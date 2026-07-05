import type { TrainingPlan } from "./training-plan";
import { generateActiveTrainingPlanFromCurrentPlanBlueprint } from "./training-plan-generation";
import {
  getTrainingPlan,
  getTrainingPlans,
  getTrainingSessionsForPlan,
  saveAcceptedTrainingPlan as saveAcceptedTrainingPlanRecord,
  saveCompletedTrainingSession,
} from "./training-plan-repository";
import {
  createCompletedTrainingSession,
  type TrainingSessionExerciseEntry,
} from "./training-session";

async function generateTrainingPlan() {
  return generateActiveTrainingPlanFromCurrentPlanBlueprint();
}

async function completeTrainingSession({
  entries,
  planId,
  templateId,
}: {
  entries: ReadonlyArray<TrainingSessionExerciseEntry>;
  planId: string;
  templateId: string;
}) {
  const trainingPlan = await getTrainingPlan(planId);

  if (!trainingPlan) {
    throw new Error("Cannot complete a Training Session without a Training Plan.");
  }

  const workoutTemplate = trainingPlan.workoutTemplates.find(
    (template) => template.id === templateId,
  );

  if (!workoutTemplate) {
    throw new Error("Cannot complete a Training Session without a Workout Template.");
  }

  const timestamp = new Date().toISOString();
  const trainingSession = createCompletedTrainingSession({
    entries,
    id: crypto.randomUUID(),
    plan: trainingPlan,
    template: workoutTemplate,
    timestamp,
  });

  return saveCompletedTrainingSession(trainingSession);
}

async function saveAcceptedTrainingPlan(trainingPlan: TrainingPlan) {
  return saveAcceptedTrainingPlanRecord(trainingPlan);
}

export const trainingPlanService = {
  completeTrainingSession,
  generateTrainingPlan,
  getTrainingPlan,
  getTrainingPlans,
  getTrainingSessionsForPlan,
  saveAcceptedTrainingPlan,
};
