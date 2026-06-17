import { describe, expect, it } from "vitest";
import {
  createDefaultPlanBlueprint,
  normalizePlanBlueprint,
  type PlanBlueprint,
  resolvePlanBlueprintRecommendedDefaults,
} from "./plan-blueprint";
import { completeMainCompoundSelections } from "./plan-builder-test-fixtures";
import { createRecommendedTrainingVolumeConfiguration } from "./training-volume";
import { getWeeklyMovementCoverage } from "./weekly-movement-coverage";

type MainCompoundCoverageExpectation = {
  mainCompoundSelections: PlanBlueprint["mainCompoundSelections"];
  split: NonNullable<PlanBlueprint["split"]>;
  trainingFrequencyDaysPerWeek: PlanBlueprint["trainingFrequencyDaysPerWeek"];
};

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
        {
          equipmentPreset: "full_gym",
          kind: "equipment_preset",
        },
        ...completeMainCompoundRecommendedDefaults,
      ],
      resolvedBlueprint: {
        ...blueprint,
        ...createRecommendedTrainingVolumeConfiguration(),
        equipmentPresetSource: "user_selected",
        mainCompoundSelections: completeMainCompoundSelections,
        repRanges: "balanced_hypertrophy",
        split: "full-body-3-day",
      },
    });
    expect(blueprint).toEqual(createTestPlanBlueprint());
  });

  it("returns a ready result when the non-exercise Plan Blueprint choices are already configured", () => {
    const blueprint = createTestPlanBlueprint({
      ...createRecommendedTrainingVolumeConfiguration(),
      equipmentPresetSource: "user_selected",
      mainCompoundSelections: completeMainCompoundSelections,
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
      mainCompoundSelections: completeMainCompoundSelections,
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
        equipmentPresetSource: "user_selected",
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

  it("reports the missing Equipment Preset default after normalizing a stored blueprint that lacked it", () => {
    const storedBlueprint = {
      createdAt: testBlueprintOptions.timestamp,
      id: testBlueprintOptions.id,
      mainCompoundRotationPools: [],
      mainCompoundSelections: completeMainCompoundSelections,
      repRanges: "balanced_hypertrophy" as const,
      split: "full-body-3-day" as const,
      trainingFrequencyDaysPerWeek: 3 as const,
      trainingGoal: "build-muscle" as const,
      updatedAt: testBlueprintOptions.timestamp,
      ...createRecommendedTrainingVolumeConfiguration(),
    };
    const blueprint = normalizePlanBlueprint(storedBlueprint);

    expect(resolvePlanBlueprintRecommendedDefaults(blueprint)).toMatchObject({
      isReady: false,
      recommendedDefaults: [
        {
          equipmentPreset: "full_gym",
          kind: "equipment_preset",
        },
      ],
      resolvedBlueprint: {
        ...blueprint,
        equipmentPresetSource: "user_selected",
      },
    });
    expect(blueprint.equipmentPresetSource).toBeNull();
    expect(blueprint.exerciseSelectionPreferences.equipmentPreset).toBe("full_gym");
  });

  it("recommends catalog-backed main compound selections for missing Full Body coverage during generation", () => {
    const blueprint = createTestPlanBlueprint({
      ...createRecommendedTrainingVolumeConfiguration(),
      equipmentPresetSource: "user_selected",
      repRanges: "balanced_hypertrophy",
      split: "full-body-3-day",
    });

    const resolution = resolvePlanBlueprintRecommendedDefaults(blueprint);

    expect(resolution).toMatchObject({
      isReady: false,
      recommendedDefaults: completeMainCompoundRecommendedDefaults,
      resolvedBlueprint: {
        ...blueprint,
        mainCompoundSelections: completeMainCompoundSelections,
      },
    });
    expectMainCompoundCoverageCanConfirmExercises({
      mainCompoundSelections: resolution.resolvedBlueprint.mainCompoundSelections,
      split: "full-body-3-day",
      trainingFrequencyDaysPerWeek: 3,
    });
  });

  it("uses Exercise Selection Preferences when recommending missing main compound defaults", () => {
    const blueprint = createTestPlanBlueprint({
      ...createRecommendedTrainingVolumeConfiguration(),
      equipmentPresetSource: "user_selected",
      exerciseSelectionPreferences: {
        ...createTestPlanBlueprint().exerciseSelectionPreferences,
        avoidedExercises: [{ id: "avoided-1", rawText: "Flat Barbell Bench Press" }],
        preferredExercises: [{ id: "preferred-1", rawText: "Flat Dumbbell Bench Press" }],
      },
      repRanges: "balanced_hypertrophy",
      split: "full-body-3-day",
    });

    const resolution = resolvePlanBlueprintRecommendedDefaults(blueprint);

    expect(resolution.recommendedDefaults).toContainEqual({
      exerciseId: "flat-dumbbell-bench-press",
      kind: "main_compound_selection",
      movementPattern: "horizontal_push",
    });
    expect(resolution.resolvedBlueprint.mainCompoundSelections).toContainEqual({
      exerciseId: "flat-dumbbell-bench-press",
      movementPattern: "horizontal_push",
    });
  });

  it("preserves configured main compounds and only recommends the missing Upper/Lower coverage patterns", () => {
    const blueprint = createTestPlanBlueprint({
      ...createRecommendedTrainingVolumeConfiguration(),
      equipmentPresetSource: "user_selected",
      mainCompoundSelections: completeMainCompoundSelections.filter(
        ({ movementPattern }) =>
          movementPattern === "horizontal_push" || movementPattern === "quad_dominant",
      ),
      repRanges: "balanced_hypertrophy",
      split: "upper-lower-4-day",
      trainingFrequencyDaysPerWeek: 4,
    });

    const resolution = resolvePlanBlueprintRecommendedDefaults(blueprint);

    expect(resolution).toMatchObject({
      isReady: false,
      recommendedDefaults: [
        {
          exerciseId: "bent-over-barbell-rows",
          kind: "main_compound_selection",
          movementPattern: "horizontal_pull",
        },
        {
          exerciseId: "standing-overhead-barbell-press",
          kind: "main_compound_selection",
          movementPattern: "vertical_push",
        },
        {
          exerciseId: "pull-ups",
          kind: "main_compound_selection",
          movementPattern: "vertical_pull",
        },
        {
          exerciseId: "barbell-romanian-deadlifts",
          kind: "main_compound_selection",
          movementPattern: "hip_hamstring_dominant",
        },
      ],
      resolvedBlueprint: {
        ...blueprint,
        mainCompoundSelections: completeMainCompoundSelections,
      },
    });
    expectMainCompoundCoverageCanConfirmExercises({
      mainCompoundSelections: resolution.resolvedBlueprint.mainCompoundSelections,
      split: "upper-lower-4-day",
      trainingFrequencyDaysPerWeek: 4,
    });
  });

  it("recommends only the missing Pull coverage patterns for Push/Pull/Legs", () => {
    const blueprint = createTestPlanBlueprint({
      ...createRecommendedTrainingVolumeConfiguration(),
      equipmentPresetSource: "user_selected",
      mainCompoundSelections: completeMainCompoundSelections.filter(
        ({ movementPattern }) =>
          movementPattern !== "horizontal_pull" && movementPattern !== "vertical_pull",
      ),
      repRanges: "balanced_hypertrophy",
      split: "rotating-push-pull-legs",
      trainingFrequencyDaysPerWeek: 4,
    });

    const resolution = resolvePlanBlueprintRecommendedDefaults(blueprint);

    expect(resolution).toMatchObject({
      isReady: false,
      recommendedDefaults: [
        {
          exerciseId: "bent-over-barbell-rows",
          kind: "main_compound_selection",
          movementPattern: "horizontal_pull",
        },
        {
          exerciseId: "pull-ups",
          kind: "main_compound_selection",
          movementPattern: "vertical_pull",
        },
      ],
    });
    expectMainCompoundCoverageCanConfirmExercises({
      mainCompoundSelections: resolution.resolvedBlueprint.mainCompoundSelections,
      split: "rotating-push-pull-legs",
      trainingFrequencyDaysPerWeek: 4,
    });
  });
});

const completeMainCompoundRecommendedDefaults = completeMainCompoundSelections.map((selection) => ({
  ...selection,
  kind: "main_compound_selection" as const,
}));

function expectMainCompoundCoverageCanConfirmExercises({
  mainCompoundSelections,
  split,
  trainingFrequencyDaysPerWeek,
}: MainCompoundCoverageExpectation): void {
  expect(
    getWeeklyMovementCoverage({
      mainCompoundSelections,
      split,
      trainingFrequencyDaysPerWeek,
    }).canConfirmExercises,
  ).toBe(true);
}
