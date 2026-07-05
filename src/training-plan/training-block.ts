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

export type MainCompoundRotationPreviewItem = {
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

export type MainCompoundKeptPreviewItem = {
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
  sessions = [],
  trainingPlan,
}: {
  sessions?: ReadonlyArray<TrainingSession>;
  trainingPlan: TrainingPlan;
}): MainCompoundRotationPreview {
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
  const kept: MainCompoundKeptPreviewItem[] = [];
  const rotated: MainCompoundRotationPreviewItem[] = [];
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
  const rotation = previewMainCompoundRotations({ sessions, trainingPlan });
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
  chosenOptions = new Map<number, RotationProposalOption>(),
  proposalIndex = 0,
  usedExerciseIds = new Set<string>(),
}: {
  chosenOptions?: Map<number, RotationProposalOption>;
  proposalIndex?: number;
  slotProposals: ReadonlyArray<{
    options: ReadonlyArray<RotationProposalOption>;
    originalIndex: number;
  }>;
  usedExerciseIds?: Set<string>;
}): Map<number, RotationProposalOption> | null {
  if (proposalIndex >= slotProposals.length) {
    return new Map(chosenOptions);
  }

  const slotProposal = slotProposals[proposalIndex];

  if (!slotProposal) {
    return new Map(chosenOptions);
  }

  for (const option of slotProposal.options) {
    if (usedExerciseIds.has(option.nextExerciseId)) {
      continue;
    }

    usedExerciseIds.add(option.nextExerciseId);
    chosenOptions.set(slotProposal.originalIndex, option);

    const resolvedOptions = chooseTemplateRotationOptions({
      chosenOptions,
      proposalIndex: proposalIndex + 1,
      slotProposals,
      usedExerciseIds,
    });

    if (resolvedOptions) {
      return resolvedOptions;
    }

    chosenOptions.delete(slotProposal.originalIndex);
    usedExerciseIds.delete(option.nextExerciseId);
  }

  return null;
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
