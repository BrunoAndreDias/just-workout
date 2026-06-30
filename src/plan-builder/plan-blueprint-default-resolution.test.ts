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
        mainCompoundRotationPools: completeMainCompoundRecommendedRotationPools,
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
      blockingIssues: [],
      isReady: true,
      recommendedDefaults: [],
      resolvedBlueprint: {
        ...blueprint,
        mainCompoundRotationPools: completeMainCompoundRecommendedRotationPools,
      },
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
        mainCompoundRotationPools: completeMainCompoundRecommendedRotationPools,
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
        mainCompoundRotationPools: completeMainCompoundRecommendedRotationPools,
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
        mainCompoundRotationPools: completeMainCompoundRecommendedRotationPools,
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

  it("resolves ranked Main Compound Preferences before falling back to Recommended Defaults", () => {
    const blueprint = createTestPlanBlueprint({
      ...createRecommendedTrainingVolumeConfiguration(),
      equipmentPresetSource: "user_selected",
      exerciseSelectionPreferences: {
        ...createTestPlanBlueprint().exerciseSelectionPreferences,
        avoidedExercises: [{ id: "avoided-1", rawText: "Flat Barbell Bench Press" }],
      },
      mainCompoundPreferences: [
        {
          exerciseIds: ["flat-barbell-bench-press", "incline-dumbbell-bench-press"],
          movementPattern: "horizontal_push",
        },
      ],
      repRanges: "balanced_hypertrophy",
      split: "full-body-3-day",
    });

    const resolution = resolvePlanBlueprintRecommendedDefaults(blueprint);

    expect(resolution.recommendedDefaults).toContainEqual({
      exerciseId: "incline-dumbbell-bench-press",
      kind: "main_compound_selection",
      movementPattern: "horizontal_push",
    });
    expect(resolution.recommendedDefaults).toContainEqual({
      exerciseId: "pull-ups",
      kind: "main_compound_selection",
      movementPattern: "vertical_pull",
    });
    expect(resolution.resolvedBlueprint.mainCompoundSelections).toContainEqual({
      exerciseId: "incline-dumbbell-bench-press",
      movementPattern: "horizontal_push",
    });
    expect(resolution.resolvedBlueprint.mainCompoundSelections).toContainEqual({
      exerciseId: "pull-ups",
      movementPattern: "vertical_pull",
    });
  });

  it("reports a blocking issue when avoided exercises leave no valid non-avoided option for a required Movement Pattern", () => {
    const blueprint = createTestPlanBlueprint({
      ...createRecommendedTrainingVolumeConfiguration(),
      equipmentPresetSource: "user_selected",
      exerciseSelectionPreferences: {
        ...createTestPlanBlueprint().exerciseSelectionPreferences,
        avoidedExercises: [
          { id: "avoided-1", rawText: "Flat Barbell Bench Press" },
          { id: "avoided-2", rawText: "Flat Dumbbell Bench Press" },
          { id: "avoided-3", rawText: "Incline Barbell Bench Press" },
          { id: "avoided-4", rawText: "Incline Dumbbell Bench Press" },
          { id: "avoided-5", rawText: "Decline Barbell Bench Press" },
          { id: "avoided-6", rawText: "Decline Dumbbell Bench Press" },
          { id: "avoided-7", rawText: "Flat Chest Press Machine" },
          { id: "avoided-8", rawText: "Incline Chest Press Machine" },
          { id: "avoided-9", rawText: "Decline Chest Press Machine" },
          { id: "avoided-10", rawText: "Dips (Parallel Bars, Slight Forward Lean)" },
          { id: "avoided-11", rawText: "Push-Ups" },
          { id: "avoided-12", rawText: "Dips (Elbows Close, No Forward Lean)" },
          { id: "avoided-13", rawText: "Flat Close Grip Bench Press" },
          { id: "avoided-14", rawText: "Decline Close Grip Bench Press" },
          { id: "avoided-15", rawText: "Close Grip Push-Ups" },
          { id: "avoided-16", rawText: "Bench Dips" },
        ],
      },
      repRanges: "balanced_hypertrophy",
      split: "full-body-3-day",
    });

    const resolution = resolvePlanBlueprintRecommendedDefaults(blueprint);

    expect(resolution.isReady).toBe(false);
    expect(resolution.recommendedDefaults).not.toContainEqual(
      expect.objectContaining({
        kind: "main_compound_selection",
        movementPattern: "horizontal_push",
      }),
    );
    expect(resolution.blockingIssues).toContainEqual({
      kind: "no_valid_main_compound_selection",
      message:
        "Horizontal Push has no valid non-avoided exercise. Remove an avoidance or choose another valid exercise for that Movement Pattern.",
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
        mainCompoundRotationPools: completeMainCompoundRecommendedRotationPools,
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

const completeMainCompoundRecommendedRotationPools = [
  {
    exerciseIds: [
      "flat-dumbbell-bench-press",
      "incline-barbell-bench-press",
      "incline-dumbbell-bench-press",
    ],
    movementPattern: "horizontal_push",
  },
  {
    exerciseIds: ["bent-over-dumbbell-rows", "t-bar-rows", "seated-cable-rows"],
    movementPattern: "horizontal_pull",
  },
  {
    exerciseIds: [
      "seated-overhead-barbell-press",
      "seated-overhead-dumbbell-press",
      "standing-overhead-dumbbell-press",
    ],
    movementPattern: "vertical_push",
  },
  {
    exerciseIds: ["chin-ups", "lat-pull-downs", "neutral-grip-pulldown"],
    movementPattern: "vertical_pull",
  },
  {
    exerciseIds: ["dumbbell-squats", "barbell-front-squats", "dumbbell-front-squats"],
    movementPattern: "quad_dominant",
  },
  {
    exerciseIds: [
      "dumbbell-romanian-deadlifts",
      "barbell-straight-leg-deadlifts",
      "dumbbell-straight-leg-deadlifts",
    ],
    movementPattern: "hip_hamstring_dominant",
  },
] as const;

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
