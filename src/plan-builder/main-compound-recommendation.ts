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
import {
  getMainCompoundPreferenceExerciseIds,
  normalizeMainCompoundPreferences,
} from "./main-compound-preferences";
import type { TrainingFrequencyDaysPerWeek } from "./plan-blueprint-types";
import type { TrainingSplitId } from "./training-split";
import {
  getWeeklyMovementCoverage,
  type MainCompoundSelection,
  normalizeMainCompoundSelections,
} from "./weekly-movement-coverage";

type RecommendMainCompoundSelectionOptions = {
  exerciseSelectionPreferences: unknown;
  mainCompoundPreferences?: unknown;
  movementPattern: CompoundCapableMovementPatternId;
};

type RecommendMissingMainCompoundSelectionsOptions = {
  exerciseSelectionPreferences: unknown;
  mainCompoundPreferences?: unknown;
  mainCompoundSelections: ReadonlyArray<MainCompoundSelection>;
  split: TrainingSplitId;
  trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek;
};

export function recommendMainCompoundSelection({
  exerciseSelectionPreferences,
  mainCompoundPreferences,
  movementPattern,
}: RecommendMainCompoundSelectionOptions): MainCompoundSelection | null {
  const exerciseId = getRecommendedMainCompoundExerciseId({
    exerciseSelectionPreferences,
    mainCompoundPreferences,
    movementPattern,
  });

  return exerciseId === null ? null : { exerciseId, movementPattern };
}

export function recommendMissingMainCompoundSelections({
  exerciseSelectionPreferences,
  mainCompoundPreferences,
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
      mainCompoundPreferences,
      movementPattern,
    });

    return selection === null ? [] : [selection];
  });
}

function getRecommendedMainCompoundExerciseId({
  exerciseSelectionPreferences,
  mainCompoundPreferences,
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
  const rankedMainCompoundPreferenceExerciseIds = getMainCompoundPreferenceExerciseIds({
    movementPattern,
    preferences: normalizeMainCompoundPreferences(mainCompoundPreferences),
  });
  const preferredExerciseIds = getPreferredExerciseIds(preferences.preferredExercises);
  const prioritizedExerciseId =
    findFirstSelectableExerciseId({
      availableExerciseIds,
      avoidedExerciseIds,
      exerciseIds: rankedMainCompoundPreferenceExerciseIds,
    }) ??
    findFirstSelectableExerciseId({
      availableExerciseIds,
      avoidedExerciseIds,
      exerciseIds: preferredExerciseIds,
    });

  if (prioritizedExerciseId !== null) {
    return prioritizedExerciseId;
  }

  const recommendedExerciseId =
    recommendedMainCompoundExerciseIdsByMovementPattern[movementPattern];

  if (
    isSelectableExerciseId({
      availableExerciseIds,
      avoidedExerciseIds,
      exerciseId: recommendedExerciseId,
    })
  ) {
    return recommendedExerciseId;
  }

  return availableExercises.find((exercise) => !avoidedExerciseIds.has(exercise.id))?.id ?? null;
}

function getPreferredExerciseIds(
  preferences: ReadonlyArray<ExerciseSelectionPreferenceItem>,
): ReadonlyArray<string> {
  return preferences
    .map(getExerciseSelectionPreferenceExerciseId)
    .filter((exerciseId): exerciseId is string => exerciseId !== null);
}

function findFirstSelectableExerciseId({
  availableExerciseIds,
  avoidedExerciseIds,
  exerciseIds,
}: {
  availableExerciseIds: ReadonlySet<string>;
  avoidedExerciseIds: ReadonlySet<string>;
  exerciseIds: ReadonlyArray<string>;
}): string | null {
  return (
    exerciseIds.find((exerciseId) =>
      isSelectableExerciseId({
        availableExerciseIds,
        avoidedExerciseIds,
        exerciseId,
      }),
    ) ?? null
  );
}

function isSelectableExerciseId({
  availableExerciseIds,
  avoidedExerciseIds,
  exerciseId,
}: {
  availableExerciseIds: ReadonlySet<string>;
  avoidedExerciseIds: ReadonlySet<string>;
  exerciseId: string;
}): boolean {
  return availableExerciseIds.has(exerciseId) && !avoidedExerciseIds.has(exerciseId);
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
