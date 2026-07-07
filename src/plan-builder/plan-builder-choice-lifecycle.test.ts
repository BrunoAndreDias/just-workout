import { describe, expect, it } from "vitest";
import {
  createDefaultPlanBlueprint,
  type PlanBlueprint,
  selectTrainingSplit,
} from "./plan-blueprint";
import { getPlanBuilderChoiceLifecycle } from "./plan-builder-choice-lifecycle";
import { completeMainCompoundSelections } from "./plan-builder-test-fixtures";
import { getPlanBuilderWorkflow, type PlanBuilderWorkflow } from "./plan-builder-workflow";
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

describe("Plan Builder choice lifecycle", () => {
  it("marks the next unconfigured section while exposing the visible Training Split fallback", () => {
    const blueprint = createTestPlanBlueprint();
    const lifecycle = getPlanBuilderChoiceLifecycle({
      activeStep: "frequency",
      blueprint,
    });

    expectLifecycleToPreserveWorkflow({
      activeStep: "frequency",
      blueprint,
      lifecycle,
    });
    expect(lifecycle.nextUnconfiguredStep).toBe("frequency");
    expect(lifecycle.selectedDefaults.visibleTrainingSplitId).toBe("full-body-3-day");
    expect(lifecycle.configuredSections.frequency).toEqual({
      isConfigured: false,
      label: "Open",
      tone: "current",
    });
    expect(lifecycle.configuredSections["rep-ranges"]).toEqual({
      isConfigured: false,
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
    const lifecycle = getPlanBuilderChoiceLifecycle({ blueprint });

    expectLifecycleToPreserveWorkflow({ blueprint, lifecycle });
    expect(lifecycle.selectedDefaults.visibleTrainingSplitId).toBe("upper-lower-full-body");
    expect(lifecycle.configuredSections.frequency).toMatchObject({
      isConfigured: true,
      label: "Done",
      tone: "complete",
    });
    expect(lifecycle.nextUnconfiguredStep).toBe("rep-ranges");
  });

  it("keeps Rep Range Style and Training Volume default-entry decisions pure", () => {
    const blueprint = createTestPlanBlueprint();

    const repRangesLifecycle = getPlanBuilderChoiceLifecycle({
      activeStep: "rep-ranges",
      blueprint,
    });
    expectLifecycleToPreserveWorkflow({
      activeStep: "rep-ranges",
      blueprint,
      lifecycle: repRangesLifecycle,
    });
    expect(repRangesLifecycle.defaultEntryActions).toEqual({
      shouldInitializeTrainingVolume: false,
      shouldSelectDefaultRepRangeStyle: true,
    });

    const volumeBlueprint = createTestPlanBlueprint({
      repRanges: "balanced_hypertrophy",
    });
    const volumeLifecycle = getPlanBuilderChoiceLifecycle({
      activeStep: "volume",
      blueprint: volumeBlueprint,
    });
    expectLifecycleToPreserveWorkflow({
      activeStep: "volume",
      blueprint: volumeBlueprint,
      lifecycle: volumeLifecycle,
    });
    expect(volumeLifecycle.defaultEntryActions).toEqual({
      shouldInitializeTrainingVolume: true,
      shouldSelectDefaultRepRangeStyle: false,
    });
  });

  it("keeps the Exercises Step immediately ready from the current Plan Blueprint", () => {
    const immediateBlueprint = createTestPlanBlueprint();
    const immediateLifecycle = getPlanBuilderChoiceLifecycle({
      activeStep: "exercises",
      blueprint: immediateBlueprint,
    });

    expectLifecycleToPreserveWorkflow({
      activeStep: "exercises",
      blueprint: immediateBlueprint,
      lifecycle: immediateLifecycle,
    });
    expect(immediateLifecycle.exercisesStep).toEqual({
      configuredBlueprint: immediateBlueprint,
      isReady: true,
      requiresTrainingSchedule: false,
      requiresVolume: false,
    });

    const readyBlueprint = createTestPlanBlueprint({
      ...createRecommendedTrainingVolumeConfiguration(),
      split: "full-body-3-day",
    });
    const readyLifecycle = getPlanBuilderChoiceLifecycle({
      activeStep: "exercises",
      blueprint: readyBlueprint,
    });

    expectLifecycleToPreserveWorkflow({
      activeStep: "exercises",
      blueprint: readyBlueprint,
      lifecycle: readyLifecycle,
    });
    expect(readyLifecycle.exercisesStep).toEqual({
      configuredBlueprint: readyBlueprint,
      isReady: true,
      requiresTrainingSchedule: false,
      requiresVolume: false,
    });
    expect(readyLifecycle.selectedDefaults.trainingVolumeConfiguration).toMatchObject(
      createRecommendedTrainingVolumeConfiguration(),
    );
  });

  it("prepares Default Generation Confirmation from the current Plan Blueprint", () => {
    const blueprint = createTestPlanBlueprint();
    const lifecycle = getPlanBuilderChoiceLifecycle({
      activeStep: "generate",
      blueprint,
    });

    expectLifecycleToPreserveWorkflow({
      activeStep: "generate",
      blueprint,
      lifecycle,
    });
    expect(lifecycle.generation.state).toBe("needs-default-generation-confirmation");
    expect(lifecycle.generation.requiresDefaultGenerationConfirmation).toBe(true);
    expect(lifecycle.generation.defaultResolution).toMatchObject({
      isReady: false,
      resolvedBlueprint: {
        mainCompoundSelections: completeMainCompoundSelections,
        repRanges: "balanced_hypertrophy",
        split: "full-body-3-day",
        volumePreset: "balanced",
      },
    });
  });

  it("hides legacy confirmed builder steps behind Configured Builder Section terms", () => {
    const blueprint = createTestPlanBlueprint({
      ...createRecommendedTrainingVolumeConfiguration(),
      confirmedBuilderSteps: {
        exercises: true,
        frequency: false,
        repRanges: false,
        split: false,
        volume: false,
      },
      mainCompoundSelections: completeMainCompoundSelections,
      repRanges: "balanced_hypertrophy",
      split: "full-body-3-day",
    });
    const lifecycle = getPlanBuilderChoiceLifecycle({ blueprint });

    expect(lifecycle.configuredSections).toMatchObject({
      exercises: { isConfigured: true },
      frequency: { isConfigured: true },
      "rep-ranges": { isConfigured: true },
      volume: { isConfigured: true },
    });
    const frequencySection = lifecycle.configuredSections.frequency;

    if (!frequencySection) {
      throw new Error("Expected Frequency to have a configured section status.");
    }

    expect(Object.keys(frequencySection)).toEqual(["isConfigured", "label", "tone"]);
    expect(lifecycle).not.toHaveProperty("confirmedBuilderSteps");
  });
});

function expectLifecycleToPreserveWorkflow({
  activeStep = null,
  blueprint,
  lifecycle,
}: {
  activeStep?: Parameters<typeof getPlanBuilderChoiceLifecycle>[0]["activeStep"];
  blueprint: PlanBlueprint;
  lifecycle: ReturnType<typeof getPlanBuilderChoiceLifecycle>;
}): void {
  const workflow = getPlanBuilderWorkflow({ activeStep, blueprint });

  expect(lifecycle.defaultEntryActions).toEqual(workflow.defaultEntryActions);
  expect(lifecycle.exercisesStep).toEqual(workflow.exerciseSetup);
  expect(lifecycle.generation.defaultResolution).toEqual(workflow.generation.defaultResolution);
  expect(lifecycle.nextUnconfiguredStep).toBe(workflow.nextStep);
  expect(lifecycle.selectedDefaults).toEqual({
    savedRepRangeStyleId: workflow.savedRepRangeStyleId,
    selectedRepRangeStyleId: workflow.selectedRepRangeStyleId,
    trainingVolumeConfiguration: workflow.trainingVolumeConfiguration,
    visibleTrainingSplitId: workflow.visibleTrainingSplitId,
  });
  expect(lifecycle.configuredSections).toEqual(getExpectedConfiguredSections(workflow));
}

function getExpectedConfiguredSections({
  sectionStatuses,
}: PlanBuilderWorkflow): ReturnType<typeof getPlanBuilderChoiceLifecycle>["configuredSections"] {
  return Object.fromEntries(
    Object.entries(sectionStatuses).map(([sectionId, status]) => [
      sectionId,
      {
        isConfigured: status.isComplete,
        label: status.label,
        tone: status.tone,
      },
    ]),
  ) as ReturnType<typeof getPlanBuilderChoiceLifecycle>["configuredSections"];
}
