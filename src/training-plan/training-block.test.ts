import { describe, expect, it } from "vitest";
import { completeMainCompoundSelections } from "../plan-builder/plan-builder-test-fixtures";
import { createPresetWeeklyRepTargets } from "../training-taxonomy";
import {
  applyConfirmedTrainingBlockExerciseRotations,
  applyNextTrainingBlockLoadSuggestionEdit,
  applyTrainingBlockExerciseSwapToPreview,
  applyTrainingBlockExerciseSwapToTrainingPlan,
  applyTrainingBlockProgressionRule,
  estimateNextTrainingBlockLoadSuggestions,
  generateNextTrainingBlock,
  generateNextTrainingBlockPreview,
  generateWeeklyIntensityTargets,
  getTrainingBlockExerciseSwapChoices,
  getTrainingBlockExerciseTargetRir,
  previewTrainingBlockExerciseRotations,
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
    const trainingPlan = createTrainingPlan({
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
      trainingFrequencyDaysPerWeek: 2,
    });
    const preview = createNextTrainingBlockTransitionPreview({
      availableLoadIncrement: 2.5,
      trainingPlan,
      trainingSessions: createCompletedTrainingBlockSessions(),
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
      currentTrainingPlan: trainingPlan,
      preview,
      suggestions: editedSuggestions,
    });

    expect(preview.trainingBlock).toMatchObject({
      cycleNumber: 2,
      endDate: "2026-08-29",
      id: "training-block-1-next",
      planId: "training-plan-1",
      previousBlockId: "training-block-1",
      startDate: "2026-07-19",
      weekNumber: 1,
    });
    expect(nextPlan).toMatchObject({
      active: true,
      id: "training-plan-1",
      trainingBlock: preview.trainingBlock,
    });
    expect(nextPlan.startingLoadSuggestions).toContainEqual(
      expect.objectContaining({
        effectiveLoad: 92.5,
        exerciseId: "incline-dumbbell-bench-press",
        kind: "first_time",
        previousLoad: null,
        suggestedLoad: null,
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
          id: "training-plan-1",
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
        trainingFrequencyDaysPerWeek: 2,
      }),
      trainingSessions: createCompletedTrainingBlockSessions(),
    });

    if (transition?.kind !== "review" || !transition.accept) {
      throw new Error("Expected an acceptable next Training Block transition.");
    }

    const editedSuggestions = transition.editLoadSuggestion({
      exerciseId: "incline-dumbbell-bench-press",
      suggestions: transition.preview.loadSuggestions,
      userEditedLoad: 92.5,
    });
    const savedTrainingPlan = await transition.accept({
      reviewMode: "accept_proposal",
      suggestions: editedSuggestions,
    });

    expect(savedTrainingPlan.id).toBe("training-plan-1");
    expect(events).toEqual(["save:training-plan-1:92.5", "after-save:training-plan-1"]);
  });

  it("keeps the same Active Training Plan identity when accepting the next Training Block", () => {
    const trainingPlan = createTrainingPlan({
      trainingBlock: {
        cycleNumber: 1,
        endDate: "2026-07-18",
        id: "training-block-1",
        planId: "training-plan-1",
        previousBlockId: null,
        startDate: "2026-06-07",
        status: "active",
        weekNumber: 6,
      },
      trainingFrequencyDaysPerWeek: 2,
    });
    const transition = createNextTrainingBlockTransitionWorkflow({
      trainingPlan,
      trainingSessions: createCompletedTrainingBlockSessions(),
    });

    if (transition?.kind !== "review") {
      throw new Error("Expected a next Training Block transition.");
    }

    const acceptedPlan = acceptNextTrainingBlockTransition({
      currentTrainingPlan: trainingPlan,
      preview: transition.preview,
      suggestions: transition.preview.loadSuggestions,
    });

    expect(transition.preview.nextTrainingPlan.id).toBe("training-plan-1");
    expect(transition.preview.trainingBlock.planId).toBe("training-plan-1");
    expect(acceptedPlan.id).toBe("training-plan-1");
    expect(acceptedPlan.trainingBlock).toMatchObject({
      cycleNumber: 2,
      planId: "training-plan-1",
      previousBlockId: "training-block-1",
      weekNumber: 1,
    });
  });

  it("creates the next Training Block with current exercises when skipping the rotation proposal", () => {
    const trainingPlan = createTrainingPlan({
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
      trainingFrequencyDaysPerWeek: 2,
    });
    const transition = createNextTrainingBlockTransitionWorkflow({
      trainingPlan,
      trainingSessions: createCompletedTrainingBlockSessions(),
    });

    if (transition?.kind !== "review") {
      throw new Error("Expected a reviewable next Training Block transition.");
    }

    const skippedPlan = acceptNextTrainingBlockTransition({
      currentTrainingPlan: trainingPlan,
      preview: transition.skipRotationPreview,
      suggestions: transition.skipRotationPreview.loadSuggestions,
    });
    const firstTemplateSlots = skippedPlan.workoutTemplates[0]?.supersetGroups[0]?.slots;

    expect(firstTemplateSlots).toContainEqual(
      expect.objectContaining({
        exerciseId: "flat-barbell-bench-press",
        exerciseName: "Flat Barbell Bench Press",
      }),
    );
    expect(firstTemplateSlots).not.toContainEqual(
      expect.objectContaining({
        exerciseId: "incline-dumbbell-bench-press",
      }),
    );
    expect(skippedPlan.startingLoadSuggestions).toContainEqual(
      expect.objectContaining({
        effectiveLoad: 100,
        exerciseId: "flat-barbell-bench-press",
        kind: "exact_previous_exercise",
        previousLoad: 100,
        suggestedLoad: 100,
      }),
    );
    expect(skippedPlan.trainingBlock).toMatchObject({
      cycleNumber: 2,
      previousBlockId: "training-block-1",
      weekNumber: 1,
    });
    expect(transition.skipRotationPreview.weeklyIntensityTargets[0]).toEqual({
      maxTargetRir: 3,
      minTargetRir: 3,
      weekNumber: 1,
    });
  });

  it("does not count Extra Training Sessions toward completed Training Block weeks", () => {
    const trainingPlan = createTrainingPlan({
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
      trainingFrequencyDaysPerWeek: 2,
    });

    const preview = createNextTrainingBlockTransitionPreview({
      trainingPlan,
      trainingSessions: createCompletedTrainingBlockSessions().map((session, index) =>
        index % 2 === 1 ? { ...session, sessionIntent: "extra" as const } : session,
      ),
    });

    expect(preview).toBeNull();
  });

  it("ignores proposal preview edits when accepting with skip rotation", async () => {
    const trainingSessions = createCompletedTrainingBlockSessions();
    const trainingPlan = createTrainingPlan({
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
      trainingFrequencyDaysPerWeek: 2,
    });

    const transition = createNextTrainingBlockTransitionWorkflow({
      saveAcceptedTrainingPlan: async (nextTrainingPlan) => nextTrainingPlan,
      trainingPlan,
      trainingSessions,
    });

    if (transition?.kind !== "review" || !transition.accept) {
      throw new Error("Expected an acceptable next Training Block transition.");
    }

    const editedProposalPreview = applyTrainingBlockExerciseSwapToPreview({
      groupId: "group-1",
      nextExerciseId: "decline-dumbbell-bench-press",
      preview: transition.preview,
      sessions: trainingSessions,
      slotIndex: 0,
      templateId: "template-1",
    });
    const acceptedPlan = await transition.accept({
      preview: editedProposalPreview,
      reviewMode: "skip_rotation",
      suggestions: transition.skipRotationPreview.loadSuggestions,
    } as Parameters<NonNullable<typeof transition.accept>>[0]);
    const firstTemplateSlots = acceptedPlan.workoutTemplates[0]?.supersetGroups[0]?.slots;

    expect(firstTemplateSlots).toContainEqual(
      expect.objectContaining({
        exerciseId: "flat-barbell-bench-press",
        exerciseName: "Flat Barbell Bench Press",
      }),
    );
    expect(firstTemplateSlots).not.toContainEqual(
      expect.objectContaining({
        exerciseId: "decline-dumbbell-bench-press",
      }),
    );
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
    const preview = previewTrainingBlockExerciseRotations({
      trainingPlan: createTrainingPlan({
        mainCompoundRotationPools: [
          {
            exerciseIds: ["incline-dumbbell-bench-press"],
            movementPattern: "horizontal_push",
          },
        ],
      }),
    });

    expect(preview.rotated).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          movementPattern: "horizontal_push",
          nextExerciseId: "incline-dumbbell-bench-press",
          nextExerciseName: "Incline Dumbbell Bench Press",
          previousExerciseId: "flat-barbell-bench-press",
          previousExerciseName: "Flat Barbell Bench Press",
          reason: "same Movement Pattern rotation pool",
        }),
        expect.objectContaining({
          movementPattern: "horizontal_pull",
          reason: "compatible main compound fallback",
        }),
      ]),
    );
    expect(preview.requiredMovementCoverage).toEqual({
      isPreserved: true,
      missingPatterns: [],
    });
  });

  it("prefers stored Isolation Exercise Preferences and excludes avoided exercises for accessory proposals", () => {
    const preview = previewTrainingBlockExerciseRotations({
      trainingPlan: createTrainingPlan({
        exerciseSelectionPreferences: {
          avoidedExercises: [{ id: "avoided-1", rawText: "Incline Dumbbell Curls" }],
          equipmentPreset: "full_gym",
          preferredExercises: [],
          strategy: "balanced",
        },
        isolationExercisePreferences: [
          {
            exerciseIds: ["incline-dumbbell-curls", "seated-dumbbell-curls"],
            primaryMuscleGroup: "biceps",
          },
        ],
        workoutTemplates: [
          {
            id: "template-1",
            label: "Upper A",
            purpose: "strength",
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
                    slotLabel: "Biceps",
                    targetMuscles: ["biceps"],
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

    expect(preview.rotated).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          movementPattern: "elbow_flexion",
          nextExerciseId: "seated-dumbbell-curls",
          nextExerciseName: "Seated Dumbbell Curls",
          previousExerciseId: "standing-barbell-curls",
          previousExerciseName: "Standing Barbell Curls",
          reason: "preferred isolation exercise",
        }),
      ]),
    );
  });

  it("prefers compatible exercises that were never performed in the Active Training Plan", () => {
    const preview = previewTrainingBlockExerciseRotations({
      sessions: [
        createTrainingSession({
          completedAt: "2026-05-18T10:00:00.000Z",
          exerciseId: "chin-ups",
          exerciseName: "Chin-Ups",
          movementPattern: "vertical_pull",
          weight: 10,
        }),
        createTrainingSession({
          completedAt: "2026-05-25T10:00:00.000Z",
          exerciseId: "lat-pull-downs",
          exerciseName: "Lat Pull-Downs",
          movementPattern: "vertical_pull",
          weight: 55,
        }),
      ],
      trainingPlan: createTrainingPlan({
        workoutTemplates: [
          {
            id: "template-1",
            label: "Upper A",
            purpose: "strength",
            supersetGroups: [
              {
                id: "group-1",
                slots: [
                  {
                    exerciseId: "pull-ups",
                    exerciseName: "Pull-Ups",
                    kind: "exercise",
                    movementPattern: "vertical_pull",
                    role: "main_compound",
                    slotLabel: "Vertical pull",
                    targetMuscles: ["back"],
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

    expect(preview.rotated).toContainEqual(
      expect.objectContaining({
        movementPattern: "vertical_pull",
        nextExerciseId: "neutral-grip-pulldown",
        nextExerciseName: "Neutral-Grip Pulldown",
        previousExerciseId: "pull-ups",
        previousExerciseName: "Pull-Ups",
        reason: "compatible main compound fallback",
      }),
    );
  });

  it("prefers compatible exercises not used in the immediately previous Training Block when every option has history", () => {
    const preview = previewTrainingBlockExerciseRotations({
      sessions: [
        createTrainingSession({
          completedAt: "2026-05-18T10:00:00.000Z",
          exerciseId: "lat-pull-downs",
          exerciseName: "Lat Pull-Downs",
          movementPattern: "vertical_pull",
          weight: 55,
        }),
        createTrainingSession({
          completedAt: "2026-05-25T10:00:00.000Z",
          exerciseId: "neutral-grip-pulldown",
          exerciseName: "Neutral-Grip Pulldown",
          movementPattern: "vertical_pull",
          weight: 55,
        }),
        createTrainingSession({
          completedAt: "2026-06-28T10:00:00.000Z",
          exerciseId: "chin-ups",
          exerciseName: "Chin-Ups",
          movementPattern: "vertical_pull",
          trainingBlockId: "training-block-1",
          weight: 10,
        }),
      ],
      trainingPlan: createTrainingPlan({
        exerciseSelectionPreferences: {
          avoidedExercises: [
            { id: "avoid-1", rawText: "Assisted Pull-Up" },
            { id: "avoid-2", rawText: "Wide-Grip Lat Pulldown" },
            { id: "avoid-3", rawText: "Close-Grip Lat Pulldown" },
            { id: "avoid-4", rawText: "Reverse-Grip Lat Pulldown" },
            { id: "avoid-5", rawText: "Close Neutral-Grip Pulldown" },
            { id: "avoid-6", rawText: "Medium-Grip Lat Pulldown" },
          ],
          equipmentPreset: "full_gym",
          preferredExercises: [],
          strategy: "balanced",
        },
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
        workoutTemplates: [
          {
            id: "template-1",
            label: "Upper A",
            purpose: "strength",
            supersetGroups: [
              {
                id: "group-1",
                slots: [
                  {
                    exerciseId: "pull-ups",
                    exerciseName: "Pull-Ups",
                    kind: "exercise",
                    movementPattern: "vertical_pull",
                    role: "main_compound",
                    slotLabel: "Vertical pull",
                    targetMuscles: ["back"],
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

    expect(preview.rotated).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          movementPattern: "vertical_pull",
          nextExerciseId: "lat-pull-downs",
          nextExerciseName: "Lat Pull-Downs",
          previousExerciseId: "pull-ups",
          previousExerciseName: "Pull-Ups",
          reason: "compatible main compound fallback",
        }),
      ]),
    );
  });

  it("reports missing required Movement Patterns when a rotation preview would not preserve coverage", () => {
    const preview = previewTrainingBlockExerciseRotations({
      trainingPlan: createTrainingPlan({
        workoutTemplates: [
          {
            id: "template-1",
            label: "Upper A",
            purpose: "strength",
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

  it("applies confirmed exercise rotations to a new Training Plan without mutating the previous plan", () => {
    const previousPlan = createTrainingPlan({
      mainCompoundRotationPools: [
        {
          exerciseIds: ["incline-dumbbell-bench-press"],
          movementPattern: "horizontal_push",
        },
      ],
    });
    const preview = previewTrainingBlockExerciseRotations({ trainingPlan: previousPlan });

    const nextPlan = applyConfirmedTrainingBlockExerciseRotations({
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
          purpose: "strength",
          supersetGroups: [
            {
              id: "group-1",
              slots: [
                ...createRequiredMainCompoundSlots(),
                {
                  exerciseId: "seated-cable-rows",
                  exerciseName: "Seated Cable Rows",
                  kind: "exercise",
                  movementPattern: "horizontal_pull",
                  role: "secondary_compound",
                  slotLabel: "secondary pull",
                  targetMuscles: ["back"],
                },
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
    const preview = previewTrainingBlockExerciseRotations({ trainingPlan: previousPlan });

    expect(preview.rotated).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          movementPattern: "horizontal_pull",
          nextExerciseId: "bent-over-barbell-rows",
          nextExerciseName: "Bent Over Barbell Rows",
          previousExerciseId: "seated-cable-rows",
          previousExerciseName: "Seated Cable Rows",
          reason: "compatible secondary compound",
        }),
        expect.objectContaining({
          movementPattern: "elbow_flexion",
          nextExerciseId: "standing-dumbbell-curls",
          nextExerciseName: "Standing Dumbbell Curls",
          previousExerciseId: "standing-barbell-curls",
          previousExerciseName: "Standing Barbell Curls",
          reason: "compatible isolation exercise",
        }),
        expect.objectContaining({
          movementPattern: "core",
          nextExerciseId: "cable-crunches",
          nextExerciseName: "Cable Crunches",
          previousExerciseId: "hanging-leg-raises",
          previousExerciseName: "Hanging Leg Raises",
          reason: "compatible abs exercise",
        }),
      ]),
    );

    const nextPlan = applyConfirmedTrainingBlockExerciseRotations({
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
        exerciseId: "bent-over-barbell-rows",
        exerciseName: "Bent Over Barbell Rows",
        movementPattern: "horizontal_pull",
        role: "secondary_compound",
        targetMuscles: ["back"],
      }),
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
        exerciseId: "cable-crunches",
        exerciseName: "Cable Crunches",
        role: "abs",
      }),
    );
  });

  it("lists only compatible non-avoided swap choices for the selected slot", () => {
    const choices = getTrainingBlockExerciseSwapChoices({
      groupId: "group-1",
      slotIndex: 0,
      templateId: "template-1",
      trainingPlan: createTrainingPlan({
        exerciseSelectionPreferences: {
          avoidedExercises: [{ id: "avoid-1", rawText: "Decline Dumbbell Bench Press" }],
          equipmentPreset: "full_gym",
          preferredExercises: [],
          strategy: "balanced",
        },
      }),
    });

    expect(choices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          exerciseId: "flat-barbell-bench-press",
          exerciseName: "Flat Barbell Bench Press",
        }),
        expect.objectContaining({
          exerciseId: "incline-dumbbell-bench-press",
          exerciseName: "Incline Dumbbell Bench Press",
        }),
      ]),
    );
    expect(choices).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          exerciseId: "decline-dumbbell-bench-press",
        }),
        expect.objectContaining({
          exerciseId: "standing-dumbbell-curls",
        }),
      ]),
    );
  });

  it("excludes duplicate swap choices from another group at the same slot index", () => {
    const choices = getTrainingBlockExerciseSwapChoices({
      groupId: "group-1",
      slotIndex: 0,
      templateId: "template-1",
      trainingPlan: createTrainingPlan({
        workoutTemplates: [
          {
            id: "template-1",
            label: "Upper A",
            purpose: "strength",
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
                title: "Upper superset 1",
                type: "superset",
              },
              {
                id: "group-2",
                slots: [
                  {
                    exerciseId: "incline-dumbbell-bench-press",
                    exerciseName: "Incline Dumbbell Bench Press",
                    kind: "exercise",
                    movementPattern: "horizontal_push",
                    role: "main_compound",
                    slotLabel: "horizontal_push",
                    targetMuscles: ["chest"],
                  },
                ],
                title: "Upper superset 2",
                type: "superset",
              },
            ],
          },
        ],
      }),
    });

    expect(choices).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          exerciseId: "incline-dumbbell-bench-press",
        }),
      ]),
    );
  });

  it("excludes an avoided current-slot exercise from swap choices", () => {
    const choices = getTrainingBlockExerciseSwapChoices({
      groupId: "group-1",
      slotIndex: 0,
      templateId: "template-1",
      trainingPlan: createTrainingPlan({
        exerciseSelectionPreferences: {
          avoidedExercises: [{ id: "avoid-1", rawText: "Flat Barbell Bench Press" }],
          equipmentPreset: "full_gym",
          preferredExercises: [],
          strategy: "balanced",
        },
      }),
    });

    expect(choices).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          exerciseId: "flat-barbell-bench-press",
        }),
      ]),
    );
  });

  it("applies a current-block swap only to the selected generated slot", () => {
    const swappedPlan = applyTrainingBlockExerciseSwapToTrainingPlan({
      groupId: "group-1",
      nextExerciseId: "incline-dumbbell-bench-press",
      slotIndex: 0,
      templateId: "template-1",
      timestamp: "2026-07-19T09:00:00.000Z",
      trainingPlan: createTrainingPlan(),
    });

    expect(swappedPlan.updatedAt).toBe("2026-07-19T09:00:00.000Z");
    expect(swappedPlan.workoutTemplates[0]?.supersetGroups[0]?.slots[0]).toMatchObject({
      exerciseId: "incline-dumbbell-bench-press",
      exerciseName: "Incline Dumbbell Bench Press",
    });
    expect(swappedPlan.workoutTemplates[0]?.supersetGroups[0]?.slots[1]).toMatchObject({
      exerciseId: "bent-over-barbell-rows",
      exerciseName: "Bent Over Barbell Rows",
    });
  });

  it("keeps one slot when rotating both would duplicate an exercise inside the same Workout Template", () => {
    const previousPlan = createTrainingPlan({
      exerciseSelectionPreferences: {
        avoidedExercises: [
          { id: "avoid-1", rawText: "Cable Crunches" },
          { id: "avoid-2", rawText: "Hanging Leg Raises" },
          { id: "avoid-3", rawText: "Ab Wheel Rollouts" },
          { id: "avoid-4", rawText: "Dead Bugs" },
          { id: "avoid-5", rawText: "Reverse Crunches" },
          { id: "avoid-6", rawText: "Side Planks" },
          { id: "avoid-7", rawText: "Hollow Holds" },
        ],
        equipmentPreset: "full_gym",
        preferredExercises: [],
        strategy: "balanced",
      },
      isolationExercisePreferences: [
        {
          exerciseIds: ["planks"],
          primaryMuscleGroup: "abs",
        },
      ],
      workoutTemplates: [
        {
          id: "template-1",
          label: "Upper A",
          purpose: "strength",
          supersetGroups: [
            {
              id: "group-1",
              slots: [
                ...createRequiredMainCompoundSlots(),
                {
                  exerciseId: "cable-crunches",
                  exerciseName: "Cable Crunches",
                  kind: "exercise",
                  movementPattern: "core",
                  role: "abs",
                  slotLabel: "Abs",
                  targetMuscles: ["abs"],
                },
                {
                  exerciseId: "hanging-leg-raises",
                  exerciseName: "Hanging Leg Raises",
                  kind: "exercise",
                  movementPattern: "core",
                  role: "abs",
                  slotLabel: "Abs",
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
    const preview = previewTrainingBlockExerciseRotations({ trainingPlan: previousPlan });

    expect(preview.rotated).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          movementPattern: "core",
          nextExerciseId: "planks",
          nextExerciseName: "Planks",
          reason: "preferred abs exercise",
        }),
      ]),
    );
    expect(preview.kept).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          movementPattern: "core",
          reason: "kept to avoid a duplicate in this Workout Template",
        }),
      ]),
    );

    const nextPlan = applyConfirmedTrainingBlockExerciseRotations({
      id: "training-plan-2",
      preview,
      timestamp: "2026-07-19T09:00:00.000Z",
      trainingPlan: previousPlan,
    });
    const absExerciseIds = nextPlan.workoutTemplates
      .flatMap((template) => template.supersetGroups)
      .flatMap((group) => group.slots)
      .filter((slot) => slot.role === "abs")
      .map((slot) => slot.exerciseId);

    expect(new Set(absExerciseIds).size).toBe(absExerciseIds.length);
  });

  it("rejects confirmed rotations when required Movement Pattern coverage is not preserved", () => {
    const previousPlan = createTrainingPlan({
      workoutTemplates: [
        {
          id: "template-1",
          label: "Upper A",
          purpose: "strength",
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
    const preview = previewTrainingBlockExerciseRotations({ trainingPlan: previousPlan });

    expect(() =>
      applyConfirmedTrainingBlockExerciseRotations({
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
        kind: "first_time",
        previousLoad: null,
        reason: "first-time exercise, start empty",
        suggestedLoad: null,
      }),
    );
    expect(preview.weeklyIntensityTargets).toHaveLength(6);
  });

  it("applies a proposal-row swap to the selected slot and recalculates exact-exercise prefills", () => {
    const trainingPlan = createTrainingPlan();
    const preview = generateNextTrainingBlockPreview({
      availableLoadIncrement: 2.5,
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
      nextBlockId: "training-block-2",
      nextPlanId: "training-plan-2",
      sessions: [
        ...createCompletedTrainingBlockSessions(),
        createTrainingSession({
          completedAt: "2026-07-11T10:00:00.000Z",
          exerciseId: "decline-barbell-bench-press",
          exerciseName: "Decline Barbell Bench Press",
          weight: 102.5,
        }),
      ],
      startDate: "2026-07-19",
      timestamp: "2026-07-19T09:00:00.000Z",
      trainingPlan,
    });

    const swappedPreview = applyTrainingBlockExerciseSwapToPreview({
      nextExerciseId: "decline-barbell-bench-press",
      preview,
      sessions: [
        ...createCompletedTrainingBlockSessions(),
        createTrainingSession({
          completedAt: "2026-07-11T10:00:00.000Z",
          exerciseId: "decline-barbell-bench-press",
          exerciseName: "Decline Barbell Bench Press",
          weight: 102.5,
        }),
      ],
      slotIndex: 0,
      templateId: "template-1",
      groupId: "group-1",
    });

    expect(
      swappedPreview.rotation.rotated.filter(
        (rotation) =>
          rotation.movementPattern === "horizontal_push" &&
          rotation.nextExerciseId === "decline-barbell-bench-press",
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          groupId: "group-1",
          nextExerciseId: "decline-barbell-bench-press",
          previousExerciseId: "flat-barbell-bench-press",
          templateId: "template-1",
        }),
      ]),
    );
    expect(swappedPreview.loadSuggestions).toContainEqual(
      expect.objectContaining({
        exerciseId: "decline-barbell-bench-press",
        kind: "exact_previous_exercise",
        previousLoad: 102.5,
        suggestedLoad: 102.5,
      }),
    );
  });

  it("prefills the latest exact same-exercise working load without a reset", () => {
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
        kind: "exact_previous_exercise",
        movementPattern: "horizontal_push",
        previousLoad: 100,
        reason: "previous exact exercise load prefill",
        suggestedLoad: 100,
        userEditedLoad: null,
      },
    ]);
  });

  it("leaves a rotated exercise empty when no exact history exists for that exercise", () => {
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
        kind: "first_time",
        movementPattern: "horizontal_push",
        previousLoad: null,
        reason: "first-time exercise, start empty",
        suggestedLoad: null,
        userEditedLoad: null,
      },
    ]);
  });

  it("uses exact history for a rotated exercise when that exact exercise was completed before", () => {
    const suggestions = estimateNextTrainingBlockLoadSuggestions({
      availableLoadIncrement: 2.5,
      sessions: [
        createTrainingSession({
          completedAt: "2026-07-10T10:00:00.000Z",
          exerciseId: "incline-dumbbell-bench-press",
          exerciseName: "Incline Dumbbell Bench Press",
          weight: 87.5,
        }),
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
        kind: "exact_previous_exercise",
        movementPattern: "horizontal_push",
        previousLoad: 87.5,
        reason: "previous exact exercise load prefill",
        suggestedLoad: 87.5,
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
        kind: "exact_previous_exercise",
        movementPattern: "vertical_pull",
        previousLoad: 0,
        reason: "previous exact exercise load prefill",
        suggestedLoad: 0,
        userEditedLoad: null,
      },
      {
        exerciseId: "chin-ups",
        exerciseName: "Chin-Ups",
        kind: "exact_previous_exercise",
        movementPattern: "vertical_pull",
        previousLoad: 10,
        reason: "previous exact exercise load prefill",
        suggestedLoad: 10,
        userEditedLoad: null,
      },
      {
        exerciseId: "assisted-pull-ups",
        exerciseName: "Assisted Pull-Ups",
        kind: "exact_previous_exercise",
        movementPattern: "vertical_pull",
        previousLoad: -12.5,
        reason: "previous exact exercise load prefill",
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
        suggestedLoad: 100,
        userEditedLoad: 97.5,
      },
    ]);
  });

  it("leaves first-time exercises empty when workout history is missing", () => {
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
        kind: "first_time",
        movementPattern: "horizontal_push",
        previousLoad: null,
        reason: "first-time exercise, start empty",
        suggestedLoad: null,
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

  it("keeps load when completed sets are in range but not all meet top range and target RIR", () => {
    const decision = applyTrainingBlockProgressionRule({
      completedSets: [
        { reps: 12, rir: 2 },
        { reps: 10, rir: 2 },
        { reps: 12, rir: 1 },
      ],
      repRange: { maxReps: 12, minReps: 8 },
      targetRir: 2,
    });

    expect(decision).toEqual({
      reason: "progression target not met",
      type: "keep_load",
    });
  });

  it("keeps load when fewer than the planned sets were completed", () => {
    const decision = applyTrainingBlockProgressionRule({
      completedSets: [
        { reps: 12, rir: 2 },
        { reps: 12, rir: 2 },
      ],
      plannedSetCount: 3,
      repRange: { maxReps: 12, minReps: 8 },
      targetRir: 2,
    });

    expect(decision).toEqual({
      reason: "progression target not met",
      type: "keep_load",
    });
  });
});

function createTrainingSession({
  completedAt,
  exerciseId,
  exerciseName = "Flat Barbell Bench Press",
  movementPattern = "horizontal_push",
  sessionIntent = "planned",
  trainingBlockCycleNumber = null,
  trainingBlockId = null,
  trainingBlockWeekNumber = null,
  weight,
}: {
  completedAt: string;
  exerciseId: string;
  exerciseName?: string;
  movementPattern?: TrainingSession["exercises"][number]["movementPattern"];
  sessionIntent?: "extra" | "planned";
  trainingBlockCycleNumber?: number | null;
  trainingBlockId?: string | null;
  trainingBlockWeekNumber?: number | null;
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
    sessionIntent,
    status: "completed",
    templateId: "template-1",
    templateLabel: "Upper A",
    trainingBlockCycleNumber,
    trainingBlockId,
    trainingBlockWeekNumber,
    updatedAt: completedAt,
    volumeByMovementPattern: [],
  };
}

function createCompletedTrainingBlockSessions(): ReadonlyArray<TrainingSession> {
  return [
    createTrainingSession({
      completedAt: "2026-06-07T10:00:00.000Z",
      exerciseId: "flat-barbell-bench-press",
      weight: 80,
    }),
    createTrainingSession({
      completedAt: "2026-06-09T10:00:00.000Z",
      exerciseId: "flat-barbell-bench-press",
      weight: 82.5,
    }),
    createTrainingSession({
      completedAt: "2026-06-14T10:00:00.000Z",
      exerciseId: "flat-barbell-bench-press",
      weight: 85,
    }),
    createTrainingSession({
      completedAt: "2026-06-16T10:00:00.000Z",
      exerciseId: "flat-barbell-bench-press",
      weight: 87.5,
    }),
    createTrainingSession({
      completedAt: "2026-06-21T10:00:00.000Z",
      exerciseId: "flat-barbell-bench-press",
      weight: 90,
    }),
    createTrainingSession({
      completedAt: "2026-06-23T10:00:00.000Z",
      exerciseId: "flat-barbell-bench-press",
      weight: 92.5,
    }),
    createTrainingSession({
      completedAt: "2026-06-28T10:00:00.000Z",
      exerciseId: "flat-barbell-bench-press",
      weight: 95,
    }),
    createTrainingSession({
      completedAt: "2026-06-30T10:00:00.000Z",
      exerciseId: "flat-barbell-bench-press",
      weight: 95,
    }),
    createTrainingSession({
      completedAt: "2026-07-05T10:00:00.000Z",
      exerciseId: "flat-barbell-bench-press",
      weight: 97.5,
    }),
    createTrainingSession({
      completedAt: "2026-07-07T10:00:00.000Z",
      exerciseId: "flat-barbell-bench-press",
      weight: 97.5,
    }),
    createTrainingSession({
      completedAt: "2026-07-12T10:00:00.000Z",
      exerciseId: "flat-barbell-bench-press",
      weight: 100,
    }),
    createTrainingSession({
      completedAt: "2026-07-14T10:00:00.000Z",
      exerciseId: "flat-barbell-bench-press",
      weight: 100,
    }),
  ];
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
        purpose: "strength",
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
              targetMuscles: getTargetMuscles(selection.movementPattern),
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

function getTargetMuscles(
  movementPattern: (typeof completeMainCompoundSelections)[number]["movementPattern"],
) {
  switch (movementPattern) {
    case "horizontal_push":
      return ["chest"] as const;
    case "horizontal_pull":
    case "vertical_pull":
      return ["back"] as const;
    case "vertical_push":
      return ["shoulders"] as const;
    case "quad_dominant":
      return ["quadriceps"] as const;
    case "hip_hamstring_dominant":
      return ["hamstrings"] as const;
  }
}
