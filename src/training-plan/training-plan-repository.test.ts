import { beforeEach, describe, expect, it } from "vitest";
import { resetLocalDatabase } from "../app/local-database";
import type { PlanBlueprint } from "../plan-builder/plan-blueprint";
import { completeMainCompoundSelections } from "../plan-builder/plan-builder-test-fixtures";
import { createPresetWeeklyRepTargets } from "../training-taxonomy";
import { generateTrainingPlanFromBlueprint, type TrainingPlan } from "./training-plan";
import {
  getTrainingPlan,
  getTrainingSessionsForPlan,
  saveAcceptedTrainingPlan,
  seedTrainingPlanData,
} from "./training-plan-repository";
import { createCompletedTrainingSession, type TrainingSession } from "./training-session";

describe("trainingPlanRepository", () => {
  beforeEach(async () => {
    await resetLocalDatabase();
  });

  it("keeps previous-block sessions queryable when a next Training Block is accepted on the same Active Training Plan", async () => {
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
          movementPattern: "horizontal_push",
          previousLoad: 40,
          reason: "same exercise, -5% reset",
          suggestedLoad: 37.5,
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
        trainingBlockCycleNumber: null,
        trainingBlockId: null,
        trainingBlockWeekNumber: null,
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
    updatedAt: "2026-06-07T09:00:00.000Z",
    volumePreset: "balanced",
    volumePresetSource: "user_selected",
    weeklyRepTargets: createPresetWeeklyRepTargets("balanced"),
  };
}
