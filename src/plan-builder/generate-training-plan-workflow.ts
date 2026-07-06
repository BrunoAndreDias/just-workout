import { type TrainingPlanDraft, trainingPlanService } from "../training-plan";
import type { PlanBlueprint, PlanBlueprintDefaultResolution } from "./plan-blueprint";
import { planBuilderService } from "./plan-builder-service";

export type GenerateTrainingPlanWorkflowDraftReadyResult = {
  status: "draft_ready";
  trainingPlanDraft: TrainingPlanDraft;
};

export type GenerateTrainingPlanWorkflowResult =
  | GenerateTrainingPlanWorkflowDraftReadyResult
  | {
      blockingIssues: PlanBlueprintDefaultResolution["blockingIssues"];
      status: "blocked";
    }
  | {
      resolution: PlanBlueprintDefaultResolution;
      status: "pending_recommended_defaults";
    };

export type GenerateTrainingPlanWorkflowDependencies = {
  applyResolvedPlanBlueprint: (options: { blueprint: PlanBlueprint }) => Promise<PlanBlueprint>;
  generateTrainingPlanDraft: () => Promise<TrainingPlanDraft>;
};

const defaultGenerateTrainingPlanWorkflowDependencies: GenerateTrainingPlanWorkflowDependencies = {
  applyResolvedPlanBlueprint: planBuilderService.applyResolvedPlanBlueprint,
  generateTrainingPlanDraft: trainingPlanService.generateTrainingPlanDraft,
};

export async function startGenerateTrainingPlanWorkflow({
  defaultResolution,
  dependencies = defaultGenerateTrainingPlanWorkflowDependencies,
}: {
  defaultResolution: PlanBlueprintDefaultResolution;
  dependencies?: GenerateTrainingPlanWorkflowDependencies;
}): Promise<GenerateTrainingPlanWorkflowResult> {
  if (defaultResolution.blockingIssues.length > 0) {
    return {
      blockingIssues: defaultResolution.blockingIssues,
      status: "blocked",
    };
  }

  if (!defaultResolution.isReady) {
    return {
      resolution: defaultResolution,
      status: "pending_recommended_defaults",
    };
  }

  return generateTrainingPlanDraftResult(dependencies);
}

export async function acceptGenerateTrainingPlanRecommendedDefaults({
  dependencies = defaultGenerateTrainingPlanWorkflowDependencies,
  resolution,
}: {
  dependencies?: GenerateTrainingPlanWorkflowDependencies;
  resolution: PlanBlueprintDefaultResolution;
}): Promise<GenerateTrainingPlanWorkflowDraftReadyResult> {
  await dependencies.applyResolvedPlanBlueprint({ blueprint: resolution.resolvedBlueprint });

  return generateTrainingPlanDraftResult(dependencies);
}

async function generateTrainingPlanDraftResult(
  dependencies: GenerateTrainingPlanWorkflowDependencies,
): Promise<GenerateTrainingPlanWorkflowDraftReadyResult> {
  const trainingPlanDraft = await dependencies.generateTrainingPlanDraft();

  return {
    status: "draft_ready",
    trainingPlanDraft,
  };
}
