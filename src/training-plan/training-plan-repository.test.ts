import { beforeEach, describe, expect, it, onTestFinished, vi } from "vitest";
import { resetLocalDatabase } from "../app/local-database";
import type { PlanBlueprint } from "../plan-builder/plan-blueprint";
import { completeMainCompoundSelections } from "../plan-builder/plan-builder-test-fixtures";
import { createPresetWeeklyRepTargets } from "../training-taxonomy";
import { generateTrainingPlanFromBlueprint, type TrainingPlan } from "./training-plan";
import {
  getTrainingPlan,
  getTrainingSessionsForPlan,
  saveAcceptedTrainingPlan,
  saveHistoricalTrainingSessionBodyweight,
  saveTrainingWeekBodyweight,
  seedTrainingPlanData,
  undoAcceptedTrainingBlockTransition,
} from "./training-plan-repository";
import { createCompletedTrainingSession, type TrainingSession } from "./training-session";

describe("trainingPlanRepository", () => {
  beforeEach(async () => {
    await resetLocalDatabase();
  });

  it("keeps previous-block sessions queryable when a next Training Block is accepted on the same Active Training Plan", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-07-20T10:00:00.000Z"));
    onTestFinished(() => {
      vi.useRealTimers();
    });

    const activeTrainingPlan = createTrainingPlan({
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
    });
    const firstWorkoutTemplate = activeTrainingPlan.workoutTemplates[0];

    if (!firstWorkoutTemplate) {
      throw new Error("Expected the generated Training Plan to include a Workout Template.");
    }

    const previousBlockSession = createCompletedTrainingSession({
      entries: [
        {
          exerciseId: "flat-dumbbell-bench-press",
          exerciseName: "Flat Dumbbell Bench Press",
          movementPattern: "horizontal_push",
          sets: [{ reps: 8, setIndex: 1, weight: 40 }],
        },
      ],
      id: "session-1",
      plan: activeTrainingPlan,
      template: firstWorkoutTemplate,
      timestamp: "2026-07-12T10:00:00.000Z",
    });

    await seedTrainingPlanData({
      trainingPlans: [activeTrainingPlan],
      trainingSessions: [previousBlockSession],
    });

    const acceptedTrainingPlan: TrainingPlan = {
      ...activeTrainingPlan,
      startingLoadSuggestions: [
        {
          effectiveLoad: 42.5,
          exerciseId: "flat-dumbbell-bench-press",
          exerciseName: "Flat Dumbbell Bench Press",
          kind: "exact_previous_exercise",
          movementPattern: "horizontal_push",
          previousLoad: 40,
          reason: "previous exact exercise load prefill",
          suggestedLoad: 40,
          userEditedLoad: 42.5,
        },
      ],
      trainingBlock: {
        cycleNumber: 2,
        endDate: "2026-08-29",
        id: "training-block-1-next",
        planId: "training-plan-1",
        previousBlockId: "training-block-1",
        startDate: "2026-07-19",
        status: "active",
        weekNumber: 1,
      },
      updatedAt: "2026-07-19T09:00:00.000Z",
    };

    await saveAcceptedTrainingPlan(acceptedTrainingPlan);

    expect(await getTrainingPlan("training-plan-1")).toMatchObject({
      active: true,
      id: "training-plan-1",
      trainingBlock: {
        cycleNumber: 2,
        id: "training-block-1-next",
        planId: "training-plan-1",
        previousBlockId: "training-block-1",
        weekNumber: 1,
      },
    });
    expect(await getTrainingPlan("training-plan-1-next")).toBeNull();
    expect(await getTrainingSessionsForPlan("training-plan-1")).toEqual([
      expect.objectContaining({
        id: "session-1",
        planId: "training-plan-1",
        trainingBlockCycleNumber: 1,
        trainingBlockId: "training-block-1",
        trainingBlockWeekNumber: 6,
      }),
    ]);
  });

  it("restores the previous Training Block state when undoing an accepted next block before the first new-block session starts", async () => {
    const activeTrainingPlan = createTrainingPlan({
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
    });

    await seedTrainingPlanData({
      trainingPlans: [activeTrainingPlan],
    });

    const activeTrainingBlock = activeTrainingPlan.trainingBlock;

    if (!activeTrainingBlock) {
      throw new Error("Expected the fixture to include an active Training Block.");
    }

    const acceptedTrainingPlan: TrainingPlan = {
      ...activeTrainingPlan,
      startingLoadSuggestions: [
        {
          effectiveLoad: 42.5,
          exerciseId: "incline-dumbbell-bench-press",
          exerciseName: "Incline Dumbbell Bench Press",
          kind: "first_time",
          movementPattern: "horizontal_push",
          previousLoad: null,
          reason: "first-time exercise, start empty",
          suggestedLoad: null,
          userEditedLoad: 42.5,
        },
      ],
      trainingBlock: {
        cycleNumber: 2,
        endDate: "2026-08-29",
        id: "training-block-1-next",
        planId: "training-plan-1",
        previousBlockId: "training-block-1",
        startDate: "2026-07-19",
        status: "active",
        weekNumber: 1,
      },
      undoableTrainingBlockTransition: {
        acceptedAt: "2026-07-19T09:00:00.000Z",
        previousState: {
          generatedAt: activeTrainingPlan.generatedAt,
          startingLoadSuggestions: [],
          trainingBlock: activeTrainingBlock,
          workoutTemplates: activeTrainingPlan.workoutTemplates,
        },
      },
      updatedAt: "2026-07-19T09:00:00.000Z",
      workoutTemplates: activeTrainingPlan.workoutTemplates.map((template) => ({
        ...template,
        supersetGroups: template.supersetGroups.map((group) => ({
          ...group,
          slots: group.slots.map((slot) =>
            slot.exerciseId === "flat-dumbbell-bench-press"
              ? {
                  ...slot,
                  exerciseId: "incline-dumbbell-bench-press",
                  exerciseName: "Incline Dumbbell Bench Press",
                }
              : slot,
          ),
        })),
      })),
    };

    await saveAcceptedTrainingPlan(acceptedTrainingPlan);
    await undoAcceptedTrainingBlockTransition({
      planId: "training-plan-1",
      timestamp: "2026-07-19T09:30:00.000Z",
    });

    expect(await getTrainingPlan("training-plan-1")).toEqual(
      expect.objectContaining({
        id: "training-plan-1",
        startingLoadSuggestions: undefined,
        trainingBlock: expect.objectContaining({
          cycleNumber: 1,
          id: "training-block-1",
          previousBlockId: null,
          weekNumber: 6,
        }),
        undoableTrainingBlockTransition: null,
        workoutTemplates: expect.arrayContaining([
          expect.objectContaining({
            supersetGroups: expect.arrayContaining([
              expect.objectContaining({
                slots: expect.arrayContaining([
                  expect.objectContaining({
                    exerciseId: "flat-dumbbell-bench-press",
                    exerciseName: "Flat Dumbbell Bench Press",
                  }),
                ]),
              }),
            ]),
          }),
        ]),
      }),
    );
  });

  it("hydrates legacy completed sessions without inferring Training Block metadata", async () => {
    const trainingPlan = createTrainingPlan();

    await seedTrainingPlanData({
      trainingPlans: [trainingPlan],
      trainingSessions: [
        {
          completedAt: "2026-07-12T10:00:00.000Z",
          createdAt: "2026-07-12T10:00:00.000Z",
          exercises: [
            {
              exerciseId: "flat-dumbbell-bench-press",
              exerciseName: "Flat Dumbbell Bench Press",
              movementPattern: "horizontal_push",
              sets: [{ reps: 8, setIndex: 1, weight: 40 }],
            },
          ],
          id: "legacy-session-1",
          planId: "training-plan-1",
          status: "completed",
          templateId: "template-1",
          templateLabel: "Full Body A",
          updatedAt: "2026-07-12T10:00:00.000Z",
          volumeByMovementPattern: [],
        } as TrainingSession,
      ],
    });

    expect(await getTrainingSessionsForPlan("training-plan-1")).toEqual([
      expect.objectContaining({
        id: "legacy-session-1",
        sessionBodyweight: null,
        sessionBodyweightSource: null,
        trainingBlockCycleNumber: null,
        trainingBlockId: null,
        trainingBlockWeekNumber: null,
      }),
    ]);
  });

  it("defaults legacy persisted Workout Templates to strength purpose", async () => {
    const trainingPlan = createTrainingPlan({
      workoutTemplates: createTrainingPlan().workoutTemplates.map((template) => {
        const legacyTemplate: Partial<(typeof trainingPlan)["workoutTemplates"][number]> = {
          ...template,
        };

        delete legacyTemplate.purpose;

        return legacyTemplate as (typeof trainingPlan)["workoutTemplates"][number];
      }),
    });

    await seedTrainingPlanData({
      trainingPlans: [trainingPlan],
    });

    expect(await getTrainingPlan(trainingPlan.id)).toMatchObject({
      workoutTemplates: expect.arrayContaining([
        expect.objectContaining({
          purpose: "strength",
        }),
      ]),
    });
  });

  it("persists a Weekly Bodyweight Update and the inherited sessions it rewrites", async () => {
    const trainingPlan = createTrainingPlan({
      baselineBodyweight: 80,
    });
    const firstWorkoutTemplate = trainingPlan.workoutTemplates[0];

    if (!firstWorkoutTemplate) {
      throw new Error("Expected the generated Training Plan to include a Workout Template.");
    }

    const inheritedSession = createCompletedTrainingSession({
      entries: [
        {
          exerciseId: "pull-ups",
          exerciseName: "Pull-Ups",
          movementPattern: "vertical_pull",
          sets: [{ reps: 8, setIndex: 1, weight: 0 }],
        },
      ],
      id: "session-inherited",
      plan: trainingPlan,
      sessionBodyweight: {
        bodyweight: 80,
        source: "baseline",
      },
      template: firstWorkoutTemplate,
      timestamp: "2026-06-08T10:00:00.000Z",
    });
    await seedTrainingPlanData({
      trainingPlans: [trainingPlan],
      trainingSessions: [inheritedSession],
    });

    await saveTrainingWeekBodyweight({
      bodyweight: 82,
      planId: trainingPlan.id,
      referenceDate: "2026-06-09T12:00:00.000Z",
      timestamp: "2026-06-09T12:00:00.000Z",
    });

    expect(await getTrainingPlan(trainingPlan.id)).toEqual(
      expect.objectContaining({
        baselineBodyweight: 80,
        weeklyBodyweightUpdates: [
          expect.objectContaining({
            bodyweight: 82,
            weekEnd: "2026-06-13",
            weekStart: "2026-06-07",
          }),
        ],
      }),
    );
    expect(await getTrainingSessionsForPlan(trainingPlan.id)).toEqual([
      expect.objectContaining({
        id: "session-inherited",
        sessionBodyweight: 82,
        sessionBodyweightSource: "inherited_weekly",
        volumeByMovementPattern: [
          {
            movementPattern: "vertical_pull",
            volume: 656,
          },
        ],
      }),
    ]);
  });

  it("stores a Historical Bodyweight Correction on one completed session without changing others", async () => {
    const trainingPlan = createTrainingPlan();
    const firstWorkoutTemplate = trainingPlan.workoutTemplates[0];

    if (!firstWorkoutTemplate) {
      throw new Error("Expected the generated Training Plan to include a Workout Template.");
    }

    const missingSession = createCompletedTrainingSession({
      entries: [
        {
          exerciseId: "pull-ups",
          exerciseName: "Pull-Ups",
          movementPattern: "vertical_pull",
          sets: [{ reps: 10, setIndex: 1, weight: 0 }],
        },
      ],
      id: "session-missing-bodyweight",
      plan: trainingPlan,
      template: firstWorkoutTemplate,
      timestamp: "2026-06-10T10:00:00.000Z",
    });
    const unchangedSession = createCompletedTrainingSession({
      entries: [
        {
          exerciseId: "pull-ups",
          exerciseName: "Pull-Ups",
          movementPattern: "vertical_pull",
          sets: [{ reps: 8, setIndex: 1, weight: 5 }],
        },
      ],
      id: "session-unchanged",
      plan: trainingPlan,
      sessionBodyweight: {
        bodyweight: 78,
        source: "session_override",
      },
      template: firstWorkoutTemplate,
      timestamp: "2026-06-11T10:00:00.000Z",
    });

    await seedTrainingPlanData({
      trainingPlans: [trainingPlan],
      trainingSessions: [missingSession, unchangedSession],
    });

    await saveHistoricalTrainingSessionBodyweight({
      bodyweight: 81,
      sessionId: "session-missing-bodyweight",
      timestamp: "2026-06-12T10:00:00.000Z",
    });

    expect(await getTrainingSessionsForPlan(trainingPlan.id)).toEqual([
      expect.objectContaining({
        id: "session-missing-bodyweight",
        sessionBodyweight: 81,
        sessionBodyweightSource: "historical_correction",
        volumeByMovementPattern: [
          {
            movementPattern: "vertical_pull",
            volume: 810,
          },
        ],
      }),
      expect.objectContaining({
        id: "session-unchanged",
        sessionBodyweight: 78,
        sessionBodyweightSource: "session_override",
        volumeByMovementPattern: [
          {
            movementPattern: "vertical_pull",
            volume: 664,
          },
        ],
      }),
    ]);
  });
});

function createTrainingPlan(overrides: Partial<TrainingPlan> = {}): TrainingPlan {
  return {
    ...generateTrainingPlanFromBlueprint({
      blueprint: createCompleteBlueprint(),
      id: "training-plan-1",
      timestamp: "2026-06-07T10:00:00.000Z",
    }),
    ...overrides,
  };
}

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
    id: "plan-blueprint-1",
    isolationExercisePreferences: [],
    mainCompoundPreferences: [],
    mainCompoundRotationPreferences: [],
    mainCompoundRotationPools: [],
    mainCompoundSelections: completeMainCompoundSelections,
    repRanges: "balanced_hypertrophy",
    split: "alternating-full-body-a-b",
    trainingFrequencyDaysPerWeek: 3,
    trainingGoal: "build-muscle",
    trainingPlanDraft: null,
    updatedAt: "2026-06-07T09:00:00.000Z",
    volumePreset: "balanced",
    volumePresetSource: "user_selected",
    weeklyRepTargets: createPresetWeeklyRepTargets("balanced"),
  };
}
