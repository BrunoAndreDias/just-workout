import { getExerciseCatalogExercise } from "./exercise-catalog";

export type RankedExercisePreferenceItem = {
  exerciseId: string;
  exerciseName: string;
};

export function getRankedExercisePreferenceDetails(preferenceExerciseIds: ReadonlyArray<string>): {
  metadata: string;
  preferences: ReadonlyArray<RankedExercisePreferenceItem>;
} {
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
    metadata: getRankedPreferenceMetadata(preferences.length),
    preferences,
  };
}

function getRankedPreferenceMetadata(preferenceCount: number): string {
  return preferenceCount === 0
    ? "Empty bucket"
    : `${preferenceCount} ranked ${preferenceCount === 1 ? "preference" : "preferences"}`;
}

export function normalizeRankedPreferenceExerciseIds({
  exerciseIds,
  normalizeExerciseId,
}: {
  exerciseIds: unknown;
  normalizeExerciseId: (exerciseId: string) => string | null;
}): Array<string> {
  if (!Array.isArray(exerciseIds)) {
    return [];
  }

  const canonicalExerciseIds = new Set<string>();

  for (const exerciseId of exerciseIds) {
    if (typeof exerciseId !== "string") {
      continue;
    }

    const canonicalExerciseId = normalizeExerciseId(exerciseId);

    if (!canonicalExerciseId) {
      continue;
    }

    canonicalExerciseIds.add(canonicalExerciseId);
  }

  return [...canonicalExerciseIds];
}

export function isExerciseIdBucketCandidate(value: unknown): value is {
  exerciseIds: ReadonlyArray<unknown>;
  updatedAt?: unknown;
} {
  if (!value || typeof value !== "object") {
    return false;
  }

  return Array.isArray((value as { exerciseIds?: unknown }).exerciseIds);
}
