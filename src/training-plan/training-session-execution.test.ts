import { describe, expect, it } from "vitest";
import type { TrainingPlanSlot, WorkoutTemplate } from "./training-plan";
import type { TrainingSession } from "./training-session";
import {
  applyTrainingSessionDraftChange,
  applyTrainingSessionExecutionAction,
  changeTrainingSessionExecutionSetDone,
  changeTrainingSessionExecutionSetReps,
  changeTrainingSessionExecutionSetRir,
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
      { done: true, reps: "10", rir: "", setIndex: 1, weight: "40" },
      { done: false, reps: "9", rir: "", setIndex: 2, weight: "42.5" },
      { done: false, reps: "", rir: "", setIndex: 3, weight: "" },
    ];

    expect(createTrainingSessionEntries(sessionExercises, drafts)[0]).toEqual({
      exerciseId: "bench-press",
      exerciseName: "Flat Dumbbell Bench Press",
      movementPattern: "horizontal_push",
      sets: [
        { done: true, reps: 10, rir: null, setIndex: 1, weight: 40 },
        { done: false, reps: 9, rir: null, setIndex: 2, weight: 42.5 },
        { done: false, reps: 0, rir: null, setIndex: 3, weight: 0 },
      ],
    });
  });

  it("captures per-set RIR in completed session entries", () => {
    const workoutTemplate = createWorkoutTemplate();
    const sessionExercises = createTrainingSessionExercises(workoutTemplate);
    const drafts = createInitialTrainingSessionDrafts(sessionExercises);
    const benchKey = getTrainingSessionExerciseKey("group-1", benchPressSlot);

    drafts[benchKey] = [
      { done: true, reps: "10", rir: "2", setIndex: 1, weight: "40" },
      { done: true, reps: "9", rir: "1", setIndex: 2, weight: "42.5" },
      { done: false, reps: "", rir: "", setIndex: 3, weight: "" },
    ];

    expect(createTrainingSessionEntries(sessionExercises, drafts)[0]).toEqual({
      exerciseId: "bench-press",
      exerciseName: "Flat Dumbbell Bench Press",
      movementPattern: "horizontal_push",
      sets: [
        { done: true, reps: 10, rir: 2, setIndex: 1, weight: 40 },
        { done: true, reps: 9, rir: 1, setIndex: 2, weight: 42.5 },
        { done: false, reps: 0, rir: null, setIndex: 3, weight: 0 },
      ],
    });
  });

  it("normalizes invalid per-set RIR values to empty completed session entries", () => {
    const workoutTemplate = createWorkoutTemplate();
    const sessionExercises = createTrainingSessionExercises(workoutTemplate);
    const drafts = createInitialTrainingSessionDrafts(sessionExercises);
    const benchKey = getTrainingSessionExerciseKey("group-1", benchPressSlot);

    drafts[benchKey] = [
      { done: true, reps: "10", rir: "-1", setIndex: 1, weight: "40" },
      { done: true, reps: "10", rir: "not-a-number", setIndex: 2, weight: "40" },
      { done: true, reps: "10", rir: "Infinity", setIndex: 3, weight: "40" },
    ];

    expect(createTrainingSessionEntries(sessionExercises, drafts)[0]?.sets).toEqual([
      { done: true, reps: 10, rir: null, setIndex: 1, weight: 40 },
      { done: true, reps: 10, rir: null, setIndex: 2, weight: 40 },
      { done: true, reps: 10, rir: null, setIndex: 3, weight: 40 },
    ]);
  });

  it("prefills editable set drafts from suggested starting loads", () => {
    const workoutTemplate = createWorkoutTemplate();
    const sessionExercises = createTrainingSessionExercises(workoutTemplate);
    const drafts = createInitialTrainingSessionDrafts(sessionExercises, [
      {
        effectiveLoad: 92.5,
        exerciseId: "bench-press",
        exerciseName: "Flat Dumbbell Bench Press",
        kind: "exact_previous_exercise",
        movementPattern: "horizontal_push",
        previousLoad: 100,
        reason: "previous exact exercise load prefill",
        suggestedLoad: 92.5,
        userEditedLoad: 92.5,
      },
    ]);

    expect(drafts[getTrainingSessionExerciseKey("group-1", benchPressSlot)]).toEqual([
      { done: false, reps: "8", rir: "", setIndex: 1, weight: "92.5" },
      { done: false, reps: "8", rir: "", setIndex: 2, weight: "92.5" },
      { done: false, reps: "8", rir: "", setIndex: 3, weight: "92.5" },
    ]);
    expect(drafts[getTrainingSessionExerciseKey("group-1", pullUpsSlot)]).toEqual([
      { done: false, reps: "8", rir: "", setIndex: 1, weight: "" },
      { done: false, reps: "8", rir: "", setIndex: 2, weight: "" },
      { done: false, reps: "8", rir: "", setIndex: 3, weight: "" },
    ]);
  });

  it("counts completed sets for the whole Training Session and one Superset Group", () => {
    const workoutTemplate = createWorkoutTemplate();
    const sessionExercises = createTrainingSessionExercises(workoutTemplate);
    const drafts = createInitialTrainingSessionDrafts(sessionExercises);

    drafts[getTrainingSessionExerciseKey("group-1", benchPressSlot)] = [
      { done: true, reps: "8", rir: "", setIndex: 1, weight: "40" },
      { done: true, reps: "8", rir: "", setIndex: 2, weight: "40" },
      { done: false, reps: "8", rir: "", setIndex: 3, weight: "40" },
    ];
    drafts[getTrainingSessionExerciseKey("group-2", squatSlot)] = [
      { done: true, reps: "8", rir: "", setIndex: 1, weight: "80" },
      { done: false, reps: "8", rir: "", setIndex: 2, weight: "80" },
      { done: false, reps: "8", rir: "", setIndex: 3, weight: "80" },
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
      { done: false, reps: "8", rir: "", setIndex: 1, weight: "" },
      { done: false, reps: "8", rir: "", setIndex: 2, weight: "42.5" },
      { done: false, reps: "8", rir: "", setIndex: 3, weight: "" },
    ]);
    expect(updatedDrafts[pullKey]).toBe(unchangedPullDrafts);
  });

  it("summarizes Superset Group progress from current set drafts", () => {
    const workoutTemplate = createWorkoutTemplate();
    const sessionExercises = createTrainingSessionExercises(workoutTemplate);
    const drafts = createInitialTrainingSessionDrafts(sessionExercises);

    drafts[getTrainingSessionExerciseKey("group-1", benchPressSlot)] = [
      { done: true, reps: "8", rir: "", setIndex: 1, weight: "40" },
      { done: true, reps: "8", rir: "", setIndex: 2, weight: "40" },
      { done: true, reps: "8", rir: "", setIndex: 3, weight: "40" },
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
        { done: true, reps: "8", rir: "", setIndex: 1, weight: "40" },
        { done: true, reps: "8", rir: "", setIndex: 2, weight: "40" },
        { done: true, reps: "8", rir: "", setIndex: 3, weight: "40" },
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

  it("falls back to the legacy 3 x 8-12 default when a slot has no generated prescription", () => {
    expect(getTrainingSessionDefaultReps(absSlot)).toBe(8);
    expect(getTrainingSessionDefaultReps(benchPressSlot)).toBe(8);
  });

  it("uses generated Training Prescriptions for session labels, planned sets, and default reps", () => {
    const workoutTemplate = createWorkoutTemplateWithTrainingPrescriptions();
    const sessionExercises = createTrainingSessionExercises(workoutTemplate);
    const drafts = createInitialTrainingSessionDrafts(sessionExercises);
    const benchKey = getTrainingSessionExerciseKey("group-1", prescribedBenchPressSlot);
    const absKey = getTrainingSessionExerciseKey("group-2", prescribedAbsSlot);

    expect(drafts[benchKey]).toEqual([
      { done: false, reps: "6", rir: "", setIndex: 1, weight: "" },
      { done: false, reps: "6", rir: "", setIndex: 2, weight: "" },
      { done: false, reps: "6", rir: "", setIndex: 3, weight: "" },
      { done: false, reps: "6", rir: "", setIndex: 4, weight: "" },
    ]);
    expect(drafts[absKey]).toEqual([
      { done: false, reps: "10", rir: "", setIndex: 1, weight: "" },
      { done: false, reps: "10", rir: "", setIndex: 2, weight: "" },
      { done: false, reps: "10", rir: "", setIndex: 3, weight: "" },
      { done: false, reps: "10", rir: "", setIndex: 4, weight: "" },
    ]);
    expect(getTrainingSessionDefaultReps(prescribedBenchPressSlot)).toBe(6);
    expect(getTrainingSessionDefaultReps(prescribedAbsSlot)).toBe(10);

    const readModel = createTrainingSessionExecutionReadModel({
      completedSession: null,
      previousTrainingSessions: [],
      state: createInitialTrainingSessionExecutionState({ workoutTemplate }),
      workoutTemplate,
    });

    expect(readModel.plannedSetCount).toBe(12);
    expect(readModel.groups[0]).toMatchObject({
      now: {
        prescriptionLabel: "4 x 6-8",
        setLabel: "Set 1 of 4",
        targetRepsLabel: "Target 6-8 reps",
      },
      summary: {
        plannedSetCount: 8,
      },
    });
    expect(readModel.groups[0]?.rounds).toHaveLength(4);
    expect(readModel.groups[1]).toMatchObject({
      now: {
        prescriptionLabel: "4 x 10-15",
        setLabel: "Set 1 of 4",
        targetRepsLabel: "Target 10-15 reps",
      },
      summary: {
        plannedSetCount: 4,
      },
    });
    expect(readModel.groups[1]?.rounds[0]?.rows[0]).toMatchObject({
      prescriptionLabel: "4 x 10-15",
      reps: "10",
    });
  });

  it("keeps Superset Group rounds aligned when generated set counts differ by exercise", () => {
    const workoutTemplate = createWorkoutTemplateWithMixedTrainingPrescriptionSetCounts();
    let state = createInitialTrainingSessionExecutionState({ workoutTemplate });

    const readModel = createTrainingSessionExecutionReadModel({
      completedSession: null,
      previousTrainingSessions: [],
      state,
      workoutTemplate,
    });

    expect(readModel.plannedSetCount).toBe(6);
    expect(readModel.groups[0]).toMatchObject({
      now: {
        prescriptionLabel: "2 x 6-8",
        setLabel: "Set 1 of 2",
      },
      summary: {
        plannedSetCount: 6,
      },
    });
    expect(
      readModel.groups[0]?.rounds.map((round) => ({
        exerciseNames: round.rows.map((row) => row.exerciseName),
        roundIndex: round.roundIndex,
      })),
    ).toEqual([
      {
        exerciseNames: ["Incline Dumbbell Bench Press", "Weighted Pull-Ups"],
        roundIndex: 1,
      },
      {
        exerciseNames: ["Incline Dumbbell Bench Press", "Weighted Pull-Ups"],
        roundIndex: 2,
      },
      { exerciseNames: ["Weighted Pull-Ups"], roundIndex: 3 },
      { exerciseNames: ["Weighted Pull-Ups"], roundIndex: 4 },
    ]);

    const fourthPullUpSet = readModel.groups[0]?.rounds[3]?.rows[0];

    if (!fourthPullUpSet) {
      throw new Error("Expected the fourth pull-up set row.");
    }

    state = applyTrainingSessionExecutionAction({
      action: changeTrainingSessionExecutionSetDone(fourthPullUpSet, true),
      state,
      workoutTemplate,
    });

    expect(
      state.drafts[getTrainingSessionExerciseKey("group-1", fourSetPrescribedPullUpsSlot)]?.[3],
    ).toMatchObject({
      done: true,
      setIndex: 4,
    });
  });

  it("creates the execution read model consumed by the route and Superset Group UI", () => {
    const workoutTemplate = createWorkoutTemplate();
    const state = createInitialTrainingSessionExecutionState({ workoutTemplate });
    const benchKey = getTrainingSessionExerciseKey("group-1", benchPressSlot);

    state.drafts[benchKey] = [
      { done: true, reps: "10", rir: "", setIndex: 1, weight: "40" },
      { done: false, reps: "8", rir: "", setIndex: 2, weight: "40" },
      { done: false, reps: "8", rir: "", setIndex: 3, weight: "40" },
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
        volume: 400,
      },
    ]);
    expect(readModel.entries[0]).toEqual({
      exerciseId: "bench-press",
      exerciseName: "Flat Dumbbell Bench Press",
      movementPattern: "horizontal_push",
      sets: [1, 2, 3].map((setIndex) => ({
        done: setIndex === 1,
        reps: setIndex === 1 ? 10 : 8,
        rir: null,
        setIndex,
        // Week 1 of the Weekly Effort Ramp; no progression prefill was supplied.
        target: { reps: null, rir: 4, weight: null },
        weight: 40,
      })),
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

  it("stamps each completed set entry with the Session Target it was shown", () => {
    const workoutTemplate = createWorkoutTemplate();
    const state = createInitialTrainingSessionExecutionState({ workoutTemplate });

    const readModel = createTrainingSessionExecutionReadModel({
      completedSession: null,
      loadPrefills: [
        {
          effectiveLoad: 42.5,
          exerciseId: "bench-press",
          exerciseName: "Flat Dumbbell Bench Press",
          kind: "exact_previous_exercise",
          movementPattern: "horizontal_push",
          previousLoad: 40,
          reason: "progression",
          suggestedLoad: 42.5,
          targetReps: 9,
          userEditedLoad: null,
        },
      ],
      previousTrainingSessions: [],
      state,
      trainingBlockWeekNumber: 3,
      workoutTemplate,
    });

    // Week 3 of the Weekly Effort Ramp targets 2 RIR.
    expect(readModel.entries[0]?.sets[0]?.target).toEqual({ reps: 9, rir: 2, weight: 42.5 });
    // Without a progression prefill only the week's effort target is known.
    expect(readModel.entries[1]?.sets[0]?.target).toEqual({ reps: null, rir: 2, weight: null });
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
      done: false,
      reps: 9,
      rir: null,
      setIndex: 2,
      target: { reps: null, rir: 4, weight: null },
      weight: 42.5,
    });
  });

  it("copies a chosen RIR forward into the next empty, not-done set of the same exercise", () => {
    const workoutTemplate = createWorkoutTemplate();
    const benchKey = getTrainingSessionExerciseKey("group-1", benchPressSlot);
    const pullKey = getTrainingSessionExerciseKey("group-1", pullUpsSlot);
    const rowsFor = (state: ReturnType<typeof createInitialTrainingSessionExecutionState>) =>
      createTrainingSessionExecutionReadModel({
        completedSession: null,
        previousTrainingSessions: [],
        state,
        workoutTemplate,
      }).groups[0]?.rounds.map((round) => round.rows[0]) ?? [];
    let state = createInitialTrainingSessionExecutionState({ workoutTemplate });
    const [firstBenchSet, secondBenchSet] = rowsFor(state);

    if (!firstBenchSet || !secondBenchSet) {
      throw new Error("Expected bench set rows.");
    }

    state = applyTrainingSessionExecutionAction({
      action: changeTrainingSessionExecutionSetRir(firstBenchSet, "3"),
      state,
      workoutTemplate,
    });

    // Only the next set is seeded; later sets and other exercises stay empty.
    expect(state.drafts[benchKey]?.map((draft) => draft.rir)).toEqual(["3", "3", ""]);
    expect(state.drafts[pullKey]?.map((draft) => draft.rir)).toEqual(["", "", ""]);

    // A set that already has a RIR keeps it.
    state = applyTrainingSessionExecutionAction({
      action: changeTrainingSessionExecutionSetRir(firstBenchSet, "1"),
      state,
      workoutTemplate,
    });
    expect(state.drafts[benchKey]?.map((draft) => draft.rir)).toEqual(["1", "3", ""]);

    // Clearing never propagates.
    state = applyTrainingSessionExecutionAction({
      action: changeTrainingSessionExecutionSetRir(secondBenchSet, ""),
      state,
      workoutTemplate,
    });
    expect(state.drafts[benchKey]?.map((draft) => draft.rir)).toEqual(["1", "", ""]);
  });

  it("does not copy RIR forward into a set that is already done", () => {
    const workoutTemplate = createWorkoutTemplate();
    const benchKey = getTrainingSessionExerciseKey("group-1", benchPressSlot);
    let state = createInitialTrainingSessionExecutionState({ workoutTemplate });
    const rounds =
      createTrainingSessionExecutionReadModel({
        completedSession: null,
        previousTrainingSessions: [],
        state,
        workoutTemplate,
      }).groups[0]?.rounds ?? [];
    const firstBenchSet = rounds[0]?.rows[0];
    const secondBenchSet = rounds[1]?.rows[0];

    if (!firstBenchSet || !secondBenchSet) {
      throw new Error("Expected bench set rows.");
    }

    state = applyTrainingSessionExecutionAction({
      action: changeTrainingSessionExecutionSetDone(secondBenchSet, true),
      state,
      workoutTemplate,
    });
    state = applyTrainingSessionExecutionAction({
      action: changeTrainingSessionExecutionSetRir(firstBenchSet, "2"),
      state,
      workoutTemplate,
    });

    expect(state.drafts[benchKey]?.map((draft) => draft.rir)).toEqual(["2", "", ""]);
  });

  it("does not count unchecked bodyweight sets in the live Completed Load Volume preview", () => {
    const workoutTemplate = createWorkoutTemplate();
    const state = createInitialTrainingSessionExecutionState({ workoutTemplate });
    const benchKey = getTrainingSessionExerciseKey("group-1", benchPressSlot);

    state.drafts[benchKey] = [
      { done: true, reps: "10", rir: "", setIndex: 1, weight: "40" },
      { done: false, reps: "8", rir: "", setIndex: 2, weight: "40" },
      { done: false, reps: "8", rir: "", setIndex: 3, weight: "40" },
    ];

    const readModel = createTrainingSessionExecutionReadModel({
      completedSession: null,
      previousTrainingSessions: [],
      sessionBodyweight: 80,
      state,
      workoutTemplate,
    });

    expect(readModel.volumeByMovementPattern).toEqual([
      {
        movementPattern: "horizontal_push",
        movementPatternLabel: "Horizontal Push",
        volume: 400,
      },
    ]);
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

const prescribedBenchPressSlot = createTrainingPlanSlot({
  exerciseId: "incline-bench-press",
  exerciseName: "Incline Dumbbell Bench Press",
  movementPattern: "horizontal_push",
  role: "main_compound",
  trainingPrescription: {
    repRange: { max: 8, min: 6 },
    setCount: 4,
  },
});

const prescribedPullUpsSlot = createTrainingPlanSlot({
  exerciseId: "weighted-pull-ups",
  exerciseName: "Weighted Pull-Ups",
  movementPattern: "vertical_pull",
  role: "secondary_compound",
  trainingPrescription: {
    repRange: { max: 10, min: 8 },
    setCount: 4,
  },
});

const prescribedAbsSlot = createTrainingPlanSlot({
  exerciseId: "cable-crunch",
  exerciseName: "Cable Crunches",
  movementPattern: "core",
  role: "abs",
  trainingPrescription: {
    repRange: { max: 15, min: 10 },
    setCount: 4,
  },
});

const twoSetPrescribedBenchPressSlot = createTrainingPlanSlot({
  exerciseId: "incline-bench-press",
  exerciseName: "Incline Dumbbell Bench Press",
  movementPattern: "horizontal_push",
  role: "main_compound",
  trainingPrescription: {
    repRange: { max: 8, min: 6 },
    setCount: 2,
  },
});

const fourSetPrescribedPullUpsSlot = createTrainingPlanSlot({
  exerciseId: "weighted-pull-ups",
  exerciseName: "Weighted Pull-Ups",
  movementPattern: "vertical_pull",
  role: "secondary_compound",
  trainingPrescription: {
    repRange: { max: 10, min: 8 },
    setCount: 4,
  },
});

function createWorkoutTemplate(): WorkoutTemplate {
  return {
    id: "template-1",
    label: "Full Body A",
    purpose: "strength",
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

function createWorkoutTemplateWithTrainingPrescriptions(): WorkoutTemplate {
  return {
    id: "template-prescribed",
    label: "Upper",
    purpose: "strength",
    supersetGroups: [
      {
        id: "group-1",
        slots: [prescribedBenchPressSlot, prescribedPullUpsSlot],
        title: "Superset 1",
        type: "superset",
      },
      {
        id: "group-2",
        slots: [prescribedAbsSlot],
        title: "Superset 2",
        type: "superset",
      },
    ],
  };
}

function createWorkoutTemplateWithMixedTrainingPrescriptionSetCounts(): WorkoutTemplate {
  return {
    id: "template-mixed-prescribed-set-counts",
    label: "Upper",
    purpose: "strength",
    supersetGroups: [
      {
        id: "group-1",
        slots: [twoSetPrescribedBenchPressSlot, fourSetPrescribedPullUpsSlot],
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
  Partial<Pick<TrainingPlanSlot, "trainingPrescription">>) {
  return {
    exerciseId,
    exerciseName,
    kind: "exercise",
    movementPattern,
    role,
    slotLabel: "A1",
    targetMuscles: [],
    trainingPrescription,
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
