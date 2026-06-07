import {
  type CompoundCapableMovementPatternId,
  compoundCapableMovementPatterns,
  getExerciseCatalogExercise,
  isMainCompoundEligible,
} from "./exercise-catalog";
import type { MainCompoundSelection } from "./weekly-movement-coverage";

export type MainCompoundRotationPool = {
  exerciseIds: ReadonlyArray<string>;
  movementPattern: CompoundCapableMovementPatternId;
  updatedAt?: string;
};

export type MainCompoundRotationPoolUpdate = {
  exerciseIds: ReadonlyArray<string>;
  movementPattern: CompoundCapableMovementPatternId;
  updatedAt?: string;
};

export function normalizeMainCompoundRotationPools({
  mainCompoundSelections,
  rotationPools,
}: {
  mainCompoundSelections: ReadonlyArray<MainCompoundSelection>;
  rotationPools: unknown;
}): ReadonlyArray<MainCompoundRotationPool> {
  if (!Array.isArray(rotationPools)) {
    return [];
  }

  const selectedMainExerciseIds = new Set(
    mainCompoundSelections.map((selection) => selection.exerciseId),
  );
  const startingExerciseByPattern = new Map(
    mainCompoundSelections.map((selection) => [
      selection.movementPattern,
      getExerciseCatalogExercise(selection.exerciseId),
    ]),
  );
  const canonicalPools = new Map<CompoundCapableMovementPatternId, MainCompoundRotationPool>();

  for (const pool of rotationPools) {
    if (!isMainCompoundRotationPoolCandidate(pool)) {
      continue;
    }

    const startingExercise = startingExerciseByPattern.get(pool.movementPattern);
    const startingPrimaryMuscleGroups =
      startingExercise === undefined ? undefined : new Set(startingExercise.primaryMuscleGroups);
    const exerciseIds = Array.from(new Set(pool.exerciseIds)).filter((exerciseId) => {
      const exercise = getExerciseCatalogExercise(exerciseId);

      if (
        !exercise ||
        !isMainCompoundEligible(exercise) ||
        exercise.movementPattern !== pool.movementPattern ||
        selectedMainExerciseIds.has(exercise.id)
      ) {
        return false;
      }

      if (startingPrimaryMuscleGroups === undefined) {
        return true;
      }

      return exercise.primaryMuscleGroups.some((muscleGroup) =>
        startingPrimaryMuscleGroups.has(muscleGroup),
      );
    });

    canonicalPools.set(pool.movementPattern, {
      exerciseIds,
      movementPattern: pool.movementPattern,
      ...(typeof pool.updatedAt === "string" ? { updatedAt: pool.updatedAt } : {}),
    });
  }

  return compoundCapableMovementPatterns.flatMap((movementPattern) => {
    const pool = canonicalPools.get(movementPattern);

    return pool ? [pool] : [];
  });
}

export function applyMainCompoundRotationPoolUpdate({
  mainCompoundSelections,
  rotationPools,
  update,
}: {
  mainCompoundSelections: ReadonlyArray<MainCompoundSelection>;
  rotationPools: ReadonlyArray<MainCompoundRotationPool>;
  update: MainCompoundRotationPoolUpdate;
}): ReadonlyArray<MainCompoundRotationPool> {
  return normalizeMainCompoundRotationPools({
    mainCompoundSelections,
    rotationPools: [
      ...rotationPools.filter((pool) => pool.movementPattern !== update.movementPattern),
      update,
    ],
  });
}

function isMainCompoundRotationPoolCandidate(value: unknown): value is MainCompoundRotationPool {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<MainCompoundRotationPool>;

  return (
    compoundCapableMovementPatterns.includes(
      candidate.movementPattern as CompoundCapableMovementPatternId,
    ) && Array.isArray(candidate.exerciseIds)
  );
}
