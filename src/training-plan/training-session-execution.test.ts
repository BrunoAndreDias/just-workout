import { describe, expect, it } from "vitest";
import type { TrainingPlanSlot, WorkoutTemplate } from "./training-plan";
import type { TrainingSession } from "./training-session";
import {
  countCompletedTrainingSessionGroupSets,
  countCompletedTrainingSessionSets,
  createInitialTrainingSessionDrafts,
  createTrainingSessionEntries,
  createTrainingSessionExercises,
  getExpandedTrainingSessionGroupIdsAfterCompletion,
  getPreviousTrainingSessionSetLabel,
  getTrainingSessionDefaultReps,
  getTrainingSessionExerciseKey,
} from "./training-session-execution";

describe("Training Session Execution", () => {
  it("creates session entries from Workout Template slots and current set drafts", () => {
    const workoutTemplate = createWorkoutTemplate();
    const sessionExercises = createTrainingSessionExercises(workoutTemplate);
    const drafts = createInitialTrainingSessionDrafts(sessionExercises);
    const benchKey = getTrainingSessionExerciseKey("group-1", benchPressSlot);

    drafts[benchKey] = [
      { done: true, reps: "10", setIndex: 1, weight: "40" },
      { done: false, reps: "9", setIndex: 2, weight: "42.5" },
      { done: false, reps: "", setIndex: 3, weight: "" },
    ];

    expect(createTrainingSessionEntries(sessionExercises, drafts)[0]).toEqual({
      exerciseId: "bench-press",
      exerciseName: "Flat Dumbbell Bench Press",
      movementPattern: "horizontal_push",
      sets: [
        { reps: 10, setIndex: 1, weight: 40 },
        { reps: 9, setIndex: 2, weight: 42.5 },
        { reps: 0, setIndex: 3, weight: 0 },
      ],
    });
  });

  it("counts completed sets for the whole Training Session and one Superset Group", () => {
    const workoutTemplate = createWorkoutTemplate();
    const sessionExercises = createTrainingSessionExercises(workoutTemplate);
    const drafts = createInitialTrainingSessionDrafts(sessionExercises);

    drafts[getTrainingSessionExerciseKey("group-1", benchPressSlot)] = [
      { done: true, reps: "8", setIndex: 1, weight: "40" },
      { done: true, reps: "8", setIndex: 2, weight: "40" },
      { done: false, reps: "8", setIndex: 3, weight: "40" },
    ];
    drafts[getTrainingSessionExerciseKey("group-2", squatSlot)] = [
      { done: true, reps: "8", setIndex: 1, weight: "80" },
      { done: false, reps: "8", setIndex: 2, weight: "80" },
      { done: false, reps: "8", setIndex: 3, weight: "80" },
    ];

    expect(countCompletedTrainingSessionSets(drafts)).toBe(3);
    expect(
      countCompletedTrainingSessionGroupSets({
        drafts,
        groupId: "group-1",
        slots: [benchPressSlot, pullUpsSlot],
      }),
    ).toBe(2);
  });

  it("closes the completed Superset Group and opens the next incomplete group", () => {
    const workoutTemplate = createWorkoutTemplate();
    const sessionExercises = createTrainingSessionExercises(workoutTemplate);
    const drafts = createInitialTrainingSessionDrafts(sessionExercises);

    for (const slot of [benchPressSlot, pullUpsSlot]) {
      drafts[getTrainingSessionExerciseKey("group-1", slot)] = [
        { done: true, reps: "8", setIndex: 1, weight: "40" },
        { done: true, reps: "8", setIndex: 2, weight: "40" },
        { done: true, reps: "8", setIndex: 3, weight: "40" },
      ];
    }

    expect(
      getExpandedTrainingSessionGroupIdsAfterCompletion({
        completedGroupId: "group-1",
        currentGroupIds: ["group-1"],
        drafts,
        groups: workoutTemplate.supersetGroups,
      }),
    ).toEqual(["group-2"]);
  });

  it("formats previous set labels from previous Training Sessions", () => {
    expect(
      getPreviousTrainingSessionSetLabel({
        previousTrainingSessions: [createPreviousTrainingSession()],
        setIndex: 1,
        slot: benchPressSlot,
      }),
    ).toBe("40kg x 10");
    expect(
      getPreviousTrainingSessionSetLabel({
        previousTrainingSessions: [createPreviousTrainingSession()],
        setIndex: 1,
        slot: pullUpsSlot,
      }),
    ).toBe("BW x 8");
  });

  it("defaults abs work to twelve reps and other work to eight reps", () => {
    expect(getTrainingSessionDefaultReps(absSlot)).toBe(12);
    expect(getTrainingSessionDefaultReps(benchPressSlot)).toBe(8);
  });
});

const benchPressSlot = createTrainingPlanSlot({
  exerciseId: "bench-press",
  exerciseName: "Flat Dumbbell Bench Press",
  movementPattern: "horizontal_push",
  role: "main_compound",
});

const pullUpsSlot = createTrainingPlanSlot({
  exerciseId: "pull-ups",
  exerciseName: "Pull-Ups",
  movementPattern: "vertical_pull",
  role: "secondary_compound",
});

const squatSlot = createTrainingPlanSlot({
  exerciseId: "barbell-squat",
  exerciseName: "Barbell Squats",
  movementPattern: "quad_dominant",
  role: "main_compound",
});

const absSlot = createTrainingPlanSlot({
  exerciseId: "hanging-leg-raise",
  exerciseName: "Hanging Leg Raises",
  movementPattern: "core",
  role: "abs",
});

function createWorkoutTemplate(): WorkoutTemplate {
  return {
    id: "template-1",
    label: "Full Body A",
    supersetGroups: [
      {
        id: "group-1",
        slots: [benchPressSlot, pullUpsSlot],
        title: "Superset 1",
        type: "superset",
      },
      {
        id: "group-2",
        slots: [squatSlot],
        title: "Superset 2",
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
}: Pick<TrainingPlanSlot, "exerciseId" | "exerciseName" | "movementPattern" | "role">) {
  return {
    exerciseId,
    exerciseName,
    kind: "exercise",
    movementPattern,
    role,
    slotLabel: "A1",
    targetMuscles: [],
  } satisfies TrainingPlanSlot;
}

function createPreviousTrainingSession(): TrainingSession {
  return {
    completedAt: "2026-06-10T09:00:00.000Z",
    createdAt: "2026-06-10T09:00:00.000Z",
    exercises: [
      {
        exerciseId: "bench-press",
        exerciseName: "Flat Dumbbell Bench Press",
        movementPattern: "horizontal_push",
        sets: [{ reps: 10, setIndex: 1, weight: 40 }],
      },
      {
        exerciseId: "pull-ups",
        exerciseName: "Pull-Ups",
        movementPattern: "vertical_pull",
        sets: [{ reps: 8, setIndex: 1, weight: 0 }],
      },
    ],
    id: "session-1",
    planId: "plan-1",
    status: "completed",
    templateId: "template-1",
    templateLabel: "Full Body A",
    updatedAt: "2026-06-10T09:00:00.000Z",
    volumeByMovementPattern: [],
  };
}
