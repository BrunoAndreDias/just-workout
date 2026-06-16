import type { getRepRangeStyle } from "./plan-blueprint";
import { hasValidTrainingFrequency, type PlanBlueprint } from "./plan-blueprint";
import {
  exerciseFoundationSetupCopy,
  getExerciseFoundationSetupGuidance,
  type MainCompoundRotationPoolChange,
  type MainCompoundSelectionChange,
  PlanBuilderExerciseFoundationStep,
} from "./plan-builder-exercise-foundation";
import { RepRangeStyleStep } from "./steps/rep-range-style-step";
import { TrainingFrequencyStep } from "./steps/training-frequency-step";
import { WeeklyVolumeTargetsStep } from "./steps/weekly-volume-targets-step";
import type { TrainingSplitId } from "./training-split";
import type {
  OptionalVolumeMuscleGroupId,
  TrainingVolumeConfiguration,
  VolumePresetId,
} from "./training-volume";

export function OnePageTrainingScheduleStep({
  blueprint,
  getVisibleTrainingSplitId,
  onContinueToTrainingStyle,
  onTrainingFrequencyChange,
  onTrainingSplitChange,
}: {
  blueprint: PlanBlueprint;
  getVisibleTrainingSplitId: (blueprint: PlanBlueprint) => TrainingSplitId;
  onContinueToTrainingStyle: () => Promise<void>;
  onTrainingFrequencyChange: (
    trainingFrequencyDaysPerWeek: PlanBlueprint["trainingFrequencyDaysPerWeek"],
  ) => void;
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

export function ExerciseFoundationSetupState({
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
