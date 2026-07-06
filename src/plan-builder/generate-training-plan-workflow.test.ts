import { describe, expect, it } from "vitest";
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

  it("creates a Training Plan Draft when the Plan Blueprint is ready", async () => {
    const events: string[] = [];

    const result = await startGenerateTrainingPlanWorkflow({
      defaultResolution: createDefaultResolution({ isReady: true }),
      dependencies: createWorkflowDependencies(events),
    });

    expect(events).toEqual(["generate-training-plan-draft"]);
    expect(result).toMatchObject({
      status: "draft_ready",
      trainingPlanDraft: {
        content: {
          split: "3-Day Full Body",
        },
      },
    });
  });

  it("returns blocked when generation has blocking issues", async () => {
    const events: string[] = [];
    const resolution = createDefaultResolution({
      blockingIssues: [
        {
          kind: "no_valid_main_compound_selection",
          message:
            "Weekly Movement Coverage is blocked for Horizontal push because Exercise Selection Preferences avoid every valid exercise in that Movement Pattern. Remove an avoidance or choose another valid exercise before generating.",
          movementPattern: "horizontal_push",
        },
      ],
      isReady: false,
    });

    const result = await startGenerateTrainingPlanWorkflow({
      defaultResolution: resolution,
      dependencies: createWorkflowDependencies(events),
    });

    expect(result).toEqual({
      blockingIssues: resolution.blockingIssues,
      status: "blocked",
    });
    expect(events).toEqual([]);
  });

  it("applies accepted Recommended Defaults before creating the Training Plan Draft", async () => {
    const events: string[] = [];
    const resolution = createDefaultResolution({ isReady: false });

    const result = await acceptGenerateTrainingPlanRecommendedDefaults({
      dependencies: createWorkflowDependencies(events),
      resolution,
    });

    expect(events).toEqual([
      "apply-resolved-plan-blueprint:plan-blueprint-test",
      "generate-training-plan-draft",
    ]);
    expect(result).toMatchObject({
      status: "draft_ready",
      trainingPlanDraft: {
        content: {
          split: "3-Day Full Body",
        },
      },
    });
  });
});

function createDefaultResolution({
  blockingIssues = [],
  isReady,
}: {
  blockingIssues?: PlanBlueprintDefaultResolution["blockingIssues"];
  isReady: boolean;
}): PlanBlueprintDefaultResolution {
  const resolvedBlueprint = createResolvedBlueprint();

  return {
    blockingIssues,
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
    generateTrainingPlanDraft: async () => {
      events.push("generate-training-plan-draft");

      return {
        content: {
          mainCompoundRotationPools: [],
          repRangeStyle: "balanced_hypertrophy",
          split: "3-Day Full Body",
          trainingBlockWeeks: 6,
          trainingFrequencyDaysPerWeek: 3,
          trainingGoal: "build-muscle",
          weeklyRepTargets: [],
          workoutTemplates: [],
        },
      };
    },
  };
}
