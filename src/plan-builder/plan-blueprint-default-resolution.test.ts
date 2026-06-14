import { describe, expect, it } from "vitest";
import {
  createDefaultPlanBlueprint,
  type PlanBlueprint,
  resolvePlanBlueprintRecommendedDefaults,
} from "./plan-blueprint";
import { createRecommendedTrainingVolumeConfiguration } from "./training-volume";

const testBlueprintOptions = {
  id: "blueprint-1",
  timestamp: "2026-06-14T10:00:00.000Z",
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

describe("plan blueprint default resolution", () => {
  it("reports and resolves missing non-exercise Recommended Defaults without mutating the source blueprint", () => {
    const blueprint = createTestPlanBlueprint();

    const resolution = resolvePlanBlueprintRecommendedDefaults(blueprint);

    expect(resolution).toMatchObject({
      isReady: false,
      recommendedDefaults: [
        {
          kind: "training_split",
          split: "full-body-3-day",
        },
        {
          kind: "rep_range_style",
          repRangeStyle: "balanced_hypertrophy",
        },
        {
          kind: "training_volume",
          ...createRecommendedTrainingVolumeConfiguration(),
        },
      ],
      resolvedBlueprint: {
        ...blueprint,
        ...createRecommendedTrainingVolumeConfiguration(),
        repRanges: "balanced_hypertrophy",
        split: "full-body-3-day",
      },
    });
    expect(blueprint).toEqual(createTestPlanBlueprint());
  });

  it("returns a ready result when the non-exercise Plan Blueprint choices are already configured", () => {
    const blueprint = createTestPlanBlueprint({
      ...createRecommendedTrainingVolumeConfiguration(),
      repRanges: "controlled_higher_reps",
      split: "upper-lower-4-day",
      trainingFrequencyDaysPerWeek: 4,
    });

    expect(resolvePlanBlueprintRecommendedDefaults(blueprint)).toEqual({
      isReady: true,
      recommendedDefaults: [],
      resolvedBlueprint: blueprint,
    });
  });

  it("resolves only the missing non-exercise choices for partially configured blueprints", () => {
    const blueprint = createTestPlanBlueprint({
      exerciseSelectionPreferences: {
        avoidedExercises: [{ id: "avoid-1", rawText: "Behind-the-neck press" }],
        equipmentPreset: "unsupported" as never,
        preferredExercises: [{ id: "prefer-1", rawText: "Chest-supported row" }],
        strategy: "balanced",
      },
      repRanges: "strength_leaning",
      split: "rotating-push-pull-legs",
      trainingFrequencyDaysPerWeek: 5,
    });

    expect(resolvePlanBlueprintRecommendedDefaults(blueprint)).toMatchObject({
      isReady: false,
      recommendedDefaults: [
        {
          kind: "training_volume",
          ...createRecommendedTrainingVolumeConfiguration(),
        },
        {
          equipmentPreset: "full_gym",
          kind: "equipment_preset",
        },
      ],
      resolvedBlueprint: {
        ...blueprint,
        ...createRecommendedTrainingVolumeConfiguration(),
        exerciseSelectionPreferences: {
          avoidedExercises: [{ id: "avoid-1", rawText: "Behind-the-neck press" }],
          equipmentPreset: "full_gym",
          preferredExercises: [{ id: "prefer-1", rawText: "Chest-supported row" }],
          strategy: "balanced",
        },
      },
    });
    expect(blueprint.repRanges).toBe("strength_leaning");
    expect(blueprint.split).toBe("rotating-push-pull-legs");
    expect(blueprint.volumePreset).toBeNull();
  });
});
