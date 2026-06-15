import {
  getExerciseCatalogExercise,
  getExerciseCatalogExercisesByMovementPattern,
  isCompoundCapableMovementPattern,
  type MovementPatternId,
} from "../plan-builder/exercise-catalog";
import { isBodyweightLoadExercise } from "./bodyweight-load";
import type { TrainingPlan, TrainingPlanStartingLoadSuggestion } from "./training-plan";
import type { TrainingSession } from "./training-session";

export type TrainingBlock = {
  cycleNumber: number;
  endDate: string;
  id: string;
  planId: string;
  previousBlockId: string | null;
  startDate: string;
  status: "active" | "completed" | "upcoming";
  weekNumber: number;
};

export type GenerateNextTrainingBlockInput = {
  completedWeeks: ReadonlyArray<number>;
  currentBlock: TrainingBlock;
  id: string;
  planId: string;
  startDate: string;
};

export type MainCompoundRotationPreviewItem = {
  movementPattern: MovementPatternId;
  nextExerciseId: string;
  nextExerciseName: string;
  previousExerciseId: string;
  previousExerciseName: string;
  reason: string;
};

export type MainCompoundKeptPreviewItem = {
  exerciseId: string;
  exerciseName: string;
  movementPattern: MovementPatternId;
  reason: string;
};

export type MainCompoundRotationPreview = {
  kept: ReadonlyArray<MainCompoundKeptPreviewItem>;
  requiredMovementCoverage: RequiredMovementCoverageResult;
  rotated: ReadonlyArray<MainCompoundRotationPreviewItem>;
};

export type RequiredMovementCoverageResult = {
  isPreserved: boolean;
  missingPatterns: ReadonlyArray<MovementPatternId>;
};

export type NextTrainingBlockLoadTarget = {
  exerciseId: string;
  exerciseName: string;
  movementPattern: MovementPatternId;
};

export type NextTrainingBlockLoadSuggestion = NextTrainingBlockLoadTarget & {
  previousLoad: number | null;
  reason: string;
  suggestedLoad: number;
  userEditedLoad: number | null;
};

export type WeeklyIntensityTarget = {
  maxTargetRir: number;
  minTargetRir: number;
  weekNumber: number;
};

export type TrainingBlockExerciseRole =
  TrainingPlan["workoutTemplates"][number]["supersetGroups"][number]["slots"][number]["role"];

export type TrainingBlockProgressionSet = {
  reps: number;
  rir: number;
};

export type TrainingBlockProgressionDecision = {
  reason: string;
  type: "increase_load" | "keep_load" | "reduce_load";
};

export type NextTrainingBlockPreview = {
  loadSuggestions: ReadonlyArray<NextTrainingBlockLoadSuggestion>;
  nextTrainingPlan: TrainingPlan;
  rotation: MainCompoundRotationPreview;
  trainingBlock: TrainingBlock;
  weeklyIntensityTargets: ReadonlyArray<WeeklyIntensityTarget>;
};

const DEFAULT_TRAINING_BLOCK_WEEKS = 6;
const DEFAULT_SAFE_STARTING_LOAD = 20;
const REQUIRED_TRAINING_BLOCK_MOVEMENT_PATTERNS: ReadonlyArray<MovementPatternId> = [
  "horizontal_push",
  "horizontal_pull",
  "vertical_pull",
  "quad_dominant",
  "hip_hamstring_dominant",
];
const DEFAULT_WEEKLY_INTENSITY_TARGETS: ReadonlyArray<WeeklyIntensityTarget> = [
  { maxTargetRir: 3, minTargetRir: 3, weekNumber: 1 },
  { maxTargetRir: 3, minTargetRir: 2, weekNumber: 2 },
  { maxTargetRir: 2, minTargetRir: 2, weekNumber: 3 },
  { maxTargetRir: 2, minTargetRir: 1, weekNumber: 4 },
  { maxTargetRir: 1, minTargetRir: 1, weekNumber: 5 },
  { maxTargetRir: 1, minTargetRir: 0, weekNumber: 6 },
];

export function generateNextTrainingBlock({
  completedWeeks,
  currentBlock,
  id,
  planId,
  startDate,
}: GenerateNextTrainingBlockInput): TrainingBlock {
  if (!hasCompletedTrainingBlock(completedWeeks)) {
    throw new Error("Cannot generate the next Training Block before six weeks are completed.");
  }

  return {
    cycleNumber: currentBlock.cycleNumber + 1,
    endDate: addInclusiveWeeks(startDate, DEFAULT_TRAINING_BLOCK_WEEKS),
    id,
    planId,
    previousBlockId: currentBlock.id,
    startDate,
    status: "active",
    weekNumber: 1,
  };
}

function hasCompletedTrainingBlock(completedWeeks: ReadonlyArray<number>): boolean {
  return Array.from({ length: DEFAULT_TRAINING_BLOCK_WEEKS }, (_, index) => index + 1).every(
    (weekNumber) => completedWeeks.includes(weekNumber),
  );
}

export function previewMainCompoundRotations({
  trainingPlan,
}: {
  trainingPlan: TrainingPlan;
}): MainCompoundRotationPreview {
  const poolsByMovementPattern = new Map(
    trainingPlan.mainCompoundRotationPools.map((pool) => [pool.movementPattern, pool]),
  );
  const kept: MainCompoundKeptPreviewItem[] = [];
  const rotated: MainCompoundRotationPreviewItem[] = [];
  const seenExerciseIds = new Set<string>();
  const proposedMovementPatterns = new Set<MovementPatternId>();
  const usedNextExerciseIds = new Set<string>();

  for (const slot of trainingPlan.workoutTemplates
    .flatMap((template) => template.supersetGroups)
    .flatMap((group) => group.slots)) {
    proposedMovementPatterns.add(slot.movementPattern);

    if (seenExerciseIds.has(slot.exerciseId)) {
      continue;
    }

    seenExerciseIds.add(slot.exerciseId);

    if (slot.role !== "main_compound") {
      const nextExercise = getCompatibleRotationExercise({
        excludedExerciseIds: usedNextExerciseIds,
        slot,
      });

      if (!nextExercise) {
        kept.push({
          exerciseId: slot.exerciseId,
          exerciseName: slot.exerciseName,
          movementPattern: slot.movementPattern,
          reason: "no compatible role and target muscle replacement",
        });
        continue;
      }

      usedNextExerciseIds.add(nextExercise.id);
      rotated.push({
        movementPattern: slot.movementPattern,
        nextExerciseId: nextExercise.id,
        nextExerciseName: nextExercise.name,
        previousExerciseId: slot.exerciseId,
        previousExerciseName: slot.exerciseName,
        reason: "same role, Movement Pattern, and target muscle",
      });
      continue;
    }

    if (!isCompoundCapableMovementPattern(slot.movementPattern)) {
      kept.push({
        exerciseId: slot.exerciseId,
        exerciseName: slot.exerciseName,
        movementPattern: slot.movementPattern,
        reason: "no valid rotation pool replacement",
      });
      continue;
    }

    const rotationPool = poolsByMovementPattern.get(slot.movementPattern);
    const nextExerciseId = rotationPool?.exerciseIds[0];
    const nextExercise = nextExerciseId ? getExerciseCatalogExercise(nextExerciseId) : undefined;

    if (
      !nextExercise ||
      nextExercise.movementPattern !== slot.movementPattern ||
      usedNextExerciseIds.has(nextExercise.id)
    ) {
      kept.push({
        exerciseId: slot.exerciseId,
        exerciseName: slot.exerciseName,
        movementPattern: slot.movementPattern,
        reason: "no valid rotation pool replacement",
      });
      continue;
    }

    usedNextExerciseIds.add(nextExercise.id);
    rotated.push({
      movementPattern: slot.movementPattern,
      nextExerciseId: nextExercise.id,
      nextExerciseName: nextExercise.name,
      previousExerciseId: slot.exerciseId,
      previousExerciseName: slot.exerciseName,
      reason: "same Movement Pattern rotation pool",
    });
  }

  const missingPatterns = REQUIRED_TRAINING_BLOCK_MOVEMENT_PATTERNS.filter(
    (movementPattern) => !proposedMovementPatterns.has(movementPattern),
  );

  return {
    kept,
    requiredMovementCoverage: {
      isPreserved: missingPatterns.length === 0,
      missingPatterns,
    },
    rotated,
  };
}

export function applyConfirmedMainCompoundRotations({
  id,
  preview,
  timestamp,
  trainingPlan,
}: {
  id: string;
  preview: MainCompoundRotationPreview;
  timestamp: string;
  trainingPlan: TrainingPlan;
}): TrainingPlan {
  if (!preview.requiredMovementCoverage.isPreserved) {
    throw new Error(
      "Cannot apply rotations that do not preserve required Movement Pattern coverage.",
    );
  }

  const rotationByPreviousExerciseId = new Map(
    preview.rotated.map((rotation) => [rotation.previousExerciseId, rotation]),
  );

  return {
    ...trainingPlan,
    generatedAt: timestamp,
    id,
    updatedAt: timestamp,
    workoutTemplates: trainingPlan.workoutTemplates.map((template) => ({
      ...template,
      supersetGroups: template.supersetGroups.map((group) => ({
        ...group,
        slots: group.slots.map((slot) => {
          const rotation = rotationByPreviousExerciseId.get(slot.exerciseId);

          if (!rotation) {
            return slot;
          }

          return {
            ...slot,
            exerciseId: rotation.nextExerciseId,
            exerciseName: rotation.nextExerciseName,
          };
        }),
      })),
    })),
  };
}

export function generateNextTrainingBlockPreview({
  availableLoadIncrement,
  completedWeeks,
  currentBlock,
  nextBlockId,
  nextPlanId,
  sessions,
  startDate,
  timestamp,
  trainingPlan,
}: {
  availableLoadIncrement: number;
  completedWeeks: ReadonlyArray<number>;
  currentBlock: TrainingBlock;
  nextBlockId: string;
  nextPlanId: string;
  sessions: ReadonlyArray<TrainingSession>;
  startDate: string;
  timestamp: string;
  trainingPlan: TrainingPlan;
}): NextTrainingBlockPreview {
  const rotation = previewMainCompoundRotations({ trainingPlan });
  const nextTrainingPlan = applyConfirmedMainCompoundRotations({
    id: nextPlanId,
    preview: rotation,
    timestamp,
    trainingPlan,
  });
  const trainingBlock = generateNextTrainingBlock({
    completedWeeks,
    currentBlock,
    id: nextBlockId,
    planId: nextPlanId,
    startDate,
  });

  return {
    loadSuggestions: estimateNextTrainingBlockLoadSuggestions({
      availableLoadIncrement,
      sessions,
      targets: getLoadSuggestionTargets(nextTrainingPlan),
    }),
    nextTrainingPlan,
    rotation,
    trainingBlock,
    weeklyIntensityTargets: generateWeeklyIntensityTargets({
      trainingBlockWeeks: nextTrainingPlan.trainingBlockWeeks,
    }),
  };
}

export function applyNextTrainingBlockLoadSuggestions({
  suggestions,
  trainingPlan,
}: {
  suggestions: ReadonlyArray<NextTrainingBlockLoadSuggestion>;
  trainingPlan: TrainingPlan;
}): TrainingPlan {
  return {
    ...trainingPlan,
    startingLoadSuggestions: suggestions.map(
      (suggestion): TrainingPlanStartingLoadSuggestion => ({
        effectiveLoad: suggestion.userEditedLoad ?? suggestion.suggestedLoad,
        exerciseId: suggestion.exerciseId,
        exerciseName: suggestion.exerciseName,
        movementPattern: suggestion.movementPattern,
        previousLoad: suggestion.previousLoad,
        reason: suggestion.reason,
        suggestedLoad: suggestion.suggestedLoad,
        userEditedLoad: suggestion.userEditedLoad,
      }),
    ),
  };
}

export function estimateNextTrainingBlockLoadSuggestions({
  availableLoadIncrement,
  sessions,
  targets,
}: {
  availableLoadIncrement: number;
  sessions: ReadonlyArray<TrainingSession>;
  targets: ReadonlyArray<NextTrainingBlockLoadTarget>;
}): ReadonlyArray<NextTrainingBlockLoadSuggestion> {
  return targets.flatMap((target): ReadonlyArray<NextTrainingBlockLoadSuggestion> => {
    if (isBodyweightLoadTarget(target)) {
      return [
        estimateBodyweightLoadSuggestion({
          availableLoadIncrement,
          sessions,
          target,
        }),
      ];
    }

    const exactExerciseLoad = getLatestCompletedWorkingLoad({
      exerciseId: target.exerciseId,
      sessions,
    });
    const previousLoad =
      exactExerciseLoad ??
      getLatestCompletedWorkingLoad({
        movementPattern: target.movementPattern,
        sessions,
      });

    if (previousLoad === null) {
      return [
        {
          ...target,
          previousLoad,
          reason: "missing workout history, safe default",
          suggestedLoad: DEFAULT_SAFE_STARTING_LOAD,
          userEditedLoad: null,
        },
      ];
    }

    const isExactExercise = exactExerciseLoad !== null;

    return [
      {
        ...target,
        previousLoad,
        reason: isExactExercise ? "same exercise, -5% reset" : "same Movement Pattern, -10% reset",
        suggestedLoad: roundToNearestIncrement(
          previousLoad * (isExactExercise ? 0.95 : 0.9),
          availableLoadIncrement,
        ),
        userEditedLoad: null,
      },
    ];
  });
}

function estimateBodyweightLoadSuggestion({
  availableLoadIncrement,
  sessions,
  target,
}: {
  availableLoadIncrement: number;
  sessions: ReadonlyArray<TrainingSession>;
  target: NextTrainingBlockLoadTarget;
}): NextTrainingBlockLoadSuggestion {
  const exactExerciseLoad = getLatestCompletedBodyweightLoadAdjustment({
    exerciseId: target.exerciseId,
    sessions,
  });
  const previousLoad =
    exactExerciseLoad ??
    getLatestCompletedBodyweightLoadAdjustment({
      movementPattern: target.movementPattern,
      sessions,
    });

  if (previousLoad === null) {
    return {
      ...target,
      previousLoad: 0,
      reason: "bodyweight only, no added load",
      suggestedLoad: 0,
      userEditedLoad: null,
    };
  }

  if (previousLoad === 0) {
    return {
      ...target,
      previousLoad,
      reason: "bodyweight only, no added load",
      suggestedLoad: 0,
      userEditedLoad: null,
    };
  }

  const isExactExercise = exactExerciseLoad !== null;

  return {
    ...target,
    previousLoad,
    reason: getBodyweightLoadAdjustmentReason({
      isExactExercise,
      previousLoad,
    }),
    suggestedLoad: roundToNearestIncrement(
      previousLoad * (isExactExercise ? 0.95 : 0.9),
      availableLoadIncrement,
    ),
    userEditedLoad: null,
  };
}

function getBodyweightLoadAdjustmentReason({
  isExactExercise,
  previousLoad,
}: {
  isExactExercise: boolean;
  previousLoad: number;
}): string {
  if (previousLoad < 0) {
    return isExactExercise
      ? "bodyweight assistance, -5% reset"
      : "compatible bodyweight assistance, -10% reset";
  }

  return isExactExercise
    ? "bodyweight added load, -5% reset"
    : "compatible bodyweight added load, -10% reset";
}

export function applyNextTrainingBlockLoadSuggestionEdit({
  exerciseId,
  suggestions,
  userEditedLoad,
}: {
  exerciseId: string;
  suggestions: ReadonlyArray<NextTrainingBlockLoadSuggestion>;
  userEditedLoad: number;
}): ReadonlyArray<NextTrainingBlockLoadSuggestion> {
  return suggestions.map((suggestion) =>
    suggestion.exerciseId === exerciseId ? { ...suggestion, userEditedLoad } : suggestion,
  );
}

export function generateWeeklyIntensityTargets({
  trainingBlockWeeks,
}: {
  trainingBlockWeeks: number;
}): ReadonlyArray<WeeklyIntensityTarget> {
  return DEFAULT_WEEKLY_INTENSITY_TARGETS.slice(0, trainingBlockWeeks);
}

export function getTrainingBlockExerciseTargetRir({
  role,
  setIndex,
  weekNumber,
  weeklyIntensityTargets,
}: {
  role: TrainingBlockExerciseRole;
  setIndex: number;
  weekNumber: number;
  weeklyIntensityTargets: ReadonlyArray<WeeklyIntensityTarget>;
}): number {
  const weeklyTarget = weeklyIntensityTargets.find((target) => target.weekNumber === weekNumber);
  const targetRir = weeklyTarget?.minTargetRir ?? 2;

  if (role === "main_compound" || role === "secondary_compound") {
    return Math.max(targetRir, 1);
  }

  if (role === "isolation" && setIndex < 3) {
    return Math.max(targetRir, 1);
  }

  return targetRir;
}

export function applyTrainingBlockProgressionRule({
  completedSets,
  repRange,
  targetRir,
}: {
  completedSets: ReadonlyArray<TrainingBlockProgressionSet>;
  repRange: { maxReps: number; minReps: number };
  targetRir: number;
}): TrainingBlockProgressionDecision {
  const completedTopOfRange =
    completedSets.length > 0 &&
    completedSets.every((set) => set.reps >= repRange.maxReps && set.rir >= targetRir);

  if (completedTopOfRange) {
    return {
      reason: "completed all sets at the top of the rep range with target RIR or easier",
      type: "increase_load",
    };
  }

  if (completedSets.some((set) => set.reps < repRange.minReps)) {
    return {
      reason: "missed the lower end of the rep range",
      type: "reduce_load",
    };
  }

  return {
    reason: "progression target not met",
    type: "keep_load",
  };
}

function addInclusiveWeeks(startDate: string, weeks: number): string {
  const date = new Date(`${startDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + weeks * 7 - 1);

  return date.toISOString().slice(0, 10);
}

function getLoadSuggestionTargets(
  trainingPlan: TrainingPlan,
): ReadonlyArray<NextTrainingBlockLoadTarget> {
  const targetsByExerciseId = new Map<string, NextTrainingBlockLoadTarget>();

  for (const slot of trainingPlan.workoutTemplates
    .flatMap((template) => template.supersetGroups)
    .flatMap((group) => group.slots)) {
    if (!targetsByExerciseId.has(slot.exerciseId)) {
      targetsByExerciseId.set(slot.exerciseId, {
        exerciseId: slot.exerciseId,
        exerciseName: slot.exerciseName,
        movementPattern: slot.movementPattern,
      });
    }
  }

  return [...targetsByExerciseId.values()];
}

function getLatestCompletedWorkingLoad({
  exerciseId,
  movementPattern,
  sessions,
}: {
  exerciseId?: string;
  movementPattern?: MovementPatternId;
  sessions: ReadonlyArray<TrainingSession>;
}): number | null {
  const latestEntry = getLatestCompletedExerciseEntry({
    exerciseId,
    movementPattern,
    sessions,
  });
  const latestWorkingSet = latestEntry?.sets
    .filter((set) => set.weight > 0 && set.reps > 0)
    .sort((firstSet, secondSet) => secondSet.setIndex - firstSet.setIndex)[0];

  return latestWorkingSet?.weight ?? null;
}

function getLatestCompletedBodyweightLoadAdjustment({
  exerciseId,
  movementPattern,
  sessions,
}: {
  exerciseId?: string;
  movementPattern?: MovementPatternId;
  sessions: ReadonlyArray<TrainingSession>;
}): number | null {
  const latestEntry = getLatestCompletedExerciseEntry({
    exerciseId,
    entryMatches: isBodyweightLoadTarget,
    movementPattern,
    sessions,
  });
  const latestSet = latestEntry?.sets
    .filter((set) => set.reps > 0)
    .sort((firstSet, secondSet) => secondSet.setIndex - firstSet.setIndex)[0];

  return latestSet?.weight ?? null;
}

function getLatestCompletedExerciseEntry({
  entryMatches = () => true,
  exerciseId,
  movementPattern,
  sessions,
}: {
  entryMatches?: (entry: TrainingSession["exercises"][number]) => boolean;
  exerciseId?: string;
  movementPattern?: MovementPatternId;
  sessions: ReadonlyArray<TrainingSession>;
}): TrainingSession["exercises"][number] | undefined {
  return [...sessions]
    .filter((session) => session.completedAt !== null)
    .sort((firstSession, secondSession) =>
      (secondSession.completedAt ?? "").localeCompare(firstSession.completedAt ?? ""),
    )
    .flatMap((session) => session.exercises)
    .find(
      (entry) =>
        entryMatches(entry) &&
        (exerciseId ? entry.exerciseId === exerciseId : true) &&
        (movementPattern ? entry.movementPattern === movementPattern : true),
    );
}

function roundToNearestIncrement(value: number, increment: number): number {
  return Math.round(value / increment) * increment;
}

function isBodyweightLoadTarget({
  exerciseId,
  exerciseName,
}: Pick<NextTrainingBlockLoadTarget, "exerciseId" | "exerciseName">): boolean {
  return isBodyweightLoadExercise({ exerciseId, exerciseName });
}

function getCompatibleRotationExercise({
  excludedExerciseIds,
  slot,
}: {
  excludedExerciseIds: ReadonlySet<string>;
  slot: TrainingPlan["workoutTemplates"][number]["supersetGroups"][number]["slots"][number];
}) {
  const catalogRole = getCatalogRoleForTrainingPlanRole(slot.role);

  if (!catalogRole) {
    return null;
  }

  return (
    getExerciseCatalogExercisesByMovementPattern(slot.movementPattern).find(
      (exercise) =>
        exercise.id !== slot.exerciseId &&
        exercise.role === catalogRole &&
        !excludedExerciseIds.has(exercise.id) &&
        slot.targetMuscles.every((targetMuscle) =>
          exercise.primaryMuscleGroups.includes(targetMuscle),
        ),
    ) ?? null
  );
}

function getCatalogRoleForTrainingPlanRole(
  role: TrainingPlan["workoutTemplates"][number]["supersetGroups"][number]["slots"][number]["role"],
) {
  if (role === "secondary_compound") {
    return "compound";
  }

  if (role === "isolation") {
    return "isolation";
  }

  return null;
}
