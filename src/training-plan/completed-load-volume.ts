import type { MovementPatternId } from "../plan-builder/exercise-catalog";
import type { TrainingSessionExerciseEntry, TrainingSessionSetEntry } from "./training-session";

export type CompletedLoadVolumeMovementRow = {
  movementPattern: MovementPatternId;
  volume: number;
};

export type CompletedLoadVolumeExerciseReport = {
  completedLoadVolume: number;
  exerciseId: string;
  exerciseName: string;
  loadedSetCount: number;
  movementPattern: MovementPatternId;
};

export type CompletedLoadVolumeSummary = {
  exercises: ReadonlyArray<CompletedLoadVolumeExerciseReport>;
  loadedSetCount: number;
  totalVolume: number;
  volumeByMovementPattern: ReadonlyArray<CompletedLoadVolumeMovementRow>;
};

export function summarizeCompletedLoadVolume(
  entries: ReadonlyArray<TrainingSessionExerciseEntry>,
): CompletedLoadVolumeSummary {
  const exercises = entries.map(createCompletedLoadVolumeExerciseReport);
  const volumeByPattern = new Map<MovementPatternId, CompletedLoadVolumeMovementRow>();
  let loadedSetCount = 0;
  let totalVolume = 0;

  for (const exercise of exercises) {
    loadedSetCount += exercise.loadedSetCount;
    totalVolume += exercise.completedLoadVolume;
    addExerciseVolumeToMovementPattern(volumeByPattern, exercise);
  }

  return {
    exercises,
    loadedSetCount,
    totalVolume,
    volumeByMovementPattern: sortMovementVolumeRows(Array.from(volumeByPattern.values())),
  };
}

export function calculateVolumeByMovementPattern(
  entries: ReadonlyArray<TrainingSessionExerciseEntry>,
): CompletedLoadVolumeMovementRow[] {
  return [...summarizeCompletedLoadVolume(entries).volumeByMovementPattern];
}

export function createCompletedLoadVolumeExerciseReport(
  exercise: TrainingSessionExerciseEntry,
): CompletedLoadVolumeExerciseReport {
  let completedLoadVolume = 0;
  let loadedSetCount = 0;

  for (const set of exercise.sets) {
    if (!isLoadedSet(set)) {
      continue;
    }

    completedLoadVolume += set.weight * set.reps;
    loadedSetCount += 1;
  }

  return {
    completedLoadVolume,
    exerciseId: exercise.exerciseId,
    exerciseName: exercise.exerciseName,
    loadedSetCount,
    movementPattern: exercise.movementPattern,
  };
}

export function isLoadedSet(set: TrainingSessionSetEntry): boolean {
  return set.weight > 0 && set.reps > 0;
}

function addExerciseVolumeToMovementPattern(
  volumeByPattern: Map<MovementPatternId, CompletedLoadVolumeMovementRow>,
  exercise: CompletedLoadVolumeExerciseReport,
) {
  if (exercise.completedLoadVolume <= 0) {
    return;
  }

  const currentPattern = volumeByPattern.get(exercise.movementPattern);

  volumeByPattern.set(exercise.movementPattern, {
    movementPattern: exercise.movementPattern,
    volume: (currentPattern?.volume ?? 0) + exercise.completedLoadVolume,
  });
}

function sortMovementVolumeRows(
  rows: ReadonlyArray<CompletedLoadVolumeMovementRow>,
): CompletedLoadVolumeMovementRow[] {
  return [...rows].sort((firstRow, secondRow) =>
    firstRow.movementPattern.localeCompare(secondRow.movementPattern),
  );
}
