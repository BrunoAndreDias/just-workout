import type { CompoundCapableMovementPatternId } from "./exercise-catalog";
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

export function PlanBuilderMainCompoundPreferencesStep({
  blueprint,
  onBackToVolume,
  onContinueToGenerate,
  onMainCompoundPreferencesChange,
  onMainCompoundRotationPreferencesChange,
}: {
  blueprint: PlanBlueprint;
  onBackToVolume: () => void;
  onContinueToGenerate: () => Promise<void>;
  onMainCompoundPreferencesChange: (preferences: MainCompoundPreferencesChange) => Promise<unknown>;
  onMainCompoundRotationPreferencesChange: (
    preferences: MainCompoundRotationPreferencesChange,
  ) => Promise<unknown>;
}) {
  const mainCompoundReadModel = getMainCompoundPreferenceReadModel({
    blueprint,
  });
  const mainCompoundRotationReadModel = getMainCompoundRotationPreferenceReadModel({
    blueprint,
  });

  return (
    <MainCompoundPreferencesStep
      mainCompoundReadModel={mainCompoundReadModel}
      mainCompoundRotationReadModel={mainCompoundRotationReadModel}
      onBackToVolume={onBackToVolume}
      onContinueToGenerate={onContinueToGenerate}
      onMainCompoundPreferencesChange={async (preferences) => {
        await onMainCompoundPreferencesChange(preferences);
      }}
      onMainCompoundRotationPreferencesChange={async (preferences) => {
        await onMainCompoundRotationPreferencesChange(preferences);
      }}
    />
  );
}
