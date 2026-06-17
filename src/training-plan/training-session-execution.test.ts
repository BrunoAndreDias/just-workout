import { describe, expect, it } from "vitest";
import type { TrainingPlanSlot, WorkoutTemplate } from "./training-plan";
import type { TrainingSession } from "./training-session";
import {
  applyTrainingSessionDraftChange,
  applyTrainingSessionExecutionAction,
  changeTrainingSessionExecutionSetDone,
  changeTrainingSessionExecutionSetReps,
  changeTrainingSessionExecutionSetWeight,
  countCompletedTrainingSessionGroupSets,
  countCompletedTrainingSessionSets,
  createInitialTrainingSessionDrafts,
  createInitialTrainingSessionExecutionState,
  createTrainingSessionEntries,
  createTrainingSessionExecutionReadModel,
  createTrainingSessionExercises,
  getExpandedTrainingSessionGroupIdsAfterCompletion,
  getPreviousTrainingSessionSetLabel,
  getTrainingSessionDefaultReps,
  getTrainingSessionExerciseKey,
  getTrainingSessionGroupProgress,
  hasTrainingSessionExecutionDrafts,
  toggleTrainingSessionExecutionGroup,
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

  it("prefills editable set drafts from suggested starting loads", () => {
    const workoutTemplate = createWorkoutTemplate();
    const sessionExercises = createTrainingSessionExercises(workoutTemplate);
    const drafts = createInitialTrainingSessionDrafts(sessionExercises, [
      {
        effectiveLoad: 92.5,
        exerciseId: "bench-press",
        exerciseName: "Flat Dumbbell Bench Press",
        movementPattern: "horizontal_push",
        previousLoad: 100,
        reason: "same exercise, -5% reset",
        suggestedLoad: 95,
        userEditedLoad: 92.5,
      },
    ]);

    expect(drafts[getTrainingSessionExerciseKey("group-1", benchPressSlot)]).toEqual([
      { done: false, reps: "8", setIndex: 1, weight: "92.5" },
      { done: false, reps: "8", setIndex: 2, weight: "92.5" },
      { done: false, reps: "8", setIndex: 3, weight: "92.5" },
    ]);
    expect(drafts[getTrainingSessionExerciseKey("group-1", pullUpsSlot)]).toEqual([
      { done: false, reps: "8", setIndex: 1, weight: "" },
      { done: false, reps: "8", setIndex: 2, weight: "" },
      { done: false, reps: "8", setIndex: 3, weight: "" },
    ]);
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

  it("applies one set draft change without replacing unrelated exercise drafts", () => {
    const workoutTemplate = createWorkoutTemplate();
    const sessionExercises = createTrainingSessionExercises(workoutTemplate);
    const drafts = createInitialTrainingSessionDrafts(sessionExercises);
    const benchKey = getTrainingSessionExerciseKey("group-1", benchPressSlot);
    const pullKey = getTrainingSessionExerciseKey("group-1", pullUpsSlot);
    const unchangedPullDrafts = drafts[pullKey];

    const updatedDrafts = applyTrainingSessionDraftChange({
      drafts,
      exerciseKey: benchKey,
      field: "weight",
      setIndex: 2,
      slot: benchPressSlot,
      value: "42.5",
    });

    expect(updatedDrafts[benchKey]).toEqual([
      { done: false, reps: "8", setIndex: 1, weight: "" },
      { done: false, reps: "8", setIndex: 2, weight: "42.5" },
      { done: false, reps: "8", setIndex: 3, weight: "" },
    ]);
    expect(updatedDrafts[pullKey]).toBe(unchangedPullDrafts);
  });

  it("summarizes Superset Group progress from current set drafts", () => {
    const workoutTemplate = createWorkoutTemplate();
    const sessionExercises = createTrainingSessionExercises(workoutTemplate);
    const drafts = createInitialTrainingSessionDrafts(sessionExercises);

    drafts[getTrainingSessionExerciseKey("group-1", benchPressSlot)] = [
      { done: true, reps: "8", setIndex: 1, weight: "40" },
      { done: true, reps: "8", setIndex: 2, weight: "40" },
      { done: true, reps: "8", setIndex: 3, weight: "40" },
    ];

    expect(
      getTrainingSessionGroupProgress({
        drafts,
        groupId: "group-1",
        slots: [benchPressSlot, pullUpsSlot],
      }),
    ).toEqual({
      completedSetCount: 3,
      isComplete: false,
      plannedSetCount: 6,
    });
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

  it("creates the execution read model consumed by the route and Superset Group UI", () => {
    const workoutTemplate = createWorkoutTemplate();
    const state = createInitialTrainingSessionExecutionState({ workoutTemplate });
    const benchKey = getTrainingSessionExerciseKey("group-1", benchPressSlot);

    state.drafts[benchKey] = [
      { done: true, reps: "10", setIndex: 1, weight: "40" },
      { done: false, reps: "8", setIndex: 2, weight: "40" },
      { done: false, reps: "8", setIndex: 3, weight: "40" },
    ];

    const readModel = createTrainingSessionExecutionReadModel({
      completedSession: null,
      previousTrainingSessions: [createPreviousTrainingSession()],
      state,
      workoutTemplate,
    });

    expect(readModel.completedSetCount).toBe(1);
    expect(readModel.plannedSetCount).toBe(9);
    expect(readModel.volumeByMovementPattern).toEqual([
      {
        movementPattern: "horizontal_push",
        movementPatternLabel: "Horizontal Push",
        volume: 1040,
      },
    ]);
    expect(readModel.entries[0]).toEqual({
      exerciseId: "bench-press",
      exerciseName: "Flat Dumbbell Bench Press",
      movementPattern: "horizontal_push",
      sets: [
        { reps: 10, setIndex: 1, weight: 40 },
        { reps: 8, setIndex: 2, weight: 40 },
        { reps: 8, setIndex: 3, weight: 40 },
      ],
    });
    expect(readModel.groups[0]).toMatchObject({
      accessibleTitle: "Superset 1",
      groupId: "group-1",
      isOpen: true,
      now: {
        exerciseName: "Flat Dumbbell Bench Press",
        movementPatternLabel: "Horizontal push",
        prescriptionLabel: "3 x 8-12",
        roleLabel: "Main",
        setLabel: "Set 1 of 3",
        targetRepsLabel: "Target 8-12 reps",
      },
      summary: {
        completedSetCount: 1,
        exerciseCount: 2,
        isComplete: false,
        plannedSetCount: 6,
      },
      title: "Upper Superset 1",
    });
    expect(readModel.groups[0]?.rounds[0]?.rows[0]).toMatchObject({
      done: true,
      doneLabel: "Mark Flat Dumbbell Bench Press set 1 not done",
      exerciseName: "Flat Dumbbell Bench Press",
      movementPatternLabel: "Horizontal push",
      prescriptionLabel: "3 x 8-12",
      previousSetLabel: "40kg x 10",
      reps: "10",
      setId: expect.any(String),
      setIndex: 1,
      weight: "40",
      weightInputMin: "0",
    });
    expect(readModel.groups[0]?.rounds[0]?.rows[0]).not.toHaveProperty("exerciseKey");
  });

  it("applies Training Session set actions from read-model rows", () => {
    const workoutTemplate = createWorkoutTemplate();
    let state = createInitialTrainingSessionExecutionState({ workoutTemplate });
    const readModel = createTrainingSessionExecutionReadModel({
      completedSession: null,
      previousTrainingSessions: [],
      state,
      workoutTemplate,
    });
    const secondBenchSet = readModel.groups[0]?.rounds[1]?.rows[0];

    if (!secondBenchSet) {
      throw new Error("Expected the second bench set row.");
    }

    state = applyTrainingSessionExecutionAction({
      action: changeTrainingSessionExecutionSetWeight(secondBenchSet, "42.5"),
      state,
      workoutTemplate,
    });
    state = applyTrainingSessionExecutionAction({
      action: changeTrainingSessionExecutionSetReps(secondBenchSet, "9"),
      state,
      workoutTemplate,
    });

    const updatedReadModel = createTrainingSessionExecutionReadModel({
      completedSession: null,
      previousTrainingSessions: [],
      state,
      workoutTemplate,
    });

    expect(updatedReadModel.groups[0]?.rounds[1]?.rows[0]).toMatchObject({
      reps: "9",
      weight: "42.5",
    });
    expect(updatedReadModel.entries[0]?.sets[1]).toEqual({
      reps: 9,
      setIndex: 2,
      weight: 42.5,
    });
  });

  it("applies completion actions and advances to the next incomplete Superset Group", () => {
    const workoutTemplate = createWorkoutTemplate();
    let state = createInitialTrainingSessionExecutionState({ workoutTemplate });
    const readModel = createTrainingSessionExecutionReadModel({
      completedSession: null,
      previousTrainingSessions: [],
      state,
      workoutTemplate,
    });
    const firstGroupRows = readModel.groups[0]?.rounds.flatMap((round) => round.rows) ?? [];

    for (const row of firstGroupRows) {
      state = applyTrainingSessionExecutionAction({
        action: changeTrainingSessionExecutionSetDone(row, true),
        state,
        workoutTemplate,
      });
    }

    const updatedReadModel = createTrainingSessionExecutionReadModel({
      completedSession: null,
      previousTrainingSessions: [],
      state,
      workoutTemplate,
    });

    expect(
      updatedReadModel.groups.map((group) => ({
        groupId: group.groupId,
        isOpen: group.isOpen,
      })),
    ).toEqual([
      { groupId: "group-1", isOpen: false },
      { groupId: "group-2", isOpen: true },
    ]);
  });

  it("keeps Training Session execution state details behind execution helpers", () => {
    const workoutTemplate = createWorkoutTemplate();
    const state = createInitialTrainingSessionExecutionState({ workoutTemplate });
    const readModel = createTrainingSessionExecutionReadModel({
      completedSession: null,
      previousTrainingSessions: [],
      state,
      workoutTemplate,
    });
    const firstGroup = readModel.groups[0];

    if (!firstGroup) {
      throw new Error("Expected the first Superset Group.");
    }

    expect(hasTrainingSessionExecutionDrafts(state)).toBe(true);
    expect(firstGroup.isOpen).toBe(true);

    const toggledState = applyTrainingSessionExecutionAction({
      action: toggleTrainingSessionExecutionGroup(firstGroup),
      state,
      workoutTemplate,
    });
    const toggledReadModel = createTrainingSessionExecutionReadModel({
      completedSession: null,
      previousTrainingSessions: [],
      state: toggledState,
      workoutTemplate,
    });

    expect(toggledReadModel.groups[0]?.isOpen).toBe(false);
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
