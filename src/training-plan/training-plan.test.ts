import { describe, expect, it } from "vitest";
import type { PlanBlueprint } from "../plan-builder/plan-blueprint";
import { completeMainCompoundSelections } from "../plan-builder/plan-builder-test-fixtures";
import { createPresetWeeklyRepTargets } from "../plan-builder/training-volume";
import { generateTrainingPlanFromBlueprint } from "./training-plan";

describe("generateTrainingPlanFromBlueprint", () => {
  it("generates concrete exercise slots with exactly two abs exercises per workout template", () => {
    const trainingPlan = generateTrainingPlanFromBlueprint({
      blueprint: createCompleteBlueprint(),
      id: "training-plan-test",
      timestamp: "2026-06-07T10:00:00.000Z",
    });

    for (const template of trainingPlan.workoutTemplates) {
      const slots = template.supersetGroups.flatMap((group) => group.slots);
      const slotNames = slots.map((slot) => slot.exerciseName);
      const slotLabels = slots.map((slot) => slot.slotLabel);
      const absNames = slots
        .filter((slot) => slot.slotLabel === "Abs")
        .map((slot) => slot.exerciseName);

      expect(slots.every((slot) => slot.kind === "exercise")).toBe(true);
      expect(slotNames).not.toContain("Upper pull");
      expect(slotNames).not.toContain("Upper push");
      expect(slotNames).not.toContain("Lower compound");
      expect(slotNames).not.toContain("Posterior chain");
      expect(slotLabels.filter((slotLabel) => slotLabel === "Abs")).toHaveLength(2);
      expect(new Set(absNames).size).toBe(2);
    }
  });

  it("builds lower templates as two alternating main supersets plus one isolation superset", () => {
    const trainingPlan = generateTrainingPlanFromBlueprint({
      blueprint: createCompleteBlueprint({
        split: "upper-lower-full-body",
        trainingFrequencyDaysPerWeek: 3,
      }),
      id: "training-plan-test",
      timestamp: "2026-06-07T10:00:00.000Z",
    });

    const lowerTemplate = trainingPlan.workoutTemplates.find(
      (template) => template.label === "Lower",
    );

    expect(lowerTemplate?.supersetGroups.map((group) => group.title)).toEqual([
      "Lower superset 1",
      "Lower superset 2",
      "Isolation finisher",
    ]);
    expect(lowerTemplate?.supersetGroups[0]?.slots.map((slot) => slot.slotLabel)).toEqual([
      "Quad dominant",
      "Hip/hamstring secondary",
      "Abs",
    ]);
    expect(lowerTemplate?.supersetGroups[1]?.slots.map((slot) => slot.slotLabel)).toEqual([
      "Hip/hamstring dominant",
      "Quad secondary",
      "Abs",
    ]);
    expect(lowerTemplate?.supersetGroups[2]?.slots.map((slot) => slot.slotLabel)).toEqual([
      "Lower isolation",
      "Lower isolation",
    ]);
    expect(lowerTemplate?.supersetGroups[2]?.slots.map((slot) => slot.exerciseName)).toEqual([
      "Leg Extensions",
      "Standing Calf Raises",
    ]);
    expect(
      lowerTemplate?.supersetGroups
        .flatMap((group) => group.slots)
        .filter((slot) => slot.slotLabel === "Abs"),
    ).toHaveLength(2);
    expect(
      new Set(
        lowerTemplate?.supersetGroups
          .flatMap((group) => group.slots)
          .filter((slot) => slot.slotLabel === "Abs")
          .map((slot) => slot.exerciseName),
      ).size,
    ).toBe(2);

    const mainExerciseIds = new Set(
      lowerTemplate?.supersetGroups
        .slice(0, 2)
        .flatMap((group) => group.slots)
        .filter((slot) => slot.slotLabel !== "Abs")
        .map((slot) => slot.exerciseId),
    );
    const isolationExerciseIds =
      lowerTemplate?.supersetGroups[2]?.slots.map((slot) => slot.exerciseId) ?? [];

    expect(isolationExerciseIds.every((exerciseId) => !mainExerciseIds.has(exerciseId))).toBe(true);
  });
});

function createCompleteBlueprint({
  split = "upper-lower-4-day",
  trainingFrequencyDaysPerWeek = 4,
}: {
  split?: PlanBlueprint["split"];
  trainingFrequencyDaysPerWeek?: PlanBlueprint["trainingFrequencyDaysPerWeek"];
} = {}): PlanBlueprint {
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
    id: "plan-blueprint-test",
    mainCompoundRotationPools: [],
    mainCompoundSelections: completeMainCompoundSelections,
    repRanges: "balanced_hypertrophy",
    split,
    trainingFrequencyDaysPerWeek,
    trainingGoal: "build-muscle",
    updatedAt: "2026-06-07T09:00:00.000Z",
    volumePreset: "balanced",
    volumePresetSource: "user_selected",
    weeklyRepTargets: createPresetWeeklyRepTargets("balanced"),
  };
}
