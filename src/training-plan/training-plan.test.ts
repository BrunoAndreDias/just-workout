import { describe, expect, it } from "vitest";
import type { PlanBlueprint } from "../plan-builder/plan-blueprint";
import { completeMainCompoundSelections } from "../plan-builder/plan-builder-test-fixtures";
import { createPresetWeeklyRepTargets } from "../plan-builder/training-volume";
import { generateTrainingPlanFromBlueprint } from "./training-plan";

describe("generateTrainingPlanFromBlueprint", () => {
  it("builds upper templates as push/pull/abs then pull/push/abs", () => {
    const trainingPlan = generateTrainingPlanFromBlueprint({
      blueprint: createCompleteBlueprint(),
      id: "training-plan-test",
      timestamp: "2026-06-07T10:00:00.000Z",
    });

    const upperTemplate = trainingPlan.workoutTemplates.find(
      (template) => template.label === "Upper A",
    );

    expect(upperTemplate?.supersetGroups.map((group) => group.type)).toEqual([
      "superset",
      "superset",
      "isolation",
    ]);
    expect(upperTemplate?.supersetGroups[0]?.slots.map((slot) => slot.movementPattern)).toEqual([
      "horizontal_push",
      "vertical_pull",
      "core",
    ]);
    expect(upperTemplate?.supersetGroups[0]?.slots.map((slot) => slot.role)).toEqual([
      "main_compound",
      "secondary_compound",
      "abs",
    ]);
    expect(upperTemplate?.supersetGroups[1]?.slots.map((slot) => slot.movementPattern)).toEqual([
      "horizontal_pull",
      "vertical_push",
      "core",
    ]);
    expect(upperTemplate?.supersetGroups[1]?.slots.map((slot) => slot.role)).toEqual([
      "main_compound",
      "secondary_compound",
      "abs",
    ]);
    expect(upperTemplate?.supersetGroups[2]?.slots.map((slot) => slot.role)).toEqual([
      "isolation",
      "isolation",
    ]);
    expectWorkoutHasNoDuplicateExercises(upperTemplate);
  });

  it("builds all-full-body templates as upper-focused core supersets plus separate accessories and abs", () => {
    const trainingPlan = generateTrainingPlanFromBlueprint({
      blueprint: createCompleteBlueprint({
        split: "full-body-3-day",
        trainingFrequencyDaysPerWeek: 3,
      }),
      id: "training-plan-test",
      timestamp: "2026-06-07T10:00:00.000Z",
    });

    const fullBodyTemplate = trainingPlan.workoutTemplates[0];

    expect(fullBodyTemplate?.supersetGroups.map((group) => group.title)).toEqual([
      "Full-body superset 1",
      "Full-body superset 2",
      "Isolation finisher",
      "Abs finisher",
    ]);
    expect(fullBodyTemplate?.supersetGroups.map((group) => group.type)).toEqual([
      "superset",
      "superset",
      "isolation",
      "abs",
    ]);
    expect(fullBodyTemplate?.supersetGroups[0]?.slots.map((slot) => slot.movementPattern)).toEqual([
      "horizontal_push",
      "vertical_pull",
      "quad_dominant",
    ]);
    expect(fullBodyTemplate?.supersetGroups[0]?.slots.map((slot) => slot.role)).toEqual([
      "main_compound",
      "secondary_compound",
      "main_compound",
    ]);
    expect(fullBodyTemplate?.supersetGroups[1]?.slots.map((slot) => slot.movementPattern)).toEqual([
      "horizontal_pull",
      "vertical_push",
      "hip_hamstring_dominant",
    ]);
    expect(fullBodyTemplate?.supersetGroups[1]?.slots.map((slot) => slot.role)).toEqual([
      "main_compound",
      "secondary_compound",
      "main_compound",
    ]);
    expect(fullBodyTemplate?.supersetGroups[2]?.slots.map((slot) => slot.slotLabel)).toEqual([
      "Biceps",
      "Triceps",
      "Lower isolation",
    ]);
    expect(fullBodyTemplate?.supersetGroups[2]?.slots.map((slot) => slot.exerciseName)).toEqual([
      "Standing Barbell Curls",
      "Cable Press-Downs",
      "Standing Calf Raises",
    ]);
    expect(fullBodyTemplate?.supersetGroups[3]?.slots.map((slot) => slot.role)).toEqual([
      "abs",
      "abs",
    ]);
    expect(
      fullBodyTemplate?.supersetGroups
        .slice(0, 2)
        .flatMap((group) => group.slots)
        .some((slot) => slot.role === "abs"),
    ).toBe(false);
    expectWorkoutHasNoDuplicateExercises(fullBodyTemplate);
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
    expect(lowerTemplate?.supersetGroups[0]?.slots.map((slot) => slot.movementPattern)).toEqual([
      "quad_dominant",
      "hip_hamstring_dominant",
      "core",
    ]);
    expect(lowerTemplate?.supersetGroups[0]?.slots.map((slot) => slot.role)).toEqual([
      "main_compound",
      "secondary_compound",
      "abs",
    ]);
    expect(lowerTemplate?.supersetGroups[1]?.slots.map((slot) => slot.movementPattern)).toEqual([
      "hip_hamstring_dominant",
      "quad_dominant",
      "core",
    ]);
    expect(lowerTemplate?.supersetGroups[1]?.slots.map((slot) => slot.role)).toEqual([
      "main_compound",
      "secondary_compound",
      "abs",
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
    expectWorkoutHasNoDuplicateExercises(lowerTemplate);
  });

  it("keeps abs out of mixed-split full-body templates", () => {
    const trainingPlan = generateTrainingPlanFromBlueprint({
      blueprint: createCompleteBlueprint({
        split: "upper-lower-full-body",
        trainingFrequencyDaysPerWeek: 3,
      }),
      id: "training-plan-test",
      timestamp: "2026-06-07T10:00:00.000Z",
    });

    const fullBodyTemplate = trainingPlan.workoutTemplates.find((template) =>
      /^Full Body/.test(template.label),
    );

    expect(fullBodyTemplate?.supersetGroups.map((group) => group.type)).toEqual([
      "superset",
      "superset",
      "isolation",
    ]);
    expect(
      fullBodyTemplate?.supersetGroups
        .flatMap((group) => group.slots)
        .filter((slot) => slot.role === "abs"),
    ).toHaveLength(0);
    expectWorkoutHasNoDuplicateExercises(fullBodyTemplate);
  });
});

function expectWorkoutHasNoDuplicateExercises(
  template:
    | ReturnType<typeof generateTrainingPlanFromBlueprint>["workoutTemplates"][number]
    | undefined,
) {
  const exerciseIds = template?.supersetGroups.flatMap((group) =>
    group.slots.map((slot) => slot.exerciseId),
  );

  expect(new Set(exerciseIds).size).toBe(exerciseIds?.length);
}

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
