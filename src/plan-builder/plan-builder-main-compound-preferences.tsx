import type {
  CompoundCapableMovementPatternId,
  ExerciseCatalogMuscleGroupId,
} from "./exercise-catalog";
import { getIsolationExercisePreferenceReadModel } from "./isolation-exercise-preference-read-model";
import { getMainCompoundPreferenceReadModel } from "./main-compound-preference-read-model";
import { getMainCompoundRotationPreferenceReadModel } from "./main-compound-rotation-preference-read-model";
import type { PlanBlueprint } from "./plan-blueprint";
import { MainCompoundPreferencesStep } from "./steps/exercise-foundation/main-compound-preferences-step";

export type MainCompoundPreferencesChange = {
  exerciseIds: ReadonlyArray<string>;
  movementPattern: CompoundCapableMovementPatternId;
};

export type MainCompoundRotationPreferencesChange = {
  exerciseIds: ReadonlyArray<string>;
  movementPattern: CompoundCapableMovementPatternId;
};

export type IsolationExercisePreferencesChange = {
  exerciseIds: ReadonlyArray<string>;
  primaryMuscleGroup: ExerciseCatalogMuscleGroupId;
};

export function PlanBuilderMainCompoundPreferencesStep({
  blueprint,
  onIsolationExercisePreferencesChange,
  onMainCompoundPreferencesChange,
  onMainCompoundRotationPreferencesChange,
}: {
  blueprint: PlanBlueprint;
  onIsolationExercisePreferencesChange: (
    preferences: IsolationExercisePreferencesChange,
  ) => Promise<unknown>;
  onMainCompoundPreferencesChange: (preferences: MainCompoundPreferencesChange) => Promise<unknown>;
  onMainCompoundRotationPreferencesChange: (
    preferences: MainCompoundRotationPreferencesChange,
  ) => Promise<unknown>;
}) {
  const mainCompoundReadModel = getMainCompoundPreferenceReadModel({
    blueprint,
  });
  const isolationReadModel = getIsolationExercisePreferenceReadModel({
    blueprint,
  });
  const mainCompoundRotationReadModel = getMainCompoundRotationPreferenceReadModel({
    blueprint,
  });

  return (
    <MainCompoundPreferencesStep
      isolationReadModel={isolationReadModel}
      mainCompoundReadModel={mainCompoundReadModel}
      mainCompoundRotationReadModel={mainCompoundRotationReadModel}
      onIsolationExercisePreferencesChange={async (preferences) => {
        await onIsolationExercisePreferencesChange(preferences);
      }}
      onMainCompoundPreferencesChange={async (preferences) => {
        await onMainCompoundPreferencesChange(preferences);
      }}
      onMainCompoundRotationPreferencesChange={async (preferences) => {
        await onMainCompoundRotationPreferencesChange(preferences);
      }}
    />
  );
}
