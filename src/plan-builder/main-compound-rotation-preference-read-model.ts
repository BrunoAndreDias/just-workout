import {
  type CompoundCapableMovementPatternId,
  compoundCapableMovementPatterns,
  getExerciseCatalogExercise,
} from "./exercise-catalog";
import {
  getMainCompoundMovementPatternHelperText,
  getMainCompoundOptionList,
} from "./main-compound-option-presentation";
import type {
  MainCompoundPreferenceReadModel,
  MainCompoundPreferenceRowReadModel,
} from "./main-compound-preference-read-model";
import {
  getMainCompoundRotationPreferenceExerciseIds,
  normalizeMainCompoundRotationPreferences,
} from "./main-compound-rotation-preferences";
import type { PlanBlueprint } from "./plan-blueprint";
import { formatMovementPatternLabel } from "./weekly-movement-coverage";

export type MainCompoundRotationPreferenceReadModel = MainCompoundPreferenceReadModel;
export type MainCompoundRotationPreferenceRowReadModel = MainCompoundPreferenceRowReadModel;

export function getMainCompoundRotationPreferenceReadModel({
  blueprint,
}: {
  blueprint: Pick<PlanBlueprint, "mainCompoundRotationPreferences">;
}): MainCompoundRotationPreferenceReadModel {
  const normalizedPreferences = normalizeMainCompoundRotationPreferences(
    blueprint.mainCompoundRotationPreferences,
  );
  const rows = compoundCapableMovementPatterns.map((movementPattern) => {
    const preferenceExerciseIds = getMainCompoundRotationPreferenceExerciseIds({
      movementPattern,
      preferences: normalizedPreferences,
    });
    const preferences = preferenceExerciseIds.flatMap((exerciseId) => {
      const exercise = getExerciseCatalogExercise(exerciseId);

      return exercise
        ? [
            {
              exerciseId,
              exerciseName: exercise.name,
            },
          ]
        : [];
    });
    return {
      helperText: getMainCompoundMovementPatternHelperText(movementPattern),
      mainCompoundOptions: getMainCompoundRotationOptions({
        movementPattern,
        preferenceExerciseIds,
      }),
      metadata:
        preferences.length === 0
          ? "Empty bucket"
          : `${preferences.length} ranked ${preferences.length === 1 ? "rotation preference" : "rotation preferences"}`,
      movementPattern,
      movementPatternLabel: formatMovementPatternLabel(movementPattern),
      preferences,
    } satisfies MainCompoundRotationPreferenceRowReadModel;
  });
  const rankedBucketCount = rows.filter((row) => row.preferences.length > 0).length;

  return {
    guidance:
      rankedBucketCount === 0
        ? "Rank future rotation alternatives you want available later. Empty buckets stay valid."
        : "Ranked rotation preferences guide future Main Compound Rotation Pools before Recommended Defaults fill empty buckets.",
    rankedBucketCount,
    rows,
    summary: `${rankedBucketCount} of ${rows.length} rotation buckets ranked`,
  };
}

function getMainCompoundRotationOptions({
  movementPattern,
  preferenceExerciseIds,
}: {
  movementPattern: CompoundCapableMovementPatternId;
  preferenceExerciseIds: ReadonlyArray<string>;
}) {
  return getMainCompoundOptionList({
    getMetadata: (exercise) => {
      const preferenceIndex = preferenceExerciseIds.indexOf(exercise.id);

      return preferenceIndex === -1
        ? "Available rotation compound"
        : `Rotation preference #${preferenceIndex + 1}`;
    },
    movementPattern,
  });
}
