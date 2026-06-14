import { useNavigate } from "@tanstack/react-router";
import {
  Check,
  Circle,
  CircleCheck,
  Dumbbell,
  Layers3,
  SlidersHorizontal,
  Wand2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "../design-system/cn";
import { PageHeader, PageMain } from "../design-system/typography";
import type { PlanBuilderStep } from "./components/plan-builder-config";
import {
  useConfirmExerciseSelectionPreferencesMutation,
  useConfirmRepRangeStyleMutation,
  useConfirmTrainingFrequencyMutation,
  useConfirmTrainingSplitMutation,
  useConfirmTrainingVolumeMutation,
  useGenerateTrainingPlanMutation,
  useInitializeTrainingVolumeMutation,
  usePlanBuilderBlueprint,
  useUpdateMainCompoundRotationPoolMutation,
  useUpdateMainCompoundSelectionMutation,
  useUpdateOptionalVolumeTargetMutation,
  useUpdateRepRangeStyleMutation,
  useUpdateTrainingFrequencyMutation,
  useUpdateTrainingSplitMutation,
  useUpdateTrainingVolumePresetMutation,
} from "./components/plan-builder-mutations";
import {
  defaultRepRangeStyleId,
  getRepRangeStyle,
  getValidRepRangeStyleId,
  hasValidTrainingFrequency,
  isExercisesStepComplete,
  isVolumeStepComplete,
  type PlanBlueprint,
  type PlanBlueprintSummary,
  type RepRangeStyleId,
} from "./plan-blueprint";
import { ExerciseFoundationStep } from "./steps/exercise-foundation-step";
import { GenerateTrainingPlanStep } from "./steps/generate-training-plan-step";
import { RepRangeStyleStep } from "./steps/rep-range-style-step";
import { TrainingFrequencyStep } from "./steps/training-frequency-step";
import { WeeklyVolumeTargetsStep } from "./steps/weekly-volume-targets-step";
import {
  getRecommendedTrainingSplitId,
  isTrainingSplitCompatible,
  type TrainingSplitId,
} from "./training-split";
import {
  isTrainingVolumeConfiguration,
  type OptionalVolumeMuscleGroupId,
  type VolumePresetId,
} from "./training-volume";
import "./plan-builder-one-page-route.css";

const planBuilderOnePageSections = [
  {
    id: "frequency",
    title: "Training schedule",
    subtitle: "Frequency and split",
    icon: CircleCheck,
  },
  {
    id: "rep-ranges",
    title: "Rep ranges",
    subtitle: "Intensity target",
    icon: SlidersHorizontal,
  },
  {
    id: "volume",
    title: "Volume",
    subtitle: "Sets and weekly load",
    icon: Layers3,
  },
  {
    id: "exercises",
    title: "Exercises",
    subtitle: "Main compounds and swaps",
    icon: Dumbbell,
  },
  {
    id: "generate",
    title: "Generate",
    subtitle: "Review before creation",
    icon: Wand2,
  },
] as const satisfies ReadonlyArray<{
  id: PlanBuilderStep;
  icon: typeof CircleCheck;
  subtitle: string;
  title: string;
}>;

export function PlanBuilderOnePageRoute() {
  const { blueprint, summary } = usePlanBuilderBlueprint();
  const [activeStep, setActiveStep] = useState<PlanBuilderStep | null>(null);
  const [closingStep, setClosingStep] = useState<PlanBuilderStep | null>(null);
  const [isRestoringOverview, setIsRestoringOverview] = useState(false);
  const closeAnimationTimeoutRef = useRef<number | null>(null);
  const overviewRestoreTimeoutRef = useRef<number | null>(null);
  const visibleStep = activeStep ?? closingStep;
  const isClosingSelectedStep = activeStep === null && closingStep !== null;
  const isSectionGridCompact = activeStep !== null || closingStep !== null;

  useEffect(() => {
    return () => {
      if (closeAnimationTimeoutRef.current !== null) {
        window.clearTimeout(closeAnimationTimeoutRef.current);
      }

      if (overviewRestoreTimeoutRef.current !== null) {
        window.clearTimeout(overviewRestoreTimeoutRef.current);
      }
    };
  }, []);

  function clearOverviewTransitionTimers() {
    if (closeAnimationTimeoutRef.current !== null) {
      window.clearTimeout(closeAnimationTimeoutRef.current);
      closeAnimationTimeoutRef.current = null;
    }

    if (overviewRestoreTimeoutRef.current !== null) {
      window.clearTimeout(overviewRestoreTimeoutRef.current);
      overviewRestoreTimeoutRef.current = null;
    }
  }

  function openPlanBuilderSection(step: PlanBuilderStep) {
    clearOverviewTransitionTimers();
    setIsRestoringOverview(false);
    setClosingStep(null);
    setActiveStep(step);
  }

  function selectPlanBuilderSection(step: PlanBuilderStep) {
    clearOverviewTransitionTimers();

    if (activeStep === step) {
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (prefersReducedMotion) {
        setIsRestoringOverview(false);
        setClosingStep(null);
        setActiveStep(null);
        return;
      }

      setIsRestoringOverview(false);
      setClosingStep(step);
      setActiveStep(null);
      closeAnimationTimeoutRef.current = window.setTimeout(() => {
        setClosingStep((currentStep) => (currentStep === step ? null : currentStep));
        setIsRestoringOverview(true);
        closeAnimationTimeoutRef.current = null;
        overviewRestoreTimeoutRef.current = window.setTimeout(() => {
          setIsRestoringOverview(false);
          overviewRestoreTimeoutRef.current = null;
        }, 280);
      }, 320);
      return;
    }

    openPlanBuilderSection(step);
  }

  return (
    <section className="plan-builder-one-page">
      <div className="plan-builder-one-page__surface">
        <PageHeader
          description="Open any builder section from one focused workspace."
          title="Plan Builder"
        />

        <PageMain>
          <ul
            className={cn(
              "plan-builder-one-page__section-grid",
              isSectionGridCompact ? "plan-builder-one-page__section-grid--compact" : null,
              isRestoringOverview
                ? "plan-builder-one-page__section-grid--restoring-overview"
                : null,
            )}
          >
            {planBuilderOnePageSections.map((section) => (
              <PlanBuilderOnePageSectionCard
                blueprint={blueprint}
                isActive={activeStep === section.id || closingStep === section.id}
                isExpanded={activeStep === section.id}
                key={section.id}
                onSelect={() => selectPlanBuilderSection(section.id)}
                section={section}
                summary={summary}
              />
            ))}
          </ul>

          {visibleStep ? (
            <section
              aria-label={getStepTitle(visibleStep)}
              className={cn(
                "plan-builder-one-page__active-panel",
                isClosingSelectedStep ? "plan-builder-one-page__active-panel--closing" : null,
              )}
              key={visibleStep}
            >
              <div
                className={cn(
                  "plan-builder-page",
                  "plan-builder-one-page__step",
                  `plan-builder-page--${visibleStep}`,
                )}
              >
                <PlanBuilderOnePageStepContent
                  activeStep={visibleStep}
                  blueprint={blueprint}
                  setActiveStep={openPlanBuilderSection}
                  summary={summary}
                />
              </div>
            </section>
          ) : null}
        </PageMain>
      </div>
    </section>
  );
}

function PlanBuilderOnePageSectionCard({
  blueprint,
  isActive,
  isExpanded,
  onSelect,
  section,
  summary,
}: {
  blueprint: PlanBlueprint | undefined;
  isActive: boolean;
  isExpanded: boolean;
  onSelect: () => void;
  section: (typeof planBuilderOnePageSections)[number];
  summary: PlanBlueprintSummary | null;
}) {
  const Icon = section.icon;
  const status = getSectionStatus({ blueprint, isActive, sectionId: section.id });

  return (
    <li
      className={cn(
        "plan-builder-one-page__section-card",
        isActive ? "plan-builder-one-page__section-card--active" : null,
      )}
      data-status={status.tone}
    >
      <button
        aria-expanded={isExpanded}
        aria-pressed={isExpanded}
        className="plan-builder-one-page__section-button"
        onClick={onSelect}
        type="button"
      >
        <span className="plan-builder-one-page__section-icon" data-status={status.tone}>
          {status.tone === "complete" ? (
            <Check aria-hidden="true" size={16} strokeWidth={3} />
          ) : (
            <Icon aria-hidden="true" size={17} strokeWidth={2.2} />
          )}
        </span>
        <span className="plan-builder-one-page__section-copy">
          <span className="plan-builder-one-page__section-title">{section.title}</span>
          <span className="plan-builder-one-page__section-subtitle">{section.subtitle}</span>
        </span>
        <span className="plan-builder-one-page__status-pill" data-status={status.tone}>
          {status.label}
        </span>

        <span className="plan-builder-one-page__section-details">
          {getSectionDetails(section.id, blueprint, summary).map((detail) => (
            <span className="plan-builder-one-page__section-detail" key={detail}>
              <Circle aria-hidden="true" size={7} strokeWidth={3} />
              <span>{detail}</span>
            </span>
          ))}
        </span>
      </button>
    </li>
  );
}

function PlanBuilderOnePageStepContent({
  activeStep,
  blueprint,
  setActiveStep,
  summary,
}: {
  activeStep: PlanBuilderStep;
  blueprint: PlanBlueprint | undefined;
  setActiveStep: (step: PlanBuilderStep) => void;
  summary: PlanBlueprintSummary | null;
}) {
  if (!blueprint || !summary) {
    return <p className="plan-builder-one-page__loading">Loading Plan Blueprint...</p>;
  }

  return (
    <PlanBuilderOnePageUnlockedStep
      activeStep={activeStep}
      blueprint={blueprint}
      setActiveStep={setActiveStep}
      summary={summary}
    />
  );
}

function PlanBuilderOnePageUnlockedStep({
  activeStep,
  blueprint,
  setActiveStep,
  summary,
}: {
  activeStep: PlanBuilderStep;
  blueprint: PlanBlueprint;
  setActiveStep: (step: PlanBuilderStep) => void;
  summary: PlanBlueprintSummary;
}) {
  const navigate = useNavigate();
  const { mutate: updateTrainingFrequency } = useUpdateTrainingFrequencyMutation();
  const { mutate: updateTrainingSplit } = useUpdateTrainingSplitMutation();
  const { mutateAsync: confirmSelectedTrainingFrequency } = useConfirmTrainingFrequencyMutation();
  const { mutateAsync: confirmSelectedTrainingSplit } = useConfirmTrainingSplitMutation();
  const { mutateAsync: confirmSelectedRepRangeStyle } = useConfirmRepRangeStyleMutation();
  const { mutate: updateRepRangeStyle } = useUpdateRepRangeStyleMutation();
  const { mutateAsync: confirmSelectedTrainingVolume } = useConfirmTrainingVolumeMutation();
  const { mutate: initializeTrainingVolumeDefaults } = useInitializeTrainingVolumeMutation();
  const { mutate: updateTrainingVolumePreset } = useUpdateTrainingVolumePresetMutation();
  const { mutate: updateOptionalVolumeTarget } = useUpdateOptionalVolumeTargetMutation();
  const { mutateAsync: confirmSelectedExerciseSelectionPreferences } =
    useConfirmExerciseSelectionPreferencesMutation();
  const { mutateAsync: updateMainCompoundRotationPool } =
    useUpdateMainCompoundRotationPoolMutation();
  const { mutateAsync: updateMainCompoundSelection } = useUpdateMainCompoundSelectionMutation();
  const { mutateAsync: generateTrainingPlan, isPending: isGenerating } =
    useGenerateTrainingPlanMutation();

  const savedRepRangeStyleId = getValidRepRangeStyleId(blueprint.repRanges);
  const selectedRepRangeStyleId = savedRepRangeStyleId ?? defaultRepRangeStyleId;
  const selectedRepRangeStyle = getRepRangeStyle(selectedRepRangeStyleId);
  const trainingVolumeConfiguration = isTrainingVolumeConfiguration(blueprint) ? blueprint : null;
  useEffect(() => {
    if (activeStep !== "rep-ranges" || savedRepRangeStyleId) {
      return;
    }

    updateRepRangeStyle({
      repRangeStyle: defaultRepRangeStyleId,
      timestamp: new Date().toISOString(),
    });
  }, [activeStep, savedRepRangeStyleId, updateRepRangeStyle]);

  useEffect(() => {
    if (activeStep !== "volume" || trainingVolumeConfiguration) {
      return;
    }

    initializeTrainingVolumeDefaults({
      timestamp: new Date().toISOString(),
    });
  }, [activeStep, initializeTrainingVolumeDefaults, trainingVolumeConfiguration]);

  async function handleContinueToRepRanges() {
    const timestamp = new Date().toISOString();
    const selectedSplit = getVisibleTrainingSplitId(blueprint);

    updateTrainingSplit({
      split: selectedSplit,
      timestamp,
    });
    await confirmSelectedTrainingFrequency({
      timestamp,
      trainingFrequencyDaysPerWeek: blueprint.trainingFrequencyDaysPerWeek,
    });
    await confirmSelectedTrainingSplit({
      split: selectedSplit,
      timestamp,
    });
    setActiveStep("rep-ranges");
  }

  async function handleContinueToVolume() {
    await confirmSelectedRepRangeStyle({
      repRangeStyle: selectedRepRangeStyleId,
      timestamp: new Date().toISOString(),
    });
    setActiveStep("volume");
  }

  async function handleContinueToExercises() {
    if (!trainingVolumeConfiguration) {
      return;
    }

    await confirmSelectedTrainingVolume({
      trainingVolumeConfiguration,
      timestamp: new Date().toISOString(),
    });
    setActiveStep("exercises");
  }

  async function handleContinueToGenerate() {
    await confirmSelectedExerciseSelectionPreferences({
      timestamp: new Date().toISOString(),
    });
    setActiveStep("generate");
  }

  async function handleGenerateTrainingPlan() {
    const trainingPlan = await generateTrainingPlan();

    await navigate({
      params: { planId: trainingPlan.id },
      to: "/training-plans/$planId",
    });
  }

  switch (activeStep) {
    case "frequency":
      return (
        <TrainingFrequencyStep
          canContinueToTrainingStyle={hasValidTrainingFrequency(blueprint)}
          onContinueToTrainingStyle={handleContinueToRepRanges}
          onTrainingFrequencyChange={(trainingFrequencyDaysPerWeek) => {
            updateTrainingFrequency({
              timestamp: new Date().toISOString(),
              trainingFrequencyDaysPerWeek,
            });
          }}
          onTrainingSplitChange={(split: TrainingSplitId) => {
            updateTrainingSplit({
              split,
              timestamp: new Date().toISOString(),
            });
          }}
          selectedTrainingSplitId={getVisibleTrainingSplitId(blueprint)}
          selectedTrainingFrequencyDaysPerWeek={
            hasValidTrainingFrequency(blueprint) ? blueprint.trainingFrequencyDaysPerWeek : null
          }
        />
      );
    case "rep-ranges":
      return (
        <RepRangeStyleStep
          onContinueToVolume={handleContinueToVolume}
          onRepRangeStyleChange={(repRangeStyle: RepRangeStyleId) => {
            updateRepRangeStyle({
              repRangeStyle,
              timestamp: new Date().toISOString(),
            });
          }}
          savedRepRangeStyleId={savedRepRangeStyleId}
          selectedRepRangeStyle={selectedRepRangeStyle}
        />
      );
    case "volume":
      return (
        <WeeklyVolumeTargetsStep
          canContinueToExercises={trainingVolumeConfiguration !== null}
          onContinueToExercises={handleContinueToExercises}
          onOptionalVolumeTargetToggle={(
            muscleGroup: OptionalVolumeMuscleGroupId,
            isEnabled: boolean,
          ) => {
            updateOptionalVolumeTarget({
              isEnabled,
              muscleGroup,
              timestamp: new Date().toISOString(),
            });
          }}
          onVolumePresetChange={(volumePreset: VolumePresetId) => {
            updateTrainingVolumePreset({
              timestamp: new Date().toISOString(),
              volumePreset,
            });
          }}
          repRangeStyle={selectedRepRangeStyle}
          selectedVolumePresetId={blueprint.volumePreset}
          volumePresetSource={blueprint.volumePresetSource}
          weeklyRepTargets={blueprint.weeklyRepTargets}
        />
      );
    case "exercises":
      if (!hasCompatibleSelectedTrainingSplit(blueprint) || !trainingVolumeConfiguration) {
        return <p className="plan-builder-one-page__loading">Preparing exercise foundation...</p>;
      }

      return (
        <ExerciseFoundationStep
          mainCompoundSelections={blueprint.mainCompoundSelections}
          mainCompoundRotationPools={blueprint.mainCompoundRotationPools}
          onContinueToGenerate={handleContinueToGenerate}
          onMainCompoundSelectionChange={async ({ exerciseId, movementPattern }) => {
            await updateMainCompoundSelection({
              exerciseId,
              movementPattern,
              timestamp: new Date().toISOString(),
            });
          }}
          onRotationPoolChange={async ({ exerciseIds, movementPattern }) => {
            await updateMainCompoundRotationPool({
              exerciseIds,
              movementPattern,
              timestamp: new Date().toISOString(),
            });
          }}
          split={blueprint.split}
          trainingFrequencyDaysPerWeek={blueprint.trainingFrequencyDaysPerWeek}
          weeklyRepTargets={trainingVolumeConfiguration.weeklyRepTargets}
        />
      );
    case "generate":
      return (
        <GenerateTrainingPlanStep
          isGenerating={isGenerating}
          onGenerateTrainingPlan={handleGenerateTrainingPlan}
          summary={summary}
        />
      );
  }

  return null;
}

function getSectionStatus({
  blueprint,
  isActive,
  sectionId,
}: {
  blueprint: PlanBlueprint | undefined;
  isActive: boolean;
  sectionId: PlanBuilderStep;
}): { label: string; tone: "complete" | "current" | "ready" } {
  if (blueprint && isSectionComplete(sectionId, blueprint)) {
    return { label: "Complete", tone: "complete" };
  }

  if (isActive) {
    return { label: "Current", tone: "current" };
  }

  return { label: "Ready", tone: "ready" };
}

function isSectionComplete(sectionId: PlanBuilderStep, blueprint: PlanBlueprint): boolean {
  switch (sectionId) {
    case "frequency":
      return hasCompatibleSelectedTrainingSplit(blueprint);
    case "rep-ranges":
      return getValidRepRangeStyleId(blueprint.repRanges) !== null;
    case "volume":
      return isVolumeStepComplete(blueprint);
    case "exercises":
      return isExercisesStepComplete(blueprint);
    case "generate":
      return false;
  }

  return false;
}

function getSectionDetails(
  sectionId: PlanBuilderStep,
  blueprint: PlanBlueprint | undefined,
  summary: PlanBlueprintSummary | null,
): ReadonlyArray<string> {
  if (!blueprint || !summary) {
    return ["Loading Plan Blueprint", "Default choices available", "Progress saved locally"];
  }

  switch (sectionId) {
    case "frequency":
      return [summary.trainingFrequency, summary.split, summary.recovery];
    case "rep-ranges":
      return [summary.repRanges, "Main and secondary lift bias", "Accessory defaults"];
    case "volume":
      return [summary.volumePreset, "Weekly Rep Targets", "Optional target groups"];
    case "exercises":
      return [
        `${blueprint.mainCompoundSelections.length} main lifts selected`,
        `${blueprint.mainCompoundRotationPools.length} rotation pools`,
        summary.nextStep === "Generate" ? "Ready to generate" : "Coverage in progress",
      ];
    case "generate":
      return [
        "Review blueprint",
        summary.generationStatus,
        summary.nextStep === "Generate" ? "Create Training Plan" : "Finish prior steps",
      ];
  }

  return [];
}

function getStepTitle(step: PlanBuilderStep): string {
  return planBuilderOnePageSections.find((section) => section.id === step)?.title ?? "Builder";
}

function getVisibleTrainingSplitId(blueprint: PlanBlueprint): TrainingSplitId {
  if (hasCompatibleSelectedTrainingSplit(blueprint)) {
    return blueprint.split;
  }

  return getRecommendedTrainingSplitId(blueprint.trainingFrequencyDaysPerWeek);
}

function hasCompatibleSelectedTrainingSplit(
  blueprint: PlanBlueprint,
): blueprint is PlanBlueprint & { split: TrainingSplitId } {
  return isTrainingSplitCompatible(blueprint.split, blueprint.trainingFrequencyDaysPerWeek);
}
