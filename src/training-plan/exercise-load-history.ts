import { isBodyweightLoadExercise } from "./bodyweight-load";
import type {
  TrainingSession,
  TrainingSessionExerciseEntry,
  TrainingSessionSetEntry,
} from "./training-session";

/** The latest completed performance of one exercise: its session and load-bearing sets. */
export type ExercisePerformance = {
  session: TrainingSession;
  /** Completed load-bearing sets, ordered by set index; never empty. */
  sets: ReadonlyArray<TrainingSessionSetEntry>;
};

/**
 * Read-only lookups over completed Training Sessions, newest `completedAt` first. Only completed
 * sets with reps and a load count; bodyweight exercises count at zero or negative adjustments.
 */
type ExerciseLoadHistory = {
  latestPerformance(
    exerciseId: string,
    options?: { trainingBlockId?: string | null },
  ): ExercisePerformance | null;
  /** Load of the last set in the latest performance, or null when never completed. */
  latestLoad(exerciseId: string): number | null;
  previousSet(exerciseId: string, setIndex: number): { reps: number; weight: number } | null;
};

/** Draft sets are stored with `done: false`; legacy completed sets have no `done` flag. */
export function isCompletedSet(set: TrainingSessionSetEntry): boolean {
  return set.done !== false;
}

const exerciseLoadHistoryCache = new WeakMap<ReadonlyArray<TrainingSession>, ExerciseLoadHistory>();

/** Builds (once per session list) the Exercise Load History; callers may pass sessions in any order. */
export function createExerciseLoadHistory(
  sessions: ReadonlyArray<TrainingSession>,
): ExerciseLoadHistory {
  const cachedHistory = exerciseLoadHistoryCache.get(sessions);

  if (cachedHistory) {
    return cachedHistory;
  }

  const performances = getPerformancesNewestFirst(sessions);
  let previousSetIndex: ReadonlyMap<string, TrainingSessionSetEntry> | null = null;
  const history: ExerciseLoadHistory = {
    latestLoad: (exerciseId) => history.latestPerformance(exerciseId)?.sets.at(-1)?.weight ?? null,
    latestPerformance: (exerciseId, { trainingBlockId = null } = {}) =>
      performances.find(
        (performance) =>
          performance.exerciseId === exerciseId &&
          (!trainingBlockId || performance.session.trainingBlockId === trainingBlockId),
      ) ?? null,
    previousSet: (exerciseId, setIndex) => {
      previousSetIndex ??= indexPreviousSets(performances);
      const set = previousSetIndex.get(getPreviousSetKey(exerciseId, setIndex));

      return set ? { reps: set.reps, weight: set.weight } : null;
    },
  };

  exerciseLoadHistoryCache.set(sessions, history);

  return history;
}

type IndexedExercisePerformance = ExercisePerformance & { exerciseId: string };

function getPerformancesNewestFirst(
  sessions: ReadonlyArray<TrainingSession>,
): ReadonlyArray<IndexedExercisePerformance> {
  return sessions
    .filter((session) => session.completedAt !== null)
    .sort((first, second) => (second.completedAt ?? "").localeCompare(first.completedAt ?? ""))
    .flatMap((session) =>
      session.exercises.flatMap((entry) => {
        const sets = getLoadHistorySets(entry);

        return sets.length > 0 ? [{ exerciseId: entry.exerciseId, session, sets }] : [];
      }),
    );
}

function getLoadHistorySets(
  entry: TrainingSessionExerciseEntry,
): ReadonlyArray<TrainingSessionSetEntry> {
  const isBodyweightLoad = isBodyweightLoadExercise(entry);

  return entry.sets
    .filter((set) => isCompletedSet(set) && set.reps > 0 && (isBodyweightLoad || set.weight > 0))
    .sort((first, second) => first.setIndex - second.setIndex);
}

// Set labels are read once per set row on every logging keystroke; index once per session list.
function indexPreviousSets(
  performances: ReadonlyArray<IndexedExercisePerformance>,
): ReadonlyMap<string, TrainingSessionSetEntry> {
  const index = new Map<string, TrainingSessionSetEntry>();

  for (const { exerciseId, sets } of performances) {
    for (const set of sets) {
      const key = getPreviousSetKey(exerciseId, set.setIndex);

      if (!index.has(key)) {
        index.set(key, set);
      }
    }
  }

  return index;
}

function getPreviousSetKey(exerciseId: string, setIndex: number): string {
  return `${exerciseId}:${setIndex}`;
}
