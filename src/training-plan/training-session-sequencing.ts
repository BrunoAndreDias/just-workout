import type { TrainingPlan } from "./training-plan";
import type { TrainingSession, TrainingSessionIntent } from "./training-session";
import {
  getTrainingWeekRangeForReferenceDate,
  isTrainingSessionInWeekRange,
} from "./training-week-bodyweight";

type TrainingSessionSequencePlan = Pick<
  TrainingPlan,
  "trainingBlock" | "trainingFrequencyDaysPerWeek" | "workoutTemplates"
> &
  Partial<Pick<TrainingPlan, "generatedAt">>;

export type TrainingSessionSequenceState = {
  completedPlannedSessions: number;
  isExtraSessionAvailable: boolean;
  nextPlannedTemplateId: string;
};

export function getTrainingSessionIntent(
  trainingSession: Pick<TrainingSession, "sessionIntent">,
): TrainingSessionIntent {
  return trainingSession.sessionIntent ?? "planned";
}

export function getTrainingSessionSequenceState({
  now = new Date(),
  trainingPlan,
  trainingSessions,
}: {
  now?: Date;
  trainingPlan: TrainingSessionSequencePlan;
  trainingSessions: ReadonlyArray<TrainingSession>;
}): TrainingSessionSequenceState {
  const currentWeekRange = getTrainingWeekRangeForReferenceDate({
    referenceDate: now.toISOString(),
    trainingPlan,
  });
  const completedPlannedSessions = trainingSessions.filter(
    (trainingSession) =>
      trainingSession.completedAt !== null &&
      isTrainingSessionInWeekRange({ trainingSession, weekRange: currentWeekRange }) &&
      getTrainingSessionIntent(trainingSession) === "planned",
  ).length;

  return {
    completedPlannedSessions,
    isExtraSessionAvailable: completedPlannedSessions >= trainingPlan.trainingFrequencyDaysPerWeek,
    nextPlannedTemplateId:
      trainingPlan.workoutTemplates[completedPlannedSessions % trainingPlan.workoutTemplates.length]
        ?.id ?? "template-1",
  };
}

export function resolveRequestedTrainingSessionIntent({
  now = new Date(),
  requestedIntent,
  trainingPlan,
  trainingSessions,
}: {
  now?: Date;
  requestedIntent?: TrainingSessionIntent;
  trainingPlan: TrainingSessionSequencePlan;
  trainingSessions: ReadonlyArray<TrainingSession>;
}): TrainingSessionIntent {
  if (requestedIntent !== "extra") {
    return "planned";
  }

  return getTrainingSessionSequenceState({
    now,
    trainingPlan,
    trainingSessions,
  }).isExtraSessionAvailable
    ? "extra"
    : "planned";
}
