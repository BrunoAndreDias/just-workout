import type { MovementPatternId } from "../training-taxonomy";
import { isBodyweightLoadExercise } from "./bodyweight-load";
import type { TrainingSessionExerciseEntry, TrainingSessionSetEntry } from "./training-session";

export type CompletedLoadVolumeMovementRow = {
  movementPattern: MovementPatternId;
  volume: number;
};

export type CompletedLoadVolumeExerciseReport = {
  completedLoadVolume: number;
  exerciseId: string;
  exerciseName: string;
  hasPartialVolume: boolean;
  loadedSetCount: number;
  movementPattern: MovementPatternId;
};

export type CompletedLoadVolumeSummary = {
  exercises: ReadonlyArray<CompletedLoadVolumeExerciseReport>;
  hasPartialVolume: boolean;
  loadedSetCount: number;
  totalVolume: number;
  volumeByMovementPattern: ReadonlyArray<CompletedLoadVolumeMovementRow>;
};

type CompletedLoadVolumeOptions = {
  sessionBodyweight?: number | null;
};

export function summarizeCompletedLoadVolume(
  entries: ReadonlyArray<TrainingSessionExerciseEntry>,
  options: CompletedLoadVolumeOptions = {},
): CompletedLoadVolumeSummary {
  const exercises = entries.map((entry) => createCompletedLoadVolumeExerciseReport(entry, options));
  const volumeByPattern = new Map<MovementPatternId, CompletedLoadVolumeMovementRow>();
  let hasPartialVolume = false;
  let loadedSetCount = 0;
  let totalVolume = 0;

  for (const exercise of exercises) {
    hasPartialVolume = hasPartialVolume || exercise.hasPartialVolume;
    loadedSetCount += exercise.loadedSetCount;
    totalVolume += exercise.completedLoadVolume;
    addExerciseVolumeToMovementPattern(volumeByPattern, exercise);
  }

  return {
    exercises,
    hasPartialVolume,
    loadedSetCount,
    totalVolume,
    volumeByMovementPattern: sortMovementVolumeRows(Array.from(volumeByPattern.values())),
  };
}

export function calculateVolumeByMovementPattern(
  entries: ReadonlyArray<TrainingSessionExerciseEntry>,
  options: CompletedLoadVolumeOptions = {},
): CompletedLoadVolumeMovementRow[] {
  return [...summarizeCompletedLoadVolume(entries, options).volumeByMovementPattern];
}

export function createCompletedLoadVolumeExerciseReport(
  exercise: TrainingSessionExerciseEntry,
  options: CompletedLoadVolumeOptions = {},
): CompletedLoadVolumeExerciseReport {
  let completedLoadVolume = 0;
  let hasPartialVolume = false;
  let loadedSetCount = 0;

  for (const set of exercise.sets) {
    if (!isCompletedSet(set)) {
      continue;
    }

    if (
      isMissingBodyweightVolume({ exercise, sessionBodyweight: options.sessionBodyweight, set })
    ) {
      hasPartialVolume = true;
      continue;
    }

    const effectiveLoad = getCompletedSetEffectiveLoad({
      exercise,
      sessionBodyweight: options.sessionBodyweight ?? null,
      set,
    });

    if (effectiveLoad <= 0 || set.reps <= 0) {
      continue;
    }

    completedLoadVolume += effectiveLoad * set.reps;
    loadedSetCount += 1;
  }

  return {
    completedLoadVolume,
    exerciseId: exercise.exerciseId,
    exerciseName: exercise.exerciseName,
    hasPartialVolume,
    loadedSetCount,
    movementPattern: exercise.movementPattern,
  };
}

export function isLoadedSet(set: TrainingSessionSetEntry): boolean {
  return isCompletedSet(set) && set.weight > 0 && set.reps > 0;
}

function getCompletedSetEffectiveLoad({
  exercise,
  sessionBodyweight,
  set,
}: {
  exercise: TrainingSessionExerciseEntry;
  sessionBodyweight: number | null;
  set: TrainingSessionSetEntry;
}): number {
  if (!isBodyweightLoadExercise(exercise)) {
    return set.weight;
  }

  if (sessionBodyweight === null) {
    return 0;
  }

  return Math.max(0, sessionBodyweight + set.weight);
}

function isMissingBodyweightVolume({
  exercise,
  sessionBodyweight,
  set,
}: {
  exercise: TrainingSessionExerciseEntry;
  sessionBodyweight: number | null | undefined;
  set: TrainingSessionSetEntry;
}): boolean {
  return (
    isBodyweightLoadExercise(exercise) &&
    sessionBodyweight == null &&
    isCompletedSet(set) &&
    set.reps > 0
  );
}

function isCompletedSet(set: TrainingSessionSetEntry): boolean {
  return set.done !== false;
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
