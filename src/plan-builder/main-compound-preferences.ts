import {
  type CompoundCapableMovementPatternId,
  compoundCapableMovementPatterns,
  getConcreteExerciseCatalogExerciseId,
  getExerciseCatalogExercise,
  isCompoundCapableMovementPattern,
  isMainCompoundEligible,
} from "./exercise-catalog";

export type MainCompoundPreferenceBucket = {
  exerciseIds: ReadonlyArray<string>;
  movementPattern: CompoundCapableMovementPatternId;
  updatedAt?: string;
};

type UpdateMainCompoundPreferenceBucketOptions = {
  exerciseIds: ReadonlyArray<string>;
  movementPattern: CompoundCapableMovementPatternId;
  preferences: ReadonlyArray<MainCompoundPreferenceBucket>;
  updatedAt: string;
};

export function normalizeMainCompoundPreferences(
  preferences: unknown,
): ReadonlyArray<MainCompoundPreferenceBucket> {
  if (!Array.isArray(preferences)) {
    return [];
  }

  const canonicalPreferences = new Map<
    CompoundCapableMovementPatternId,
    MainCompoundPreferenceBucket
  >();

  for (const preference of preferences) {
    if (!isMainCompoundPreferenceBucketCandidate(preference)) {
      continue;
    }

    const exerciseIds = normalizeBucketExerciseIds(preference);

    if (exerciseIds.length === 0) {
      continue;
    }

    canonicalPreferences.set(preference.movementPattern, {
      exerciseIds,
      movementPattern: preference.movementPattern,
      ...(typeof preference.updatedAt === "string" ? { updatedAt: preference.updatedAt } : {}),
    });
  }

  return compoundCapableMovementPatterns.flatMap((movementPattern) => {
    const preference = canonicalPreferences.get(movementPattern);

    return preference ? [preference] : [];
  });
}

export function getMainCompoundPreferenceExerciseIds({
  movementPattern,
  preferences,
}: {
  movementPattern: CompoundCapableMovementPatternId;
  preferences: ReadonlyArray<MainCompoundPreferenceBucket>;
}): ReadonlyArray<string> {
  return (
    preferences.find((preference) => preference.movementPattern === movementPattern)?.exerciseIds ??
    []
  );
}

export function updateMainCompoundPreferenceBucket({
  exerciseIds,
  movementPattern,
  preferences,
  updatedAt,
}: UpdateMainCompoundPreferenceBucketOptions): ReadonlyArray<MainCompoundPreferenceBucket> {
  const normalizedPreferences = normalizeMainCompoundPreferences(preferences);
  const normalizedExerciseIds = normalizeBucketExerciseIds({
    exerciseIds,
    movementPattern,
  });
  const nextPreferences = normalizedPreferences.filter(
    (preference) => preference.movementPattern !== movementPattern,
  );

  if (normalizedExerciseIds.length === 0) {
    return nextPreferences;
  }

  return normalizeMainCompoundPreferences([
    ...nextPreferences,
    {
      exerciseIds: normalizedExerciseIds,
      movementPattern,
      updatedAt,
    },
  ]);
}

function normalizeBucketExerciseIds({
  exerciseIds,
  movementPattern,
}: Pick<MainCompoundPreferenceBucket, "exerciseIds" | "movementPattern">): Array<string> {
  if (!Array.isArray(exerciseIds)) {
    return [];
  }

  const canonicalExerciseIds = new Set<string>();

  for (const exerciseId of exerciseIds) {
    if (typeof exerciseId !== "string") {
      continue;
    }

    const canonicalExerciseId = getConcreteExerciseCatalogExerciseId(exerciseId);
    const exercise = getExerciseCatalogExercise(canonicalExerciseId);

    if (
      !exercise ||
      !isMainCompoundEligible(exercise) ||
      exercise.movementPattern !== movementPattern
    ) {
      continue;
    }

    canonicalExerciseIds.add(canonicalExerciseId);
  }

  return [...canonicalExerciseIds];
}

function isMainCompoundPreferenceBucketCandidate(
  value: unknown,
): value is MainCompoundPreferenceBucket {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<MainCompoundPreferenceBucket>;

  return (
    Array.isArray(candidate.exerciseIds) &&
    isCompoundCapableMovementPattern(candidate.movementPattern)
  );
}
