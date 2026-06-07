import { normalizePlanBlueprint } from "../plan-builder/plan-blueprint";
import { getCurrentPlanBlueprint } from "../plan-builder/plan-builder-repository";
import { generateTrainingPlanFromBlueprint } from "./training-plan";
import {
  getTrainingPlan,
  getTrainingPlans,
  saveGeneratedTrainingPlan,
} from "./training-plan-repository";

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

export const trainingPlanService = {
  generateTrainingPlan,
  getTrainingPlan,
  getTrainingPlans,
};
