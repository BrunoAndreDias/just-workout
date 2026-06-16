import { normalizePlanBlueprint, type PlanBlueprint } from "../plan-builder/plan-blueprint";
import { getCurrentPlanBlueprint } from "../plan-builder/plan-builder-repository";
import { generateTrainingPlanFromBlueprint, type TrainingPlan } from "./training-plan";
import { saveGeneratedTrainingPlan } from "./training-plan-repository";

type TrainingPlanGenerationDependencies = {
  createTrainingPlanId: () => string;
  getCurrentPlanBlueprint: () => Promise<PlanBlueprint | null>;
  getTimestamp: () => string;
  saveActiveTrainingPlan: (trainingPlan: TrainingPlan) => Promise<TrainingPlan>;
};

const defaultTrainingPlanGenerationDependencies: TrainingPlanGenerationDependencies = {
  createTrainingPlanId: () => crypto.randomUUID(),
  getCurrentPlanBlueprint,
  getTimestamp: () => new Date().toISOString(),
  saveActiveTrainingPlan: saveGeneratedTrainingPlan,
};

export async function generateActiveTrainingPlanFromCurrentPlanBlueprint(
  dependencies: TrainingPlanGenerationDependencies = defaultTrainingPlanGenerationDependencies,
) {
  const blueprint = await dependencies.getCurrentPlanBlueprint();

  if (!blueprint) {
    throw new Error("Cannot generate a Training Plan without a Plan Blueprint.");
  }

  const timestamp = dependencies.getTimestamp();
  const trainingPlan = generateTrainingPlanFromBlueprint({
    blueprint: normalizePlanBlueprint(blueprint),
    id: dependencies.createTrainingPlanId(),
    timestamp,
  });

  return dependencies.saveActiveTrainingPlan(trainingPlan);
}
