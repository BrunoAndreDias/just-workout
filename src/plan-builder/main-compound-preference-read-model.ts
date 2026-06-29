import {
  type CompoundCapableMovementPatternId,
  compoundCapableMovementPatterns,
  getExerciseCatalogExercise,
} from "./exercise-catalog";
import type { ExerciseFoundationCompoundOption } from "./exercise-foundation-read-model";
import {
  getMainCompoundMovementPatternHelperText,
  getMainCompoundOptionList,
} from "./main-compound-option-presentation";
import {
  getMainCompoundPreferenceExerciseIds,
  normalizeMainCompoundPreferences,
} from "./main-compound-preferences";
import type { PlanBlueprint } from "./plan-blueprint";
import { formatMovementPatternLabel } from "./weekly-movement-coverage";

export type MainCompoundPreferenceRowReadModel = {
  helperText: string;
  mainCompoundOptions: ReadonlyArray<ExerciseFoundationCompoundOption>;
  metadata: string;
  movementPattern: CompoundCapableMovementPatternId;
  movementPatternLabel: string;
  preferences: ReadonlyArray<{ exerciseId: string; exerciseName: string }>;
  topPreference: { exerciseId: string; exerciseName: string } | null;
};

export type MainCompoundPreferenceReadModel = {
  guidance: string;
  rankedBucketCount: number;
  rows: ReadonlyArray<MainCompoundPreferenceRowReadModel>;
  summary: string;
};

export function getMainCompoundPreferenceReadModel({
  blueprint,
}: {
  blueprint: Pick<PlanBlueprint, "mainCompoundPreferences">;
}): MainCompoundPreferenceReadModel {
  const normalizedPreferences = normalizeMainCompoundPreferences(blueprint.mainCompoundPreferences);
  const rows = compoundCapableMovementPatterns.map((movementPattern) => {
    const preferenceExerciseIds = getMainCompoundPreferenceExerciseIds({
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
    const [topPreference] = preferences;

    return {
      helperText: getMainCompoundMovementPatternHelperText(movementPattern),
      mainCompoundOptions: getMainCompoundOptions({
        movementPattern,
        preferenceExerciseIds,
      }),
      metadata:
        preferences.length === 0
          ? "Empty bucket"
          : `${preferences.length} ranked ${preferences.length === 1 ? "preference" : "preferences"}`,
      movementPattern,
      movementPatternLabel: formatMovementPatternLabel(movementPattern),
      preferences,
      topPreference: topPreference ?? null,
    } satisfies MainCompoundPreferenceRowReadModel;
  });
  const rankedBucketCount = rows.filter((row) => row.preferences.length > 0).length;

  return {
    guidance:
      rankedBucketCount === 0
        ? "Rank any main compounds you want Just Workout to prioritize. Empty buckets stay valid."
        : "Ranked preferences guide generation before Recommended Defaults fill any gaps.",
    rankedBucketCount,
    rows,
    summary: `${rankedBucketCount} of ${rows.length} movement pattern buckets ranked`,
  };
}

function getMainCompoundOptions({
  movementPattern,
  preferenceExerciseIds,
}: {
  movementPattern: CompoundCapableMovementPatternId;
  preferenceExerciseIds: ReadonlyArray<string>;
}): ReadonlyArray<ExerciseFoundationCompoundOption> {
  return getMainCompoundOptionList({
    getMetadata: (exercise) => {
      const preferenceIndex = preferenceExerciseIds.indexOf(exercise.id);

      return preferenceIndex === -1
        ? "Available main compound"
        : `Preference #${preferenceIndex + 1}`;
    },
    movementPattern,
  });
}
