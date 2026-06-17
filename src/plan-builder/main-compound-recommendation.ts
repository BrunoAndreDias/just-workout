import {
  type CompoundCapableMovementPatternId,
  exerciseCatalogExercises,
  getConcreteExerciseCatalogExerciseId,
  getExerciseCatalogExercisesByMovementPattern,
  isMainCompoundEligible,
} from "./exercise-catalog";
import {
  type ExerciseSelectionPreferenceItem,
  normalizeExerciseSelectionPreferences,
} from "./exercise-selection-preferences";
import type { TrainingFrequencyDaysPerWeek } from "./plan-blueprint-types";
import type { TrainingSplitId } from "./training-split";
import {
  getWeeklyMovementCoverage,
  type MainCompoundSelection,
  normalizeMainCompoundSelections,
} from "./weekly-movement-coverage";

type RecommendMainCompoundSelectionOptions = {
  exerciseSelectionPreferences: unknown;
  movementPattern: CompoundCapableMovementPatternId;
};

type RecommendMissingMainCompoundSelectionsOptions = {
  exerciseSelectionPreferences: unknown;
  mainCompoundSelections: ReadonlyArray<MainCompoundSelection>;
  split: TrainingSplitId;
  trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek;
};

export function recommendMainCompoundSelection({
  exerciseSelectionPreferences,
  movementPattern,
}: RecommendMainCompoundSelectionOptions): MainCompoundSelection | null {
  const exerciseId = getRecommendedMainCompoundExerciseId({
    exerciseSelectionPreferences,
    movementPattern,
  });

  return exerciseId === null ? null : { exerciseId, movementPattern };
}

export function recommendMissingMainCompoundSelections({
  exerciseSelectionPreferences,
  mainCompoundSelections,
  split,
  trainingFrequencyDaysPerWeek,
}: RecommendMissingMainCompoundSelectionsOptions): ReadonlyArray<MainCompoundSelection> {
  const existingSelections = normalizeMainCompoundSelections(mainCompoundSelections);
  const selectedPatterns = new Set(
    existingSelections.map((selection) => selection.movementPattern),
  );
  const targetPatterns = getWeeklyMovementCoverage({
    mainCompoundSelections: existingSelections,
    split,
    trainingFrequencyDaysPerWeek,
  }).rows.map((row) => row.movementPattern);

  return targetPatterns.flatMap((movementPattern) => {
    if (selectedPatterns.has(movementPattern)) {
      return [];
    }

    const selection = recommendMainCompoundSelection({
      exerciseSelectionPreferences,
      movementPattern,
    });

    return selection === null ? [] : [selection];
  });
}

function getRecommendedMainCompoundExerciseId({
  exerciseSelectionPreferences,
  movementPattern,
}: RecommendMainCompoundSelectionOptions): string | null {
  const availableExercises =
    getExerciseCatalogExercisesByMovementPattern(movementPattern).filter(isMainCompoundEligible);
  const availableExerciseIds = new Set(availableExercises.map((exercise) => exercise.id));
  const preferences = normalizeExerciseSelectionPreferences(exerciseSelectionPreferences);
  const avoidedExerciseIds = new Set(
    preferences.avoidedExercises
      .map(getExerciseSelectionPreferenceExerciseId)
      .filter((exerciseId): exerciseId is string => exerciseId !== null),
  );
  const preferredExerciseIds = preferences.preferredExercises
    .map(getExerciseSelectionPreferenceExerciseId)
    .filter((exerciseId): exerciseId is string => exerciseId !== null);

  for (const preferredExerciseId of preferredExerciseIds) {
    if (
      availableExerciseIds.has(preferredExerciseId) &&
      !avoidedExerciseIds.has(preferredExerciseId)
    ) {
      return preferredExerciseId;
    }
  }

  const recommendedExerciseId =
    recommendedMainCompoundExerciseIdsByMovementPattern[movementPattern];

  if (
    availableExerciseIds.has(recommendedExerciseId) &&
    !avoidedExerciseIds.has(recommendedExerciseId)
  ) {
    return recommendedExerciseId;
  }

  return availableExercises.find((exercise) => !avoidedExerciseIds.has(exercise.id))?.id ?? null;
}

function getExerciseSelectionPreferenceExerciseId(
  preference: ExerciseSelectionPreferenceItem,
): string | null {
  if (typeof preference.matchedExerciseId === "string") {
    return getConcreteExerciseCatalogExerciseId(preference.matchedExerciseId);
  }

  const normalizedRawText = normalizeExercisePreferenceText(preference.rawText);

  return exerciseIdByNormalizedName.get(normalizedRawText) ?? null;
}

const exerciseIdByNormalizedName = new Map(
  exerciseCatalogExercises.map(
    (exercise) => [normalizeExercisePreferenceText(exercise.name), exercise.id] as const,
  ),
);

const recommendedMainCompoundExerciseIdsByMovementPattern = {
  hip_hamstring_dominant: "barbell-romanian-deadlifts",
  horizontal_pull: "bent-over-barbell-rows",
  horizontal_push: "flat-barbell-bench-press",
  quad_dominant: "barbell-squats",
  vertical_pull: "pull-ups",
  vertical_push: "standing-overhead-barbell-press",
} as const satisfies Record<CompoundCapableMovementPatternId, string>;

function normalizeExercisePreferenceText(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}
