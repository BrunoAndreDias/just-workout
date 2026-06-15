import { db } from "../app/local-database";
import type { PlanBlueprint } from "../plan-builder";
import { completeMainCompoundSelections } from "../plan-builder/plan-builder-test-fixtures";
import { createPresetWeeklyRepTargets } from "../plan-builder/training-volume";
import {
  generateTrainingPlanFromBlueprint,
  type TrainingPlan,
  type WorkoutTemplate,
} from "../training-plan/training-plan";
import { createCompletedTrainingSession } from "../training-plan/training-session";

export type TrainingCycleDevSeedResult = {
  acceptedNextCyclePlanId: string;
  bodyweightWeekSixPlanId: string;
  readyWeekSixPlanId: string;
};

export async function seedTrainingCycleDevPlans(): Promise<TrainingCycleDevSeedResult> {
  const readyWeekSixPlan = createReadyWeekSixPlan();
  const bodyweightWeekSixPlan = createBodyweightWeekSixPlan();
  const acceptedNextCyclePlan = createAcceptedNextCyclePlan();

  await db.transaction("rw", db.trainingPlans, db.trainingSessions, async () => {
    const activePlans = await db.trainingPlans.filter((plan) => plan.active).toArray();

    await Promise.all(
      activePlans.map((plan) =>
        db.trainingPlans.put({
          ...plan,
          active: false,
          updatedAt: "2026-07-19T09:00:00.000Z",
        }),
      ),
    );

    await db.trainingPlans.bulkPut([
      readyWeekSixPlan,
      bodyweightWeekSixPlan,
      acceptedNextCyclePlan,
    ]);
    await db.trainingSessions.bulkPut([
      createCompletedTrainingSession({
        entries: [
          {
            exerciseId: "flat-barbell-bench-press",
            exerciseName: "Flat Barbell Bench Press",
            movementPattern: "horizontal_push",
            sets: [{ reps: 10, setIndex: 1, weight: 100 }],
          },
          {
            exerciseId: "barbell-squats",
            exerciseName: "Barbell Squats",
            movementPattern: "quad_dominant",
            sets: [{ reps: 10, setIndex: 1, weight: 120 }],
          },
          {
            exerciseId: "pull-ups",
            exerciseName: "Pull-Ups",
            movementPattern: "vertical_pull",
            sets: [{ reps: 8, setIndex: 1, weight: 10 }],
          },
        ],
        id: "dev-cycle-week-6-session-loaded",
        plan: readyWeekSixPlan,
        template: getFirstWorkoutTemplate(readyWeekSixPlan),
        timestamp: "2026-07-12T10:00:00.000Z",
      }),
      createCompletedTrainingSession({
        entries: [
          {
            exerciseId: "pull-ups",
            exerciseName: "Pull-Ups",
            movementPattern: "vertical_pull",
            sets: [{ reps: 12, setIndex: 1, weight: 0 }],
          },
        ],
        id: "dev-cycle-bodyweight-session",
        plan: bodyweightWeekSixPlan,
        template: getFirstWorkoutTemplate(bodyweightWeekSixPlan),
        timestamp: "2026-07-12T10:00:00.000Z",
      }),
    ]);
  });

  return {
    acceptedNextCyclePlanId: acceptedNextCyclePlan.id,
    bodyweightWeekSixPlanId: bodyweightWeekSixPlan.id,
    readyWeekSixPlanId: readyWeekSixPlan.id,
  };
}

function createReadyWeekSixPlan(): TrainingPlan {
  const plan = generateTrainingPlanFromBlueprint({
    blueprint: createCompleteBlueprint(),
    id: "dev-cycle-week-6",
    timestamp: "2026-06-07T10:00:00.000Z",
  });

  return {
    ...plan,
    active: true,
    mainCompoundRotationPools: [
      {
        exerciseIds: ["incline-dumbbell-bench-press"],
        movementPattern: "horizontal_push",
        updatedAt: "2026-06-07T10:00:00.000Z",
      },
      {
        exerciseIds: ["front-squats"],
        movementPattern: "quad_dominant",
        updatedAt: "2026-06-07T10:00:00.000Z",
      },
    ],
    trainingBlock: {
      cycleNumber: 1,
      endDate: "2026-07-18",
      id: "dev-training-block-1",
      planId: "dev-cycle-week-6",
      previousBlockId: null,
      startDate: "2026-06-07",
      status: "completed",
      weekNumber: 6,
    },
    updatedAt: "2026-07-18T12:00:00.000Z",
  };
}

function createBodyweightWeekSixPlan(): TrainingPlan {
  const plan = generateTrainingPlanFromBlueprint({
    blueprint: createCompleteBlueprint(),
    id: "dev-cycle-bodyweight-week-6",
    timestamp: "2026-06-07T10:00:00.000Z",
  });

  return {
    ...plan,
    active: false,
    trainingBlock: {
      cycleNumber: 1,
      endDate: "2026-07-18",
      id: "dev-bodyweight-training-block-1",
      planId: "dev-cycle-bodyweight-week-6",
      previousBlockId: null,
      startDate: "2026-06-07",
      status: "completed",
      weekNumber: 6,
    },
    updatedAt: "2026-07-18T11:00:00.000Z",
  };
}

function createAcceptedNextCyclePlan(): TrainingPlan {
  const plan = generateTrainingPlanFromBlueprint({
    blueprint: createCompleteBlueprint(),
    id: "dev-cycle-2",
    timestamp: "2026-07-19T09:00:00.000Z",
  });

  return {
    ...plan,
    active: false,
    generatedAt: "2026-07-19T09:00:00.000Z",
    startingLoadSuggestions: [
      {
        effectiveLoad: 92.5,
        exerciseId: "incline-dumbbell-bench-press",
        exerciseName: "Incline Dumbbell Bench Press",
        movementPattern: "horizontal_push",
        previousLoad: 100,
        reason: "same Movement Pattern, -10% reset",
        suggestedLoad: 90,
        userEditedLoad: 92.5,
      },
      {
        effectiveLoad: 0,
        exerciseId: "pull-ups",
        exerciseName: "Pull-Ups",
        movementPattern: "vertical_pull",
        previousLoad: 0,
        reason: "bodyweight only, no added load",
        suggestedLoad: 0,
        userEditedLoad: null,
      },
    ],
    trainingBlock: {
      cycleNumber: 2,
      endDate: "2026-08-29",
      id: "dev-training-block-2",
      planId: "dev-cycle-2",
      previousBlockId: "dev-training-block-1",
      startDate: "2026-07-19",
      status: "active",
      weekNumber: 1,
    },
    updatedAt: "2026-07-19T09:00:00.000Z",
    workoutTemplates: plan.workoutTemplates.map((template) => ({
      ...template,
      supersetGroups: template.supersetGroups.map((group) => ({
        ...group,
        slots: group.slots.map((slot) =>
          slot.exerciseId === "flat-barbell-bench-press"
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
    id: "dev-cycle-blueprint",
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

function getFirstWorkoutTemplate(trainingPlan: TrainingPlan): WorkoutTemplate {
  const [template] = trainingPlan.workoutTemplates;

  if (!template) {
    throw new Error(`Dev seed plan ${trainingPlan.id} has no workout templates.`);
  }

  return template;
}
