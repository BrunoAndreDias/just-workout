import { isBodyweightLoadExercise } from "./bodyweight-load";
import { createExerciseLoadHistory, type ExercisePerformance } from "./exercise-load-history";
import { roundToNearestIncrement, suggestNextExerciseTarget } from "./exercise-progression";
import {
  generateWeeklyIntensityTargets,
  getTrainingBlockExerciseTargetRir,
} from "./training-block";
import type {
  TrainingPlan,
  TrainingPlanSlot,
  TrainingPlanStartingLoadSuggestion,
} from "./training-plan";
import { createLegacyDefaultTrainingPrescription } from "./training-prescription";
import type { TrainingSession } from "./training-session";

const DEFAULT_AVAILABLE_LOAD_INCREMENT = 2.5;

export type TrainingSessionLoadPrefill = TrainingPlanStartingLoadSuggestion & {
  /** Plain-language explanation of how this session's target was derived. */
  progressionNote: string;
  /** True while an exact-history prefill should be explained in the first relevant session. */
  showPrefillExplanation: boolean;
  /** Rep target for every working set this session; null leaves the prescription minimum. */
  targetReps: number | null;
  /** This Training Week's RIR target for the exercise. */
  targetRir: number;
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

  const currentWeekNumber = trainingPlan.trainingBlock?.weekNumber ?? 1;
  const weeklyIntensityTargets = generateWeeklyIntensityTargets({
    trainingBlockWeeks: trainingPlan.trainingBlockWeeks,
  });
  const getTargetRir = (slot: TrainingPlanSlot, weekNumber: number) =>
    getTrainingBlockExerciseTargetRir({
      role: slot.role,
      weekNumber,
      weeklyIntensityTargets,
    });

  const exerciseLoadHistory = createExerciseLoadHistory(previousTrainingSessions);
  const currentTrainingBlockId = trainingPlan.trainingBlock?.id ?? null;

  return getUniqueWorkoutTemplateSlots(workoutTemplate).map((slot) => {
    const targetRir = getTargetRir(slot, currentWeekNumber);
    const latestCurrentBlockHistory = exerciseLoadHistory.latestPerformance(slot.exerciseId, {
      trainingBlockId: currentTrainingBlockId,
    });
    const latestHistory =
      latestCurrentBlockHistory ?? exerciseLoadHistory.latestPerformance(slot.exerciseId);
    const progressedPrefill = latestHistory
      ? createProgressedPrefillFromLatestHistory({
          availableLoadIncrement,
          history: latestHistory,
          previousTargetRir: getTargetRir(
            slot,
            latestHistory.session.trainingBlockWeekNumber ?? currentWeekNumber,
          ),
          showPrefillExplanation: latestCurrentBlockHistory === null,
          slot,
          targetRir,
        })
      : null;

    if (latestCurrentBlockHistory && progressedPrefill) {
      return progressedPrefill;
    }

    const persistedSuggestion = persistedSuggestionsByExerciseId.get(slot.exerciseId);

    if (persistedSuggestion && hasPersistedEffectiveLoad(persistedSuggestion)) {
      return createPersistedPrefill({ persistedSuggestion, progressedPrefill, slot, targetRir });
    }

    return progressedPrefill ?? createFirstTimePrefill(slot, targetRir);
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

function createPersistedPrefill({
  persistedSuggestion,
  progressedPrefill,
  slot,
  targetRir,
}: {
  persistedSuggestion: TrainingPlanStartingLoadSuggestion;
  progressedPrefill: TrainingSessionLoadPrefill | null;
  slot: TrainingPlanSlot;
  targetRir: number;
}): TrainingSessionLoadPrefill {
  const isCarriedOver = persistedSuggestion.kind === "exact_previous_exercise";
  const minReps = getPrescription(slot).repRange.min;

  return {
    ...persistedSuggestion,
    progressionNote: isCarriedOver
      ? `Starting load carried over from your last Training Block. Aim for ${
          progressedPrefill?.targetReps ?? minReps
        } reps at ${targetRir} RIR.`
      : `Starting load you set for this Training Block. Aim for ${minReps} reps at ${targetRir} RIR.`,
    showPrefillExplanation: isCarriedOver,
    targetReps: progressedPrefill?.targetReps ?? null,
    targetRir,
  };
}

function hasPersistedEffectiveLoad(suggestion: TrainingPlanStartingLoadSuggestion): boolean {
  return suggestion.effectiveLoad !== null;
}

function createProgressedPrefillFromLatestHistory({
  availableLoadIncrement,
  history,
  previousTargetRir,
  showPrefillExplanation,
  slot,
  targetRir,
}: {
  availableLoadIncrement: number;
  history: ExercisePerformance;
  previousTargetRir: number;
  showPrefillExplanation: boolean;
  slot: TrainingPlanSlot;
  targetRir: number;
}): TrainingSessionLoadPrefill | null {
  const previousLoad = history.sets.at(-1)?.weight ?? null;

  const target = suggestNextExerciseTarget({
    availableLoadIncrement,
    isBodyweightLoad: isBodyweightLoadExercise(slot),
    nextTargetRir: targetRir,
    previousSets: history.sets.map((set) => ({
      reps: set.reps,
      rir: set.rir ?? null,
      weight: set.weight,
    })),
    previousTargetRir,
    repRange: getPrescription(slot).repRange,
  });

  if (!target) {
    return null;
  }

  const suggestedLoad = roundToNearestIncrement(target.load, availableLoadIncrement);

  return {
    effectiveLoad: suggestedLoad,
    exerciseId: slot.exerciseId,
    exerciseName: slot.exerciseName,
    kind: "exact_previous_exercise",
    movementPattern: slot.movementPattern,
    previousLoad,
    progressionNote: target.note,
    reason: getProgressionReason(target.loadChange),
    showPrefillExplanation,
    suggestedLoad,
    targetReps: target.reps,
    targetRir,
    userEditedLoad: null,
  };
}

function getProgressionReason(loadChange: "increase" | "keep" | "reduce"): string {
  switch (loadChange) {
    case "increase":
      return "rep target passed the top of the rep range, so the load goes up";
    case "reduce":
      return "rep target fell below the rep range, so the load goes down";
    default:
      return "rep target adjusted from last session's reps and RIR";
  }
}

function createFirstTimePrefill(
  slot: TrainingPlanSlot,
  targetRir: number,
): TrainingSessionLoadPrefill {
  const { repRange } = getPrescription(slot);

  return {
    effectiveLoad: null,
    exerciseId: slot.exerciseId,
    exerciseName: slot.exerciseName,
    kind: "first_time",
    movementPattern: slot.movementPattern,
    previousLoad: null,
    progressionNote: `First time: pick a load you can lift for ${repRange.min}–${repRange.max} reps with about ${targetRir} reps left in the tank.`,
    reason: "first-time exercise, start empty",
    showPrefillExplanation: false,
    suggestedLoad: null,
    targetReps: null,
    targetRir,
    userEditedLoad: null,
  };
}

function getPrescription(slot: TrainingPlanSlot) {
  return slot.trainingPrescription ?? createLegacyDefaultTrainingPrescription();
}
