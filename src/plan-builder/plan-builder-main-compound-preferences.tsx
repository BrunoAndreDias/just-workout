import type {
  CompoundCapableMovementPatternId,
  ExerciseCatalogMuscleGroupId,
} from "./exercise-catalog";
import { getIsolationExercisePreferenceReadModel } from "./isolation-exercise-preference-read-model";
import { getMainCompoundPreferenceReadModel } from "./main-compound-preference-read-model";
import type { PlanBlueprint } from "./plan-blueprint";
import { MainCompoundPreferencesStep } from "./steps/exercise-foundation/main-compound-preferences-step";

export type MainCompoundPreferencesChange = {
  exerciseIds: ReadonlyArray<string>;
  movementPattern: CompoundCapableMovementPatternId;
};

export type IsolationExercisePreferencesChange = {
  exerciseIds: ReadonlyArray<string>;
  primaryMuscleGroup: ExerciseCatalogMuscleGroupId;
};

export function PlanBuilderMainCompoundPreferencesStep({
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
  const mainCompoundReadModel = getMainCompoundPreferenceReadModel({
    blueprint,
  });
  const isolationReadModel = getIsolationExercisePreferenceReadModel({
    blueprint,
  });

  return (
    <MainCompoundPreferencesStep
      isolationReadModel={isolationReadModel}
      onBackToVolume={onBackToVolume}
      onContinueToGenerate={onContinueToGenerate}
      onIsolationExercisePreferencesChange={async (preferences) => {
        await onIsolationExercisePreferencesChange(preferences);
      }}
      onMainCompoundPreferencesChange={async (preferences) => {
        await onMainCompoundPreferencesChange(preferences);
      }}
      readModel={mainCompoundReadModel}
    />
  );
}
