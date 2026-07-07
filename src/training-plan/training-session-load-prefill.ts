import { isBodyweightLoadExercise } from "./bodyweight-load";
import {
  applyTrainingBlockProgressionRule,
  generateWeeklyIntensityTargets,
  getTrainingBlockExerciseTargetRir,
} from "./training-block";
import type {
  TrainingPlan,
  TrainingPlanSlot,
  TrainingPlanStartingLoadSuggestion,
} from "./training-plan";
import { createLegacyDefaultTrainingPrescription } from "./training-prescription";
import type { TrainingSession, TrainingSessionExerciseEntry } from "./training-session";
import { getCompletedTrainingSessionsNewestFirst } from "./training-session-history";

const DEFAULT_AVAILABLE_LOAD_INCREMENT = 2.5;

export type TrainingSessionLoadPrefill = TrainingPlanStartingLoadSuggestion & {
  /** True while an exact-history prefill should be explained in the first relevant session. */
  showPrefillExplanation: boolean;
};

/**
 * Builds one editable starting-load prefill per exercise in the workout template.
 */
export function createTrainingSessionLoadPrefills({
  availableLoadIncrement = DEFAULT_AVAILABLE_LOAD_INCREMENT,
  previousTrainingSessions,
  trainingPlan,
  workoutTemplate,
}: {
  availableLoadIncrement?: number;
  previousTrainingSessions: ReadonlyArray<TrainingSession>;
  trainingPlan: TrainingPlan;
  workoutTemplate: NonNullable<TrainingPlan["workoutTemplates"][number]>;
}): ReadonlyArray<TrainingSessionLoadPrefill> {
  const persistedSuggestionsByExerciseId = new Map(
    (trainingPlan.startingLoadSuggestions ?? []).map((suggestion) => [
      suggestion.exerciseId,
      suggestion,
    ]),
  );

  return getUniqueWorkoutTemplateSlots(workoutTemplate).map((slot) => {
    const latestCurrentBlockHistory = getLatestCompletedExerciseHistory({
      exerciseId: slot.exerciseId,
      sessions: previousTrainingSessions,
      trainingBlockId: trainingPlan.trainingBlock?.id ?? null,
    });

    if (latestCurrentBlockHistory) {
      return createProgressedPrefillFromLatestHistory({
        availableLoadIncrement,
        history: latestCurrentBlockHistory,
        slot,
        trainingPlan,
      });
    }

    const persistedSuggestion = persistedSuggestionsByExerciseId.get(slot.exerciseId);

    if (persistedSuggestion && hasPersistedEffectiveLoad(persistedSuggestion)) {
      return {
        ...persistedSuggestion,
        showPrefillExplanation: persistedSuggestion.kind === "exact_previous_exercise",
      };
    }

    const latestExactHistory = getLatestCompletedExerciseHistory({
      exerciseId: slot.exerciseId,
      sessions: previousTrainingSessions,
      trainingBlockId: null,
    });

    if (latestExactHistory) {
      const previousLoad = getLatestCompletedExerciseLoad({
        entry: latestExactHistory.entry,
        slot,
      });

      if (previousLoad !== null) {
        return createExactHistoryPrefill({
          exerciseName: slot.exerciseName,
          exerciseId: slot.exerciseId,
          movementPattern: slot.movementPattern,
          previousLoad,
          suggestedLoad: roundToNearestIncrement(previousLoad, availableLoadIncrement),
          showPrefillExplanation: true,
        });
      }
    }

    return createFirstTimePrefill(slot);
  });
}

function getUniqueWorkoutTemplateSlots(
  workoutTemplate: NonNullable<TrainingPlan["workoutTemplates"][number]>,
): ReadonlyArray<TrainingPlanSlot> {
  const slotsByExerciseId = new Map<string, TrainingPlanSlot>();

  for (const slot of workoutTemplate.supersetGroups.flatMap((group) => group.slots)) {
    if (!slotsByExerciseId.has(slot.exerciseId)) {
      slotsByExerciseId.set(slot.exerciseId, slot);
    }
  }

  return [...slotsByExerciseId.values()];
}

function hasPersistedEffectiveLoad(suggestion: TrainingPlanStartingLoadSuggestion): boolean {
  return suggestion.effectiveLoad !== null;
}

function getLatestCompletedExerciseHistory({
  exerciseId,
  sessions,
  trainingBlockId,
}: {
  exerciseId: string;
  sessions: ReadonlyArray<TrainingSession>;
  trainingBlockId: string | null;
}): { entry: TrainingSessionExerciseEntry; session: TrainingSession } | null {
  for (const session of getCompletedTrainingSessionsNewestFirst(sessions)) {
    if (trainingBlockId && session.trainingBlockId !== trainingBlockId) {
      continue;
    }

    const entry = session.exercises.find((exercise) => exercise.exerciseId === exerciseId);

    if (entry) {
      return {
        entry,
        session,
      };
    }
  }

  return null;
}

function createProgressedPrefillFromLatestHistory({
  availableLoadIncrement,
  history,
  slot,
  trainingPlan,
}: {
  availableLoadIncrement: number;
  history: { entry: TrainingSessionExerciseEntry; session: TrainingSession };
  slot: TrainingPlanSlot;
  trainingPlan: TrainingPlan;
}): TrainingSessionLoadPrefill {
  const previousLoad = getLatestCompletedExerciseLoad({
    entry: history.entry,
    slot,
  });

  if (previousLoad === null) {
    return createFirstTimePrefill(slot);
  }

  const trainingPrescription =
    slot.trainingPrescription ?? createLegacyDefaultTrainingPrescription();
  const weeklyIntensityTargets = generateWeeklyIntensityTargets({
    trainingBlockWeeks: trainingPlan.trainingBlockWeeks,
  });
  const defaultTargetRir = getTrainingBlockExerciseTargetRir({
    role: slot.role,
    setIndex: 1,
    weekNumber:
      history.session.trainingBlockWeekNumber ?? trainingPlan.trainingBlock?.weekNumber ?? 1,
    weeklyIntensityTargets,
  });
  const decision = applyTrainingBlockProgressionRule({
    completedSets: history.entry.sets
      .filter((set) => isCompletedProgressionSet({ set, slot }))
      .map((set) => ({
        reps: set.reps,
        rir: set.rir ?? null,
        targetRir: getTrainingBlockExerciseTargetRir({
          role: slot.role,
          setIndex: set.setIndex,
          weekNumber:
            history.session.trainingBlockWeekNumber ?? trainingPlan.trainingBlock?.weekNumber ?? 1,
          weeklyIntensityTargets,
        }),
      })),
    plannedSetCount: trainingPrescription.setCount,
    repRange: {
      maxReps: trainingPrescription.repRange.max,
      minReps: trainingPrescription.repRange.min,
    },
    targetRir: defaultTargetRir,
  });

  return createExactHistoryPrefill({
    exerciseId: slot.exerciseId,
    exerciseName: slot.exerciseName,
    movementPattern: slot.movementPattern,
    previousLoad,
    reason: decision.reason,
    suggestedLoad: applyProgressionDecisionToLoad({
      availableLoadIncrement,
      decision: decision.type,
      previousLoad,
      slot,
    }),
    showPrefillExplanation: false,
  });
}

function createExactHistoryPrefill({
  exerciseId,
  exerciseName,
  movementPattern,
  previousLoad,
  reason = "previous exact exercise load prefill",
  suggestedLoad,
  showPrefillExplanation,
}: {
  exerciseId: string;
  exerciseName: string;
  movementPattern: TrainingPlanSlot["movementPattern"];
  previousLoad: number;
  reason?: string;
  suggestedLoad: number;
  showPrefillExplanation: boolean;
}): TrainingSessionLoadPrefill {
  return {
    effectiveLoad: suggestedLoad,
    exerciseId,
    exerciseName,
    kind: "exact_previous_exercise",
    movementPattern,
    previousLoad,
    reason,
    showPrefillExplanation,
    suggestedLoad,
    userEditedLoad: null,
  };
}

function createFirstTimePrefill(slot: TrainingPlanSlot): TrainingSessionLoadPrefill {
  return {
    effectiveLoad: null,
    exerciseId: slot.exerciseId,
    exerciseName: slot.exerciseName,
    kind: "first_time",
    movementPattern: slot.movementPattern,
    previousLoad: null,
    reason: "first-time exercise, start empty",
    showPrefillExplanation: false,
    suggestedLoad: null,
    userEditedLoad: null,
  };
}

function getLatestCompletedExerciseLoad({
  entry,
  slot,
}: {
  entry: TrainingSessionExerciseEntry;
  slot: TrainingPlanSlot;
}): number | null {
  const completedSets = entry.sets
    .filter((set) => isCompletedProgressionSet({ set, slot }))
    .sort((firstSet, secondSet) => secondSet.setIndex - firstSet.setIndex);

  return completedSets[0]?.weight ?? null;
}

function isCompletedProgressionSet({
  set,
  slot,
}: {
  set: TrainingSessionExerciseEntry["sets"][number];
  slot: TrainingPlanSlot;
}): boolean {
  if (set.done === false || set.reps <= 0) {
    return false;
  }

  if (isBodyweightLoadExercise(slot)) {
    return true;
  }

  return set.weight > 0;
}

function applyProgressionDecisionToLoad({
  availableLoadIncrement,
  decision,
  previousLoad,
  slot,
}: {
  availableLoadIncrement: number;
  decision: "increase_load" | "keep_load" | "reduce_load";
  previousLoad: number;
  slot: TrainingPlanSlot;
}): number {
  if (decision === "keep_load") {
    return previousLoad;
  }

  const nextLoad =
    decision === "increase_load"
      ? previousLoad + availableLoadIncrement
      : previousLoad - availableLoadIncrement;

  if (!isBodyweightLoadExercise(slot)) {
    return roundToNearestIncrement(Math.max(nextLoad, 0), availableLoadIncrement);
  }

  return roundToNearestIncrement(nextLoad, availableLoadIncrement);
}

function roundToNearestIncrement(value: number, increment: number): number {
  return Math.round(value / increment) * increment;
}
