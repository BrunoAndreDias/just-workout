import { beforeEach, describe, expect, it } from "vitest";
import { resetLocalDatabase } from "../app/local-database";
import {
  acceptGenerateTrainingPlanRecommendedDefaults,
  startGenerateTrainingPlanWorkflow,
} from "./generate-training-plan-workflow";
import {
  createDefaultPlanBlueprint,
  type PlanBlueprint,
  type PlanBlueprintDefaultResolution,
} from "./plan-blueprint";
import { planBuilderService } from "./plan-builder-service";
import { completeMainCompoundSelections } from "./plan-builder-test-fixtures";
import { createRecommendedTrainingVolumeConfiguration } from "./training-volume";

describe("Generate Training Plan workflow", () => {
  beforeEach(async () => {
    await resetLocalDatabase();
  });

  it("returns pending Recommended Defaults without applying or generating", async () => {
    const resolution = createDefaultResolution({ isReady: false });

    const result = await startGenerateTrainingPlanWorkflow({
      defaultResolution: resolution,
    });

    expect(result).toEqual({
      resolution,
      status: "pending_recommended_defaults",
    });
  });

  it("creates a Training Plan Draft when the Plan Blueprint is ready", async () => {
    const resolution = createDefaultResolution({ isReady: true });

    await planBuilderService.applyResolvedPlanBlueprint({
      blueprint: resolution.resolvedBlueprint,
    });

    const result = await startGenerateTrainingPlanWorkflow({
      defaultResolution: resolution,
    });

    expect(result).toMatchObject({
      status: "draft_ready",
      trainingPlanDraft: {
        content: {
          split: "3-Day Full Body",
        },
      },
    });
    if (result.status !== "draft_ready") {
      throw new Error(`Expected draft-ready result, received ${result.status}.`);
    }

    expect(await planBuilderService.getOrCreatePlanBlueprint()).toMatchObject({
      trainingPlanDraft: result.trainingPlanDraft,
    });
  });

  it("returns blocked when generation has blocking issues", async () => {
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
    });

    expect(result).toEqual({
      blockingIssues: resolution.blockingIssues,
      status: "blocked",
    });
  });

  it("applies accepted Recommended Defaults before creating the Training Plan Draft", async () => {
    const resolution = createDefaultResolution({ isReady: false });

    const result = await acceptGenerateTrainingPlanRecommendedDefaults({
      resolution,
    });

    expect(result).toMatchObject({
      status: "draft_ready",
      trainingPlanDraft: {
        content: {
          split: "3-Day Full Body",
        },
      },
    });
    if (result.status !== "draft_ready") {
      throw new Error(`Expected draft-ready result, received ${result.status}.`);
    }

    expect(await planBuilderService.getOrCreatePlanBlueprint()).toMatchObject({
      id: resolution.resolvedBlueprint.id,
      trainingPlanDraft: result.trainingPlanDraft,
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
