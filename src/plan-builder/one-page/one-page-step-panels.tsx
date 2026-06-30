import type { getRepRangeStyle, PlanBlueprint } from "../plan-blueprint";
import {
  type IsolationExercisePreferencesChange,
  type MainCompoundPreferencesChange,
  PlanBuilderMainCompoundPreferencesStep,
} from "../plan-builder-main-compound-preferences";
import { RepRangeStyleStep } from "../steps/rep-range-style/rep-range-style-step";
import { TrainingFrequencyStep } from "../steps/training-frequency/training-frequency-step";
import { WeeklyVolumeTargetsStep } from "../steps/weekly-volume-targets/weekly-volume-targets-step";
import type { TrainingSplitId } from "../training-split";
import type { OptionalVolumeMuscleGroupId, VolumePresetId } from "../training-volume";

export function OnePageTrainingScheduleStep({
  blueprint,
  onTrainingFrequencyChange,
  onTrainingSplitChange,
  selectedTrainingSplitId,
}: {
  blueprint: PlanBlueprint;
  onTrainingFrequencyChange: (
    trainingFrequencyDaysPerWeek: PlanBlueprint["trainingFrequencyDaysPerWeek"],
  ) => void;
  onTrainingSplitChange: (split: TrainingSplitId) => void;
  selectedTrainingSplitId: TrainingSplitId;
}) {
  return (
    <TrainingFrequencyStep
      onTrainingFrequencyChange={onTrainingFrequencyChange}
      onTrainingSplitChange={onTrainingSplitChange}
      selectedTrainingSplitId={selectedTrainingSplitId}
      selectedTrainingFrequencyDaysPerWeek={blueprint.trainingFrequencyDaysPerWeek}
    />
  );
}

export function OnePageRepRangeStep({
  onRepRangeStyleChange,
  savedRepRangeStyleId,
  selectedRepRangeStyle,
}: {
  onRepRangeStyleChange: Parameters<typeof RepRangeStyleStep>[0]["onRepRangeStyleChange"];
  savedRepRangeStyleId: Parameters<typeof RepRangeStyleStep>[0]["savedRepRangeStyleId"];
  selectedRepRangeStyle: ReturnType<typeof getRepRangeStyle>;
}) {
  return (
    <RepRangeStyleStep
      onRepRangeStyleChange={onRepRangeStyleChange}
      savedRepRangeStyleId={savedRepRangeStyleId}
      selectedRepRangeStyle={selectedRepRangeStyle}
    />
  );
}

export function OnePageVolumeStep({
  blueprint,
  onOptionalVolumeTargetToggle,
  onVolumePresetChange,
  repRangeStyle,
}: {
  blueprint: PlanBlueprint;
  onOptionalVolumeTargetToggle: (
    muscleGroup: OptionalVolumeMuscleGroupId,
    isEnabled: boolean,
  ) => void;
  onVolumePresetChange: (volumePreset: VolumePresetId) => void;
  repRangeStyle: ReturnType<typeof getRepRangeStyle>;
}) {
  return (
    <WeeklyVolumeTargetsStep
      onOptionalVolumeTargetToggle={onOptionalVolumeTargetToggle}
      onVolumePresetChange={onVolumePresetChange}
      repRangeStyle={repRangeStyle}
      selectedVolumePresetId={blueprint.volumePreset}
      volumePresetSource={blueprint.volumePresetSource}
      weeklyRepTargets={blueprint.weeklyRepTargets}
    />
  );
}

export function OnePageExercisesStep({
  blueprint,
  onBackToVolume,
  onContinueToGenerate,
  onIsolationExercisePreferencesChange,
  onMainCompoundPreferencesChange,
}: {
  blueprint: PlanBlueprint;
  onBackToVolume: () => void;
  onContinueToGenerate: () => Promise<void>;
  onIsolationExercisePreferencesChange: (
    preferences: IsolationExercisePreferencesChange,
  ) => Promise<unknown>;
  onMainCompoundPreferencesChange: (preferences: MainCompoundPreferencesChange) => Promise<unknown>;
}) {
  return (
    <PlanBuilderMainCompoundPreferencesStep
      blueprint={blueprint}
      onBackToVolume={onBackToVolume}
      onContinueToGenerate={onContinueToGenerate}
      onIsolationExercisePreferencesChange={onIsolationExercisePreferencesChange}
      onMainCompoundPreferencesChange={onMainCompoundPreferencesChange}
    />
  );
}
