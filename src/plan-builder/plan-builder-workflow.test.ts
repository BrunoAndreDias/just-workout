import { describe, expect, it } from "vitest";
import {
  createDefaultPlanBlueprint,
  type PlanBlueprint,
  selectTrainingSplit,
} from "./plan-blueprint";
import { completeMainCompoundSelections } from "./plan-builder-test-fixtures";
import { getPlanBuilderWorkflow } from "./plan-builder-workflow";
import { createRecommendedTrainingVolumeConfiguration } from "./training-volume";

const testBlueprintOptions = {
  id: "blueprint-1",
  timestamp: "2026-06-16T10:00:00.000Z",
} as const;

type TestPlanBlueprintOverrides = Omit<Partial<PlanBlueprint>, "confirmedBuilderSteps"> & {
  confirmedBuilderSteps?: Partial<PlanBlueprint["confirmedBuilderSteps"]>;
};

function createTestPlanBlueprint(overrides: TestPlanBlueprintOverrides = {}): PlanBlueprint {
  const defaultBlueprint = createDefaultPlanBlueprint(testBlueprintOptions);

  return {
    ...defaultBlueprint,
    ...overrides,
    confirmedBuilderSteps: {
      ...defaultBlueprint.confirmedBuilderSteps,
      ...overrides.confirmedBuilderSteps,
    },
  };
}

describe("Plan Builder workflow", () => {
  it("marks the next incomplete section while exposing the visible Training Split fallback", () => {
    const blueprint = createTestPlanBlueprint();
    const workflow = getPlanBuilderWorkflow({
      activeStep: "frequency",
      blueprint,
    });

    expect(workflow.nextStep).toBe("frequency");
    expect(workflow.visibleTrainingSplitId).toBe("full-body-3-day");
    expect(workflow.sectionStatuses.frequency).toEqual({
      isComplete: false,
      label: "Open",
      tone: "current",
    });
    expect(workflow.sectionStatuses["rep-ranges"]).toEqual({
      isComplete: false,
      label: "Ready",
      tone: "ready",
    });
  });

  it("uses the configured Training Split when it remains compatible", () => {
    const blueprint = selectTrainingSplit({
      blueprint: createTestPlanBlueprint(),
      split: "upper-lower-full-body",
      timestamp: testBlueprintOptions.timestamp,
    });
    const workflow = getPlanBuilderWorkflow({ blueprint });

    expect(workflow.visibleTrainingSplitId).toBe("upper-lower-full-body");
    expect(workflow.sectionStatuses.frequency).toMatchObject({
      isComplete: true,
      label: "Done",
      tone: "complete",
    });
    expect(workflow.nextStep).toBe("rep-ranges");
  });

  it("keeps Rep Range Style and Training Volume default-entry decisions pure", () => {
    const blueprint = createTestPlanBlueprint();

    expect(
      getPlanBuilderWorkflow({
        activeStep: "rep-ranges",
        blueprint,
      }).defaultEntryActions,
    ).toEqual({
      shouldInitializeTrainingVolume: false,
      shouldSelectDefaultRepRangeStyle: true,
    });

    expect(
      getPlanBuilderWorkflow({
        activeStep: "volume",
        blueprint: createTestPlanBlueprint({
          repRanges: "balanced_hypertrophy",
        }),
      }).defaultEntryActions,
    ).toEqual({
      shouldInitializeTrainingVolume: true,
      shouldSelectDefaultRepRangeStyle: false,
    });
  });

  it("keeps Exercises immediately ready from the current Plan Blueprint", () => {
    const immediateWorkflow = getPlanBuilderWorkflow({
      activeStep: "exercises",
      blueprint: createTestPlanBlueprint(),
    });

    expect(immediateWorkflow.exerciseSetup).toMatchObject({
      configuredBlueprint: createTestPlanBlueprint(),
      isReady: true,
      requiresTrainingSchedule: false,
      requiresVolume: false,
    });

    const readyBlueprint = createTestPlanBlueprint({
      ...createRecommendedTrainingVolumeConfiguration(),
      split: "full-body-3-day",
    });
    const readyWorkflow = getPlanBuilderWorkflow({
      activeStep: "exercises",
      blueprint: readyBlueprint,
    });

    expect(readyWorkflow.exerciseSetup).toMatchObject({
      configuredBlueprint: readyBlueprint,
      isReady: true,
      requiresTrainingSchedule: false,
      requiresVolume: false,
    });
    expect(readyWorkflow.trainingVolumeConfiguration).toMatchObject(
      createRecommendedTrainingVolumeConfiguration(),
    );
  });

  it("prepares Default Generation Confirmation from the current Plan Blueprint", () => {
    const workflow = getPlanBuilderWorkflow({
      activeStep: "generate",
      blueprint: createTestPlanBlueprint(),
    });

    expect(workflow.generation.defaultResolution).toMatchObject({
      isReady: false,
      resolvedBlueprint: {
        mainCompoundSelections: completeMainCompoundSelections,
        repRanges: "balanced_hypertrophy",
        split: "full-body-3-day",
        volumePreset: "balanced",
      },
    });
  });
});
