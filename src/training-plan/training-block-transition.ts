import {
  applyNextTrainingBlockLoadSuggestionEdit,
  applyNextTrainingBlockLoadSuggestions,
  createSkippedTrainingBlockExerciseRotationPreview,
  generateNextTrainingBlockPreview,
  type NextTrainingBlockLoadSuggestion,
  type NextTrainingBlockPreview,
  type TrainingBlockExerciseRotationPreview,
} from "./training-block";
import type { TrainingPlan } from "./training-plan";
import type { TrainingSession } from "./training-session";

const DEFAULT_AVAILABLE_LOAD_INCREMENT = 2.5;

export type CreateNextTrainingBlockTransitionPreviewInput = {
  availableLoadIncrement?: number;
  idFactory?: (baseId: string) => string;
  rotationPreview?: TrainingBlockExerciseRotationPreview;
  timestamp?: string;
  trainingPlan: TrainingPlan;
  trainingSessions: ReadonlyArray<TrainingSession>;
};

export type AcceptNextTrainingBlockTransitionInput = {
  currentTrainingPlan?: TrainingPlan;
  preview: NextTrainingBlockPreview;
  suggestions: ReadonlyArray<NextTrainingBlockLoadSuggestion>;
};

export type CreateNextTrainingBlockTransitionWorkflowInput = {
  availableLoadIncrement?: number;
  idFactory?: (baseId: string) => string;
  onAcceptedTrainingPlan?: (trainingPlan: TrainingPlan) => Promise<void> | void;
  saveAcceptedTrainingPlan?: (trainingPlan: TrainingPlan) => Promise<TrainingPlan>;
  undoAcceptedTrainingBlockTransition?: (planId: string) => Promise<TrainingPlan>;
  timestamp?: string;
  trainingPlan: TrainingPlan;
  trainingSessions: ReadonlyArray<TrainingSession>;
};

export type EditNextTrainingBlockTransitionLoadSuggestionInput = {
  exerciseId: string;
  suggestions: ReadonlyArray<NextTrainingBlockLoadSuggestion>;
  userEditedLoad: number;
};

export type NextTrainingBlockTransitionReviewWorkflow = {
  accept?: (input: {
    reviewMode?: "accept_proposal" | "skip_rotation";
    suggestions: ReadonlyArray<NextTrainingBlockLoadSuggestion>;
  }) => Promise<TrainingPlan>;
  editLoadSuggestion: (
    input: EditNextTrainingBlockTransitionLoadSuggestionInput,
  ) => ReadonlyArray<NextTrainingBlockLoadSuggestion>;
  kind: "review";
  preview: NextTrainingBlockPreview;
  skipRotationPreview: NextTrainingBlockPreview;
};

export type AcceptedTrainingBlockTransitionWorkflow = {
  kind: "accepted";
  undo?: () => Promise<TrainingPlan>;
};

export type NextTrainingBlockTransitionWorkflow =
  | AcceptedTrainingBlockTransitionWorkflow
  | NextTrainingBlockTransitionReviewWorkflow;

export function createNextTrainingBlockTransitionWorkflow({
  availableLoadIncrement,
  idFactory,
  onAcceptedTrainingPlan,
  saveAcceptedTrainingPlan,
  undoAcceptedTrainingBlockTransition,
  timestamp,
  trainingPlan,
  trainingSessions,
}: CreateNextTrainingBlockTransitionWorkflowInput): NextTrainingBlockTransitionWorkflow | null {
  if (trainingPlan.undoableTrainingBlockTransition) {
    return {
      kind: "accepted",
      undo: undoAcceptedTrainingBlockTransition
        ? () => undoAcceptedTrainingBlockTransition(trainingPlan.id)
        : undefined,
    };
  }

  const preview = createNextTrainingBlockTransitionPreview({
    availableLoadIncrement,
    idFactory,
    timestamp,
    trainingPlan,
    trainingSessions,
  });
  const skipRotationPreview = createNextTrainingBlockTransitionPreview({
    availableLoadIncrement,
    idFactory,
    rotationPreview: createSkippedTrainingBlockExerciseRotationPreview({ trainingPlan }),
    timestamp,
    trainingPlan,
    trainingSessions,
  });

  if (!preview || !skipRotationPreview) {
    return null;
  }

  const editLoadSuggestion = ({
    exerciseId,
    suggestions,
    userEditedLoad,
  }: EditNextTrainingBlockTransitionLoadSuggestionInput) =>
    applyNextTrainingBlockLoadSuggestionEdit({
      exerciseId,
      suggestions,
      userEditedLoad,
    });

  if (!saveAcceptedTrainingPlan) {
    return {
      editLoadSuggestion,
      kind: "review",
      preview,
      skipRotationPreview,
    };
  }

  return {
    accept: async ({ reviewMode = "accept_proposal", suggestions }) => {
      const nextTrainingPlan = acceptNextTrainingBlockTransition({
        currentTrainingPlan: trainingPlan,
        preview: reviewMode === "skip_rotation" ? skipRotationPreview : preview,
        suggestions,
      });
      const savedTrainingPlan = await saveAcceptedTrainingPlan(nextTrainingPlan);

      await onAcceptedTrainingPlan?.(savedTrainingPlan);

      return savedTrainingPlan;
    },
    editLoadSuggestion,
    kind: "review",
    preview,
    skipRotationPreview,
  };
}

export function createNextTrainingBlockTransitionPreview({
  availableLoadIncrement = DEFAULT_AVAILABLE_LOAD_INCREMENT,
  idFactory = createNextId,
  rotationPreview,
  timestamp,
  trainingPlan,
  trainingSessions,
}: CreateNextTrainingBlockTransitionPreviewInput): NextTrainingBlockPreview | null {
  if (!trainingPlan.trainingBlock) {
    return null;
  }

  if (trainingPlan.trainingBlock.weekNumber < trainingPlan.trainingBlockWeeks) {
    return null;
  }

  const completedWeeks = getCompletedTrainingBlockWeeks({ trainingPlan, trainingSessions });

  if (!hasCompletedAllTrainingBlockWeeks(trainingPlan.trainingBlockWeeks, completedWeeks)) {
    return null;
  }

  return generateNextTrainingBlockPreview({
    availableLoadIncrement,
    completedWeeks,
    currentBlock: trainingPlan.trainingBlock,
    nextBlockId: idFactory(trainingPlan.trainingBlock.id),
    nextPlanId: trainingPlan.id,
    rotationPreview,
    sessions: trainingSessions,
    startDate: getNextDate(trainingPlan.trainingBlock.endDate),
    timestamp: timestamp ?? trainingPlan.trainingBlock.endDate,
    trainingPlan,
  });
}

export function acceptNextTrainingBlockTransition({
  currentTrainingPlan,
  preview,
  suggestions,
}: AcceptNextTrainingBlockTransitionInput): TrainingPlan {
  const acceptedTrainingPlan = applyNextTrainingBlockLoadSuggestions({
    suggestions,
    trainingPlan: {
      ...preview.nextTrainingPlan,
      active: true,
      trainingBlock: preview.trainingBlock,
    },
  });

  if (!currentTrainingPlan?.trainingBlock) {
    return acceptedTrainingPlan;
  }

  return {
    ...acceptedTrainingPlan,
    undoableTrainingBlockTransition: {
      acceptedAt: acceptedTrainingPlan.updatedAt,
      previousState: {
        generatedAt: currentTrainingPlan.generatedAt,
        startingLoadSuggestions: currentTrainingPlan.startingLoadSuggestions ?? [],
        trainingBlock: currentTrainingPlan.trainingBlock,
        workoutTemplates: currentTrainingPlan.workoutTemplates,
      },
    },
  };
}

function getCompletedTrainingBlockWeeks({
  trainingPlan,
  trainingSessions,
}: {
  trainingPlan: Pick<
    TrainingPlan,
    "trainingBlock" | "trainingBlockWeeks" | "trainingFrequencyDaysPerWeek"
  >;
  trainingSessions: ReadonlyArray<TrainingSession>;
}): ReadonlyArray<number> {
  if (!trainingPlan.trainingBlock) {
    return [];
  }

  const completedSessionCountsByWeek = new Map<number, number>();

  for (const trainingSession of trainingSessions) {
    const weekNumber = getTrainingBlockWeekNumberForSession({
      trainingBlock: trainingPlan.trainingBlock,
      trainingBlockWeeks: trainingPlan.trainingBlockWeeks,
      trainingSession,
    });

    if (weekNumber === null) {
      continue;
    }

    completedSessionCountsByWeek.set(
      weekNumber,
      (completedSessionCountsByWeek.get(weekNumber) ?? 0) + 1,
    );
  }

  return Array.from({ length: trainingPlan.trainingBlockWeeks }, (_, index) => index + 1).filter(
    (weekNumber) =>
      (completedSessionCountsByWeek.get(weekNumber) ?? 0) >=
      trainingPlan.trainingFrequencyDaysPerWeek,
  );
}

function hasCompletedAllTrainingBlockWeeks(
  trainingBlockWeeks: number,
  completedWeeks: ReadonlyArray<number>,
): boolean {
  return Array.from({ length: trainingBlockWeeks }, (_, index) => index + 1).every((weekNumber) =>
    completedWeeks.includes(weekNumber),
  );
}

function getTrainingBlockWeekNumberForSession({
  trainingBlock,
  trainingBlockWeeks,
  trainingSession,
}: {
  trainingBlock: NonNullable<TrainingPlan["trainingBlock"]>;
  trainingBlockWeeks: number;
  trainingSession: TrainingSession;
}): number | null {
  if (trainingSession.completedAt === null) {
    return null;
  }

  if (isDifferentTrainingBlockSession(trainingBlock, trainingSession)) {
    return null;
  }

  const storedWeekNumber = getStoredTrainingBlockWeekNumber({
    trainingBlock,
    trainingBlockWeeks,
    trainingSession,
  });

  if (storedWeekNumber !== null) {
    return storedWeekNumber;
  }

  return deriveTrainingBlockWeekNumberFromCompletionDate({
    trainingBlock,
    trainingBlockWeeks,
    trainingSession,
  });
}

function isTrainingBlockWeekNumberInRange(weekNumber: number, trainingBlockWeeks: number): boolean {
  return weekNumber >= 1 && weekNumber <= trainingBlockWeeks;
}

function isDifferentTrainingBlockSession(
  trainingBlock: NonNullable<TrainingPlan["trainingBlock"]>,
  trainingSession: TrainingSession,
): boolean {
  return Boolean(
    trainingSession.trainingBlockId && trainingSession.trainingBlockId !== trainingBlock.id,
  );
}

function getStoredTrainingBlockWeekNumber({
  trainingBlock,
  trainingBlockWeeks,
  trainingSession,
}: {
  trainingBlock: NonNullable<TrainingPlan["trainingBlock"]>;
  trainingBlockWeeks: number;
  trainingSession: TrainingSession;
}): number | null {
  if (
    trainingSession.trainingBlockId !== trainingBlock.id ||
    trainingSession.trainingBlockWeekNumber === null ||
    trainingSession.trainingBlockWeekNumber === undefined
  ) {
    return null;
  }

  return isTrainingBlockWeekNumberInRange(
    trainingSession.trainingBlockWeekNumber,
    trainingBlockWeeks,
  )
    ? trainingSession.trainingBlockWeekNumber
    : null;
}

function deriveTrainingBlockWeekNumberFromCompletionDate({
  trainingBlock,
  trainingBlockWeeks,
  trainingSession,
}: {
  trainingBlock: NonNullable<TrainingPlan["trainingBlock"]>;
  trainingBlockWeeks: number;
  trainingSession: Pick<TrainingSession, "completedAt">;
}): number | null {
  const completedAt = new Date(trainingSession.completedAt ?? "");
  const startDate = new Date(`${trainingBlock.startDate}T00:00:00.000Z`);
  const endDate = new Date(`${trainingBlock.endDate}T23:59:59.999Z`);

  if (!isDateWithinTrainingBlock({ completedAt, endDate, startDate })) {
    return null;
  }

  const dayOffset = Math.floor(
    (completedAt.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000),
  );
  const weekNumber = Math.floor(dayOffset / 7) + 1;

  return isTrainingBlockWeekNumberInRange(weekNumber, trainingBlockWeeks) ? weekNumber : null;
}

function isDateWithinTrainingBlock({
  completedAt,
  endDate,
  startDate,
}: {
  completedAt: Date;
  endDate: Date;
  startDate: Date;
}): boolean {
  return (
    !Number.isNaN(completedAt.getTime()) &&
    completedAt.getTime() >= startDate.getTime() &&
    completedAt.getTime() <= endDate.getTime()
  );
}

function getNextDate(date: string): string {
  const nextDate = new Date(`${date}T00:00:00.000Z`);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);

  return nextDate.toISOString().slice(0, 10);
}

function createNextId(baseId: string): string {
  return `${baseId}-next`;
}
