import {
  type ExerciseCatalogMuscleGroupId,
  exerciseCatalogExercises,
  exerciseCatalogMuscleGroups,
  getConcreteExerciseCatalogExerciseId,
  getExerciseCatalogExercise,
} from "./exercise-catalog";
import {
  isExerciseIdBucketCandidate,
  normalizeRankedPreferenceExerciseIds,
} from "./ranked-exercise-preferences";

export type IsolationExercisePreferenceBucket = {
  exerciseIds: ReadonlyArray<string>;
  primaryMuscleGroup: ExerciseCatalogMuscleGroupId;
  updatedAt?: string;
};

type UpdateIsolationExercisePreferenceBucketOptions = {
  exerciseIds: ReadonlyArray<string>;
  preferences: ReadonlyArray<IsolationExercisePreferenceBucket>;
  primaryMuscleGroup: ExerciseCatalogMuscleGroupId;
  updatedAt: string;
};

export const isolationPreferencePrimaryMuscleGroups = exerciseCatalogMuscleGroups
  .filter(({ id }) =>
    exerciseCatalogExercises.some(
      (exercise) =>
        exercise.role === "isolation" &&
        exercise.primaryMuscleGroups.some((muscleGroup) => muscleGroup === id),
    ),
  )
  .map(({ id }) => id) satisfies ReadonlyArray<ExerciseCatalogMuscleGroupId>;

const isolationPreferencePrimaryMuscleGroupSet: ReadonlySet<ExerciseCatalogMuscleGroupId> = new Set(
  isolationPreferencePrimaryMuscleGroups,
);

export function normalizeIsolationExercisePreferences(
  preferences: unknown,
): ReadonlyArray<IsolationExercisePreferenceBucket> {
  if (!Array.isArray(preferences)) {
    return [];
  }

  const canonicalPreferences = new Map<
    ExerciseCatalogMuscleGroupId,
    IsolationExercisePreferenceBucket
  >();

  for (const preference of preferences) {
    if (!isIsolationExercisePreferenceBucketCandidate(preference)) {
      continue;
    }

    const exerciseIds = normalizeBucketExerciseIds(preference);

    if (exerciseIds.length === 0) {
      continue;
    }

    canonicalPreferences.set(preference.primaryMuscleGroup, {
      exerciseIds,
      primaryMuscleGroup: preference.primaryMuscleGroup,
      ...(typeof preference.updatedAt === "string" ? { updatedAt: preference.updatedAt } : {}),
    });
  }

  return isolationPreferencePrimaryMuscleGroups.flatMap((primaryMuscleGroup) => {
    const preference = canonicalPreferences.get(primaryMuscleGroup);

    return preference ? [preference] : [];
  });
}

export function getIsolationExercisePreferenceExerciseIds({
  preferences,
  primaryMuscleGroup,
}: {
  preferences: ReadonlyArray<IsolationExercisePreferenceBucket>;
  primaryMuscleGroup: ExerciseCatalogMuscleGroupId;
}): ReadonlyArray<string> {
  return (
    preferences.find((preference) => preference.primaryMuscleGroup === primaryMuscleGroup)
      ?.exerciseIds ?? []
  );
}

export function updateIsolationExercisePreferenceBucket({
  exerciseIds,
  preferences,
  primaryMuscleGroup,
  updatedAt,
}: UpdateIsolationExercisePreferenceBucketOptions): ReadonlyArray<IsolationExercisePreferenceBucket> {
  const normalizedPreferences = normalizeIsolationExercisePreferences(preferences);
  const normalizedExerciseIds = normalizeBucketExerciseIds({
    exerciseIds,
    primaryMuscleGroup,
  });
  const nextPreferences = normalizedPreferences.filter(
    (preference) => preference.primaryMuscleGroup !== primaryMuscleGroup,
  );

  if (normalizedExerciseIds.length === 0) {
    return nextPreferences;
  }

  return normalizeIsolationExercisePreferences([
    ...nextPreferences,
    {
      exerciseIds: normalizedExerciseIds,
      primaryMuscleGroup,
      updatedAt,
    },
  ]);
}

function normalizeBucketExerciseIds({
  exerciseIds,
  primaryMuscleGroup,
}: Pick<IsolationExercisePreferenceBucket, "exerciseIds" | "primaryMuscleGroup">): Array<string> {
  return normalizeRankedPreferenceExerciseIds({
    exerciseIds,
    normalizeExerciseId: (exerciseId) => {
      const canonicalExerciseId = getConcreteExerciseCatalogExerciseId(exerciseId);
      const exercise = getExerciseCatalogExercise(canonicalExerciseId);

      if (
        !exercise ||
        exercise.role !== "isolation" ||
        !exercise.primaryMuscleGroups.includes(primaryMuscleGroup)
      ) {
        return null;
      }

      return canonicalExerciseId;
    },
  });
}

function isIsolationExercisePreferenceBucketCandidate(
  value: unknown,
): value is IsolationExercisePreferenceBucket {
  if (!isExerciseIdBucketCandidate(value)) {
    return false;
  }

  const candidate = value as Partial<IsolationExercisePreferenceBucket>;

  return (
    Array.isArray(candidate.exerciseIds) &&
    isIsolationPreferencePrimaryMuscleGroup(candidate.primaryMuscleGroup)
  );
}

function isIsolationPreferencePrimaryMuscleGroup(
  value: unknown,
): value is ExerciseCatalogMuscleGroupId {
  if (typeof value !== "string") {
    return false;
  }

  return isolationPreferencePrimaryMuscleGroupSet.has(value as ExerciseCatalogMuscleGroupId);
}
