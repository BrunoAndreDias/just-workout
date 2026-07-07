import {
  type CompoundCapableMovementPatternId,
  compoundCapableMovementPatterns,
  getConcreteExerciseCatalogExerciseId,
  getExerciseCatalogExercise,
  getExerciseCatalogExercisesByMovementPattern,
  isMainCompoundEligible,
} from "./exercise-catalog";
import { getAvoidedExerciseIds } from "./exercise-selection-preferences";
import {
  getMainCompoundRotationPreferenceExerciseIds,
  normalizeMainCompoundRotationPreferences,
} from "./main-compound-rotation-preferences";
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
    const exerciseIds = getConcreteUniqueExerciseIds(pool.exerciseIds).filter((exerciseId) => {
      const exercise = getEligibleRotationExercise({
        excludedExerciseIds: selectedMainExerciseIds,
        exerciseId,
        movementPattern: pool.movementPattern,
      });

      if (!exercise) {
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

export function deriveMainCompoundRotationPools({
  exerciseSelectionPreferences,
  mainCompoundSelections,
  rotationPools,
  rotationPreferences,
}: {
  exerciseSelectionPreferences?: unknown;
  mainCompoundSelections: ReadonlyArray<MainCompoundSelection>;
  rotationPools: unknown;
  rotationPreferences: unknown;
}): ReadonlyArray<MainCompoundRotationPool> {
  const avoidedExerciseIds = getAvoidedExerciseIds(exerciseSelectionPreferences);
  const normalizedRotationPools = normalizeMainCompoundRotationPools({
    mainCompoundSelections,
    rotationPools,
  });
  const normalizedRotationPreferences =
    normalizeMainCompoundRotationPreferences(rotationPreferences);
  const selectionByPattern = new Map(
    mainCompoundSelections.map((selection) => [selection.movementPattern, selection]),
  );
  const rotationPoolByPattern = new Map(
    normalizedRotationPools.map((pool) => [pool.movementPattern, pool]),
  );

  return compoundCapableMovementPatterns.flatMap((movementPattern) => {
    const selection = selectionByPattern.get(movementPattern);

    if (!selection) {
      const existingRotationPool = rotationPoolByPattern.get(movementPattern);

      return existingRotationPool ? [existingRotationPool] : [];
    }

    const rotationPreferenceExerciseIds = getMainCompoundRotationPreferenceExerciseIds({
      movementPattern,
      preferences: normalizedRotationPreferences,
    });

    if (rotationPreferenceExerciseIds.length > 0) {
      const exerciseIds = getCompatibleRotationExerciseIds({
        avoidedExerciseIds,
        candidateExerciseIds: rotationPreferenceExerciseIds,
        mainCompoundSelections,
        movementPattern,
        startingExerciseId: selection.exerciseId,
      });

      return exerciseIds.length > 0 ? [{ exerciseIds, movementPattern }] : [];
    }

    const existingRotationPool = rotationPoolByPattern.get(movementPattern);

    if (existingRotationPool) {
      return [existingRotationPool];
    }

    const exerciseIds = getSuggestedRotationExerciseIds({
      avoidedExerciseIds,
      mainCompoundSelections,
      movementPattern,
      startingExerciseId: selection.exerciseId,
    });

    return exerciseIds.length > 0 ? [{ exerciseIds, movementPattern }] : [];
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

function getCompatibleRotationExerciseIds({
  avoidedExerciseIds,
  candidateExerciseIds,
  mainCompoundSelections,
  movementPattern,
  startingExerciseId,
}: {
  avoidedExerciseIds: ReadonlySet<string>;
  candidateExerciseIds: ReadonlyArray<string>;
  mainCompoundSelections: ReadonlyArray<MainCompoundSelection>;
  movementPattern: CompoundCapableMovementPatternId;
  startingExerciseId: string;
}): Array<string> {
  const selectedMainExerciseIds = new Set(
    mainCompoundSelections.map((selection) => selection.exerciseId),
  );
  const excludedExerciseIds = new Set([
    ...avoidedExerciseIds,
    ...selectedMainExerciseIds,
    startingExerciseId,
  ]);
  const startingExercise = getExerciseCatalogExercise(startingExerciseId);

  if (!startingExercise) {
    return [];
  }

  const startingPrimaryMuscleGroups = new Set(startingExercise.primaryMuscleGroups);

  return getConcreteUniqueExerciseIds(candidateExerciseIds).filter((exerciseId) => {
    const exercise = getEligibleRotationExercise({
      excludedExerciseIds,
      exerciseId,
      movementPattern,
    });

    if (!exercise) {
      return false;
    }

    return exercise.primaryMuscleGroups.some((muscleGroup) =>
      startingPrimaryMuscleGroups.has(muscleGroup),
    );
  });
}

function getConcreteUniqueExerciseIds(exerciseIds: ReadonlyArray<string>): Array<string> {
  return Array.from(
    new Set(exerciseIds.map((exerciseId) => getConcreteExerciseCatalogExerciseId(exerciseId))),
  );
}

function getEligibleRotationExercise({
  excludedExerciseIds,
  exerciseId,
  movementPattern,
}: {
  excludedExerciseIds: ReadonlySet<string>;
  exerciseId: string;
  movementPattern: CompoundCapableMovementPatternId;
}) {
  const exercise = getExerciseCatalogExercise(exerciseId);

  if (!exercise || !isMainCompoundEligible(exercise)) {
    return null;
  }

  if (exercise.movementPattern !== movementPattern || excludedExerciseIds.has(exercise.id)) {
    return null;
  }

  return exercise;
}

function getSuggestedRotationExerciseIds({
  avoidedExerciseIds,
  mainCompoundSelections,
  movementPattern,
  startingExerciseId,
}: {
  avoidedExerciseIds: ReadonlySet<string>;
  mainCompoundSelections: ReadonlyArray<MainCompoundSelection>;
  movementPattern: CompoundCapableMovementPatternId;
  startingExerciseId: string;
}): Array<string> {
  return getCompatibleRotationExerciseIds({
    avoidedExerciseIds,
    candidateExerciseIds: getExerciseCatalogExercisesByMovementPattern(movementPattern).map(
      (exercise) => exercise.id,
    ),
    mainCompoundSelections,
    movementPattern,
    startingExerciseId,
  }).slice(0, 3);
}
