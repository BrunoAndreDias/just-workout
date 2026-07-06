import { getAvoidedExerciseIds } from "../plan-builder/exercise-selection-preferences";
import {
  getIsolationExercisePreferenceExerciseIds,
  normalizeIsolationExercisePreferences,
} from "../plan-builder/isolation-exercise-preferences";
import {
  getExerciseCatalogExercise,
  getExerciseCatalogExercisesByMovementPattern,
  isCompoundCapableMovementPattern,
  type MovementPatternId,
} from "../training-taxonomy";
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

export type TrainingBlockExerciseRotationPreviewItem = {
  groupId: string;
  movementPattern: MovementPatternId;
  nextExerciseId: string;
  nextExerciseName: string;
  previousExerciseId: string;
  previousExerciseName: string;
  reason: string;
  role: TrainingBlockExerciseRole;
  slotIndex: number;
  slotLabel: string;
  templateId: string;
  templateLabel: string;
};

export type TrainingBlockKeptExercisePreviewItem = {
  exerciseId: string;
  exerciseName: string;
  groupId: string;
  movementPattern: MovementPatternId;
  reason: string;
  role: TrainingBlockExerciseRole;
  slotIndex: number;
  slotLabel: string;
  templateId: string;
  templateLabel: string;
};

export type TrainingBlockExerciseRotationPreview = {
  kept: ReadonlyArray<TrainingBlockKeptExercisePreviewItem>;
  requiredMovementCoverage: RequiredMovementCoverageResult;
  rotated: ReadonlyArray<TrainingBlockExerciseRotationPreviewItem>;
};

export type TrainingBlockExerciseSwapChoice = {
  exerciseId: string;
  exerciseName: string;
  reason: string;
};

export type TrainingBlockExerciseSwapSlotLocator = {
  groupId: string;
  slotIndex: number;
  templateId: string;
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
  kind: "exact_previous_exercise" | "first_time";
  previousLoad: number | null;
  reason: string;
  suggestedLoad: number | null;
  userEditedLoad: number | null;
};

export type WeeklyIntensityTarget = {
  maxTargetRir: number;
  minTargetRir: number;
  weekNumber: number;
};

export type TrainingBlockExerciseRole =
  TrainingPlan["workoutTemplates"][number]["supersetGroups"][number]["slots"][number]["role"];

type TrainingPlanSlot =
  TrainingPlan["workoutTemplates"][number]["supersetGroups"][number]["slots"][number];

type TemplateSlotContext = {
  groupId: string;
  slot: TrainingPlanSlot;
  slotIndex: number;
  slotLabel: string;
  templateId: string;
  templateLabel: string;
};

type RotationProposalOption = {
  nextExerciseId: string;
  nextExerciseName: string;
  reason: string;
  type: "keep" | "rotate";
};

export type TrainingBlockProgressionSet = {
  reps: number;
  rir: number | null;
  targetRir?: number;
};

export type TrainingBlockProgressionDecision = {
  reason: string;
  type: "increase_load" | "keep_load" | "reduce_load";
};

export type NextTrainingBlockPreview = {
  loadSuggestions: ReadonlyArray<NextTrainingBlockLoadSuggestion>;
  nextTrainingPlan: TrainingPlan;
  rotation: TrainingBlockExerciseRotationPreview;
  trainingBlock: TrainingBlock;
  weeklyIntensityTargets: ReadonlyArray<WeeklyIntensityTarget>;
};

const DEFAULT_AVAILABLE_LOAD_INCREMENT = 2.5;
const DEFAULT_TRAINING_BLOCK_WEEKS = 6;
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

export function previewTrainingBlockExerciseRotations({
  sessions = [],
  trainingPlan,
}: {
  sessions?: ReadonlyArray<TrainingSession>;
  trainingPlan: TrainingPlan;
}): TrainingBlockExerciseRotationPreview {
  const poolsByMovementPattern = new Map(
    trainingPlan.mainCompoundRotationPools.map((pool) => [pool.movementPattern, pool]),
  );
  const avoidedExerciseIds = getAvoidedExerciseIds(trainingPlan.exerciseSelectionPreferences);
  const isolationExercisePreferences = normalizeIsolationExercisePreferences(
    trainingPlan.isolationExercisePreferences,
  );
  const performedExerciseIds = getPerformedExerciseIds({
    sessions,
    trainingPlan,
  });
  const previousBlockExerciseIds = getPreviousBlockExerciseIds({
    sessions,
    trainingPlan,
  });
  const kept: TrainingBlockKeptExercisePreviewItem[] = [];
  const rotated: TrainingBlockExerciseRotationPreviewItem[] = [];
  const proposedMovementPatterns = new Set<MovementPatternId>();

  for (const workoutTemplate of trainingPlan.workoutTemplates) {
    const templateAssignments = assignTemplateRotationOptions({
      avoidedExerciseIds,
      isolationExercisePreferences,
      performedExerciseIds,
      poolsByMovementPattern,
      previousBlockExerciseIds,
      workoutTemplate,
    });

    for (const assignment of templateAssignments) {
      proposedMovementPatterns.add(assignment.slot.movementPattern);

      if (assignment.option.type === "keep") {
        kept.push({
          exerciseId: assignment.slot.exerciseId,
          exerciseName: assignment.slot.exerciseName,
          groupId: assignment.groupId,
          movementPattern: assignment.slot.movementPattern,
          reason: assignment.option.reason,
          role: assignment.slot.role,
          slotIndex: assignment.slotIndex,
          slotLabel: assignment.slotLabel,
          templateId: assignment.templateId,
          templateLabel: assignment.templateLabel,
        });
        continue;
      }

      rotated.push({
        groupId: assignment.groupId,
        movementPattern: assignment.slot.movementPattern,
        nextExerciseId: assignment.option.nextExerciseId,
        nextExerciseName: assignment.option.nextExerciseName,
        previousExerciseId: assignment.slot.exerciseId,
        previousExerciseName: assignment.slot.exerciseName,
        reason: assignment.option.reason,
        role: assignment.slot.role,
        slotIndex: assignment.slotIndex,
        slotLabel: assignment.slotLabel,
        templateId: assignment.templateId,
        templateLabel: assignment.templateLabel,
      });
    }
  }

  return {
    kept,
    requiredMovementCoverage: getRequiredMovementCoverageResult(proposedMovementPatterns),
    rotated,
  };
}

/**
 * Creates a rotation preview that keeps every current exercise for users who skip the proposal.
 */
export function createSkippedTrainingBlockExerciseRotationPreview({
  trainingPlan,
}: {
  trainingPlan: TrainingPlan;
}): TrainingBlockExerciseRotationPreview {
  const kept = trainingPlan.workoutTemplates.flatMap((template) =>
    template.supersetGroups.flatMap((group) =>
      group.slots.map((slot, slotIndex) => ({
        exerciseId: slot.exerciseId,
        exerciseName: slot.exerciseName,
        groupId: group.id,
        movementPattern: slot.movementPattern,
        reason: "kept current exercise after skipping the rotation proposal",
        role: slot.role,
        slotIndex,
        slotLabel: slot.slotLabel,
        templateId: template.id,
        templateLabel: template.label,
      })),
    ),
  );
  const proposedMovementPatterns = new Set(
    kept.map((item) => item.movementPattern),
  ) as ReadonlySet<MovementPatternId>;

  return {
    kept,
    requiredMovementCoverage: getRequiredMovementCoverageResult(proposedMovementPatterns),
    rotated: [],
  };
}

export function getTrainingBlockExerciseSwapChoices({
  groupId,
  slotIndex,
  templateId,
  trainingPlan,
}: TrainingBlockExerciseSwapSlotLocator & {
  trainingPlan: Pick<
    TrainingPlan,
    | "exerciseSelectionPreferences"
    | "isolationExercisePreferences"
    | "mainCompoundRotationPools"
    | "trainingBlock"
    | "workoutTemplates"
  >;
}): ReadonlyArray<TrainingBlockExerciseSwapChoice> {
  const resolvedSlot = resolveTrainingBlockExerciseSwapSlot({
    groupId,
    slotIndex,
    templateId,
    workoutTemplates: trainingPlan.workoutTemplates,
  });
  const avoidedExerciseIds = getAvoidedExerciseIds(trainingPlan.exerciseSelectionPreferences);
  const isolationExercisePreferences = normalizeIsolationExercisePreferences(
    trainingPlan.isolationExercisePreferences,
  );
  const poolsByMovementPattern = new Map(
    trainingPlan.mainCompoundRotationPools.map((pool) => [pool.movementPattern, pool]),
  );
  const compatibleChoices = getRotationExerciseChoices({
    avoidedExerciseIds,
    isolationExercisePreferences,
    performedExerciseIds: new Set<string>(),
    poolsByMovementPattern,
    previousBlockExerciseIds: new Set<string>(),
    slot: resolvedSlot.slot,
  }).filter(
    (choice) =>
      !wouldExerciseSwapCreateDuplicateInTemplate({
        exerciseId: choice.id,
        slotIndex,
        template: resolvedSlot.template,
      }),
  );

  return [
    {
      exerciseId: resolvedSlot.slot.exerciseId,
      exerciseName: resolvedSlot.slot.exerciseName,
      reason: "current exercise in this slot",
    },
    ...compatibleChoices.map((choice) => ({
      exerciseId: choice.id,
      exerciseName: choice.name,
      reason: choice.reason,
    })),
  ];
}

export function getTrainingBlockExerciseSwapAffectedSlotCount(
  input: TrainingBlockExerciseSwapSlotLocator,
): number {
  return input.slotIndex >= 0 ? 1 : 0;
}

export function applyTrainingBlockExerciseSwapToPreview({
  availableLoadIncrement = DEFAULT_AVAILABLE_LOAD_INCREMENT,
  groupId,
  nextExerciseId,
  preview,
  sessions,
  slotIndex,
  templateId,
}: TrainingBlockExerciseSwapSlotLocator & {
  availableLoadIncrement?: number;
  nextExerciseId: string;
  preview: NextTrainingBlockPreview;
  sessions: ReadonlyArray<TrainingSession>;
}): NextTrainingBlockPreview {
  const swapChoice = resolveTrainingBlockExerciseSwapChoice({
    groupId,
    nextExerciseId,
    slotIndex,
    templateId,
    trainingPlan: preview.nextTrainingPlan,
  });
  const nextExercise = getExerciseCatalogExercise(swapChoice.exerciseId);

  if (!nextExercise) {
    throw new Error("Expected a compatible exercise for the Training Block swap.");
  }

  const nextTrainingPlan = {
    ...preview.nextTrainingPlan,
    workoutTemplates: applyTrainingBlockExerciseSwapToWorkoutTemplates({
      groupId,
      nextExercise,
      slotIndex,
      templateId,
      workoutTemplates: preview.nextTrainingPlan.workoutTemplates,
    }),
  };

  return {
    ...preview,
    loadSuggestions: estimateNextTrainingBlockLoadSuggestions({
      availableLoadIncrement,
      sessions,
      targets: getLoadSuggestionTargets(nextTrainingPlan),
    }),
    nextTrainingPlan,
    rotation: applyTrainingBlockExerciseSwapToRotationPreview({
      groupId,
      nextExercise,
      preview: preview.rotation,
      slotIndex,
      templateId,
    }),
  };
}

export function applyTrainingBlockExerciseSwapToTrainingPlan({
  groupId,
  nextExerciseId,
  slotIndex,
  templateId,
  timestamp,
  trainingPlan,
}: TrainingBlockExerciseSwapSlotLocator & {
  nextExerciseId: string;
  timestamp: string;
  trainingPlan: TrainingPlan;
}): TrainingPlan {
  const swapChoice = resolveTrainingBlockExerciseSwapChoice({
    groupId,
    nextExerciseId,
    slotIndex,
    templateId,
    trainingPlan,
  });
  const nextExercise = getExerciseCatalogExercise(swapChoice.exerciseId);

  if (!nextExercise) {
    throw new Error("Expected a compatible exercise for the Training Block swap.");
  }

  return {
    ...trainingPlan,
    updatedAt: timestamp,
    workoutTemplates: applyTrainingBlockExerciseSwapToWorkoutTemplates({
      groupId,
      nextExercise,
      slotIndex,
      templateId,
      workoutTemplates: trainingPlan.workoutTemplates,
    }),
  };
}

export function hasCompletedTrainingBlockSessions({
  trainingBlock,
  trainingSessions,
}: {
  trainingBlock: TrainingBlock | null | undefined;
  trainingSessions: ReadonlyArray<TrainingSession>;
}): boolean {
  if (!trainingBlock) {
    return false;
  }

  return trainingSessions.some((trainingSession) =>
    isSessionFromCurrentTrainingBlock({
      session: trainingSession,
      trainingBlock,
    }),
  );
}

export function applyConfirmedTrainingBlockExerciseRotations({
  id,
  preview,
  timestamp,
  trainingPlan,
}: {
  id: string;
  preview: TrainingBlockExerciseRotationPreview;
  timestamp: string;
  trainingPlan: TrainingPlan;
}): TrainingPlan {
  if (!preview.requiredMovementCoverage.isPreserved) {
    throw new Error(
      "Cannot apply rotations that do not preserve required Movement Pattern coverage.",
    );
  }

  const rotationBySlotKey = new Map(
    preview.rotated.map((rotation) => [getTemplateSlotKey(rotation), rotation]),
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
        slots: group.slots.map((slot, slotIndex) => {
          const rotation = rotationBySlotKey.get(
            getTemplateSlotKey({
              groupId: group.id,
              slotIndex,
              templateId: template.id,
            }),
          );

          if (!rotation) {
            return slot;
          }

          const nextExercise = getExerciseCatalogExercise(rotation.nextExerciseId);

          return {
            ...slot,
            exerciseId: rotation.nextExerciseId,
            exerciseName: rotation.nextExerciseName,
            movementPattern: nextExercise?.movementPattern ?? slot.movementPattern,
            targetMuscles: nextExercise?.primaryMuscleGroups ?? slot.targetMuscles,
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
  rotationPreview,
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
  rotationPreview?: TrainingBlockExerciseRotationPreview;
  sessions: ReadonlyArray<TrainingSession>;
  startDate: string;
  timestamp: string;
  trainingPlan: TrainingPlan;
}): NextTrainingBlockPreview {
  const rotation =
    rotationPreview ?? previewTrainingBlockExerciseRotations({ sessions, trainingPlan });
  const nextTrainingPlan = applyConfirmedTrainingBlockExerciseRotations({
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
        effectiveLoad: suggestion.userEditedLoad ?? suggestion.suggestedLoad ?? null,
        exerciseId: suggestion.exerciseId,
        exerciseName: suggestion.exerciseName,
        kind: suggestion.kind,
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
  return targets.map((target): NextTrainingBlockLoadSuggestion => {
    if (isBodyweightLoadTarget(target)) {
      return estimateBodyweightLoadSuggestion({
        availableLoadIncrement,
        sessions,
        target,
      });
    }

    const exactExerciseLoad = getLatestCompletedWorkingLoad({
      exerciseId: target.exerciseId,
      sessions,
    });

    if (exactExerciseLoad === null) {
      return {
        ...target,
        kind: "first_time",
        previousLoad: null,
        reason: "first-time exercise, start empty",
        suggestedLoad: null,
        userEditedLoad: null,
      };
    }

    return {
      ...target,
      kind: "exact_previous_exercise",
      previousLoad: exactExerciseLoad,
      reason: "previous exact exercise load prefill",
      suggestedLoad: roundToNearestIncrement(exactExerciseLoad, availableLoadIncrement),
      userEditedLoad: null,
    };
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

  if (exactExerciseLoad === null) {
    return {
      ...target,
      kind: "first_time",
      previousLoad: null,
      reason: "first-time exercise, start empty",
      suggestedLoad: null,
      userEditedLoad: null,
    };
  }

  if (exactExerciseLoad === 0) {
    return {
      ...target,
      kind: "exact_previous_exercise",
      previousLoad: exactExerciseLoad,
      reason: "previous exact exercise load prefill",
      suggestedLoad: 0,
      userEditedLoad: null,
    };
  }

  return {
    ...target,
    kind: "exact_previous_exercise",
    previousLoad: exactExerciseLoad,
    reason: "previous exact exercise load prefill",
    suggestedLoad: roundToNearestIncrement(exactExerciseLoad, availableLoadIncrement),
    userEditedLoad: null,
  };
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
  plannedSetCount = completedSets.length,
  repRange,
  targetRir,
}: {
  completedSets: ReadonlyArray<TrainingBlockProgressionSet>;
  plannedSetCount?: number;
  repRange: { maxReps: number; minReps: number };
  targetRir: number;
}): TrainingBlockProgressionDecision {
  const completedTopOfRange =
    completedSets.length > 0 &&
    completedSets.length === plannedSetCount &&
    completedSets.every(
      (set) =>
        set.reps >= repRange.maxReps && set.rir !== null && set.rir >= (set.targetRir ?? targetRir),
    );

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

function getRequiredMovementCoverageResult(
  proposedMovementPatterns: ReadonlySet<MovementPatternId>,
): RequiredMovementCoverageResult {
  const missingPatterns = REQUIRED_TRAINING_BLOCK_MOVEMENT_PATTERNS.filter(
    (movementPattern) => !proposedMovementPatterns.has(movementPattern),
  );

  return {
    isPreserved: missingPatterns.length === 0,
    missingPatterns,
  };
}

function isBodyweightLoadTarget({
  exerciseId,
  exerciseName,
}: Pick<NextTrainingBlockLoadTarget, "exerciseId" | "exerciseName">): boolean {
  return isBodyweightLoadExercise({ exerciseId, exerciseName });
}

function assignTemplateRotationOptions({
  avoidedExerciseIds,
  isolationExercisePreferences,
  performedExerciseIds,
  poolsByMovementPattern,
  previousBlockExerciseIds,
  workoutTemplate,
}: {
  avoidedExerciseIds: ReadonlySet<string>;
  isolationExercisePreferences: ReturnType<typeof normalizeIsolationExercisePreferences>;
  performedExerciseIds: ReadonlySet<string>;
  poolsByMovementPattern: ReadonlyMap<
    MovementPatternId,
    TrainingPlan["mainCompoundRotationPools"][number]
  >;
  previousBlockExerciseIds: ReadonlySet<string>;
  workoutTemplate: TrainingPlan["workoutTemplates"][number];
}): ReadonlyArray<TemplateSlotContext & { option: RotationProposalOption }> {
  const slotContexts = workoutTemplate.supersetGroups.flatMap((group) =>
    group.slots.map(
      (slot, slotIndex): TemplateSlotContext => ({
        groupId: group.id,
        slot,
        slotIndex,
        slotLabel: slot.slotLabel,
        templateId: workoutTemplate.id,
        templateLabel: workoutTemplate.label,
      }),
    ),
  );
  const slotProposals = slotContexts.map((slotContext, originalIndex) => ({
    options: buildSlotRotationOptions({
      avoidedExerciseIds,
      isolationExercisePreferences,
      performedExerciseIds,
      poolsByMovementPattern,
      previousBlockExerciseIds,
      slot: slotContext.slot,
    }),
    originalIndex,
  }));
  const resolvedOptions = chooseTemplateRotationOptions({
    slotProposals: [...slotProposals].sort(
      (firstProposal, secondProposal) =>
        firstProposal.options.length - secondProposal.options.length ||
        firstProposal.originalIndex - secondProposal.originalIndex,
    ),
  });

  if (!resolvedOptions) {
    throw new Error("Cannot resolve a unique Training Block rotation proposal for this template.");
  }

  return slotContexts.map((slotContext, originalIndex) => {
    const option = resolvedOptions.get(originalIndex);

    if (!option) {
      throw new Error("Expected a rotation proposal option for every template slot.");
    }

    return {
      ...slotContext,
      option,
    };
  });
}

function getCatalogRoleForTrainingPlanRole(role: TrainingPlanSlot["role"]) {
  if (role === "main_compound" || role === "secondary_compound") {
    return "compound";
  }

  if (role === "isolation" || role === "abs") {
    return "isolation";
  }

  return null;
}

function chooseTemplateRotationOptions({
  slotProposals,
}: {
  slotProposals: ReadonlyArray<{
    options: ReadonlyArray<RotationProposalOption>;
    originalIndex: number;
  }>;
}): Map<number, RotationProposalOption> | null {
  const chosenOptions = new Map<number, RotationProposalOption>();
  const usedExerciseIds = new Set<string>();

  function chooseOption(proposalIndex: number): boolean {
    if (proposalIndex >= slotProposals.length) {
      return true;
    }

    const slotProposal = slotProposals[proposalIndex];

    if (!slotProposal) {
      return true;
    }

    for (const option of slotProposal.options) {
      if (usedExerciseIds.has(option.nextExerciseId)) {
        continue;
      }

      usedExerciseIds.add(option.nextExerciseId);
      chosenOptions.set(slotProposal.originalIndex, option);

      if (chooseOption(proposalIndex + 1)) {
        return true;
      }

      chosenOptions.delete(slotProposal.originalIndex);
      usedExerciseIds.delete(option.nextExerciseId);
    }

    return false;
  }

  return chooseOption(0) ? new Map(chosenOptions) : null;
}

function buildSlotRotationOptions({
  avoidedExerciseIds,
  isolationExercisePreferences,
  performedExerciseIds,
  poolsByMovementPattern,
  previousBlockExerciseIds,
  slot,
}: {
  avoidedExerciseIds: ReadonlySet<string>;
  isolationExercisePreferences: ReturnType<typeof normalizeIsolationExercisePreferences>;
  performedExerciseIds: ReadonlySet<string>;
  poolsByMovementPattern: ReadonlyMap<
    MovementPatternId,
    TrainingPlan["mainCompoundRotationPools"][number]
  >;
  previousBlockExerciseIds: ReadonlySet<string>;
  slot: TrainingPlanSlot;
}): ReadonlyArray<RotationProposalOption> {
  const replacementOptions = getRotationExerciseChoices({
    avoidedExerciseIds,
    isolationExercisePreferences,
    performedExerciseIds,
    poolsByMovementPattern,
    previousBlockExerciseIds,
    slot,
  }).map(
    (choice): RotationProposalOption => ({
      nextExerciseId: choice.id,
      nextExerciseName: choice.name,
      reason: choice.reason,
      type: "rotate",
    }),
  );

  if (replacementOptions.length === 0) {
    return [
      {
        nextExerciseId: slot.exerciseId,
        nextExerciseName: slot.exerciseName,
        reason: "no compatible role and target muscle replacement",
        type: "keep",
      },
    ];
  }

  return [
    ...replacementOptions,
    {
      nextExerciseId: slot.exerciseId,
      nextExerciseName: slot.exerciseName,
      reason: "kept to avoid a duplicate in this Workout Template",
      type: "keep",
    },
  ];
}

function getRotationExerciseChoices({
  avoidedExerciseIds,
  isolationExercisePreferences,
  performedExerciseIds,
  poolsByMovementPattern,
  previousBlockExerciseIds,
  slot,
}: {
  avoidedExerciseIds: ReadonlySet<string>;
  isolationExercisePreferences: ReturnType<typeof normalizeIsolationExercisePreferences>;
  performedExerciseIds: ReadonlySet<string>;
  poolsByMovementPattern: ReadonlyMap<
    MovementPatternId,
    TrainingPlan["mainCompoundRotationPools"][number]
  >;
  previousBlockExerciseIds: ReadonlySet<string>;
  slot: TrainingPlanSlot;
}): ReadonlyArray<{ id: string; name: string; reason: string }> {
  const choices: Array<{ id: string; name: string; reason: string }> = [];
  const seenExerciseIds = new Set<string>();

  if (slot.role === "main_compound") {
    appendRotationExerciseChoices({
      candidateExerciseIds: getCompatibleRotationPoolExerciseIds({
        avoidedExerciseIds,
        poolsByMovementPattern,
        slot,
      }),
      choices,
      performedExerciseIds,
      previousBlockExerciseIds,
      reason: "same Movement Pattern rotation pool",
      seenExerciseIds,
    });
  }

  if (slot.role === "isolation" || slot.role === "abs") {
    appendRotationExerciseChoices({
      candidateExerciseIds: getCompatibleIsolationPreferenceExerciseIds({
        avoidedExerciseIds,
        isolationExercisePreferences,
        slot,
      }),
      choices,
      performedExerciseIds,
      previousBlockExerciseIds,
      reason: slot.role === "abs" ? "preferred abs exercise" : "preferred isolation exercise",
      seenExerciseIds,
    });
  }

  appendRotationExerciseChoices({
    candidateExerciseIds: getCompatibleCatalogExerciseIds({
      avoidedExerciseIds,
      slot,
    }),
    choices,
    performedExerciseIds,
    previousBlockExerciseIds,
    reason: getCompatibleCatalogReason(slot.role),
    seenExerciseIds,
  });

  return choices;
}

function appendRotationExerciseChoices({
  candidateExerciseIds,
  choices,
  performedExerciseIds,
  previousBlockExerciseIds,
  reason,
  seenExerciseIds,
}: {
  candidateExerciseIds: ReadonlyArray<string>;
  choices: Array<{ id: string; name: string; reason: string }>;
  performedExerciseIds: ReadonlySet<string>;
  previousBlockExerciseIds: ReadonlySet<string>;
  reason: string;
  seenExerciseIds: Set<string>;
}) {
  for (const exerciseId of sortExerciseIdsByNovelty({
    candidateExerciseIds,
    performedExerciseIds,
    previousBlockExerciseIds,
  })) {
    if (seenExerciseIds.has(exerciseId)) {
      continue;
    }

    const exercise = getExerciseCatalogExercise(exerciseId);

    if (!exercise) {
      continue;
    }

    seenExerciseIds.add(exercise.id);
    choices.push({
      id: exercise.id,
      name: exercise.name,
      reason,
    });
  }
}

function sortExerciseIdsByNovelty({
  candidateExerciseIds,
  performedExerciseIds,
  previousBlockExerciseIds,
}: {
  candidateExerciseIds: ReadonlyArray<string>;
  performedExerciseIds: ReadonlySet<string>;
  previousBlockExerciseIds: ReadonlySet<string>;
}): Array<string> {
  return [...candidateExerciseIds].sort(
    (firstExerciseId, secondExerciseId) =>
      getExerciseNoveltyRank({
        exerciseId: firstExerciseId,
        performedExerciseIds,
        previousBlockExerciseIds,
      }) -
      getExerciseNoveltyRank({
        exerciseId: secondExerciseId,
        performedExerciseIds,
        previousBlockExerciseIds,
      }),
  );
}

function getExerciseNoveltyRank({
  exerciseId,
  performedExerciseIds,
  previousBlockExerciseIds,
}: {
  exerciseId: string;
  performedExerciseIds: ReadonlySet<string>;
  previousBlockExerciseIds: ReadonlySet<string>;
}): number {
  if (!performedExerciseIds.has(exerciseId)) {
    return 0;
  }

  if (!previousBlockExerciseIds.has(exerciseId)) {
    return 1;
  }

  return 2;
}

function getPerformedExerciseIds({
  sessions,
  trainingPlan,
}: {
  sessions: ReadonlyArray<TrainingSession>;
  trainingPlan: TrainingPlan;
}): ReadonlySet<string> {
  const performedExerciseIds = new Set<string>();

  for (const session of sessions) {
    if (session.planId !== trainingPlan.id || session.completedAt === null) {
      continue;
    }

    for (const exercise of session.exercises) {
      performedExerciseIds.add(exercise.exerciseId);
    }
  }

  return performedExerciseIds;
}

function getPreviousBlockExerciseIds({
  sessions,
  trainingPlan,
}: {
  sessions: ReadonlyArray<TrainingSession>;
  trainingPlan: TrainingPlan;
}): ReadonlySet<string> {
  const currentTrainingBlock = trainingPlan.trainingBlock;

  if (!currentTrainingBlock) {
    return new Set<string>();
  }

  const previousBlockExerciseIds = new Set<string>();

  for (const session of sessions) {
    if (!isSessionFromCurrentTrainingBlock({ session, trainingBlock: currentTrainingBlock })) {
      continue;
    }

    for (const exercise of session.exercises) {
      previousBlockExerciseIds.add(exercise.exerciseId);
    }
  }

  return previousBlockExerciseIds;
}

function isSessionFromCurrentTrainingBlock({
  session,
  trainingBlock,
}: {
  session: TrainingSession;
  trainingBlock: TrainingBlock;
}): boolean {
  if (
    session.planId !== trainingBlock.planId ||
    session.completedAt === null ||
    session.completedAt.length < 10
  ) {
    return false;
  }

  if (session.trainingBlockId) {
    return session.trainingBlockId === trainingBlock.id;
  }

  const completedDate = session.completedAt.slice(0, 10);

  return completedDate >= trainingBlock.startDate && completedDate <= trainingBlock.endDate;
}

function getCompatibleRotationPoolExerciseIds({
  avoidedExerciseIds,
  poolsByMovementPattern,
  slot,
}: {
  avoidedExerciseIds: ReadonlySet<string>;
  poolsByMovementPattern: ReadonlyMap<
    MovementPatternId,
    TrainingPlan["mainCompoundRotationPools"][number]
  >;
  slot: TrainingPlanSlot;
}): ReadonlyArray<string> {
  if (slot.role !== "main_compound" || !isCompoundCapableMovementPattern(slot.movementPattern)) {
    return [];
  }

  return (poolsByMovementPattern.get(slot.movementPattern)?.exerciseIds ?? []).filter(
    (exerciseId) => isCompatibleRotationExercise({ avoidedExerciseIds, exerciseId, slot }),
  );
}

function getCompatibleIsolationPreferenceExerciseIds({
  avoidedExerciseIds,
  isolationExercisePreferences,
  slot,
}: {
  avoidedExerciseIds: ReadonlySet<string>;
  isolationExercisePreferences: ReturnType<typeof normalizeIsolationExercisePreferences>;
  slot: TrainingPlanSlot;
}): ReadonlyArray<string> {
  if (slot.role !== "isolation" && slot.role !== "abs") {
    return [];
  }

  return Array.from(
    new Set(
      slot.targetMuscles.flatMap((targetMuscle) =>
        getIsolationExercisePreferenceExerciseIds({
          preferences: isolationExercisePreferences,
          primaryMuscleGroup: targetMuscle,
        }),
      ),
    ),
  ).filter((exerciseId) => isCompatibleRotationExercise({ avoidedExerciseIds, exerciseId, slot }));
}

function getCompatibleCatalogExerciseIds({
  avoidedExerciseIds,
  slot,
}: {
  avoidedExerciseIds: ReadonlySet<string>;
  slot: TrainingPlanSlot;
}): ReadonlyArray<string> {
  return getExerciseCatalogExercisesByMovementPattern(slot.movementPattern)
    .map((exercise) => exercise.id)
    .filter((exerciseId) => isCompatibleRotationExercise({ avoidedExerciseIds, exerciseId, slot }));
}

function isCompatibleRotationExercise({
  avoidedExerciseIds,
  exerciseId,
  slot,
}: {
  avoidedExerciseIds: ReadonlySet<string>;
  exerciseId: string;
  slot: TrainingPlanSlot;
}): boolean {
  const exercise = getExerciseCatalogExercise(exerciseId);
  const catalogRole = getCatalogRoleForTrainingPlanRole(slot.role);

  if (
    !exercise ||
    !catalogRole ||
    exercise.id === slot.exerciseId ||
    avoidedExerciseIds.has(exercise.id)
  ) {
    return false;
  }

  return (
    exercise.movementPattern === slot.movementPattern &&
    exercise.role === catalogRole &&
    slot.targetMuscles.every((targetMuscle) => exercise.primaryMuscleGroups.includes(targetMuscle))
  );
}

function getCompatibleCatalogReason(role: TrainingPlanSlot["role"]): string {
  if (role === "main_compound") {
    return "compatible main compound fallback";
  }

  if (role === "secondary_compound") {
    return "compatible secondary compound";
  }

  return role === "abs" ? "compatible abs exercise" : "compatible isolation exercise";
}

function getTemplateSlotKey({
  groupId,
  slotIndex,
  templateId,
}: {
  groupId: string;
  slotIndex: number;
  templateId: string;
}): string {
  return `${templateId}:${groupId}:${slotIndex}`;
}

function resolveTrainingBlockExerciseSwapChoice({
  groupId,
  nextExerciseId,
  slotIndex,
  templateId,
  trainingPlan,
}: TrainingBlockExerciseSwapSlotLocator & {
  nextExerciseId: string;
  trainingPlan: Pick<
    TrainingPlan,
    | "exerciseSelectionPreferences"
    | "isolationExercisePreferences"
    | "mainCompoundRotationPools"
    | "trainingBlock"
    | "workoutTemplates"
  >;
}): TrainingBlockExerciseSwapChoice {
  const swapChoice = getTrainingBlockExerciseSwapChoices({
    groupId,
    slotIndex,
    templateId,
    trainingPlan,
  }).find((choice) => choice.exerciseId === nextExerciseId);

  if (!swapChoice) {
    throw new Error("Cannot apply an incompatible Training Block swap.");
  }

  return swapChoice;
}

function resolveTrainingBlockExerciseSwapSlot({
  groupId,
  slotIndex,
  templateId,
  workoutTemplates,
}: TrainingBlockExerciseSwapSlotLocator & {
  workoutTemplates: ReadonlyArray<TrainingPlan["workoutTemplates"][number]>;
}): {
  slot: TrainingPlan["workoutTemplates"][number]["supersetGroups"][number]["slots"][number];
  template: TrainingPlan["workoutTemplates"][number];
} {
  const template = workoutTemplates.find((workoutTemplate) => workoutTemplate.id === templateId);
  const group = template?.supersetGroups.find((supersetGroup) => supersetGroup.id === groupId);
  const slot = group?.slots[slotIndex];

  if (!template || !group || !slot) {
    throw new Error("Cannot resolve the requested Training Block exercise swap slot.");
  }

  return {
    slot,
    template,
  };
}

function wouldExerciseSwapCreateDuplicateInTemplate({
  exerciseId,
  slotIndex,
  template,
}: {
  exerciseId: string;
  slotIndex: number;
  template: TrainingPlan["workoutTemplates"][number];
}): boolean {
  return template.supersetGroups.some((group) =>
    group.slots.some(
      (slot, currentSlotIndex) => slot.exerciseId === exerciseId && currentSlotIndex !== slotIndex,
    ),
  );
}

function applyTrainingBlockExerciseSwapToWorkoutTemplates({
  groupId,
  nextExercise,
  slotIndex,
  templateId,
  workoutTemplates,
}: TrainingBlockExerciseSwapSlotLocator & {
  nextExercise: NonNullable<ReturnType<typeof getExerciseCatalogExercise>>;
  workoutTemplates: ReadonlyArray<TrainingPlan["workoutTemplates"][number]>;
}): ReadonlyArray<TrainingPlan["workoutTemplates"][number]> {
  return workoutTemplates.map((template) =>
    template.id !== templateId
      ? template
      : {
          ...template,
          supersetGroups: template.supersetGroups.map((group) =>
            group.id !== groupId
              ? group
              : {
                  ...group,
                  slots: group.slots.map((slot, currentSlotIndex) =>
                    currentSlotIndex !== slotIndex
                      ? slot
                      : {
                          ...slot,
                          exerciseId: nextExercise.id,
                          exerciseName: nextExercise.name,
                          movementPattern: nextExercise.movementPattern,
                          targetMuscles: nextExercise.primaryMuscleGroups,
                        },
                  ),
                },
          ),
        },
  );
}

function applyTrainingBlockExerciseSwapToRotationPreview({
  groupId,
  nextExercise,
  preview,
  slotIndex,
  templateId,
}: TrainingBlockExerciseSwapSlotLocator & {
  nextExercise: NonNullable<ReturnType<typeof getExerciseCatalogExercise>>;
  preview: TrainingBlockExerciseRotationPreview;
}): TrainingBlockExerciseRotationPreview {
  const matchedRotation = preview.rotated.find(
    (rotation) =>
      rotation.groupId === groupId &&
      rotation.slotIndex === slotIndex &&
      rotation.templateId === templateId,
  );

  if (matchedRotation) {
    if (nextExercise.id === matchedRotation.previousExerciseId) {
      return {
        ...preview,
        kept: [
          ...preview.kept,
          {
            exerciseId: matchedRotation.previousExerciseId,
            exerciseName: matchedRotation.previousExerciseName,
            groupId: matchedRotation.groupId,
            movementPattern: matchedRotation.movementPattern,
            reason: "kept current exercise after a user-selected swap",
            role: matchedRotation.role,
            slotIndex: matchedRotation.slotIndex,
            slotLabel: matchedRotation.slotLabel,
            templateId: matchedRotation.templateId,
            templateLabel: matchedRotation.templateLabel,
          },
        ],
        rotated: preview.rotated.filter(
          (rotation) =>
            !(
              rotation.groupId === groupId &&
              rotation.slotIndex === slotIndex &&
              rotation.templateId === templateId
            ),
        ),
      };
    }

    return {
      ...preview,
      rotated: preview.rotated.map((rotation) =>
        rotation.groupId === groupId &&
        rotation.slotIndex === slotIndex &&
        rotation.templateId === templateId
          ? {
              ...rotation,
              nextExerciseId: nextExercise.id,
              nextExerciseName: nextExercise.name,
              reason: "user-selected compatible exercise",
            }
          : rotation,
      ),
    };
  }

  const matchedKept = preview.kept.find(
    (kept) =>
      kept.groupId === groupId && kept.slotIndex === slotIndex && kept.templateId === templateId,
  );

  if (!matchedKept) {
    throw new Error("Cannot resolve the requested Training Block rotation row for swapping.");
  }

  if (nextExercise.id === matchedKept.exerciseId) {
    return preview;
  }

  return {
    ...preview,
    kept: preview.kept.filter(
      (kept) =>
        !(
          kept.groupId === groupId &&
          kept.slotIndex === slotIndex &&
          kept.templateId === templateId
        ),
    ),
    rotated: [
      ...preview.rotated,
      {
        groupId: matchedKept.groupId,
        movementPattern: matchedKept.movementPattern,
        nextExerciseId: nextExercise.id,
        nextExerciseName: nextExercise.name,
        previousExerciseId: matchedKept.exerciseId,
        previousExerciseName: matchedKept.exerciseName,
        reason: "user-selected compatible exercise",
        role: matchedKept.role,
        slotIndex: matchedKept.slotIndex,
        slotLabel: matchedKept.slotLabel,
        templateId: matchedKept.templateId,
        templateLabel: matchedKept.templateLabel,
      },
    ],
  };
}
