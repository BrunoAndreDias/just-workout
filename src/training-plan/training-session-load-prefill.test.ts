import { describe, expect, it } from "vitest";
import type { TrainingPlan, TrainingPlanSlot, WorkoutTemplate } from "./training-plan";
import type { TrainingSession } from "./training-session";
import { createTrainingSessionLoadPrefills } from "./training-session-load-prefill";

describe("Training Session load prefills", () => {
  it("keeps an accepted exact-history prefill for the first relevant new-block session", () => {
    const trainingPlan = createTrainingPlan({
      startingLoadSuggestions: [
        {
          effectiveLoad: 92.5,
          exerciseId: "incline-dumbbell-bench-press",
          exerciseName: "Incline Dumbbell Bench Press",
          kind: "exact_previous_exercise",
          movementPattern: "horizontal_push",
          previousLoad: 92.5,
          reason: "previous exact exercise load prefill",
          suggestedLoad: 92.5,
          userEditedLoad: null,
        },
      ],
      workoutTemplate: createWorkoutTemplate(inclineBenchPressSlot),
    });

    expect(
      createTrainingSessionLoadPrefills({
        previousTrainingSessions: [],
        trainingPlan,
        workoutTemplate: trainingPlan.workoutTemplates[0] as WorkoutTemplate,
      }),
    ).toEqual([
      expect.objectContaining({
        effectiveLoad: 92.5,
        exerciseId: "incline-dumbbell-bench-press",
        showPrefillExplanation: true,
      }),
    ]);
  });

  it("explains an exact-history prefill that was not persisted from transition suggestions", () => {
    const trainingPlan = createTrainingPlan({
      workoutTemplate: createWorkoutTemplate(inclineBenchPressSlot),
    });

    expect(
      createTrainingSessionLoadPrefills({
        previousTrainingSessions: [
          createTrainingSession({
            completedAt: "2026-07-12T10:00:00.000Z",
            exerciseId: "incline-dumbbell-bench-press",
            exerciseName: "Incline Dumbbell Bench Press",
            trainingBlockId: "training-block-1",
            trainingBlockWeekNumber: 6,
            weight: 87.5,
          }),
        ],
        trainingPlan,
        workoutTemplate: trainingPlan.workoutTemplates[0] as WorkoutTemplate,
      }),
    ).toEqual([
      expect.objectContaining({
        // Week 6 ended near failure; week 1 of the next block targets 4 RIR, so the load
        // steps down one increment to keep the rep target inside the 6-8 range.
        effectiveLoad: 85,
        exerciseId: "incline-dumbbell-bench-press",
        kind: "exact_previous_exercise",
        previousLoad: 87.5,
        showPrefillExplanation: true,
        targetReps: 6,
        targetRir: 4,
      }),
    ]);
  });

  it("ignores empty persisted first-time suggestions when exact exercise history exists", () => {
    const trainingPlan = createTrainingPlan({
      startingLoadSuggestions: [
        {
          effectiveLoad: null,
          exerciseId: "incline-dumbbell-bench-press",
          exerciseName: "Incline Dumbbell Bench Press",
          kind: "first_time",
          movementPattern: "horizontal_push",
          previousLoad: null,
          reason: "first-time exercise, start empty",
          suggestedLoad: null,
          userEditedLoad: null,
        },
      ],
      workoutTemplate: createWorkoutTemplate(inclineBenchPressSlot),
    });

    expect(
      createTrainingSessionLoadPrefills({
        previousTrainingSessions: [
          createTrainingSession({
            completedAt: "2026-07-12T10:00:00.000Z",
            exerciseId: "incline-dumbbell-bench-press",
            exerciseName: "Incline Dumbbell Bench Press",
            trainingBlockId: "training-block-1",
            trainingBlockWeekNumber: 6,
            weight: 87.5,
          }),
        ],
        trainingPlan,
        workoutTemplate: trainingPlan.workoutTemplates[0] as WorkoutTemplate,
      }),
    ).toEqual([
      expect.objectContaining({
        // Week 6 ended near failure; week 1 of the next block targets 4 RIR, so the load
        // steps down one increment to keep the rep target inside the 6-8 range.
        effectiveLoad: 85,
        exerciseId: "incline-dumbbell-bench-press",
        kind: "exact_previous_exercise",
        previousLoad: 87.5,
        showPrefillExplanation: true,
        targetReps: 6,
        targetRir: 4,
      }),
    ]);
  });

  it("adjusts the next exact-exercise target from completed sets and target RIR", () => {
    const trainingPlan = createTrainingPlan({
      workoutTemplate: createWorkoutTemplate(inclineBenchPressSlot),
    });

    expect(
      createTrainingSessionLoadPrefills({
        previousTrainingSessions: [
          createTrainingSession({
            completedAt: "2026-07-19T10:00:00.000Z",
            exerciseId: "incline-dumbbell-bench-press",
            exerciseName: "Incline Dumbbell Bench Press",
            sets: [
              { done: true, reps: 8, rir: 3, setIndex: 1, weight: 92.5 },
              { done: true, reps: 8, rir: 3, setIndex: 2, weight: 92.5 },
              { done: true, reps: 8, rir: 3, setIndex: 3, weight: 92.5 },
            ],
            trainingBlockId: "training-block-2",
            trainingBlockWeekNumber: 1,
            weight: 92.5,
          }),
        ],
        trainingPlan,
        workoutTemplate: trainingPlan.workoutTemplates[0] as WorkoutTemplate,
      }),
    ).toEqual([
      expect.objectContaining({
        // 8 reps at 3 RIR was harder than the week 1 target of 4 RIR: one rep fewer, same load.
        effectiveLoad: 92.5,
        exerciseId: "incline-dumbbell-bench-press",
        kind: "exact_previous_exercise",
        previousLoad: 92.5,
        showPrefillExplanation: false,
        targetReps: 7,
        targetRir: 4,
      }),
    ]);
  });

  it("uses Extra Training Session history for the next block's exact-exercise prefill", () => {
    const trainingPlan = createTrainingPlan({
      workoutTemplate: createWorkoutTemplate(inclineBenchPressSlot),
    });

    expect(
      createTrainingSessionLoadPrefills({
        previousTrainingSessions: [
          createTrainingSession({
            completedAt: "2026-07-12T10:00:00.000Z",
            exerciseId: "incline-dumbbell-bench-press",
            exerciseName: "Incline Dumbbell Bench Press",
            trainingBlockId: "training-block-1",
            trainingBlockWeekNumber: 6,
            weight: 87.5,
          }),
          createTrainingSession({
            completedAt: "2026-07-13T10:00:00.000Z",
            exerciseId: "incline-dumbbell-bench-press",
            exerciseName: "Incline Dumbbell Bench Press",
            sessionIntent: "extra",
            trainingBlockId: "training-block-1",
            trainingBlockWeekNumber: 6,
            weight: 95,
          }),
        ],
        trainingPlan,
        workoutTemplate: trainingPlan.workoutTemplates[0] as WorkoutTemplate,
      }),
    ).toEqual([
      expect.objectContaining({
        effectiveLoad: 92.5,
        exerciseId: "incline-dumbbell-bench-press",
        kind: "exact_previous_exercise",
        previousLoad: 95,
        showPrefillExplanation: true,
        targetReps: 6,
      }),
    ]);
  });
});

const inclineBenchPressSlot = createTrainingPlanSlot({
  exerciseId: "incline-dumbbell-bench-press",
  exerciseName: "Incline Dumbbell Bench Press",
  movementPattern: "horizontal_push",
  role: "main_compound",
  trainingPrescription: {
    repRange: { max: 8, min: 6 },
    setCount: 3,
  },
});

function createTrainingPlan({
  startingLoadSuggestions = [],
  workoutTemplate,
}: {
  startingLoadSuggestions?: TrainingPlan["startingLoadSuggestions"];
  workoutTemplate: WorkoutTemplate;
}): TrainingPlan {
  return {
    active: true,
    generatedAt: "2026-07-19T09:00:00.000Z",
    id: "training-plan-1",
    mainCompoundRotationPools: [],
    repRangeStyle: "balanced_hypertrophy",
    sourceBlueprintId: "blueprint-1",
    split: "Alternating Full Body A/B",
    startingLoadSuggestions,
    trainingBlock: {
      cycleNumber: 2,
      endDate: "2026-08-29",
      id: "training-block-2",
      planId: "training-plan-1",
      previousBlockId: "training-block-1",
      startDate: "2026-07-19",
      status: "active",
      weekNumber: 1,
    },
    trainingBlockWeeks: 6,
    trainingFrequencyDaysPerWeek: 2,
    trainingGoal: "build-muscle",
    updatedAt: "2026-07-19T09:00:00.000Z",
    weeklyRepTargets: [],
    workoutTemplates: [workoutTemplate],
  };
}

function createWorkoutTemplate(slot: TrainingPlanSlot): WorkoutTemplate {
  return {
    id: "template-1",
    label: "Full Body A",
    purpose: "strength",
    supersetGroups: [
      {
        id: "group-1",
        slots: [slot],
        title: "Superset 1",
        type: "superset",
      },
    ],
  };
}

function createTrainingPlanSlot({
  exerciseId,
  exerciseName,
  movementPattern,
  role,
  trainingPrescription,
}: Pick<TrainingPlanSlot, "exerciseId" | "exerciseName" | "movementPattern" | "role"> &
  Pick<TrainingPlanSlot, "trainingPrescription">): TrainingPlanSlot {
  return {
    exerciseId,
    exerciseName,
    kind: "exercise",
    movementPattern,
    role,
    slotLabel: "A1",
    targetMuscles: [],
    trainingPrescription,
  };
}

function createTrainingSession({
  completedAt,
  exerciseId,
  exerciseName,
  sessionIntent,
  sets,
  trainingBlockId,
  trainingBlockWeekNumber,
  weight,
}: {
  completedAt: string;
  exerciseId: string;
  exerciseName: string;
  sessionIntent?: TrainingSession["sessionIntent"];
  sets?: TrainingSession["exercises"][number]["sets"];
  trainingBlockId: string;
  trainingBlockWeekNumber: number;
  weight: number;
}): TrainingSession {
  return {
    completedAt,
    createdAt: completedAt,
    exercises: [
      {
        exerciseId,
        exerciseName,
        movementPattern: "horizontal_push",
        sets: sets ?? [
          { done: true, reps: 8, setIndex: 1, weight: weight - 2.5 },
          { done: true, reps: 8, setIndex: 2, weight },
        ],
      },
    ],
    id: `session-${completedAt}`,
    planId: "training-plan-1",
    sessionIntent: sessionIntent ?? "planned",
    status: "completed",
    templateId: "template-1",
    templateLabel: "Full Body A",
    trainingBlockCycleNumber: trainingBlockId === "training-block-2" ? 2 : 1,
    trainingBlockId,
    trainingBlockWeekNumber,
    updatedAt: completedAt,
    volumeByMovementPattern: [],
  };
}
