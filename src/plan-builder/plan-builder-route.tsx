import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { PageLead } from "../design-system/typography";
import {
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
import { ExerciseFoundationStep } from "./steps/exercise-foundation-step";
import { RepRangeStyleStep } from "./steps/rep-range-style-step";
import { ReviewPlaceholderStep } from "./steps/review-placeholder-step";
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

export function PlanBuilderRoute() {
  const { blueprint, summary } = usePlanBuilderBlueprint();
  const { mutate: updateTrainingFrequency } = useUpdateTrainingFrequencyMutation();
  const { mutate: updateTrainingSplit } = useUpdateTrainingSplitMutation();
  const { mutateAsync: confirmSelectedTrainingFrequency } = useConfirmTrainingFrequencyMutation();
  const { mutateAsync: confirmSelectedTrainingSplit } = useConfirmTrainingSplitMutation();
  const navigate = useNavigate();

  function handleTrainingFrequencyChange(
    trainingFrequencyDaysPerWeek: PlanBlueprint["trainingFrequencyDaysPerWeek"],
  ) {
    updateTrainingFrequency({
      timestamp: new Date().toISOString(),
      trainingFrequencyDaysPerWeek,
    });
  }

  function handleTrainingScheduleSplitChange(split: TrainingSplitId) {
    updateTrainingSplit({
      split,
      timestamp: new Date().toISOString(),
    });
  }

  async function handleContinueToTrainingStyle() {
    if (!blueprint) {
      return;
    }

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
    await navigate({ to: planBuilderPaths.repRanges });
  }

  return (
    <PlanBuilderPage
      currentStep="frequency"
      intro={
        <PageLead>
          Choose how often you can train and confirm the weekly split Just Workout should use.
        </PageLead>
      }
      summary={summary}
    >
      {blueprint ? (
        <TrainingFrequencyStep
          canContinueToTrainingStyle={hasValidTrainingFrequency(blueprint)}
          onContinueToTrainingStyle={handleContinueToTrainingStyle}
          onTrainingFrequencyChange={handleTrainingFrequencyChange}
          onTrainingSplitChange={handleTrainingScheduleSplitChange}
          selectedTrainingSplitId={getVisibleTrainingSplitId(blueprint)}
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
          Select the Rep Range Style that should shape main lifts, secondary work, and accessories.
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

  async function handleExerciseSelectionPreferencesChange(
    nextExerciseSelectionPreferences: ExerciseSelectionPreferences,
  ) {
    await updateSelectedExerciseSelectionPreferences({
      exerciseSelectionPreferences: nextExerciseSelectionPreferences,
      timestamp: new Date().toISOString(),
    });
  }

  return (
    <PlanBuilderPage
      currentStep="exercises"
      intro={
        <PageLead className="max-w-2xl text-sm leading-6 text-stone-700 sm:text-base">
          Review the main compound movement patterns your plan needs. Exercise selection will be
          editable in the next iteration.
        </PageLead>
      }
      summary={summary}
    >
      {isExerciseSelectionStepReady ? (
        <ExerciseFoundationStep
          exerciseSelectionPreferences={exerciseSelectionPreferences}
          mainCompoundSelections={blueprint.mainCompoundSelections}
          onExerciseSelectionPreferencesChange={handleExerciseSelectionPreferencesChange}
          split={blueprint.split}
          trainingFrequencyDaysPerWeek={blueprint.trainingFrequencyDaysPerWeek}
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
