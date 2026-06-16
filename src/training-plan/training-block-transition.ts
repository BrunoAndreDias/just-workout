import {
  applyNextTrainingBlockLoadSuggestionEdit,
  applyNextTrainingBlockLoadSuggestions,
  generateNextTrainingBlockPreview,
  type NextTrainingBlockLoadSuggestion,
  type NextTrainingBlockPreview,
} from "./training-block";
import type { TrainingPlan } from "./training-plan";
import type { TrainingSession } from "./training-session";

const DEFAULT_AVAILABLE_LOAD_INCREMENT = 2.5;

export type CreateNextTrainingBlockTransitionPreviewInput = {
  availableLoadIncrement?: number;
  idFactory?: (baseId: string) => string;
  timestamp?: string;
  trainingPlan: TrainingPlan;
  trainingSessions: ReadonlyArray<TrainingSession>;
};

export type AcceptNextTrainingBlockTransitionInput = {
  preview: NextTrainingBlockPreview;
  suggestions: ReadonlyArray<NextTrainingBlockLoadSuggestion>;
};

export type CreateNextTrainingBlockTransitionWorkflowInput = {
  availableLoadIncrement?: number;
  idFactory?: (baseId: string) => string;
  onAcceptedTrainingPlan?: (trainingPlan: TrainingPlan) => Promise<void> | void;
  saveAcceptedTrainingPlan?: (trainingPlan: TrainingPlan) => Promise<TrainingPlan>;
  timestamp?: string;
  trainingPlan: TrainingPlan;
  trainingSessions: ReadonlyArray<TrainingSession>;
};

export type EditNextTrainingBlockTransitionLoadSuggestionInput = {
  exerciseId: string;
  suggestions: ReadonlyArray<NextTrainingBlockLoadSuggestion>;
  userEditedLoad: number;
};

export type NextTrainingBlockTransitionWorkflow = {
  accept?: (input: {
    suggestions: ReadonlyArray<NextTrainingBlockLoadSuggestion>;
  }) => Promise<TrainingPlan>;
  editLoadSuggestion: (
    input: EditNextTrainingBlockTransitionLoadSuggestionInput,
  ) => ReadonlyArray<NextTrainingBlockLoadSuggestion>;
  preview: NextTrainingBlockPreview;
};

export function createNextTrainingBlockTransitionWorkflow({
  availableLoadIncrement,
  idFactory,
  onAcceptedTrainingPlan,
  saveAcceptedTrainingPlan,
  timestamp,
  trainingPlan,
  trainingSessions,
}: CreateNextTrainingBlockTransitionWorkflowInput): NextTrainingBlockTransitionWorkflow | null {
  const preview = createNextTrainingBlockTransitionPreview({
    availableLoadIncrement,
    idFactory,
    timestamp,
    trainingPlan,
    trainingSessions,
  });

  if (!preview) {
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
      preview,
    };
  }

  return {
    accept: async ({ suggestions }) => {
      const nextTrainingPlan = acceptNextTrainingBlockTransition({
        preview,
        suggestions,
      });
      const savedTrainingPlan = await saveAcceptedTrainingPlan(nextTrainingPlan);

      await onAcceptedTrainingPlan?.(savedTrainingPlan);

      return savedTrainingPlan;
    },
    editLoadSuggestion,
    preview,
  };
}

export function createNextTrainingBlockTransitionPreview({
  availableLoadIncrement = DEFAULT_AVAILABLE_LOAD_INCREMENT,
  idFactory = createNextId,
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

  return generateNextTrainingBlockPreview({
    availableLoadIncrement,
    completedWeeks: getCompletedTrainingBlockWeeks(trainingPlan),
    currentBlock: trainingPlan.trainingBlock,
    nextBlockId: idFactory(trainingPlan.trainingBlock.id),
    nextPlanId: idFactory(trainingPlan.id),
    sessions: trainingSessions,
    startDate: getNextDate(trainingPlan.trainingBlock.endDate),
    timestamp: timestamp ?? trainingPlan.trainingBlock.endDate,
    trainingPlan,
  });
}

export function acceptNextTrainingBlockTransition({
  preview,
  suggestions,
}: AcceptNextTrainingBlockTransitionInput): TrainingPlan {
  return applyNextTrainingBlockLoadSuggestions({
    suggestions,
    trainingPlan: {
      ...preview.nextTrainingPlan,
      active: true,
      trainingBlock: preview.trainingBlock,
    },
  });
}

function getCompletedTrainingBlockWeeks({
  trainingBlockWeeks,
}: Pick<TrainingPlan, "trainingBlockWeeks">): ReadonlyArray<number> {
  return Array.from({ length: trainingBlockWeeks }, (_, index) => index + 1);
}

function getNextDate(date: string): string {
  const nextDate = new Date(`${date}T00:00:00.000Z`);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);

  return nextDate.toISOString().slice(0, 10);
}

function createNextId(baseId: string): string {
  return `${baseId}-next`;
}
