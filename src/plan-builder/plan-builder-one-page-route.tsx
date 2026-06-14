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
  useApplyResolvedPlanBlueprintMutation,
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
  hasConfiguredExercises,
  hasConfiguredTrainingVolume,
  hasValidTrainingFrequency,
  type PlanBlueprint,
  type PlanBlueprintDefaultResolution,
  type PlanBlueprintSummary,
  type RepRangeStyleId,
  resolvePlanBlueprintRecommendedDefaults,
  type TrainingFrequencyDaysPerWeek,
} from "./plan-blueprint";
import {
  exerciseFoundationSetupCopy,
  getExerciseFoundationSetupGuidance,
  type MainCompoundRotationPoolChange,
  type MainCompoundSelectionChange,
  PlanBuilderExerciseFoundationStep,
} from "./plan-builder-exercise-foundation";
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
  type TrainingVolumeConfiguration,
  type VolumePresetId,
} from "./training-volume";
import "./components/plan-builder-page.css";
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
  const nextStep = getNextPlanBuilderStep(blueprint);

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
                nextStep={nextStep}
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
  nextStep,
  onSelect,
  section,
  summary,
}: {
  blueprint: PlanBlueprint | undefined;
  isActive: boolean;
  isExpanded: boolean;
  nextStep: PlanBuilderStep | null;
  onSelect: () => void;
  section: (typeof planBuilderOnePageSections)[number];
  summary: PlanBlueprintSummary | null;
}) {
  const Icon = section.icon;
  const status = getSectionStatus({ blueprint, isActive, nextStep, sectionId: section.id });

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
            <span className="plan-builder-one-page__section-detail" key={detail.id}>
              <Circle aria-hidden="true" size={7} strokeWidth={3} />
              <span>{formatOverviewDetail(detail.label)}</span>
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
  const { mutate: updateRepRangeStyle } = useUpdateRepRangeStyleMutation();
  const { mutate: initializeTrainingVolumeDefaults } = useInitializeTrainingVolumeMutation();
  const savedRepRangeStyleId = getValidRepRangeStyleId(blueprint.repRanges);
  const selectedRepRangeStyleId = savedRepRangeStyleId ?? defaultRepRangeStyleId;
  const selectedRepRangeStyle = getRepRangeStyle(selectedRepRangeStyleId);
  const trainingVolumeConfiguration = isTrainingVolumeConfiguration(blueprint) ? blueprint : null;
  const [pendingDefaultResolution, setPendingDefaultResolution] =
    useState<PlanBlueprintDefaultResolution | null>(null);
  const frequencyStep = useOnePageTrainingScheduleStep({ blueprint, setActiveStep });
  const repRangeStep = useOnePageRepRangeStep({ selectedRepRangeStyleId, setActiveStep });
  const volumeStep = useOnePageVolumeStep({ setActiveStep, trainingVolumeConfiguration });
  const exercisesStep = useOnePageExercisesStep({ setActiveStep });
  const generateStep = useOnePageGenerateStep({
    blueprint,
    navigate,
    onPendingDefaultResolutionChange: setPendingDefaultResolution,
  });

  useRepRangeDefaultSelection({
    activeStep,
    savedRepRangeStyleId,
    updateRepRangeStyle,
  });
  useTrainingVolumeDefaultSelection({
    activeStep,
    initializeTrainingVolumeDefaults,
    trainingVolumeConfiguration,
  });

  return renderOnePageActiveStep({
    activeStep,
    blueprint,
    exercisesStep,
    frequencyStep,
    generateStep,
    pendingDefaultResolution,
    repRangeStep,
    selectedRepRangeStyle,
    savedRepRangeStyleId,
    setActiveStep,
    summary,
    trainingVolumeConfiguration,
    volumeStep,
  });
}

function renderOnePageActiveStep({
  activeStep,
  blueprint,
  exercisesStep,
  frequencyStep,
  generateStep,
  pendingDefaultResolution,
  repRangeStep,
  selectedRepRangeStyle,
  savedRepRangeStyleId,
  setActiveStep,
  summary,
  trainingVolumeConfiguration,
  volumeStep,
}: {
  activeStep: PlanBuilderStep;
  blueprint: PlanBlueprint;
  exercisesStep: ReturnType<typeof useOnePageExercisesStep>;
  frequencyStep: ReturnType<typeof useOnePageTrainingScheduleStep>;
  generateStep: ReturnType<typeof useOnePageGenerateStep>;
  pendingDefaultResolution: PlanBlueprintDefaultResolution | null;
  repRangeStep: ReturnType<typeof useOnePageRepRangeStep>;
  selectedRepRangeStyle: ReturnType<typeof getRepRangeStyle>;
  savedRepRangeStyleId: RepRangeStyleId | null;
  setActiveStep: (step: PlanBuilderStep) => void;
  summary: PlanBlueprintSummary;
  trainingVolumeConfiguration: TrainingVolumeConfiguration | null;
  volumeStep: ReturnType<typeof useOnePageVolumeStep>;
}) {
  switch (activeStep) {
    case "frequency":
      return <OnePageTrainingScheduleStep blueprint={blueprint} {...frequencyStep} />;
    case "rep-ranges":
      return (
        <OnePageRepRangeStep
          onBackToTrainingSchedule={() => setActiveStep("frequency")}
          savedRepRangeStyleId={savedRepRangeStyleId}
          selectedRepRangeStyle={selectedRepRangeStyle}
          {...repRangeStep}
        />
      );
    case "volume":
      return (
        <OnePageVolumeStep
          blueprint={blueprint}
          onBackToRepRanges={() => setActiveStep("rep-ranges")}
          repRangeStyle={selectedRepRangeStyle}
          trainingVolumeConfiguration={trainingVolumeConfiguration}
          {...volumeStep}
        />
      );
    case "exercises": {
      const requiresTrainingSchedule = !hasCompatibleSelectedTrainingSplit(blueprint);
      const requiresVolume = !trainingVolumeConfiguration;

      if (requiresTrainingSchedule || requiresVolume) {
        return (
          <ExerciseFoundationSetupState
            onOpenTrainingSchedule={() => setActiveStep("frequency")}
            onOpenVolume={() => setActiveStep("volume")}
            requiresTrainingSchedule={requiresTrainingSchedule}
            requiresVolume={requiresVolume}
          />
        );
      }

      return (
        <OnePageExercisesStep
          blueprint={blueprint}
          onBackToVolume={() => setActiveStep("volume")}
          trainingVolumeConfiguration={trainingVolumeConfiguration}
          {...exercisesStep}
        />
      );
    }
    case "generate":
      return (
        <GenerateTrainingPlanStep
          isGenerating={generateStep.isGenerating}
          onBackToExercises={() => setActiveStep("exercises")}
          onGenerateTrainingPlan={generateStep.onGenerateTrainingPlan}
          recommendedDefaultsConfirmation={
            pendingDefaultResolution
              ? {
                  onAcceptRecommendedDefaults: generateStep.onAcceptRecommendedDefaults,
                  onCancelRecommendedDefaults: generateStep.onCancelRecommendedDefaults,
                  resolution: pendingDefaultResolution,
                }
              : null
          }
          summary={summary}
        />
      );
  }

  return null;
}

function useRepRangeDefaultSelection({
  activeStep,
  savedRepRangeStyleId,
  updateRepRangeStyle,
}: {
  activeStep: PlanBuilderStep;
  savedRepRangeStyleId: RepRangeStyleId | null;
  updateRepRangeStyle: (variables: { repRangeStyle: RepRangeStyleId; timestamp: string }) => void;
}) {
  useEffect(() => {
    if (activeStep !== "rep-ranges" || savedRepRangeStyleId) {
      return;
    }

    updateRepRangeStyle({
      repRangeStyle: defaultRepRangeStyleId,
      timestamp: new Date().toISOString(),
    });
  }, [activeStep, savedRepRangeStyleId, updateRepRangeStyle]);
}

function useTrainingVolumeDefaultSelection({
  activeStep,
  initializeTrainingVolumeDefaults,
  trainingVolumeConfiguration,
}: {
  activeStep: PlanBuilderStep;
  initializeTrainingVolumeDefaults: (variables: { timestamp: string }) => void;
  trainingVolumeConfiguration: TrainingVolumeConfiguration | null;
}) {
  useEffect(() => {
    if (activeStep !== "volume" || trainingVolumeConfiguration) {
      return;
    }

    initializeTrainingVolumeDefaults({
      timestamp: new Date().toISOString(),
    });
  }, [activeStep, initializeTrainingVolumeDefaults, trainingVolumeConfiguration]);
}

function useOnePageTrainingScheduleStep({
  blueprint,
  setActiveStep,
}: {
  blueprint: PlanBlueprint;
  setActiveStep: (step: PlanBuilderStep) => void;
}) {
  const { mutate: updateTrainingFrequency } = useUpdateTrainingFrequencyMutation();
  const { mutate: updateTrainingSplit } = useUpdateTrainingSplitMutation();
  const { mutateAsync: confirmSelectedTrainingFrequency } = useConfirmTrainingFrequencyMutation();
  const { mutateAsync: confirmSelectedTrainingSplit } = useConfirmTrainingSplitMutation();

  return {
    onContinueToTrainingStyle: async () => {
      const timestamp = new Date().toISOString();
      const selectedSplit = getVisibleTrainingSplitId(blueprint);

      updateTrainingSplit({ split: selectedSplit, timestamp });
      await confirmSelectedTrainingFrequency({
        timestamp,
        trainingFrequencyDaysPerWeek: blueprint.trainingFrequencyDaysPerWeek,
      });
      await confirmSelectedTrainingSplit({ split: selectedSplit, timestamp });
      setActiveStep("rep-ranges");
    },
    onTrainingFrequencyChange: (trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek) =>
      updateTrainingFrequency({
        timestamp: new Date().toISOString(),
        trainingFrequencyDaysPerWeek,
      }),
    onTrainingSplitChange: (split: TrainingSplitId) =>
      updateTrainingSplit({
        split,
        timestamp: new Date().toISOString(),
      }),
  };
}

function useOnePageRepRangeStep({
  selectedRepRangeStyleId,
  setActiveStep,
}: {
  selectedRepRangeStyleId: RepRangeStyleId;
  setActiveStep: (step: PlanBuilderStep) => void;
}) {
  const { mutateAsync: confirmSelectedRepRangeStyle } = useConfirmRepRangeStyleMutation();
  const { mutate: updateRepRangeStyle } = useUpdateRepRangeStyleMutation();

  return {
    onContinueToVolume: async () => {
      await confirmSelectedRepRangeStyle({
        repRangeStyle: selectedRepRangeStyleId,
        timestamp: new Date().toISOString(),
      });
      setActiveStep("volume");
    },
    onRepRangeStyleChange: (repRangeStyle: RepRangeStyleId) =>
      updateRepRangeStyle({
        repRangeStyle,
        timestamp: new Date().toISOString(),
      }),
  };
}

function useOnePageVolumeStep({
  setActiveStep,
  trainingVolumeConfiguration,
}: {
  setActiveStep: (step: PlanBuilderStep) => void;
  trainingVolumeConfiguration: TrainingVolumeConfiguration | null;
}) {
  const { mutateAsync: confirmSelectedTrainingVolume } = useConfirmTrainingVolumeMutation();
  const { mutate: updateTrainingVolumePreset } = useUpdateTrainingVolumePresetMutation();
  const { mutate: updateOptionalVolumeTarget } = useUpdateOptionalVolumeTargetMutation();

  return {
    onContinueToExercises: async () => {
      if (!trainingVolumeConfiguration) {
        return;
      }

      await confirmSelectedTrainingVolume({
        trainingVolumeConfiguration,
        timestamp: new Date().toISOString(),
      });
      setActiveStep("exercises");
    },
    onOptionalVolumeTargetToggle: (muscleGroup: OptionalVolumeMuscleGroupId, isEnabled: boolean) =>
      updateOptionalVolumeTarget({ isEnabled, muscleGroup, timestamp: new Date().toISOString() }),
    onVolumePresetChange: (volumePreset: VolumePresetId) =>
      updateTrainingVolumePreset({
        timestamp: new Date().toISOString(),
        volumePreset,
      }),
  };
}

function useOnePageExercisesStep({
  setActiveStep,
}: {
  setActiveStep: (step: PlanBuilderStep) => void;
}) {
  const { mutateAsync: confirmSelectedExerciseSelectionPreferences } =
    useConfirmExerciseSelectionPreferencesMutation();
  const { mutateAsync: updateMainCompoundRotationPool } =
    useUpdateMainCompoundRotationPoolMutation();
  const { mutateAsync: updateMainCompoundSelection } = useUpdateMainCompoundSelectionMutation();

  return {
    onContinueToGenerate: async () => {
      await confirmSelectedExerciseSelectionPreferences({
        timestamp: new Date().toISOString(),
      });
      setActiveStep("generate");
    },
    onMainCompoundSelectionChange: async ({
      exerciseId,
      movementPattern,
    }: MainCompoundSelectionChange) =>
      updateMainCompoundSelection({
        exerciseId,
        movementPattern,
        timestamp: new Date().toISOString(),
      }),
    onRotationPoolChange: async ({
      exerciseIds,
      movementPattern,
    }: MainCompoundRotationPoolChange) =>
      updateMainCompoundRotationPool({
        exerciseIds,
        movementPattern,
        timestamp: new Date().toISOString(),
      }),
  };
}

function useOnePageGenerateStep({
  blueprint,
  navigate,
  onPendingDefaultResolutionChange,
}: {
  blueprint: PlanBlueprint;
  navigate: ReturnType<typeof useNavigate>;
  onPendingDefaultResolutionChange: (resolution: PlanBlueprintDefaultResolution | null) => void;
}) {
  const { mutateAsync: applyResolvedPlanBlueprint, isPending: isApplyingResolvedBlueprint } =
    useApplyResolvedPlanBlueprintMutation();
  const { mutateAsync: generateTrainingPlan, isPending: isGenerating } =
    useGenerateTrainingPlanMutation();

  async function generateAndNavigate() {
    const trainingPlan = await generateTrainingPlan();

    await navigate({
      params: { planId: trainingPlan.id },
      to: "/training-plans/$planId",
    });
  }

  return {
    isGenerating: isGenerating || isApplyingResolvedBlueprint,
    onAcceptRecommendedDefaults: async (resolution: PlanBlueprintDefaultResolution) => {
      await applyResolvedPlanBlueprint({ blueprint: resolution.resolvedBlueprint });
      onPendingDefaultResolutionChange(null);
      await generateAndNavigate();
    },
    onCancelRecommendedDefaults: () => {
      onPendingDefaultResolutionChange(null);
    },
    onGenerateTrainingPlan: async () => {
      const resolution = resolvePlanBlueprintRecommendedDefaults(blueprint);

      if (!resolution.isReady) {
        onPendingDefaultResolutionChange(resolution);
        return;
      }

      await generateAndNavigate();
    },
  };
}

function OnePageTrainingScheduleStep({
  blueprint,
  onContinueToTrainingStyle,
  onTrainingFrequencyChange,
  onTrainingSplitChange,
}: {
  blueprint: PlanBlueprint;
  onContinueToTrainingStyle: () => Promise<void>;
  onTrainingFrequencyChange: (trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek) => void;
  onTrainingSplitChange: (split: TrainingSplitId) => void;
}) {
  return (
    <TrainingFrequencyStep
      canContinueToTrainingStyle={hasValidTrainingFrequency(blueprint)}
      onContinueToTrainingStyle={onContinueToTrainingStyle}
      onTrainingFrequencyChange={onTrainingFrequencyChange}
      onTrainingSplitChange={onTrainingSplitChange}
      selectedTrainingSplitId={getVisibleTrainingSplitId(blueprint)}
      selectedTrainingFrequencyDaysPerWeek={
        hasValidTrainingFrequency(blueprint) ? blueprint.trainingFrequencyDaysPerWeek : null
      }
    />
  );
}

function OnePageRepRangeStep({
  onBackToTrainingSchedule,
  onContinueToVolume,
  onRepRangeStyleChange,
  savedRepRangeStyleId,
  selectedRepRangeStyle,
}: {
  onBackToTrainingSchedule: () => void;
  onContinueToVolume: () => Promise<void>;
  onRepRangeStyleChange: (repRangeStyle: RepRangeStyleId) => void;
  savedRepRangeStyleId: RepRangeStyleId | null;
  selectedRepRangeStyle: ReturnType<typeof getRepRangeStyle>;
}) {
  return (
    <RepRangeStyleStep
      onBackToTrainingSchedule={onBackToTrainingSchedule}
      onContinueToVolume={onContinueToVolume}
      onRepRangeStyleChange={onRepRangeStyleChange}
      savedRepRangeStyleId={savedRepRangeStyleId}
      selectedRepRangeStyle={selectedRepRangeStyle}
    />
  );
}

function OnePageVolumeStep({
  blueprint,
  onBackToRepRanges,
  onContinueToExercises,
  onOptionalVolumeTargetToggle,
  onVolumePresetChange,
  repRangeStyle,
  trainingVolumeConfiguration,
}: {
  blueprint: PlanBlueprint;
  onBackToRepRanges: () => void;
  onContinueToExercises: () => Promise<void>;
  onOptionalVolumeTargetToggle: (
    muscleGroup: OptionalVolumeMuscleGroupId,
    isEnabled: boolean,
  ) => void;
  onVolumePresetChange: (volumePreset: VolumePresetId) => void;
  repRangeStyle: ReturnType<typeof getRepRangeStyle>;
  trainingVolumeConfiguration: TrainingVolumeConfiguration | null;
}) {
  return (
    <WeeklyVolumeTargetsStep
      canContinueToExercises={trainingVolumeConfiguration !== null}
      onBackToRepRanges={onBackToRepRanges}
      onContinueToExercises={onContinueToExercises}
      onOptionalVolumeTargetToggle={onOptionalVolumeTargetToggle}
      onVolumePresetChange={onVolumePresetChange}
      repRangeStyle={repRangeStyle}
      selectedVolumePresetId={blueprint.volumePreset}
      volumePresetSource={blueprint.volumePresetSource}
      weeklyRepTargets={blueprint.weeklyRepTargets}
    />
  );
}

function OnePageExercisesStep({
  blueprint,
  onBackToVolume,
  onContinueToGenerate,
  onMainCompoundSelectionChange,
  onRotationPoolChange,
  trainingVolumeConfiguration,
}: {
  blueprint: PlanBlueprint & { split: TrainingSplitId };
  onBackToVolume: () => void;
  onContinueToGenerate: () => Promise<void>;
  onMainCompoundSelectionChange: (selection: MainCompoundSelectionChange) => Promise<unknown>;
  onRotationPoolChange: (rotationPool: MainCompoundRotationPoolChange) => Promise<unknown>;
  trainingVolumeConfiguration: TrainingVolumeConfiguration;
}) {
  return (
    <PlanBuilderExerciseFoundationStep
      blueprint={blueprint}
      onBackToVolume={onBackToVolume}
      onContinueToGenerate={onContinueToGenerate}
      onMainCompoundSelectionChange={onMainCompoundSelectionChange}
      onRotationPoolChange={onRotationPoolChange}
      weeklyRepTargets={trainingVolumeConfiguration.weeklyRepTargets}
    />
  );
}

function getSectionStatus({
  blueprint,
  isActive,
  nextStep,
  sectionId,
}: {
  blueprint: PlanBlueprint | undefined;
  isActive: boolean;
  nextStep: PlanBuilderStep | null;
  sectionId: PlanBuilderStep;
}): { label: string; tone: "complete" | "current" | "next" | "ready" } {
  if (!blueprint) {
    return { label: "Loading", tone: "ready" };
  }

  if (blueprint && isSectionComplete(sectionId, blueprint)) {
    return { label: "Done", tone: "complete" };
  }

  if (isActive) {
    return { label: "Open", tone: "current" };
  }

  if (sectionId === nextStep) {
    return { label: "Next", tone: "next" };
  }

  return { label: "Ready", tone: "ready" };
}

function getNextPlanBuilderStep(blueprint: PlanBlueprint | undefined): PlanBuilderStep | null {
  if (!blueprint) {
    return null;
  }

  return (
    planBuilderOnePageSections.find((section) => !isSectionComplete(section.id, blueprint))?.id ??
    null
  );
}

function formatOverviewDetail(detail: string): string {
  switch (detail) {
    case "Loading Plan Blueprint":
      return "Loading plan blueprint";
    case "Choose a Training Split":
      return "Choose training split";
    case "Choose Rep ranges":
      return "Choose rep ranges";
    case "Choose a compatible split to see this detail.":
      return "Choose a compatible split first";
    case "Weekly Rep Targets":
      return "Weekly rep targets";
    case "Create Training Plan":
      return "Create training plan";
    default:
      return detail.replace(/\.$/, "");
  }
}

function isSectionComplete(sectionId: PlanBuilderStep, blueprint: PlanBlueprint): boolean {
  switch (sectionId) {
    case "frequency":
      return hasCompatibleSelectedTrainingSplit(blueprint);
    case "rep-ranges":
      return getValidRepRangeStyleId(blueprint.repRanges) !== null;
    case "volume":
      return hasConfiguredTrainingVolume(blueprint);
    case "exercises":
      return hasConfiguredExercises(blueprint);
    case "generate":
      return false;
  }

  return false;
}

function getSectionDetails(
  sectionId: PlanBuilderStep,
  blueprint: PlanBlueprint | undefined,
  summary: PlanBlueprintSummary | null,
): ReadonlyArray<{ id: string; label: string }> {
  if (!blueprint || !summary) {
    return getLoadingSectionDetails(sectionId);
  }

  switch (sectionId) {
    case "frequency":
      return getFrequencySectionDetails(summary);
    case "rep-ranges":
      return getRepRangeSectionDetails(summary);
    case "volume":
      return getVolumeSectionDetails(summary);
    case "exercises":
      return getExercisesSectionDetails(blueprint);
    case "generate":
      return getGenerateSectionDetails(summary);
  }

  return [];
}

function getLoadingSectionDetails(sectionId: PlanBuilderStep) {
  return [
    { id: `${sectionId}-loading`, label: "Loading Plan Blueprint" },
    { id: `${sectionId}-defaults`, label: "Default choices available" },
    { id: `${sectionId}-saved`, label: "Progress saved locally" },
  ] as const;
}

function getFrequencySectionDetails(summary: PlanBlueprintSummary) {
  return [
    { id: "frequency-days", label: summary.trainingFrequency },
    { id: "frequency-split", label: summary.split },
    { id: "frequency-recovery", label: summary.recovery },
  ] as const;
}

function getRepRangeSectionDetails(summary: PlanBlueprintSummary) {
  return [
    { id: "rep-ranges-selection", label: summary.repRanges },
    { id: "rep-ranges-bias", label: "Main and secondary lift bias" },
    { id: "rep-ranges-accessories", label: "Accessory defaults" },
  ] as const;
}

function getVolumeSectionDetails(summary: PlanBlueprintSummary) {
  return [
    { id: "volume-preset", label: summary.volumePreset },
    { id: "volume-targets", label: "Weekly Rep Targets" },
    { id: "volume-optional", label: "Optional target groups" },
  ] as const;
}

function getExercisesSectionDetails(blueprint: PlanBlueprint) {
  return [
    {
      id: "exercises-main-lifts",
      label: `${blueprint.mainCompoundSelections.length} main lifts selected`,
    },
    {
      id: "exercises-rotation-pools",
      label: `${blueprint.mainCompoundRotationPools.length} rotation pools`,
    },
    {
      id: "exercises-status",
      label: hasConfiguredExercises(blueprint) ? "Ready to generate" : "Coverage still needed",
    },
  ] as const;
}

function getGenerateSectionDetails(summary: PlanBlueprintSummary) {
  return [
    { id: "generate-review", label: "Review blueprint" },
    { id: "generate-status", label: summary.generationStatus },
    {
      id: "generate-action",
      label:
        summary.nextStep === "Generate"
          ? "Create Training Plan"
          : "Defaults or choices still needed",
    },
  ] as const;
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

function ExerciseFoundationSetupState({
  onOpenTrainingSchedule,
  onOpenVolume,
  requiresTrainingSchedule,
  requiresVolume,
}: {
  onOpenTrainingSchedule: () => void;
  onOpenVolume: () => void;
  requiresTrainingSchedule: boolean;
  requiresVolume: boolean;
}) {
  const guidance = getExerciseFoundationSetupGuidance({
    requiresTrainingSchedule,
    requiresVolume,
  });

  return (
    <section className="plan-builder-one-page__loading">
      <h3>{exerciseFoundationSetupCopy.heading}</h3>
      <p>{exerciseFoundationSetupCopy.description}</p>
      <ul>
        {guidance.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-3 pt-2">
        {requiresTrainingSchedule ? (
          <button onClick={onOpenTrainingSchedule} type="button">
            Open Training schedule
          </button>
        ) : null}
        {requiresVolume ? (
          <button onClick={onOpenVolume} type="button">
            Open Volume
          </button>
        ) : null}
      </div>
    </section>
  );
}
