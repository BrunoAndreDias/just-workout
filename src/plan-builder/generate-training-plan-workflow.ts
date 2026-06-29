import {
  getTrainingPlanRouteTarget,
  type TrainingPlan,
  type TrainingPlanRouteTarget,
  trainingPlanService,
} from "../training-plan";
import type { PlanBlueprint, PlanBlueprintDefaultResolution } from "./plan-blueprint";
import { planBuilderService } from "./plan-builder-service";

export type GenerateTrainingPlanRouteTarget = TrainingPlanRouteTarget;

export type GenerateTrainingPlanWorkflowGeneratedResult = {
  routeTarget: GenerateTrainingPlanRouteTarget;
  status: "generated";
  trainingPlan: TrainingPlan;
};

export type GenerateTrainingPlanWorkflowResult =
  | GenerateTrainingPlanWorkflowGeneratedResult
  | {
      resolution: PlanBlueprintDefaultResolution;
      status: "pending_recommended_defaults";
    };

export type GenerateTrainingPlanWorkflowDependencies = {
  applyResolvedPlanBlueprint: (options: { blueprint: PlanBlueprint }) => Promise<PlanBlueprint>;
  generateActiveTrainingPlan: () => Promise<TrainingPlan>;
};

const defaultGenerateTrainingPlanWorkflowDependencies: GenerateTrainingPlanWorkflowDependencies = {
  applyResolvedPlanBlueprint: planBuilderService.applyResolvedPlanBlueprint,
  generateActiveTrainingPlan: trainingPlanService.generateTrainingPlan,
};

export async function startGenerateTrainingPlanWorkflow({
  defaultResolution,
  dependencies = defaultGenerateTrainingPlanWorkflowDependencies,
}: {
  defaultResolution: PlanBlueprintDefaultResolution;
  dependencies?: GenerateTrainingPlanWorkflowDependencies;
}): Promise<GenerateTrainingPlanWorkflowResult> {
  if (!defaultResolution.isReady) {
    return {
      resolution: defaultResolution,
      status: "pending_recommended_defaults",
    };
  }

  return generateActiveTrainingPlanResult(dependencies);
}

export async function acceptGenerateTrainingPlanRecommendedDefaults({
  dependencies = defaultGenerateTrainingPlanWorkflowDependencies,
  resolution,
}: {
  dependencies?: GenerateTrainingPlanWorkflowDependencies;
  resolution: PlanBlueprintDefaultResolution;
}): Promise<GenerateTrainingPlanWorkflowGeneratedResult> {
  await dependencies.applyResolvedPlanBlueprint({ blueprint: resolution.resolvedBlueprint });

  return generateActiveTrainingPlanResult(dependencies);
}

async function generateActiveTrainingPlanResult(
  dependencies: GenerateTrainingPlanWorkflowDependencies,
): Promise<GenerateTrainingPlanWorkflowGeneratedResult> {
  const trainingPlan = await dependencies.generateActiveTrainingPlan();

  return {
    routeTarget: getTrainingPlanRouteTarget(trainingPlan.id),
    status: "generated",
    trainingPlan,
  };
}
