import { isCompletedSet } from "./exercise-load-history";
import { formatWeight } from "./training-history-formatting";
import type {
  TrainingSessionExerciseEntry,
  TrainingSessionSetEntry,
  TrainingSessionSetTarget,
} from "./training-session";

/**
 * Whether a done set reached its Session Target's load and reps. Null when the set has no stored
 * target or the target only named an effort (RIR), which is compared by eye, not scored.
 */
export type TrainingSessionSetTargetOutcome = "hit" | "missed" | null;

export type TrainingSessionSetTargetComparison = {
  actualLabel: string;
  outcome: TrainingSessionSetTargetOutcome;
  setIndex: number;
  /** Null for legacy sets logged before Session Targets were stored. */
  targetLabel: string | null;
};

export type TrainingSessionExerciseTargetComparison = {
  exerciseId: string;
  exerciseName: string;
  sets: ReadonlyArray<TrainingSessionSetTargetComparison>;
};

export type TrainingSessionTargetSummary = {
  hitCount: number;
  /** Done sets whose target named a load or rep goal. */
  targetCount: number;
};

/** Pairs every done set with the Session Target it was logged against. */
export function compareTrainingSessionTargets(
  exercises: ReadonlyArray<TrainingSessionExerciseEntry>,
): TrainingSessionExerciseTargetComparison[] {
  return exercises
    .map((exercise) => ({
      exerciseId: exercise.exerciseId,
      exerciseName: exercise.exerciseName,
      sets: exercise.sets.filter(isCompletedSet).map(compareTrainingSessionSetTarget),
    }))
    .filter((exercise) => exercise.sets.length > 0);
}

export function summarizeTrainingSessionTargets(
  comparisons: ReadonlyArray<TrainingSessionExerciseTargetComparison>,
): TrainingSessionTargetSummary {
  const outcomes = comparisons.flatMap((exercise) => exercise.sets.map((set) => set.outcome));

  return {
    hitCount: outcomes.filter((outcome) => outcome === "hit").length,
    targetCount: outcomes.filter((outcome) => outcome !== null).length,
  };
}

function compareTrainingSessionSetTarget(
  set: TrainingSessionSetEntry,
): TrainingSessionSetTargetComparison {
  const target = set.target ?? null;

  return {
    actualLabel: formatSetLabel({ reps: set.reps, rir: set.rir ?? null, weight: set.weight }),
    outcome: target ? getSetTargetOutcome(set, target) : null,
    setIndex: set.setIndex,
    targetLabel: target ? formatSetLabel(target) : null,
  };
}

function getSetTargetOutcome(
  set: TrainingSessionSetEntry,
  target: TrainingSessionSetTarget,
): TrainingSessionSetTargetOutcome {
  if (target.weight === null && target.reps === null) {
    return null;
  }

  const reachedLoad = target.weight === null || set.weight >= target.weight;
  const reachedReps = target.reps === null || set.reps >= target.reps;

  return reachedLoad && reachedReps ? "hit" : "missed";
}

function formatSetLabel({ reps, rir, weight }: TrainingSessionSetTarget): string {
  const load = weight === null ? null : `${formatWeight(weight)} kg`;
  const work =
    load !== null && reps !== null
      ? `${load} × ${reps}`
      : (load ?? (reps !== null ? `${reps} reps` : null));
  const effort = rir === null ? null : `${rir} RIR`;

  return [work, effort].filter((part): part is string => part !== null).join(" · ");
}
