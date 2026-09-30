import { describe, expect, it } from "vitest";
import type { PlanBlueprint } from "../plan-builder/plan-blueprint";
import { completeMainCompoundSelections } from "../plan-builder/plan-builder-test-fixtures";
import { createPresetWeeklyRepTargets } from "../training-taxonomy";
import {
  generateTrainingPlanContentFromBlueprint,
  generateTrainingPlanFromBlueprint,
  validateTrainingPlanDraftContent,
  type WorkoutTemplate,
} from "./training-plan";
import type { TrainingPrescription } from "./training-prescription";

describe("generateTrainingPlanFromBlueprint", () => {
  it("adds role-based Training Prescriptions to generated workout slots and changes only rep ranges when Rep Range Style changes", () => {
    const strengthPlan = generateTrainingPlanFromBlueprint({
      blueprint: createCompleteBlueprint({
        repRanges: "strength_leaning",
      }),
      id: "training-plan-strength",
      timestamp: "2026-06-07T10:00:00.000Z",
    });
    const balancedPlan = generateTrainingPlanFromBlueprint({
      blueprint: createCompleteBlueprint({
        repRanges: "balanced_hypertrophy",
      }),
      id: "training-plan-balanced",
      timestamp: "2026-06-07T10:00:00.000Z",
    });
    const higherRepPlan = generateTrainingPlanFromBlueprint({
      blueprint: createCompleteBlueprint({
        repRanges: "controlled_higher_reps",
      }),
      id: "training-plan-higher-reps",
      timestamp: "2026-06-07T10:00:00.000Z",
    });

    expect(stripTrainingPrescriptions(strengthPlan.workoutTemplates)).toEqual(
      stripTrainingPrescriptions(balancedPlan.workoutTemplates),
    );
    expect(stripTrainingPrescriptions(strengthPlan.workoutTemplates)).toEqual(
      stripTrainingPrescriptions(higherRepPlan.workoutTemplates),
    );

    const strengthUpperTemplate = getWorkoutTemplate(strengthPlan, "Upper A");
    const balancedUpperTemplate = getWorkoutTemplate(balancedPlan, "Upper A");
    const higherRepUpperTemplate = getWorkoutTemplate(higherRepPlan, "Upper A");

    expect(getTrainingPrescriptions(strengthUpperTemplate, 0)).toEqual([
      { repRange: { max: 6, min: 4 }, setCount: 3 },
      { repRange: { max: 8, min: 6 }, setCount: 3 },
      { repRange: { max: 12, min: 8 }, setCount: 3 },
    ]);
    expect(getTrainingPrescriptions(strengthUpperTemplate, 2)).toEqual([
      { repRange: { max: 12, min: 8 }, setCount: 3 },
      { repRange: { max: 12, min: 8 }, setCount: 3 },
    ]);

    expect(getTrainingPrescriptions(balancedUpperTemplate, 0)).toEqual([
      { repRange: { max: 8, min: 6 }, setCount: 3 },
      { repRange: { max: 10, min: 8 }, setCount: 3 },
      { repRange: { max: 15, min: 10 }, setCount: 3 },
    ]);
    expect(getTrainingPrescriptions(balancedUpperTemplate, 2)).toEqual([
      { repRange: { max: 15, min: 10 }, setCount: 3 },
      { repRange: { max: 15, min: 10 }, setCount: 3 },
    ]);

    expect(getTrainingPrescriptions(higherRepUpperTemplate, 0)).toEqual([
      { repRange: { max: 10, min: 8 }, setCount: 3 },
      { repRange: { max: 12, min: 10 }, setCount: 3 },
      { repRange: { max: 20, min: 12 }, setCount: 3 },
    ]);
    expect(getTrainingPrescriptions(higherRepUpperTemplate, 2)).toEqual([
      { repRange: { max: 20, min: 12 }, setCount: 3 },
      { repRange: { max: 20, min: 12 }, setCount: 3 },
    ]);
  });

  it("extracts draft-ready Training Plan content without lifecycle fields while preserving generated content", () => {
    const blueprint = createCompleteBlueprint();
    const content = generateTrainingPlanContentFromBlueprint({ blueprint });
    const trainingPlan = generateTrainingPlanFromBlueprint({
      blueprint,
      id: "training-plan-test",
      timestamp: "2026-06-07T10:00:00.000Z",
    });

    expect(content).toEqual({
      exerciseSelectionPreferences: trainingPlan.exerciseSelectionPreferences,
      isolationExercisePreferences: trainingPlan.isolationExercisePreferences,
      mainCompoundRotationPools: trainingPlan.mainCompoundRotationPools,
      repRangeStyle: trainingPlan.repRangeStyle,
      split: trainingPlan.split,
      startingLoadSuggestions: trainingPlan.startingLoadSuggestions,
      trainingBlockWeeks: trainingPlan.trainingBlockWeeks,
      trainingFrequencyDaysPerWeek: trainingPlan.trainingFrequencyDaysPerWeek,
      trainingGoal: trainingPlan.trainingGoal,
      weeklyRepTargets: trainingPlan.weeklyRepTargets,
      workoutTemplates: trainingPlan.workoutTemplates,
    });
    expect(content.workoutTemplates.every((template) => template.purpose === "strength")).toBe(
      true,
    );
  });

  it("generates Full Body templates without duplicate exercises inside a Workout Template", () => {
    const content = generateTrainingPlanContentFromBlueprint({
      blueprint: createCompleteBlueprint({
        split: "full-body-3-day",
        trainingFrequencyDaysPerWeek: 3,
      }),
    });

    expect(
      content.workoutTemplates.every((template) => {
        const exerciseIds = template.supersetGroups.flatMap((group) =>
          group.slots.map((slot) => slot.exerciseId),
        );

        return new Set(exerciseIds).size === exerciseIds.length;
      }),
    ).toBe(true);
  });

  it("keeps generated Training Prescriptions independent between workout slots and generations", () => {
    const trainingPlan = generateTrainingPlanFromBlueprint({
      blueprint: createCompleteBlueprint(),
      id: "training-plan-test",
      timestamp: "2026-06-07T10:00:00.000Z",
    });
    const upperTemplate = getWorkoutTemplate(trainingPlan, "Upper A");
    const mainCompoundSlots = upperTemplate.supersetGroups
      .flatMap((group) => group.slots)
      .filter((slot) => slot.role === "main_compound");

    expect(mainCompoundSlots).toHaveLength(2);

    const [firstMainCompoundSlot, secondMainCompoundSlot] = mainCompoundSlots;
    expect(firstMainCompoundSlot).toBeDefined();
    expect(secondMainCompoundSlot).toBeDefined();

    const firstTrainingPrescription = getRequiredTrainingPrescription(firstMainCompoundSlot);
    const secondTrainingPrescription = getRequiredTrainingPrescription(secondMainCompoundSlot);
    const secondRepRange = { ...secondTrainingPrescription.repRange };

    firstTrainingPrescription.repRange.min = 99;

    expect(secondTrainingPrescription.repRange).toEqual(secondRepRange);

    const nextTrainingPlan = generateTrainingPlanFromBlueprint({
      blueprint: createCompleteBlueprint(),
      id: "training-plan-test-next",
      timestamp: "2026-06-07T10:00:00.000Z",
    });

    expect(getTrainingPrescriptions(getWorkoutTemplate(nextTrainingPlan, "Upper A"), 0)[0]).toEqual(
      {
        repRange: { max: 8, min: 6 },
        setCount: 3,
      },
    );
  });

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

  it("builds all-full-body templates as upper-focused core supersets plus separate accessories without abs", () => {
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
    ]);
    expect(fullBodyTemplate?.supersetGroups.map((group) => group.type)).toEqual([
      "superset",
      "superset",
      "isolation",
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
    expect(
      fullBodyTemplate?.supersetGroups
        .flatMap((group) => group.slots)
        .some((slot) => slot.role === "abs"),
    ).toBe(false);
    expectWorkoutHasNoDuplicateExercises(fullBodyTemplate);
  });

  it("uses ranked Isolation Exercise Preferences for matching accessory slots and falls back when buckets are empty", () => {
    const trainingPlan = generateTrainingPlanFromBlueprint({
      blueprint: createCompleteBlueprint({
        isolationExercisePreferences: [
          {
            exerciseIds: ["incline-dumbbell-curls", "standing-barbell-curls"],
            primaryMuscleGroup: "biceps",
          },
          {
            exerciseIds: ["skull-crushers"],
            primaryMuscleGroup: "triceps",
          },
          {
            exerciseIds: ["flat-dumbbell-flyes"],
            primaryMuscleGroup: "chest",
          },
        ],
        split: "full-body-3-day",
        trainingFrequencyDaysPerWeek: 3,
      }),
      id: "training-plan-test",
      timestamp: "2026-06-07T10:00:00.000Z",
    });

    const fullBodyTemplate = trainingPlan.workoutTemplates[0];

    expect(fullBodyTemplate?.supersetGroups[2]?.slots.map((slot) => slot.exerciseName)).toEqual([
      "Incline Dumbbell Curls",
      "Skull Crushers",
      "Standing Calf Raises",
    ]);
    expectWorkoutHasNoDuplicateExercises(fullBodyTemplate);
  });

  it("treats avoided exercises as hard exclusions for Isolation Exercise Preferences during generation", () => {
    const trainingPlan = generateTrainingPlanFromBlueprint({
      blueprint: {
        ...createCompleteBlueprint({
          isolationExercisePreferences: [
            {
              exerciseIds: ["incline-dumbbell-curls", "standing-barbell-curls"],
              primaryMuscleGroup: "biceps",
            },
            {
              exerciseIds: ["skull-crushers"],
              primaryMuscleGroup: "triceps",
            },
          ],
          split: "full-body-3-day",
          trainingFrequencyDaysPerWeek: 3,
        }),
        exerciseSelectionPreferences: {
          avoidedExercises: [{ id: "avoided-1", rawText: "Incline Dumbbell Curls" }],
          equipmentPreset: "full_gym",
          preferredExercises: [],
          strategy: "balanced",
        },
      },
      id: "training-plan-test",
      timestamp: "2026-06-07T10:00:00.000Z",
    });

    const fullBodyTemplate = trainingPlan.workoutTemplates[0];

    expect(fullBodyTemplate?.supersetGroups[2]?.slots.map((slot) => slot.exerciseName)).toEqual([
      "Standing Barbell Curls",
      "Skull Crushers",
      "Standing Calf Raises",
    ]);
    expect(getExerciseIds(fullBodyTemplate)).not.toContain("incline-dumbbell-curls");
  });

  it("persists exercise selection policy needed for future Training Block rotation proposals", () => {
    const trainingPlan = generateTrainingPlanFromBlueprint({
      blueprint: {
        ...createCompleteBlueprint({
          isolationExercisePreferences: [
            {
              exerciseIds: ["incline-dumbbell-curls", "standing-barbell-curls"],
              primaryMuscleGroup: "biceps",
            },
          ],
        }),
        exerciseSelectionPreferences: {
          avoidedExercises: [{ id: "avoided-1", rawText: "Incline Dumbbell Curls" }],
          equipmentPreset: "full_gym",
          preferredExercises: [],
          strategy: "balanced",
        },
      },
      id: "training-plan-test",
      timestamp: "2026-06-07T10:00:00.000Z",
    });

    expect(trainingPlan.exerciseSelectionPreferences).toEqual({
      avoidedExercises: [{ id: "avoided-1", rawText: "Incline Dumbbell Curls" }],
      equipmentPreset: "full_gym",
      preferredExercises: [],
      strategy: "balanced",
    });
    expect(trainingPlan.isolationExercisePreferences).toEqual([
      {
        exerciseIds: ["incline-dumbbell-curls", "standing-barbell-curls"],
        primaryMuscleGroup: "biceps",
      },
    ]);
  });

  it("builds alternating Full Body A/B templates with concrete blueprint exercise variation", () => {
    const trainingPlan = generateTrainingPlanFromBlueprint({
      blueprint: createCompleteBlueprint({
        split: "alternating-full-body-a-b",
        trainingFrequencyDaysPerWeek: 3,
      }),
      id: "training-plan-test",
      timestamp: "2026-06-07T10:00:00.000Z",
    });

    expect(trainingPlan.workoutTemplates.map((template) => template.label)).toEqual([
      "Full Body A",
      "Full Body B",
    ]);

    const fullBodyA = trainingPlan.workoutTemplates.find(
      (template) => template.label === "Full Body A",
    );
    const fullBodyB = trainingPlan.workoutTemplates.find(
      (template) => template.label === "Full Body B",
    );

    expect(fullBodyA?.supersetGroups.map((group) => group.type)).toEqual([
      "superset",
      "superset",
      "isolation",
    ]);
    expect(fullBodyA?.supersetGroups[0]?.slots.map((slot) => slot.exerciseName)).toEqual([
      "Flat Dumbbell Bench Press",
      "Pull-Ups",
      "Barbell or Dumbbell Lunges",
    ]);
    expect(fullBodyA?.supersetGroups[1]?.slots.map((slot) => slot.exerciseName)).toEqual([
      "Bent Over Barbell Rows",
      "Standing Overhead Barbell or Dumbbell Press",
      "Barbell Romanian Deadlifts",
    ]);
    expect(fullBodyA?.supersetGroups[2]?.slots.map((slot) => slot.exerciseName)).toEqual([
      "Standing Barbell Curls",
      "Cable Press-Downs",
      "Standing Calf Raises",
    ]);

    expect(fullBodyB?.supersetGroups.map((group) => group.type)).toEqual([
      "superset",
      "superset",
      "isolation",
    ]);
    expect(fullBodyB?.supersetGroups[0]?.slots.map((slot) => slot.exerciseName)).toEqual([
      "Flat Barbell Bench Press",
      "Bent Over Barbell Rows",
      "Barbell Squats",
    ]);
    expect(fullBodyB?.supersetGroups[1]?.slots.map((slot) => slot.exerciseName)).toEqual([
      "Pull-Ups",
      "Standing Overhead Barbell Press",
      "Hyperextensions",
    ]);
    expect(fullBodyB?.supersetGroups[2]?.slots.map((slot) => slot.exerciseName)).toEqual([
      "Standing Barbell Curls",
      "Cable Press-Downs",
      "Standing Calf Raises",
    ]);
    expectWorkoutHasNoDuplicateExercises(fullBodyA);
    expectWorkoutHasNoDuplicateExercises(fullBodyB);
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

  it("builds rotating Push/Pull/Legs templates from the rotating split cycle", () => {
    const trainingPlan = generateTrainingPlanFromBlueprint({
      blueprint: createCompleteBlueprint({
        split: "rotating-push-pull-legs",
        trainingFrequencyDaysPerWeek: 5,
      }),
      id: "training-plan-test",
      timestamp: "2026-06-07T10:00:00.000Z",
    });

    expect(trainingPlan.split).toBe("Rotating Push/Pull/Legs");
    expect(trainingPlan.workoutTemplates.map((template) => template.label)).toEqual([
      "Push A",
      "Pull A",
      "Legs A",
      "Push B",
      "Pull B",
      "Legs B",
    ]);

    const byLabel = (label: string) =>
      trainingPlan.workoutTemplates.find((template) => template.label === label);
    const mainExerciseIds = (label: string) =>
      byLabel(label)
        ?.supersetGroups.flatMap((group) => group.slots)
        .filter((slot) => slot.role === "main_compound")
        .map((slot) => slot.exerciseId);

    expect(byLabel("Push A")?.supersetGroups.map((group) => group.title)).toEqual([
      "Push superset 1",
      "Push superset 2",
      "Isolation finisher",
    ]);
    expect(byLabel("Legs A")?.supersetGroups.map((group) => group.title)).toEqual([
      "Lower superset 1",
      "Lower superset 2",
      "Isolation finisher",
    ]);
    // Push days only press and Pull days only pull; A and B lead with different main lifts.
    expect(mainExerciseIds("Push A")).toEqual(["flat-barbell-bench-press"]);
    expect(mainExerciseIds("Push B")).toEqual(["standing-overhead-barbell-press"]);
    expect(mainExerciseIds("Pull A")).toEqual(["bent-over-barbell-rows"]);
    expect(mainExerciseIds("Pull B")).toEqual(["pull-ups"]);
    expect(getExerciseIds(byLabel("Push A"))).not.toContain("bent-over-barbell-rows");
    expect(getExerciseIds(byLabel("Pull A"))).not.toContain("flat-barbell-bench-press");
    expect(getExerciseIds(byLabel("Legs B"))).toEqual(
      expect.arrayContaining(["barbell-squats", "barbell-romanian-deadlifts"]),
    );
    expect(validateTrainingPlanDraftContent({ content: trainingPlan }).blockers).toEqual([]);
  });

  it.each([
    ["full-body-2-day", 2],
    ["full-body-3-day", 3],
    ["alternating-full-body-a-b", 3],
    ["upper-lower-full-body", 3],
    ["rotating-upper-lower", 3],
    ["upper-lower-4-day", 4],
    ["rotating-push-pull-legs", 4],
    ["rotating-upper-lower", 5],
    ["rotating-push-pull-legs", 5],
  ] as const)("generates an acceptable draft for %s at %i days/week", (split, trainingFrequencyDaysPerWeek) => {
    const content = generateTrainingPlanContentFromBlueprint({
      blueprint: createCompleteBlueprint({ split, trainingFrequencyDaysPerWeek }),
    });

    expect(validateTrainingPlanDraftContent({ content }).blockers).toEqual([]);
  });

  it("swaps avoided default exercises for compatible alternatives instead of blocking the draft", () => {
    const blueprint = createCompleteBlueprint({
      split: "rotating-upper-lower",
      trainingFrequencyDaysPerWeek: 3,
    });
    const content = generateTrainingPlanContentFromBlueprint({
      blueprint: {
        ...blueprint,
        exerciseSelectionPreferences: {
          ...blueprint.exerciseSelectionPreferences,
          avoidedExercises: [
            { id: "avoid-1", rawText: "Incline Dumbbell Bench Press" },
            { id: "avoid-2", rawText: "Hanging Leg Raises" },
            { id: "avoid-3", rawText: "Dumbbell Split Squats" },
          ],
        },
      },
    });
    const exerciseIds = content.workoutTemplates.flatMap((template) => getExerciseIds(template));

    expect(exerciseIds).not.toContain("incline-dumbbell-bench-press");
    expect(exerciseIds).not.toContain("hanging-leg-raises");
    expect(exerciseIds).not.toContain("dumbbell-split-squats");
    expect(validateTrainingPlanDraftContent({ content }).blockers).toEqual([]);
  });

  it.each([
    3, 5,
  ] as const)("builds Rotating Upper/Lower A/B templates with abs in the main supersets for %i days/week", (trainingFrequencyDaysPerWeek) => {
    const trainingPlan = generateTrainingPlanFromBlueprint({
      blueprint: createCompleteBlueprint({
        split: "rotating-upper-lower",
        trainingFrequencyDaysPerWeek,
      }),
      id: "training-plan-test",
      timestamp: "2026-06-07T10:00:00.000Z",
    });

    expect(trainingPlan.split).toBe("Rotating Upper/Lower");
    expect(trainingPlan.trainingFrequencyDaysPerWeek).toBe(trainingFrequencyDaysPerWeek);
    expect(trainingPlan.workoutTemplates.map((template) => template.label)).toEqual([
      "Upper A",
      "Lower A",
      "Upper B",
      "Lower B",
    ]);

    for (const template of trainingPlan.workoutTemplates) {
      const isUpper = template.label.startsWith("Upper");

      expect(template.supersetGroups.map((group) => group.title)).toEqual(
        isUpper
          ? ["Upper superset 1", "Upper superset 2", "Isolation finisher"]
          : ["Lower superset 1", "Lower superset 2", "Isolation finisher"],
      );
      expect(
        template.supersetGroups
          .slice(0, 2)
          .map((group) => group.slots.filter((slot) => slot.role === "abs").length),
      ).toEqual([1, 1]);
      expect(template.supersetGroups[2]?.slots.some((slot) => slot.role === "abs")).toBe(false);
      expectWorkoutHasNoDuplicateExercises(template);
    }
  });

  it("derives Main Compound Rotation Pools from ranked rotation preferences and empty buckets", () => {
    const trainingPlan = generateTrainingPlanFromBlueprint({
      blueprint: {
        ...createCompleteBlueprint(),
        exerciseSelectionPreferences: {
          avoidedExercises: [{ id: "avoided-1", rawText: "Flat Dumbbell Bench Press" }],
          equipmentPreset: "full_gym",
          preferredExercises: [],
          strategy: "balanced",
        },
        mainCompoundRotationPreferences: [
          {
            exerciseIds: [
              "flat-barbell-bench-press",
              "incline-barbell-bench-press",
              "flat-dumbbell-bench-press",
            ],
            movementPattern: "horizontal_push",
          },
        ],
      },
      id: "training-plan-test",
      timestamp: "2026-06-07T10:00:00.000Z",
    });

    expect(trainingPlan.mainCompoundRotationPools).toEqual(
      expect.arrayContaining([
        {
          exerciseIds: ["incline-barbell-bench-press"],
          movementPattern: "horizontal_push",
        },
        {
          exerciseIds: ["chin-ups", "lat-pull-downs", "neutral-grip-pulldown"],
          movementPattern: "vertical_pull",
        },
      ]),
    );
    expect(
      trainingPlan.mainCompoundRotationPools.find(
        (pool) => pool.movementPattern === "horizontal_push",
      )?.exerciseIds,
    ).not.toContain("flat-barbell-bench-press");
    expect(
      trainingPlan.mainCompoundRotationPools.find(
        (pool) => pool.movementPattern === "horizontal_push",
      )?.exerciseIds,
    ).not.toContain("flat-dumbbell-bench-press");
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

function getExerciseIds(
  template:
    | ReturnType<typeof generateTrainingPlanFromBlueprint>["workoutTemplates"][number]
    | undefined,
) {
  return (
    template?.supersetGroups.flatMap((group) => group.slots).map((slot) => slot.exerciseId) ?? []
  );
}

function getWorkoutTemplate(
  trainingPlan: ReturnType<typeof generateTrainingPlanFromBlueprint>,
  label: WorkoutTemplate["label"],
): WorkoutTemplate {
  const workoutTemplate = trainingPlan.workoutTemplates.find(
    (template) => template.label === label,
  );

  expect(workoutTemplate).toBeDefined();

  return workoutTemplate as WorkoutTemplate;
}

function getTrainingPrescriptions(
  workoutTemplate: WorkoutTemplate,
  groupIndex: number,
): TrainingPrescription[] {
  const supersetGroup = workoutTemplate.supersetGroups[groupIndex];

  expect(supersetGroup).toBeDefined();

  return (supersetGroup?.slots ?? []).map(getRequiredTrainingPrescription);
}

function getRequiredTrainingPrescription(
  slot: WorkoutTemplate["supersetGroups"][number]["slots"][number] | undefined,
): TrainingPrescription {
  expect(slot?.trainingPrescription).toBeDefined();

  return slot?.trainingPrescription as TrainingPrescription;
}

function stripTrainingPrescriptions(
  workoutTemplates: ReadonlyArray<WorkoutTemplate>,
): WorkoutTemplate[] {
  return workoutTemplates.map((workoutTemplate) => ({
    ...workoutTemplate,
    supersetGroups: workoutTemplate.supersetGroups.map((supersetGroup) => ({
      ...supersetGroup,
      slots: supersetGroup.slots.map((slot) => {
        const slotWithoutTrainingPrescription = { ...slot };
        delete slotWithoutTrainingPrescription.trainingPrescription;

        return slotWithoutTrainingPrescription;
      }),
    })),
  }));
}

function createCompleteBlueprint({
  isolationExercisePreferences = [],
  repRanges = "balanced_hypertrophy",
  split = "upper-lower-4-day",
  trainingFrequencyDaysPerWeek = 4,
}: {
  isolationExercisePreferences?: PlanBlueprint["isolationExercisePreferences"];
  repRanges?: NonNullable<PlanBlueprint["repRanges"]>;
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
    equipmentPresetSource: "user_selected",
    id: "plan-blueprint-test",
    isolationExercisePreferences,
    mainCompoundPreferences: [],
    mainCompoundRotationPreferences: [],
    mainCompoundRotationPools: [],
    mainCompoundSelections: completeMainCompoundSelections,
    repRanges,
    split,
    trainingFrequencyDaysPerWeek,
    trainingGoal: "build-muscle",
    trainingPlanDraft: null,
    updatedAt: "2026-06-07T09:00:00.000Z",
    volumePreset: "balanced",
    volumePresetSource: "user_selected",
    weeklyRepTargets: createPresetWeeklyRepTargets("balanced"),
  };
}
