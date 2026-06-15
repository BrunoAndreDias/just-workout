import { normalizePlanBlueprint } from "../plan-builder/plan-blueprint";
import { getCurrentPlanBlueprint } from "../plan-builder/plan-builder-repository";
import { generateTrainingPlanFromBlueprint, type TrainingPlan } from "./training-plan";
import {
  getTrainingPlan,
  getTrainingPlans,
  getTrainingSessionsForPlan,
  saveCompletedTrainingSession,
  saveGeneratedTrainingPlan,
} from "./training-plan-repository";
import {
  createCompletedTrainingSession,
  type TrainingSessionExerciseEntry,
} from "./training-session";

async function generateTrainingPlan() {
  const blueprint = await getCurrentPlanBlueprint();

  if (!blueprint) {
    throw new Error("Cannot generate a Training Plan without a Plan Blueprint.");
  }

  const timestamp = new Date().toISOString();
  const trainingPlan = generateTrainingPlanFromBlueprint({
    blueprint: normalizePlanBlueprint(blueprint),
    id: crypto.randomUUID(),
    timestamp,
  });

  return saveGeneratedTrainingPlan(trainingPlan);
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

async function saveNextTrainingPlan(trainingPlan: TrainingPlan) {
  return saveGeneratedTrainingPlan(trainingPlan);
}

export const trainingPlanService = {
  completeTrainingSession,
  generateTrainingPlan,
  getTrainingPlan,
  getTrainingPlans,
  getTrainingSessionsForPlan,
  saveNextTrainingPlan,
};
