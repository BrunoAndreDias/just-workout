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
      mainCompoundRotationPools: [],
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
    mainCompoundRotationPools: [],
    mainCompoundSelections: completeMainCompoundSelections,
    repRanges: "balanced_hypertrophy",
    split: "upper-lower-4-day",
    trainingFrequencyDaysPerWeek: 4,
    trainingGoal: "build-muscle",
    updatedAt: "2026-06-07T09:00:00.000Z",
    volumePreset: "balanced",
    volumePresetSource: "user_selected",
    weeklyRepTargets: createPresetWeeklyRepTargets("balanced"),
  };
}
