import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { PageLead } from "../design-system/typography";
import {
  useConfirmExerciseSelectionPreferencesMutation,
  useConfirmRepRangeStyleMutation,
  useConfirmTrainingFrequencyMutation,
  useConfirmTrainingSplitMutation,
  useConfirmTrainingVolumeMutation,
  useInitializeTrainingVolumeMutation,
  usePlanBuilderBlueprint,
  useUpdateExerciseSelectionPreferencesMutation,
  useUpdateOptionalVolumeTargetMutation,
  useUpdateRepRangeStyleMutation,
  useUpdateTrainingFrequencyMutation,
  useUpdateTrainingSplitMutation,
  useUpdateTrainingVolumePresetMutation,
} from "./components/plan-builder-mutations";
import { PlanBuilderPage } from "./components/plan-builder-page";
import {
  createDefaultExerciseSelectionPreferences,
  deriveAutomaticExerciseSelectionRules,
  deriveMovementPatternCoverage,
  type ExerciseSelectionPreferences,
} from "./exercise-selection-preferences";
import {
  defaultRepRangeStyleId,
  getRepRangeStyle,
  getValidRepRangeStyleId,
  hasValidTrainingFrequency,
  type PlanBlueprint,
  type RepRangeStyleId,
} from "./plan-blueprint";
import { planBuilderPaths } from "./plan-builder-paths";
import { ExerciseSelectionPreferencesStep } from "./steps/exercise-selection-preferences-step";
import { RepRangeStyleStep } from "./steps/rep-range-style-step";
import { ReviewPlaceholderStep } from "./steps/review-placeholder-step";
import { TrainingFrequencyStep } from "./steps/training-frequency-step";
import { TrainingSplitStep } from "./steps/training-split-step";
import { WeeklyVolumeTargetsStep } from "./steps/weekly-volume-targets-step";
import {
  getRecommendedTrainingSplitId,
  getTrainingSplit,
  isTrainingSplitCompatible,
  type TrainingSplitId,
} from "./training-split";
import {
  isTrainingVolumeConfiguration,
  type OptionalVolumeMuscleGroupId,
  type VolumePresetId,
} from "./training-volume";

export function PlanBuilderRoute() {
  const { blueprint, summary } = usePlanBuilderBlueprint();
  const { mutate: updateTrainingFrequency } = useUpdateTrainingFrequencyMutation();
  const { mutateAsync: confirmSelectedTrainingFrequency } = useConfirmTrainingFrequencyMutation();
  const navigate = useNavigate();

  function handleTrainingFrequencyChange(
    trainingFrequencyDaysPerWeek: PlanBlueprint["trainingFrequencyDaysPerWeek"],
  ) {
    updateTrainingFrequency({
      timestamp: new Date().toISOString(),
      trainingFrequencyDaysPerWeek,
    });
  }

  async function handleContinueToSplit() {
    if (!blueprint) {
      return;
    }

    await confirmSelectedTrainingFrequency({
      timestamp: new Date().toISOString(),
      trainingFrequencyDaysPerWeek: blueprint.trainingFrequencyDaysPerWeek,
    });
    await navigate({ to: planBuilderPaths.split });
  }

  return (
    <PlanBuilderPage
      currentStep="frequency"
      intro={
        <PageLead className="text-[1.05rem] leading-6">
          Configure your training blueprint step by step before generating your plan.
        </PageLead>
      }
      summary={summary}
    >
      {blueprint ? (
        <TrainingFrequencyStep
          canContinueToSplit={hasValidTrainingFrequency(blueprint)}
          onContinueToSplit={handleContinueToSplit}
          onTrainingFrequencyChange={handleTrainingFrequencyChange}
          selectedTrainingFrequencyDaysPerWeek={
            hasValidTrainingFrequency(blueprint) ? blueprint.trainingFrequencyDaysPerWeek : null
          }
        />
      ) : (
        <p className="text-sm font-semibold text-stone-600">Loading Training Frequency...</p>
      )}
    </PlanBuilderPage>
  );
}

export function PlanBuilderSplitRoute() {
  const { blueprint, summary } = usePlanBuilderBlueprint();
  const { mutate: updateTrainingSplit } = useUpdateTrainingSplitMutation();
  const { mutateAsync: confirmSelectedTrainingSplit } = useConfirmTrainingSplitMutation();
  const navigate = useNavigate();
  const selectedSplitId = blueprint ? getVisibleTrainingSplitId(blueprint) : null;
  const selectedSplit = selectedSplitId ? getTrainingSplit(selectedSplitId) : null;

  useEffect(() => {
    if (!blueprint || hasCompatibleSelectedTrainingSplit(blueprint)) {
      return;
    }

    updateTrainingSplit({
      split: getRecommendedTrainingSplitId(blueprint.trainingFrequencyDaysPerWeek),
      timestamp: new Date().toISOString(),
    });
  }, [blueprint, updateTrainingSplit]);

  function handleTrainingSplitChange(split: TrainingSplitId) {
    updateTrainingSplit({
      split,
      timestamp: new Date().toISOString(),
    });
  }

  async function handleContinueToRepRanges() {
    if (!selectedSplitId) {
      return;
    }

    await confirmSelectedTrainingSplit({
      split: selectedSplitId,
      timestamp: new Date().toISOString(),
    });
    await navigate({ to: planBuilderPaths.repRanges });
  }

  return (
    <PlanBuilderPage
      currentStep="split"
      intro={
        <PageLead className="max-w-2xl">
          Choose a compatible Training Split for the saved Plan Blueprint.
        </PageLead>
      }
      summary={summary}
    >
      {blueprint && selectedSplit ? (
        <TrainingSplitStep
          onContinueToRepRanges={handleContinueToRepRanges}
          onTrainingSplitChange={handleTrainingSplitChange}
          selectedSplit={selectedSplit}
          trainingFrequencyDaysPerWeek={blueprint.trainingFrequencyDaysPerWeek}
        />
      ) : (
        <p className="text-sm font-semibold text-stone-600">Loading Training Split...</p>
      )}
    </PlanBuilderPage>
  );
}

export function PlanBuilderRepRangesRoute() {
  const { blueprint, summary } = usePlanBuilderBlueprint();
  const { mutateAsync: confirmSelectedRepRangeStyle } = useConfirmRepRangeStyleMutation();
  const { mutate: updateRepRangeStyle } = useUpdateRepRangeStyleMutation();
  const navigate = useNavigate();
  const savedRepRangeStyleId = blueprint ? getValidRepRangeStyleId(blueprint.repRanges) : null;
  const selectedRepRangeStyleId = blueprint
    ? (savedRepRangeStyleId ?? defaultRepRangeStyleId)
    : null;
  const selectedRepRangeStyle = selectedRepRangeStyleId
    ? getRepRangeStyle(selectedRepRangeStyleId)
    : null;

  useEffect(() => {
    if (!blueprint || savedRepRangeStyleId) {
      return;
    }

    updateRepRangeStyle({
      repRangeStyle: defaultRepRangeStyleId,
      timestamp: new Date().toISOString(),
    });
  }, [blueprint, savedRepRangeStyleId, updateRepRangeStyle]);

  function handleRepRangeStyleChange(repRangeStyle: RepRangeStyleId) {
    updateRepRangeStyle({
      repRangeStyle,
      timestamp: new Date().toISOString(),
    });
  }

  async function handleContinueToVolume() {
    if (!selectedRepRangeStyleId) {
      return;
    }

    await confirmSelectedRepRangeStyle({
      repRangeStyle: selectedRepRangeStyleId,
      timestamp: new Date().toISOString(),
    });
    await navigate({ to: planBuilderPaths.volume });
  }

  return (
    <PlanBuilderPage
      currentStep="rep-ranges"
      intro={
        <PageLead className="text-[1.05rem] leading-6">
          Configure your training blueprint step by step before generating your plan.
        </PageLead>
      }
      summary={summary}
    >
      {blueprint && selectedRepRangeStyle ? (
        <RepRangeStyleStep
          onContinueToVolume={handleContinueToVolume}
          onRepRangeStyleChange={handleRepRangeStyleChange}
          savedRepRangeStyleId={savedRepRangeStyleId}
          selectedRepRangeStyle={selectedRepRangeStyle}
        />
      ) : (
        <p className="text-sm font-semibold text-stone-600">Loading Rep Range Style...</p>
      )}
    </PlanBuilderPage>
  );
}

export function PlanBuilderVolumeRoute() {
  const { blueprint, summary } = usePlanBuilderBlueprint();
  const { mutateAsync: confirmSelectedTrainingVolume } = useConfirmTrainingVolumeMutation();
  const { mutate: initializeTrainingVolumeDefaults } = useInitializeTrainingVolumeMutation();
  const { mutate: updateTrainingVolumePreset } = useUpdateTrainingVolumePresetMutation();
  const { mutate: updateOptionalVolumeTarget } = useUpdateOptionalVolumeTargetMutation();
  const navigate = useNavigate();
  const selectedRepRangeStyleId = blueprint ? getValidRepRangeStyleId(blueprint.repRanges) : null;
  const selectedRepRangeStyle = selectedRepRangeStyleId
    ? getRepRangeStyle(selectedRepRangeStyleId)
    : null;
  const trainingVolumeConfiguration =
    blueprint && isTrainingVolumeConfiguration(blueprint) ? blueprint : null;

  useEffect(() => {
    if (!blueprint || trainingVolumeConfiguration) {
      return;
    }

    initializeTrainingVolumeDefaults({
      timestamp: new Date().toISOString(),
    });
  }, [blueprint, initializeTrainingVolumeDefaults, trainingVolumeConfiguration]);

  function handleVolumePresetChange(volumePreset: VolumePresetId) {
    updateTrainingVolumePreset({
      timestamp: new Date().toISOString(),
      volumePreset,
    });
  }

  function handleOptionalVolumeTargetToggle(
    muscleGroup: OptionalVolumeMuscleGroupId,
    isEnabled: boolean,
  ) {
    updateOptionalVolumeTarget({
      isEnabled,
      muscleGroup,
      timestamp: new Date().toISOString(),
    });
  }

  async function handleContinueToExercises() {
    if (!trainingVolumeConfiguration) {
      return;
    }

    await confirmSelectedTrainingVolume({
      trainingVolumeConfiguration,
      timestamp: new Date().toISOString(),
    });
    await navigate({ to: planBuilderPaths.exercises });
  }

  return (
    <PlanBuilderPage
      currentStep="volume"
      intro={
        <PageLead className="max-w-2xl text-sm leading-6 text-stone-700 sm:text-base">
          Set weekly rep targets before exercises are selected.
        </PageLead>
      }
      summary={summary}
    >
      <WeeklyVolumeTargetsStep
        canContinueToExercises={trainingVolumeConfiguration !== null}
        onContinueToExercises={handleContinueToExercises}
        onOptionalVolumeTargetToggle={handleOptionalVolumeTargetToggle}
        onVolumePresetChange={handleVolumePresetChange}
        repRangeStyle={selectedRepRangeStyle}
        selectedVolumePresetId={blueprint?.volumePreset ?? null}
        volumePresetSource={blueprint?.volumePresetSource ?? null}
        weeklyRepTargets={blueprint?.weeklyRepTargets ?? null}
      />
    </PlanBuilderPage>
  );
}

export function PlanBuilderExercisesRoute() {
  const navigate = useNavigate();
  const { mutateAsync: confirmSelectedExerciseSelectionPreferences } =
    useConfirmExerciseSelectionPreferencesMutation();
  const { mutateAsync: updateSelectedExerciseSelectionPreferences } =
    useUpdateExerciseSelectionPreferencesMutation();
  const { blueprint, summary } = usePlanBuilderBlueprint();
  const isExerciseSelectionStepReady =
    blueprint !== undefined &&
    hasCompatibleSelectedTrainingSplit(blueprint) &&
    isTrainingVolumeConfiguration(blueprint);
  const exerciseSelectionPreferences = isExerciseSelectionStepReady
    ? blueprint.exerciseSelectionPreferences
    : createDefaultExerciseSelectionPreferences();
  const movementPatternCoverage = isExerciseSelectionStepReady
    ? deriveMovementPatternCoverage({
        split: blueprint.split,
        strategy: exerciseSelectionPreferences.strategy,
        weeklyRepTargets: blueprint.weeklyRepTargets,
      })
    : [];
  const rulesAppliedAutomatically = deriveAutomaticExerciseSelectionRules(
    exerciseSelectionPreferences.strategy,
  );

  async function handleExerciseSelectionPreferencesChange(
    nextExerciseSelectionPreferences: ExerciseSelectionPreferences,
  ) {
    await updateSelectedExerciseSelectionPreferences({
      exerciseSelectionPreferences: nextExerciseSelectionPreferences,
      timestamp: new Date().toISOString(),
    });
  }

  async function handleContinueToReview(
    nextExerciseSelectionPreferences: ExerciseSelectionPreferences,
  ) {
    await confirmSelectedExerciseSelectionPreferences({
      exerciseSelectionPreferences: nextExerciseSelectionPreferences,
      timestamp: new Date().toISOString(),
    });
    await navigate({ to: planBuilderPaths.review });
  }

  return (
    <PlanBuilderPage
      currentStep="exercises"
      intro={
        <PageLead className="max-w-2xl text-sm leading-6 text-stone-700 sm:text-base">
          Review exercise strategy, equipment, movement coverage, and preferences before Review.
        </PageLead>
      }
      summary={summary}
    >
      {isExerciseSelectionStepReady ? (
        <ExerciseSelectionPreferencesStep
          exerciseSelectionPreferences={exerciseSelectionPreferences}
          movementPatternCoverage={movementPatternCoverage}
          onContinueToReview={handleContinueToReview}
          onExerciseSelectionPreferencesChange={handleExerciseSelectionPreferencesChange}
          rulesAppliedAutomatically={rulesAppliedAutomatically}
        />
      ) : (
        <p className="text-sm font-semibold text-stone-600">
          Loading Exercise Selection Preferences...
        </p>
      )}
    </PlanBuilderPage>
  );
}

export function PlanBuilderReviewRoute() {
  const { summary } = usePlanBuilderBlueprint();

  return (
    <PlanBuilderPage
      currentStep="review"
      intro={
        <p className="max-w-2xl text-sm font-medium leading-6 text-stone-700 sm:text-base">
          Confirm the Plan Blueprint before Training Plan generation.
        </p>
      }
      summary={summary}
    >
      <ReviewPlaceholderStep />
    </PlanBuilderPage>
  );
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
