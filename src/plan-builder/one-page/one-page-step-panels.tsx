import type { getRepRangeStyle } from "../plan-blueprint";
import { hasValidTrainingFrequency, type PlanBlueprint } from "../plan-blueprint";
import {
  type MainCompoundPreferencesChange,
  PlanBuilderMainCompoundPreferencesStep,
} from "../plan-builder-main-compound-preferences";
import { RepRangeStyleStep } from "../steps/rep-range-style/rep-range-style-step";
import { TrainingFrequencyStep } from "../steps/training-frequency/training-frequency-step";
import { WeeklyVolumeTargetsStep } from "../steps/weekly-volume-targets/weekly-volume-targets-step";
import type { TrainingSplitId } from "../training-split";
import type {
  OptionalVolumeMuscleGroupId,
  TrainingVolumeConfiguration,
  VolumePresetId,
} from "../training-volume";

export function OnePageTrainingScheduleStep({
  blueprint,
  onContinueToTrainingStyle,
  onTrainingFrequencyChange,
  onTrainingSplitChange,
  selectedTrainingSplitId,
}: {
  blueprint: PlanBlueprint;
  onContinueToTrainingStyle: () => Promise<void>;
  onTrainingFrequencyChange: (
    trainingFrequencyDaysPerWeek: PlanBlueprint["trainingFrequencyDaysPerWeek"],
  ) => void;
  onTrainingSplitChange: (split: TrainingSplitId) => void;
  selectedTrainingSplitId: TrainingSplitId;
}) {
  return (
    <TrainingFrequencyStep
      canContinueToTrainingStyle={hasValidTrainingFrequency(blueprint)}
      onContinueToTrainingStyle={onContinueToTrainingStyle}
      onTrainingFrequencyChange={onTrainingFrequencyChange}
      onTrainingSplitChange={onTrainingSplitChange}
      selectedTrainingSplitId={selectedTrainingSplitId}
      selectedTrainingFrequencyDaysPerWeek={
        hasValidTrainingFrequency(blueprint) ? blueprint.trainingFrequencyDaysPerWeek : null
      }
    />
  );
}

export function OnePageRepRangeStep({
  onBackToTrainingSchedule,
  onContinueToVolume,
  onRepRangeStyleChange,
  savedRepRangeStyleId,
  selectedRepRangeStyle,
}: {
  onBackToTrainingSchedule: () => void;
  onContinueToVolume: () => Promise<void>;
  onRepRangeStyleChange: Parameters<typeof RepRangeStyleStep>[0]["onRepRangeStyleChange"];
  savedRepRangeStyleId: Parameters<typeof RepRangeStyleStep>[0]["savedRepRangeStyleId"];
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

export function OnePageVolumeStep({
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

export function OnePageExercisesStep({
  blueprint,
  onBackToVolume,
  onContinueToGenerate,
  onMainCompoundPreferencesChange,
}: {
  blueprint: PlanBlueprint;
  onBackToVolume: () => void;
  onContinueToGenerate: () => Promise<void>;
  onMainCompoundPreferencesChange: (preferences: MainCompoundPreferencesChange) => Promise<unknown>;
}) {
  return (
    <PlanBuilderMainCompoundPreferencesStep
      blueprint={blueprint}
      onBackToVolume={onBackToVolume}
      onContinueToGenerate={onContinueToGenerate}
      onMainCompoundPreferencesChange={onMainCompoundPreferencesChange}
    />
  );
}
