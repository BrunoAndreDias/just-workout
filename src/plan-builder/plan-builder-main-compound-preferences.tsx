import { getMainCompoundPreferenceReadModel } from "./main-compound-preference-read-model";
import type { PlanBlueprint } from "./plan-blueprint";
import { MainCompoundPreferencesStep } from "./steps/exercise-foundation/main-compound-preferences-step";

export type MainCompoundPreferencesChange = {
  exerciseIds: ReadonlyArray<string>;
  movementPattern: NonNullable<PlanBlueprint["mainCompoundPreferences"][number]>["movementPattern"];
};

export function PlanBuilderMainCompoundPreferencesStep({
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
  const readModel = getMainCompoundPreferenceReadModel({
    blueprint,
  });

  return (
    <MainCompoundPreferencesStep
      onBackToVolume={onBackToVolume}
      onContinueToGenerate={onContinueToGenerate}
      onMainCompoundPreferencesChange={async (preferences) => {
        await onMainCompoundPreferencesChange(preferences);
      }}
      readModel={readModel}
    />
  );
}
