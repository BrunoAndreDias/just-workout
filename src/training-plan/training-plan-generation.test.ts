import { describe, expect, it, vi } from "vitest";
import type { PlanBlueprint } from "../plan-builder/plan-blueprint";
import { completeMainCompoundSelections } from "../plan-builder/plan-builder-test-fixtures";
import { createPresetWeeklyRepTargets } from "../training-taxonomy";
import type { TrainingPlan } from "./training-plan";
import { generateActiveTrainingPlanFromCurrentPlanBlueprint } from "./training-plan-generation";

describe("generateActiveTrainingPlanFromCurrentPlanBlueprint", () => {
  it("loads and normalizes the current Plan Blueprint before saving the generated Active Training Plan", async () => {
    const legacyBlueprint: Partial<PlanBlueprint> = createCompleteBlueprint();

    delete legacyBlueprint.mainCompoundRotationPools;

    const savedTrainingPlans: TrainingPlan[] = [];
    const trainingPlan = await generateActiveTrainingPlanFromCurrentPlanBlueprint({
      createTrainingPlanId: () => "training-plan-test",
      getCurrentPlanBlueprint: async () => legacyBlueprint as PlanBlueprint,
      getTimestamp: () => "2026-06-07T10:00:00.000Z",
      saveActiveTrainingPlan: async (plan) => {
        savedTrainingPlans.push(plan);

        return plan;
      },
    });

    expect(savedTrainingPlans).toHaveLength(1);
    expect(trainingPlan).toMatchObject({
      active: true,
      generatedAt: "2026-06-07T10:00:00.000Z",
      id: "training-plan-test",
      mainCompoundRotationPools: [
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
      ],
      sourceBlueprintId: "plan-blueprint-test",
      updatedAt: "2026-06-07T10:00:00.000Z",
    });
    expect(trainingPlan.workoutTemplates).toHaveLength(4);
  });

  it("does not save a Training Plan when there is no current Plan Blueprint", async () => {
    const saveActiveTrainingPlan = vi.fn();

    await expect(
      generateActiveTrainingPlanFromCurrentPlanBlueprint({
        createTrainingPlanId: () => "training-plan-test",
        getCurrentPlanBlueprint: async () => null,
        getTimestamp: () => "2026-06-07T10:00:00.000Z",
        saveActiveTrainingPlan,
      }),
    ).rejects.toThrow("Cannot generate a Training Plan without a Plan Blueprint.");

    expect(saveActiveTrainingPlan).not.toHaveBeenCalled();
  });

  it("does not save a Training Plan when avoided exercises leave no valid non-avoided option for a required Movement Pattern", async () => {
    const saveActiveTrainingPlan = vi.fn();

    await expect(
      generateActiveTrainingPlanFromCurrentPlanBlueprint({
        createTrainingPlanId: () => "training-plan-test",
        getCurrentPlanBlueprint: async () => ({
          ...createCompleteBlueprint(),
          exerciseSelectionPreferences: {
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
            equipmentPreset: "full_gym",
            preferredExercises: [],
            strategy: "balanced",
          },
        }),
        getTimestamp: () => "2026-06-07T10:00:00.000Z",
        saveActiveTrainingPlan,
      }),
    ).rejects.toThrow(
      "Cannot generate a Training Plan because Weekly Movement Coverage is blocked for Horizontal push because Exercise Selection Preferences avoid every valid exercise in that Movement Pattern. Remove an avoidance or choose another valid exercise before generating.",
    );

    expect(saveActiveTrainingPlan).not.toHaveBeenCalled();
  });

  it("does not save a Training Plan while avoided Main Compound Selections need replacement defaults", async () => {
    const saveActiveTrainingPlan = vi.fn();

    await expect(
      generateActiveTrainingPlanFromCurrentPlanBlueprint({
        createTrainingPlanId: () => "training-plan-test",
        getCurrentPlanBlueprint: async () => ({
          ...createCompleteBlueprint(),
          exerciseSelectionPreferences: {
            avoidedExercises: [{ id: "avoided-1", rawText: "Flat Barbell Bench Press" }],
            equipmentPreset: "full_gym",
            preferredExercises: [],
            strategy: "balanced",
          },
        }),
        getTimestamp: () => "2026-06-07T10:00:00.000Z",
        saveActiveTrainingPlan,
      }),
    ).rejects.toThrow("Cannot generate a Training Plan while Recommended Defaults are pending.");

    expect(saveActiveTrainingPlan).not.toHaveBeenCalled();
  });
});

function createCompleteBlueprint(): PlanBlueprint {
  return {
    confirmedBuilderSteps: {
      exercises: true,
      frequency: true,
      repRanges: true,
      split: true,
      volume: true,
    },
    createdAt: "2026-06-07T09:00:00.000Z",
    exerciseSelectionPreferences: {
      avoidedExercises: [],
      equipmentPreset: "full_gym",
      preferredExercises: [],
      strategy: "balanced",
    },
    equipmentPresetSource: "user_selected",
    id: "plan-blueprint-test",
    isolationExercisePreferences: [],
    mainCompoundPreferences: [],
    mainCompoundRotationPreferences: [],
    mainCompoundRotationPools: [],
    mainCompoundSelections: completeMainCompoundSelections,
    repRanges: "balanced_hypertrophy",
    split: "upper-lower-4-day",
    trainingFrequencyDaysPerWeek: 4,
    trainingGoal: "build-muscle",
    trainingPlanDraft: null,
    updatedAt: "2026-06-07T09:00:00.000Z",
    volumePreset: "balanced",
    volumePresetSource: "user_selected",
    weeklyRepTargets: createPresetWeeklyRepTargets("balanced"),
  };
}
