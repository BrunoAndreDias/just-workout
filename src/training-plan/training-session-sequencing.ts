import { getCurrentTrainingWeek, isSessionInTrainingWeek } from "./training-block-calendar";
import type { TrainingPlan } from "./training-plan";
import type { TrainingSession, TrainingSessionIntent } from "./training-session";

type TrainingSessionSequencePlan = Pick<
  TrainingPlan,
  | "generatedAt"
  | "trainingBlock"
  | "trainingBlockWeeks"
  | "trainingFrequencyDaysPerWeek"
  | "workoutTemplates"
>;

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
  const currentWeek = getCurrentTrainingWeek(trainingPlan, now);
  const completedPlannedSessions = trainingSessions.filter(
    (trainingSession) =>
      trainingSession.completedAt !== null &&
      isSessionInTrainingWeek(trainingSession, currentWeek) &&
      getTrainingSessionIntent(trainingSession) === "planned",
  ).length;

  // A rotating cycle (e.g. Upper A/Lower A/Upper B/Lower B on 3 days/week) carries over across
  // weeks, so its position comes from every planned session instead of restarting each week.
  const isRotatingCycle =
    trainingPlan.workoutTemplates.length !== trainingPlan.trainingFrequencyDaysPerWeek;
  const sequencePosition = isRotatingCycle
    ? trainingSessions.filter(
        (trainingSession) =>
          trainingSession.completedAt !== null &&
          getTrainingSessionIntent(trainingSession) === "planned",
      ).length
    : completedPlannedSessions;

  return {
    completedPlannedSessions,
    isExtraSessionAvailable: completedPlannedSessions >= trainingPlan.trainingFrequencyDaysPerWeek,
    nextPlannedTemplateId:
      trainingPlan.workoutTemplates[sequencePosition % trainingPlan.workoutTemplates.length]?.id ??
      "template-1",
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
