import type { MainCompoundRotationPool } from "./main-compound-rotation-pool";
import type { PlanBlueprint } from "./plan-blueprint";
import { ExerciseFoundationStep } from "./steps/exercise-foundation-step";
import type { TrainingSplitId } from "./training-split";
import type { TrainingVolumeConfiguration } from "./training-volume";
import type { MainCompoundSelection } from "./weekly-movement-coverage";

export const exerciseFoundationSetupCopy = {
  description: "Choose a compatible split and weekly volume before selecting exercises.",
  heading: "Exercises needs setup",
} as const;

export type ExerciseFoundationReadyBlueprint = PlanBlueprint & { split: TrainingSplitId };

export type MainCompoundSelectionChange = {
  exerciseId: string;
  movementPattern: MainCompoundSelection["movementPattern"];
};

export type MainCompoundRotationPoolChange = {
  exerciseIds: ReadonlyArray<string>;
  movementPattern: MainCompoundRotationPool["movementPattern"];
};

export function PlanBuilderExerciseFoundationStep({
  blueprint,
  onContinueToGenerate,
  onMainCompoundSelectionChange,
  onRotationPoolChange,
  weeklyRepTargets,
}: {
  blueprint: ExerciseFoundationReadyBlueprint;
  onContinueToGenerate: () => Promise<void>;
  onMainCompoundSelectionChange: (selection: MainCompoundSelectionChange) => Promise<unknown>;
  onRotationPoolChange: (rotationPool: MainCompoundRotationPoolChange) => Promise<unknown>;
  weeklyRepTargets: TrainingVolumeConfiguration["weeklyRepTargets"];
}) {
  return (
    <ExerciseFoundationStep
      mainCompoundSelections={blueprint.mainCompoundSelections}
      mainCompoundRotationPools={blueprint.mainCompoundRotationPools}
      onContinueToGenerate={onContinueToGenerate}
      onMainCompoundSelectionChange={async (selection) => {
        await onMainCompoundSelectionChange(selection);
      }}
      onRotationPoolChange={async (rotationPool) => {
        await onRotationPoolChange(rotationPool);
      }}
      split={blueprint.split}
      trainingFrequencyDaysPerWeek={blueprint.trainingFrequencyDaysPerWeek}
      weeklyRepTargets={weeklyRepTargets}
    />
  );
}

export function getExerciseFoundationSetupGuidance({
  requiresTrainingSchedule,
  requiresVolume,
}: {
  requiresTrainingSchedule: boolean;
  requiresVolume: boolean;
}): ReadonlyArray<string> {
  return [
    requiresTrainingSchedule ? "Choose a compatible split in Training schedule." : null,
    requiresVolume ? "Set weekly volume in Volume." : null,
  ].filter((item): item is string => item !== null);
}
