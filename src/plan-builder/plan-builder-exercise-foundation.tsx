import {
  type ExerciseFoundationReadyBlueprint,
  getExerciseFoundationReadModel,
} from "./exercise-foundation-read-model";
import type { MainCompoundRotationPool } from "./main-compound-rotation-pool";
import { ExerciseFoundationStep } from "./steps/exercise-foundation-step";
import type { TrainingVolumeConfiguration } from "./training-volume";
import type { MainCompoundSelection } from "./weekly-movement-coverage";

export const exerciseFoundationSetupCopy = {
  description: "Choose a compatible split and weekly volume before selecting exercises.",
  heading: "Exercises needs setup",
} as const;

export type { ExerciseFoundationReadyBlueprint } from "./exercise-foundation-read-model";

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
  onBackToVolume,
  onContinueToGenerate,
  onMainCompoundSelectionChange,
  onRotationPoolChange,
  weeklyRepTargets,
}: {
  blueprint: ExerciseFoundationReadyBlueprint;
  onBackToVolume: () => void;
  onContinueToGenerate: () => Promise<void>;
  onMainCompoundSelectionChange: (selection: MainCompoundSelectionChange) => Promise<unknown>;
  onRotationPoolChange: (rotationPool: MainCompoundRotationPoolChange) => Promise<unknown>;
  weeklyRepTargets: TrainingVolumeConfiguration["weeklyRepTargets"];
}) {
  const readModel = getExerciseFoundationReadModel({
    blueprint,
    weeklyRepTargets,
  });

  return (
    <ExerciseFoundationStep
      onBackToVolume={onBackToVolume}
      onContinueToGenerate={onContinueToGenerate}
      onMainCompoundSelectionChange={async (selection) => {
        await onMainCompoundSelectionChange(selection);
      }}
      onRotationPoolChange={async (rotationPool) => {
        await onRotationPoolChange(rotationPool);
      }}
      readModel={readModel}
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
