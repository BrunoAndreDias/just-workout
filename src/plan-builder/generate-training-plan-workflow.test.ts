import { describe, expect, it } from "vitest";
import type { TrainingPlan } from "../training-plan";
import {
  acceptGenerateTrainingPlanRecommendedDefaults,
  type GenerateTrainingPlanWorkflowDependencies,
  startGenerateTrainingPlanWorkflow,
} from "./generate-training-plan-workflow";
import {
  createDefaultPlanBlueprint,
  type PlanBlueprint,
  type PlanBlueprintDefaultResolution,
} from "./plan-blueprint";
import { completeMainCompoundSelections } from "./plan-builder-test-fixtures";
import { createRecommendedTrainingVolumeConfiguration } from "./training-volume";

describe("Generate Training Plan workflow", () => {
  it("returns pending Recommended Defaults without applying or generating", async () => {
    const resolution = createDefaultResolution({ isReady: false });
    const events: string[] = [];

    const result = await startGenerateTrainingPlanWorkflow({
      defaultResolution: resolution,
      dependencies: createWorkflowDependencies(events),
    });

    expect(result).toEqual({
      resolution,
      status: "pending_recommended_defaults",
    });
    expect(events).toEqual([]);
  });

  it("generates an Active Training Plan route target when the Plan Blueprint is ready", async () => {
    const events: string[] = [];

    const result = await startGenerateTrainingPlanWorkflow({
      defaultResolution: createDefaultResolution({ isReady: true }),
      dependencies: createWorkflowDependencies(events),
    });

    expect(events).toEqual(["generate-active-training-plan"]);
    expect(result).toMatchObject({
      routeTarget: {
        params: { planId: "training-plan-test" },
        to: "/training-plans/$planId",
      },
      status: "generated",
      trainingPlan: { id: "training-plan-test" },
    });
  });

  it("applies accepted Recommended Defaults before generating the Active Training Plan", async () => {
    const events: string[] = [];
    const resolution = createDefaultResolution({ isReady: false });

    const result = await acceptGenerateTrainingPlanRecommendedDefaults({
      dependencies: createWorkflowDependencies(events),
      resolution,
    });

    expect(events).toEqual([
      "apply-resolved-plan-blueprint:plan-blueprint-test",
      "generate-active-training-plan",
    ]);
    expect(result).toMatchObject({
      routeTarget: {
        params: { planId: "training-plan-test" },
        to: "/training-plans/$planId",
      },
      status: "generated",
      trainingPlan: { id: "training-plan-test" },
    });
  });
});

function createDefaultResolution({
  isReady,
}: {
  isReady: boolean;
}): PlanBlueprintDefaultResolution {
  const resolvedBlueprint = createResolvedBlueprint();

  return {
    isReady,
    recommendedDefaults: isReady
      ? []
      : [
          {
            kind: "training_split",
            split: "full-body-3-day",
          },
        ],
    resolvedBlueprint,
  };
}

function createResolvedBlueprint(): PlanBlueprint {
  return {
    ...createDefaultPlanBlueprint({
      id: "plan-blueprint-test",
      timestamp: "2026-06-17T09:00:00.000Z",
    }),
    ...createRecommendedTrainingVolumeConfiguration(),
    confirmedBuilderSteps: {
      exercises: true,
      frequency: true,
      repRanges: true,
      split: true,
      volume: true,
    },
    equipmentPresetSource: "user_selected",
    mainCompoundSelections: completeMainCompoundSelections,
    repRanges: "balanced_hypertrophy",
    split: "full-body-3-day",
  };
}

function createWorkflowDependencies(events: string[]): GenerateTrainingPlanWorkflowDependencies {
  return {
    applyResolvedPlanBlueprint: async ({ blueprint }) => {
      events.push(`apply-resolved-plan-blueprint:${blueprint.id}`);

      return blueprint;
    },
    generateActiveTrainingPlan: async () => {
      events.push("generate-active-training-plan");

      return createGeneratedTrainingPlan();
    },
  };
}

function createGeneratedTrainingPlan(): TrainingPlan {
  return {
    active: true,
    generatedAt: "2026-06-17T09:05:00.000Z",
    id: "training-plan-test",
    mainCompoundRotationPools: [],
    repRangeStyle: "balanced_hypertrophy",
    sourceBlueprintId: "plan-blueprint-test",
    split: "3-Day Full Body",
    trainingBlockWeeks: 6,
    trainingFrequencyDaysPerWeek: 3,
    trainingGoal: "build-muscle",
    updatedAt: "2026-06-17T09:05:00.000Z",
    weeklyRepTargets: [],
    workoutTemplates: [],
  };
}
