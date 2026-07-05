import { beforeEach, describe, expect, it } from "vitest";
import { resetLocalDatabase } from "../app/local-database";
import type { PlanBlueprint } from "../plan-builder/plan-blueprint";
import { completeMainCompoundSelections } from "../plan-builder/plan-builder-test-fixtures";
import { createPresetWeeklyRepTargets } from "../training-taxonomy";
import { generateTrainingPlanFromBlueprint, type TrainingPlan } from "./training-plan";
import { getTrainingSessionsForPlan, seedTrainingPlanData } from "./training-plan-repository";
import { trainingPlanService } from "./training-plan-service";

describe("trainingPlanService", () => {
  beforeEach(async () => {
    await resetLocalDatabase();
  });

  it("stores current Training Block metadata on newly completed Training Sessions", async () => {
    const trainingPlan = createTrainingPlan({
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
    });
    const firstTemplate = trainingPlan.workoutTemplates[0];

    if (!firstTemplate) {
      throw new Error("Expected the generated Training Plan to include a Workout Template.");
    }

    await seedTrainingPlanData({
      trainingPlans: [trainingPlan],
    });

    await trainingPlanService.completeTrainingSession({
      entries: [
        {
          exerciseId: "flat-dumbbell-bench-press",
          exerciseName: "Flat Dumbbell Bench Press",
          movementPattern: "horizontal_push",
          sets: [{ reps: 8, setIndex: 1, weight: 42.5 }],
        },
      ],
      planId: trainingPlan.id,
      templateId: firstTemplate.id,
    });

    expect(await getTrainingSessionsForPlan(trainingPlan.id)).toEqual([
      expect.objectContaining({
        planId: "training-plan-1",
        trainingBlockCycleNumber: 2,
        trainingBlockId: "training-block-2",
        trainingBlockWeekNumber: 1,
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
