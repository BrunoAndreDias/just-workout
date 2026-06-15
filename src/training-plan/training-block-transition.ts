import {
  applyNextTrainingBlockLoadSuggestions,
  generateNextTrainingBlockPreview,
  type NextTrainingBlockLoadSuggestion,
  type NextTrainingBlockPreview,
} from "./training-block";
import type { TrainingPlan } from "./training-plan";
import type { TrainingSession } from "./training-session";

export type CreateNextTrainingBlockTransitionPreviewInput = {
  availableLoadIncrement: number;
  idFactory?: (baseId: string) => string;
  timestamp?: string;
  trainingPlan: TrainingPlan;
  trainingSessions: ReadonlyArray<TrainingSession>;
};

export type AcceptNextTrainingBlockTransitionInput = {
  preview: NextTrainingBlockPreview;
  suggestions: ReadonlyArray<NextTrainingBlockLoadSuggestion>;
};

export function createNextTrainingBlockTransitionPreview({
  availableLoadIncrement,
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
