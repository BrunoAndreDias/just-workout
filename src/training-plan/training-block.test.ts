import { describe, expect, it } from "vitest";
import { completeMainCompoundSelections } from "../plan-builder/plan-builder-test-fixtures";
import { createPresetWeeklyRepTargets } from "../training-taxonomy";
import {
  applyConfirmedMainCompoundRotations,
  applyNextTrainingBlockLoadSuggestionEdit,
  applyTrainingBlockProgressionRule,
  estimateNextTrainingBlockLoadSuggestions,
  generateNextTrainingBlock,
  generateNextTrainingBlockPreview,
  generateWeeklyIntensityTargets,
  getTrainingBlockExerciseTargetRir,
  previewMainCompoundRotations,
} from "./training-block";
import {
  acceptNextTrainingBlockTransition,
  createNextTrainingBlockTransitionPreview,
  createNextTrainingBlockTransitionWorkflow,
} from "./training-block-transition";
import type { TrainingPlan } from "./training-plan";
import type { TrainingSession } from "./training-session";

describe("Training Block transition", () => {
  it("does not expose a next Training Block preview until the active block reaches the final week", () => {
    const transition = createNextTrainingBlockTransitionWorkflow({
      trainingPlan: createTrainingPlan({
        trainingBlock: {
          cycleNumber: 1,
          endDate: "2026-07-18",
          id: "training-block-1",
          planId: "training-plan-1",
          previousBlockId: null,
          startDate: "2026-06-07",
          status: "active",
          weekNumber: 5,
        },
      }),
      trainingSessions: [],
    });

    expect(transition).toBeNull();
  });

  it("creates and accepts a complete next Training Block transition behind one interface", () => {
    const preview = createNextTrainingBlockTransitionPreview({
      availableLoadIncrement: 2.5,
      trainingPlan: createTrainingPlan({
        mainCompoundRotationPools: [
          {
            exerciseIds: ["incline-dumbbell-bench-press"],
            movementPattern: "horizontal_push",
          },
        ],
        trainingBlock: {
          cycleNumber: 1,
          endDate: "2026-07-18",
          id: "training-block-1",
          planId: "training-plan-1",
          previousBlockId: null,
          startDate: "2026-06-07",
          status: "completed",
          weekNumber: 6,
        },
      }),
      trainingSessions: [
        createTrainingSession({
          completedAt: "2026-07-12T10:00:00.000Z",
          exerciseId: "flat-barbell-bench-press",
          weight: 100,
        }),
      ],
    });

    if (!preview) {
      throw new Error("Expected a next Training Block preview.");
    }

    const editedSuggestions = applyNextTrainingBlockLoadSuggestionEdit({
      exerciseId: "incline-dumbbell-bench-press",
      suggestions: preview.loadSuggestions,
      userEditedLoad: 92.5,
    });
    const nextPlan = acceptNextTrainingBlockTransition({
      preview,
      suggestions: editedSuggestions,
    });

    expect(preview.trainingBlock).toMatchObject({
      cycleNumber: 2,
      endDate: "2026-08-29",
      id: "training-block-1-next",
      planId: "training-plan-1-next",
      previousBlockId: "training-block-1",
      startDate: "2026-07-19",
      weekNumber: 1,
    });
    expect(nextPlan).toMatchObject({
      active: true,
      id: "training-plan-1-next",
      trainingBlock: preview.trainingBlock,
    });
    expect(nextPlan.startingLoadSuggestions).toContainEqual(
      expect.objectContaining({
        effectiveLoad: 92.5,
        exerciseId: "incline-dumbbell-bench-press",
        previousLoad: 100,
        suggestedLoad: 90,
        userEditedLoad: 92.5,
      }),
    );
  });

  it("accepts a next Training Block transition through the workflow after editing suggested load", async () => {
    const events: string[] = [];
    const transition = createNextTrainingBlockTransitionWorkflow({
      onAcceptedTrainingPlan: async (savedTrainingPlan) => {
        events.push(`after-save:${savedTrainingPlan.id}`);
      },
      saveAcceptedTrainingPlan: async (nextTrainingPlan) => {
        const editedSuggestion = nextTrainingPlan.startingLoadSuggestions?.find(
          (suggestion) => suggestion.exerciseId === "incline-dumbbell-bench-press",
        );

        events.push(`save:${nextTrainingPlan.id}:${editedSuggestion?.effectiveLoad}`);

        return {
          ...nextTrainingPlan,
          id: "persisted-training-plan-next",
        };
      },
      trainingPlan: createTrainingPlan({
        mainCompoundRotationPools: [
          {
            exerciseIds: ["incline-dumbbell-bench-press"],
            movementPattern: "horizontal_push",
          },
        ],
        trainingBlock: {
          cycleNumber: 1,
          endDate: "2026-07-18",
          id: "training-block-1",
          planId: "training-plan-1",
          previousBlockId: null,
          startDate: "2026-06-07",
          status: "completed",
          weekNumber: 6,
        },
      }),
      trainingSessions: [
        createTrainingSession({
          completedAt: "2026-07-12T10:00:00.000Z",
          exerciseId: "flat-barbell-bench-press",
          weight: 100,
        }),
      ],
    });

    if (!transition?.accept) {
      throw new Error("Expected an acceptable next Training Block transition.");
    }

    const editedSuggestions = transition.editLoadSuggestion({
      exerciseId: "incline-dumbbell-bench-press",
      suggestions: transition.preview.loadSuggestions,
      userEditedLoad: 92.5,
    });
    const savedTrainingPlan = await transition.accept({ suggestions: editedSuggestions });

    expect(savedTrainingPlan.id).toBe("persisted-training-plan-next");
    expect(events).toEqual([
      "save:training-plan-1-next:92.5",
      "after-save:persisted-training-plan-next",
    ]);
  });
});

describe("generateNextTrainingBlock", () => {
  it("creates the next active Training Block after six completed weeks", () => {
    const nextBlock = generateNextTrainingBlock({
      completedWeeks: [1, 2, 3, 4, 5, 6],
      currentBlock: {
        cycleNumber: 1,
        endDate: "2026-07-18",
        id: "training-block-1",
        planId: "training-plan-1",
        previousBlockId: null,
        startDate: "2026-06-07",
        status: "completed",
        weekNumber: 6,
      },
      id: "training-block-2",
      planId: "training-plan-2",
      startDate: "2026-07-19",
    });

    expect(nextBlock).toEqual({
      cycleNumber: 2,
      endDate: "2026-08-29",
      id: "training-block-2",
      planId: "training-plan-2",
      previousBlockId: "training-block-1",
      startDate: "2026-07-19",
      status: "active",
      weekNumber: 1,
    });
  });

  it("previews main compound rotations from the same Movement Pattern pool", () => {
    const preview = previewMainCompoundRotations({
      trainingPlan: createTrainingPlan({
        mainCompoundRotationPools: [
          {
            exerciseIds: ["incline-dumbbell-bench-press"],
            movementPattern: "horizontal_push",
          },
        ],
      }),
    });

    expect(preview.rotated).toEqual([
      {
        movementPattern: "horizontal_push",
        nextExerciseId: "incline-dumbbell-bench-press",
        nextExerciseName: "Incline Dumbbell Bench Press",
        previousExerciseId: "flat-barbell-bench-press",
        previousExerciseName: "Flat Barbell Bench Press",
        reason: "same Movement Pattern rotation pool",
      },
    ]);
    expect(preview.kept).toEqual(
      expect.arrayContaining([
        {
          exerciseId: "bent-over-barbell-rows",
          exerciseName: "Bent Over Barbell Rows",
          movementPattern: "horizontal_pull",
          reason: "no valid rotation pool replacement",
        },
      ]),
    );
    expect(preview.requiredMovementCoverage).toEqual({
      isPreserved: true,
      missingPatterns: [],
    });
  });

  it("reports missing required Movement Patterns when a rotation preview would not preserve coverage", () => {
    const preview = previewMainCompoundRotations({
      trainingPlan: createTrainingPlan({
        workoutTemplates: [
          {
            id: "template-1",
            label: "Upper A",
            supersetGroups: [
              {
                id: "group-1",
                slots: [
                  {
                    exerciseId: "flat-barbell-bench-press",
                    exerciseName: "Flat Barbell Bench Press",
                    kind: "exercise",
                    movementPattern: "horizontal_push",
                    role: "main_compound",
                    slotLabel: "horizontal_push",
                    targetMuscles: ["chest"],
                  },
                ],
                title: "Upper superset",
                type: "superset",
              },
            ],
          },
        ],
      }),
    });

    expect(preview.requiredMovementCoverage).toEqual({
      isPreserved: false,
      missingPatterns: [
        "horizontal_pull",
        "vertical_pull",
        "quad_dominant",
        "hip_hamstring_dominant",
      ],
    });
  });

  it("applies confirmed main compound rotations to a new Training Plan without mutating the previous plan", () => {
    const previousPlan = createTrainingPlan({
      mainCompoundRotationPools: [
        {
          exerciseIds: ["incline-dumbbell-bench-press"],
          movementPattern: "horizontal_push",
        },
      ],
    });
    const preview = previewMainCompoundRotations({ trainingPlan: previousPlan });

    const nextPlan = applyConfirmedMainCompoundRotations({
      id: "training-plan-2",
      preview,
      timestamp: "2026-07-19T09:00:00.000Z",
      trainingPlan: previousPlan,
    });

    const nextSlots = nextPlan.workoutTemplates.flatMap((template) =>
      template.supersetGroups.flatMap((group) => group.slots),
    );
    const previousSlots = previousPlan.workoutTemplates.flatMap((template) =>
      template.supersetGroups.flatMap((group) => group.slots),
    );

    expect(nextPlan.id).toBe("training-plan-2");
    expect(nextPlan.generatedAt).toBe("2026-07-19T09:00:00.000Z");
    expect(nextSlots).toContainEqual(
      expect.objectContaining({
        exerciseId: "incline-dumbbell-bench-press",
        exerciseName: "Incline Dumbbell Bench Press",
        movementPattern: "horizontal_push",
        role: "main_compound",
      }),
    );
    expect(previousSlots).toContainEqual(
      expect.objectContaining({
        exerciseId: "flat-barbell-bench-press",
        exerciseName: "Flat Barbell Bench Press",
      }),
    );
  });

  it("rotates secondary and accessory exercises when compatible catalog alternatives exist", () => {
    const previousPlan = createTrainingPlan({
      workoutTemplates: [
        {
          id: "template-1",
          label: "Upper A",
          supersetGroups: [
            {
              id: "group-1",
              slots: [
                ...createRequiredMainCompoundSlots(),
                {
                  exerciseId: "standing-barbell-curls",
                  exerciseName: "Standing Barbell Curls",
                  kind: "exercise",
                  movementPattern: "elbow_flexion",
                  role: "isolation",
                  slotLabel: "biceps",
                  targetMuscles: ["biceps"],
                },
                {
                  exerciseId: "hanging-leg-raises",
                  exerciseName: "Hanging Leg Raises",
                  kind: "exercise",
                  movementPattern: "core",
                  role: "abs",
                  slotLabel: "abs",
                  targetMuscles: ["abs"],
                },
              ],
              title: "Upper superset",
              type: "superset",
            },
          ],
        },
      ],
    });
    const preview = previewMainCompoundRotations({ trainingPlan: previousPlan });

    expect(preview.rotated).toContainEqual({
      movementPattern: "elbow_flexion",
      nextExerciseId: "standing-dumbbell-curls",
      nextExerciseName: "Standing Dumbbell Curls",
      previousExerciseId: "standing-barbell-curls",
      previousExerciseName: "Standing Barbell Curls",
      reason: "same role, Movement Pattern, and target muscle",
    });
    expect(preview.kept).toContainEqual({
      exerciseId: "hanging-leg-raises",
      exerciseName: "Hanging Leg Raises",
      movementPattern: "core",
      reason: "no compatible role and target muscle replacement",
    });

    const nextPlan = applyConfirmedMainCompoundRotations({
      id: "training-plan-2",
      preview,
      timestamp: "2026-07-19T09:00:00.000Z",
      trainingPlan: previousPlan,
    });
    const nextSlots = nextPlan.workoutTemplates.flatMap((template) =>
      template.supersetGroups.flatMap((group) => group.slots),
    );

    expect(nextSlots).toContainEqual(
      expect.objectContaining({
        exerciseId: "standing-dumbbell-curls",
        exerciseName: "Standing Dumbbell Curls",
        movementPattern: "elbow_flexion",
        role: "isolation",
        targetMuscles: ["biceps"],
      }),
    );
    expect(nextSlots).toContainEqual(
      expect.objectContaining({
        exerciseId: "hanging-leg-raises",
        exerciseName: "Hanging Leg Raises",
        role: "abs",
      }),
    );
  });

  it("rejects confirmed rotations when required Movement Pattern coverage is not preserved", () => {
    const previousPlan = createTrainingPlan({
      workoutTemplates: [
        {
          id: "template-1",
          label: "Upper A",
          supersetGroups: [
            {
              id: "group-1",
              slots: [
                {
                  exerciseId: "flat-barbell-bench-press",
                  exerciseName: "Flat Barbell Bench Press",
                  kind: "exercise",
                  movementPattern: "horizontal_push",
                  role: "main_compound",
                  slotLabel: "horizontal_push",
                  targetMuscles: ["chest"],
                },
              ],
              title: "Upper superset",
              type: "superset",
            },
          ],
        },
      ],
    });
    const preview = previewMainCompoundRotations({ trainingPlan: previousPlan });

    expect(() =>
      applyConfirmedMainCompoundRotations({
        id: "training-plan-2",
        preview,
        timestamp: "2026-07-19T09:00:00.000Z",
        trainingPlan: previousPlan,
      }),
    ).toThrow("Cannot apply rotations that do not preserve required Movement Pattern coverage.");
  });

  it("composes the next Training Block preview with rotations, load suggestions, and weekly intensity targets", () => {
    const currentBlock = {
      cycleNumber: 1,
      endDate: "2026-07-18",
      id: "training-block-1",
      planId: "training-plan-1",
      previousBlockId: null,
      startDate: "2026-06-07",
      status: "completed",
      weekNumber: 6,
    } as const;
    const trainingPlan = createTrainingPlan({
      mainCompoundRotationPools: [
        {
          exerciseIds: ["incline-dumbbell-bench-press"],
          movementPattern: "horizontal_push",
        },
      ],
    });

    const preview = generateNextTrainingBlockPreview({
      availableLoadIncrement: 2.5,
      completedWeeks: [1, 2, 3, 4, 5, 6],
      currentBlock,
      nextBlockId: "training-block-2",
      nextPlanId: "training-plan-2",
      sessions: [
        createTrainingSession({
          completedAt: "2026-07-12T10:00:00.000Z",
          exerciseId: "flat-barbell-bench-press",
          weight: 100,
        }),
      ],
      startDate: "2026-07-19",
      timestamp: "2026-07-19T09:00:00.000Z",
      trainingPlan,
    });

    expect(preview.trainingBlock).toEqual({
      cycleNumber: 2,
      endDate: "2026-08-29",
      id: "training-block-2",
      planId: "training-plan-2",
      previousBlockId: "training-block-1",
      startDate: "2026-07-19",
      status: "active",
      weekNumber: 1,
    });
    expect(preview.nextTrainingPlan.id).toBe("training-plan-2");
    expect(preview.rotation.rotated).toContainEqual(
      expect.objectContaining({
        nextExerciseId: "incline-dumbbell-bench-press",
        previousExerciseId: "flat-barbell-bench-press",
      }),
    );
    expect(preview.loadSuggestions).toContainEqual(
      expect.objectContaining({
        exerciseId: "incline-dumbbell-bench-press",
        previousLoad: 100,
        reason: "same Movement Pattern, -10% reset",
        suggestedLoad: 90,
      }),
    );
    expect(preview.weeklyIntensityTargets).toHaveLength(6);
  });

  it("suggests the latest same-exercise working load with a five percent reset", () => {
    const suggestions = estimateNextTrainingBlockLoadSuggestions({
      availableLoadIncrement: 2.5,
      sessions: [
        createTrainingSession({
          completedAt: "2026-06-21T10:00:00.000Z",
          exerciseId: "flat-barbell-bench-press",
          weight: 90,
        }),
        createTrainingSession({
          completedAt: "2026-07-12T10:00:00.000Z",
          exerciseId: "flat-barbell-bench-press",
          weight: 100,
        }),
      ],
      targets: [
        {
          exerciseId: "flat-barbell-bench-press",
          exerciseName: "Flat Barbell Bench Press",
          movementPattern: "horizontal_push",
        },
      ],
    });

    expect(suggestions).toEqual([
      {
        exerciseId: "flat-barbell-bench-press",
        exerciseName: "Flat Barbell Bench Press",
        movementPattern: "horizontal_push",
        previousLoad: 100,
        reason: "same exercise, -5% reset",
        suggestedLoad: 95,
        userEditedLoad: null,
      },
    ]);
  });

  it("suggests a compatible Movement Pattern load with a ten percent reset for a rotated exercise", () => {
    const suggestions = estimateNextTrainingBlockLoadSuggestions({
      availableLoadIncrement: 2.5,
      sessions: [
        createTrainingSession({
          completedAt: "2026-07-12T10:00:00.000Z",
          exerciseId: "flat-barbell-bench-press",
          weight: 100,
        }),
      ],
      targets: [
        {
          exerciseId: "incline-dumbbell-bench-press",
          exerciseName: "Incline Dumbbell Bench Press",
          movementPattern: "horizontal_push",
        },
      ],
    });

    expect(suggestions).toEqual([
      {
        exerciseId: "incline-dumbbell-bench-press",
        exerciseName: "Incline Dumbbell Bench Press",
        movementPattern: "horizontal_push",
        previousLoad: 100,
        reason: "same Movement Pattern, -10% reset",
        suggestedLoad: 90,
        userEditedLoad: null,
      },
    ]);
  });

  it("preserves bodyweight-only logic while carrying over added load for bodyweight exercises", () => {
    const suggestions = estimateNextTrainingBlockLoadSuggestions({
      availableLoadIncrement: 2.5,
      sessions: [
        createTrainingSession({
          completedAt: "2026-07-12T10:00:00.000Z",
          exerciseId: "pull-ups",
          exerciseName: "Pull-Ups",
          movementPattern: "vertical_pull",
          weight: 0,
        }),
        createTrainingSession({
          completedAt: "2026-07-13T10:00:00.000Z",
          exerciseId: "chin-ups",
          exerciseName: "Chin-Ups",
          movementPattern: "vertical_pull",
          weight: 10,
        }),
        createTrainingSession({
          completedAt: "2026-07-14T10:00:00.000Z",
          exerciseId: "assisted-pull-ups",
          exerciseName: "Assisted Pull-Ups",
          movementPattern: "vertical_pull",
          weight: -12.5,
        }),
      ],
      targets: [
        {
          exerciseId: "pull-ups",
          exerciseName: "Pull-Ups",
          movementPattern: "vertical_pull",
        },
        {
          exerciseId: "chin-ups",
          exerciseName: "Chin-Ups",
          movementPattern: "vertical_pull",
        },
        {
          exerciseId: "assisted-pull-ups",
          exerciseName: "Assisted Pull-Ups",
          movementPattern: "vertical_pull",
        },
      ],
    });

    expect(suggestions).toEqual([
      {
        exerciseId: "pull-ups",
        exerciseName: "Pull-Ups",
        movementPattern: "vertical_pull",
        previousLoad: 0,
        reason: "bodyweight only, no added load",
        suggestedLoad: 0,
        userEditedLoad: null,
      },
      {
        exerciseId: "chin-ups",
        exerciseName: "Chin-Ups",
        movementPattern: "vertical_pull",
        previousLoad: 10,
        reason: "bodyweight added load, -5% reset",
        suggestedLoad: 10,
        userEditedLoad: null,
      },
      {
        exerciseId: "assisted-pull-ups",
        exerciseName: "Assisted Pull-Ups",
        movementPattern: "vertical_pull",
        previousLoad: -12.5,
        reason: "bodyweight assistance, -5% reset",
        suggestedLoad: -12.5,
        userEditedLoad: null,
      },
    ]);
  });

  it("progresses weekly intensity from easier week 1 targets to 0-1 RIR in week 6", () => {
    const targets = generateWeeklyIntensityTargets({ trainingBlockWeeks: 6 });

    expect(targets[0]).toEqual({
      maxTargetRir: 3,
      minTargetRir: 3,
      weekNumber: 1,
    });
    expect(targets[5]).toEqual({
      maxTargetRir: 1,
      minTargetRir: 0,
      weekNumber: 6,
    });
    expect(targets[0]?.minTargetRir).toBeGreaterThan(targets[5]?.minTargetRir ?? 0);
  });

  it("keeps compound defaults away from 0 RIR while allowing isolation last sets to reach 0 RIR", () => {
    const weeklyIntensityTargets = generateWeeklyIntensityTargets({ trainingBlockWeeks: 6 });

    expect(
      getTrainingBlockExerciseTargetRir({
        role: "main_compound",
        setIndex: 3,
        weekNumber: 6,
        weeklyIntensityTargets,
      }),
    ).toBe(1);
    expect(
      getTrainingBlockExerciseTargetRir({
        role: "secondary_compound",
        setIndex: 3,
        weekNumber: 6,
        weeklyIntensityTargets,
      }),
    ).toBe(1);
    expect(
      getTrainingBlockExerciseTargetRir({
        role: "isolation",
        setIndex: 3,
        weekNumber: 6,
        weeklyIntensityTargets,
      }),
    ).toBe(0);
    expect(
      getTrainingBlockExerciseTargetRir({
        role: "isolation",
        setIndex: 1,
        weekNumber: 6,
        weeklyIntensityTargets,
      }),
    ).toBe(1);
  });

  it("preserves user-edited suggested loads without changing the original suggestion", () => {
    const [suggestion] = estimateNextTrainingBlockLoadSuggestions({
      availableLoadIncrement: 2.5,
      sessions: [
        createTrainingSession({
          completedAt: "2026-07-12T10:00:00.000Z",
          exerciseId: "flat-barbell-bench-press",
          weight: 100,
        }),
      ],
      targets: [
        {
          exerciseId: "flat-barbell-bench-press",
          exerciseName: "Flat Barbell Bench Press",
          movementPattern: "horizontal_push",
        },
      ],
    });

    if (!suggestion) {
      throw new Error("Expected a load suggestion.");
    }

    const editedSuggestions = applyNextTrainingBlockLoadSuggestionEdit({
      exerciseId: "flat-barbell-bench-press",
      suggestions: [suggestion],
      userEditedLoad: 97.5,
    });

    expect(editedSuggestions).toEqual([
      {
        ...suggestion,
        suggestedLoad: 95,
        userEditedLoad: 97.5,
      },
    ]);
  });

  it("falls back to safe editable defaults when workout history is missing", () => {
    const suggestions = estimateNextTrainingBlockLoadSuggestions({
      availableLoadIncrement: 2.5,
      sessions: [],
      targets: [
        {
          exerciseId: "flat-barbell-bench-press",
          exerciseName: "Flat Barbell Bench Press",
          movementPattern: "horizontal_push",
        },
      ],
    });

    expect(suggestions).toEqual([
      {
        exerciseId: "flat-barbell-bench-press",
        exerciseName: "Flat Barbell Bench Press",
        movementPattern: "horizontal_push",
        previousLoad: null,
        reason: "missing workout history, safe default",
        suggestedLoad: 20,
        userEditedLoad: null,
      },
    ]);
  });

  it("suggests increasing load when every completed set reaches the top of the rep range at target RIR or easier", () => {
    const decision = applyTrainingBlockProgressionRule({
      completedSets: [
        { reps: 12, rir: 2 },
        { reps: 12, rir: 3 },
        { reps: 12, rir: 2 },
      ],
      repRange: { maxReps: 12, minReps: 8 },
      targetRir: 2,
    });

    expect(decision).toEqual({
      reason: "completed all sets at the top of the rep range with target RIR or easier",
      type: "increase_load",
    });
  });

  it("suggests reducing load when completed sets miss the lower end of the rep range", () => {
    const decision = applyTrainingBlockProgressionRule({
      completedSets: [
        { reps: 7, rir: 1 },
        { reps: 8, rir: 2 },
        { reps: 6, rir: 1 },
      ],
      repRange: { maxReps: 12, minReps: 8 },
      targetRir: 2,
    });

    expect(decision).toEqual({
      reason: "missed the lower end of the rep range",
      type: "reduce_load",
    });
  });
});

function createTrainingSession({
  completedAt,
  exerciseId,
  exerciseName = "Flat Barbell Bench Press",
  movementPattern = "horizontal_push",
  weight,
}: {
  completedAt: string;
  exerciseId: string;
  exerciseName?: string;
  movementPattern?: TrainingSession["exercises"][number]["movementPattern"];
  weight: number;
}): TrainingSession {
  return {
    completedAt,
    createdAt: completedAt,
    exercises: [
      {
        exerciseId,
        exerciseName,
        movementPattern,
        sets: [
          { reps: 10, setIndex: 1, weight: weight - 5 },
          { reps: 8, setIndex: 2, weight },
        ],
      },
    ],
    id: `session-${completedAt}`,
    planId: "training-plan-1",
    status: "completed",
    templateId: "template-1",
    templateLabel: "Upper A",
    updatedAt: completedAt,
    volumeByMovementPattern: [],
  };
}

function createTrainingPlan(overrides: Partial<TrainingPlan> = {}): TrainingPlan {
  return {
    active: true,
    generatedAt: "2026-06-07T10:00:00.000Z",
    id: "training-plan-1",
    mainCompoundRotationPools: [],
    repRangeStyle: "balanced_hypertrophy",
    sourceBlueprintId: "plan-blueprint-1",
    split: "Upper / Lower",
    trainingBlockWeeks: 6,
    trainingFrequencyDaysPerWeek: 4,
    trainingGoal: "build-muscle",
    updatedAt: "2026-06-07T10:00:00.000Z",
    weeklyRepTargets: createPresetWeeklyRepTargets("balanced"),
    workoutTemplates: [
      {
        id: "template-1",
        label: "Upper A",
        supersetGroups: [
          {
            id: "group-1",
            slots: completeMainCompoundSelections.map((selection) => ({
              exerciseId: selection.exerciseId,
              exerciseName: getExerciseName(selection.exerciseId),
              kind: "exercise",
              movementPattern: selection.movementPattern,
              role: "main_compound",
              slotLabel: selection.movementPattern,
              targetMuscles: selection.movementPattern === "horizontal_push" ? ["chest"] : ["back"],
            })),
            title: "Upper superset",
            type: "superset",
          },
        ],
      },
    ],
    ...overrides,
  };
}

function createRequiredMainCompoundSlots() {
  return [
    {
      exerciseId: "flat-barbell-bench-press",
      exerciseName: "Flat Barbell Bench Press",
      kind: "exercise",
      movementPattern: "horizontal_push",
      role: "main_compound",
      slotLabel: "horizontal_push",
      targetMuscles: ["chest"],
    },
    {
      exerciseId: "bent-over-barbell-rows",
      exerciseName: "Bent Over Barbell Rows",
      kind: "exercise",
      movementPattern: "horizontal_pull",
      role: "main_compound",
      slotLabel: "horizontal_pull",
      targetMuscles: ["back"],
    },
    {
      exerciseId: "pull-ups",
      exerciseName: "Pull-Ups",
      kind: "exercise",
      movementPattern: "vertical_pull",
      role: "main_compound",
      slotLabel: "vertical_pull",
      targetMuscles: ["back"],
    },
    {
      exerciseId: "barbell-squats",
      exerciseName: "Barbell Squats",
      kind: "exercise",
      movementPattern: "quad_dominant",
      role: "main_compound",
      slotLabel: "quad_dominant",
      targetMuscles: ["quadriceps"],
    },
    {
      exerciseId: "barbell-romanian-deadlifts",
      exerciseName: "Barbell Romanian Deadlifts",
      kind: "exercise",
      movementPattern: "hip_hamstring_dominant",
      role: "main_compound",
      slotLabel: "hip_hamstring_dominant",
      targetMuscles: ["hamstrings"],
    },
  ] satisfies TrainingPlan["workoutTemplates"][number]["supersetGroups"][number]["slots"];
}

function getExerciseName(exerciseId: string): string {
  const exerciseNames: Record<string, string> = {
    "barbell-romanian-deadlifts": "Barbell Romanian Deadlifts",
    "barbell-squats": "Barbell Squats",
    "bent-over-barbell-rows": "Bent Over Barbell Rows",
    "flat-barbell-bench-press": "Flat Barbell Bench Press",
    "pull-ups": "Pull-Ups",
    "standing-overhead-barbell-press": "Standing Overhead Barbell Press",
  };

  return exerciseNames[exerciseId] ?? exerciseId;
}
