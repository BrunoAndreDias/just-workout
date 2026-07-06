import { beforeEach, describe, expect, it } from "vitest";
import { resetLocalDatabase } from "../app/local-database";
import type { PlanBlueprint } from "../plan-builder/plan-blueprint";
import {
  getCurrentPlanBlueprint,
  savePlanBlueprint,
} from "../plan-builder/plan-builder-repository";
import { completeMainCompoundSelections } from "../plan-builder/plan-builder-test-fixtures";
import { createPresetWeeklyRepTargets } from "../training-taxonomy";
import { generateTrainingPlanFromBlueprint, type TrainingPlan } from "./training-plan";
import { getTrainingSessionsForPlan, seedTrainingPlanData } from "./training-plan-repository";
import { trainingPlanService } from "./training-plan-service";
import { createCompletedTrainingSession } from "./training-session";

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

  it("stores Session Bodyweight and Session Bodyweight Source on completed bodyweight sessions", async () => {
    const trainingPlan = createTrainingPlan();
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
          exerciseId: "pull-ups",
          exerciseName: "Pull-Ups",
          movementPattern: "vertical_pull",
          sets: [{ reps: 8, setIndex: 1, weight: 5 }],
        },
      ],
      planId: trainingPlan.id,
      sessionBodyweight: {
        bodyweight: 80,
        source: "session_override",
      },
      templateId: firstTemplate.id,
    });

    expect(await getTrainingSessionsForPlan(trainingPlan.id)).toEqual([
      expect.objectContaining({
        planId: "training-plan-1",
        sessionBodyweight: 80,
        sessionBodyweightSource: "session_override",
      }),
    ]);
  });

  it("rejects completed sessions with malformed Session Bodyweight metadata", async () => {
    const trainingPlan = createTrainingPlan();
    const firstTemplate = trainingPlan.workoutTemplates[0];

    if (!firstTemplate) {
      throw new Error("Expected the generated Training Plan to include a Workout Template.");
    }

    await seedTrainingPlanData({
      trainingPlans: [trainingPlan],
    });

    await expect(
      trainingPlanService.completeTrainingSession({
        entries: [
          {
            exerciseId: "pull-ups",
            exerciseName: "Pull-Ups",
            movementPattern: "vertical_pull",
            sets: [{ reps: 8, setIndex: 1, weight: 0 }],
          },
        ],
        planId: trainingPlan.id,
        sessionBodyweight: 80 as never,
        templateId: firstTemplate.id,
      }),
    ).rejects.toThrow("Session Bodyweight must include a positive bodyweight and source.");

    await expect(
      trainingPlanService.completeTrainingSession({
        entries: [
          {
            exerciseId: "pull-ups",
            exerciseName: "Pull-Ups",
            movementPattern: "vertical_pull",
            sets: [{ reps: 8, setIndex: 1, weight: 0 }],
          },
        ],
        planId: trainingPlan.id,
        sessionBodyweight: { bodyweight: 80 } as never,
        templateId: firstTemplate.id,
      }),
    ).rejects.toThrow("Session Bodyweight must include a positive bodyweight and source.");

    await expect(getTrainingSessionsForPlan(trainingPlan.id)).resolves.toEqual([]);
  });

  it("stores explicit Extra Training Session intent after the current Training Week target is met", async () => {
    const weekStart = createRelativeUtcDay(-3);

    const trainingPlan = createTrainingPlan({
      generatedAt: weekStart.toISOString(),
      trainingBlock: {
        cycleNumber: 1,
        endDate: "2026-07-18",
        id: "training-block-1",
        planId: "training-plan-1",
        previousBlockId: null,
        startDate: weekStart.toISOString().slice(0, 10),
        status: "active",
        weekNumber: 1,
      },
      trainingFrequencyDaysPerWeek: 3,
    });
    const [firstTemplate, secondTemplate] = trainingPlan.workoutTemplates;

    if (!firstTemplate || !secondTemplate) {
      throw new Error("Expected the generated Training Plan to include Workout Templates.");
    }

    await seedTrainingPlanData({
      trainingPlans: [trainingPlan],
      trainingSessions: [
        createCompletedTrainingSession({
          entries: [],
          id: "session-1",
          plan: trainingPlan,
          template: firstTemplate,
          timestamp: createRelativeUtcDay(-3).toISOString(),
        }),
        createCompletedTrainingSession({
          entries: [],
          id: "session-2",
          plan: trainingPlan,
          template: secondTemplate,
          timestamp: createRelativeUtcDay(-2).toISOString(),
        }),
        createCompletedTrainingSession({
          entries: [],
          id: "session-3",
          plan: trainingPlan,
          template: firstTemplate,
          timestamp: createRelativeUtcDay(-1).toISOString(),
        }),
      ],
    });

    await trainingPlanService.completeTrainingSession({
      entries: [],
      planId: trainingPlan.id,
      sessionIntent: "extra",
      templateId: secondTemplate.id,
    });

    expect(await getTrainingSessionsForPlan(trainingPlan.id)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sessionIntent: "extra",
          templateId: secondTemplate.id,
        }),
      ]),
    );
  });

  it("stores a requested repeat as planned until the current Training Week target is met", async () => {
    const weekStart = createRelativeUtcDay(-2);

    const trainingPlan = createTrainingPlan({
      generatedAt: weekStart.toISOString(),
      trainingBlock: {
        cycleNumber: 1,
        endDate: "2026-07-18",
        id: "training-block-1",
        planId: "training-plan-1",
        previousBlockId: null,
        startDate: weekStart.toISOString().slice(0, 10),
        status: "active",
        weekNumber: 1,
      },
      trainingFrequencyDaysPerWeek: 3,
    });
    const firstTemplate = trainingPlan.workoutTemplates[0];

    if (!firstTemplate) {
      throw new Error("Expected the generated Training Plan to include a Workout Template.");
    }

    await seedTrainingPlanData({
      trainingPlans: [trainingPlan],
      trainingSessions: [
        createCompletedTrainingSession({
          entries: [],
          id: "session-1",
          plan: trainingPlan,
          template: firstTemplate,
          timestamp: createRelativeUtcDay(-2).toISOString(),
        }),
      ],
    });

    await trainingPlanService.completeTrainingSession({
      entries: [],
      planId: trainingPlan.id,
      sessionIntent: "extra",
      templateId: firstTemplate.id,
    });

    expect(await getTrainingSessionsForPlan(trainingPlan.id)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sessionIntent: "planned",
          templateId: firstTemplate.id,
        }),
      ]),
    );
  });

  it("accepts the saved Training Plan Draft into a new Active Training Plan and clears it from the Plan Blueprint", async () => {
    const blueprint = createCompleteBlueprint();

    await savePlanBlueprint({
      ...blueprint,
      trainingPlanDraft: {
        content: {
          mainCompoundRotationPools: [],
          repRangeStyle: "balanced_hypertrophy",
          split: "Alternating Full Body A/B",
          trainingBlockWeeks: 6,
          trainingFrequencyDaysPerWeek: 3,
          trainingGoal: "build-muscle",
          weeklyRepTargets: createPresetWeeklyRepTargets("balanced"),
          workoutTemplates: createTrainingPlan().workoutTemplates,
        },
      },
    });
    await seedTrainingPlanData({
      trainingPlans: [
        createTrainingPlan({
          active: true,
          id: "previous-active-plan",
          updatedAt: "2026-06-07T09:30:00.000Z",
        }),
      ],
    });

    const acceptedTrainingPlan = await trainingPlanService.acceptTrainingPlanDraft();

    expect(acceptedTrainingPlan).toMatchObject({
      active: true,
      sourceBlueprintId: blueprint.id,
      split: "Alternating Full Body A/B",
    });
    expect(await getCurrentPlanBlueprint()).toMatchObject({
      id: blueprint.id,
      trainingPlanDraft: null,
    });
  });

  it("does not accept Stale Builder Output before Reset Draft regenerates it", async () => {
    const blueprint = createCompleteBlueprint();

    await savePlanBlueprint({
      ...blueprint,
      trainingPlanDraft: {
        content: {
          mainCompoundRotationPools: [],
          repRangeStyle: "balanced_hypertrophy",
          split: "Alternating Full Body A/B",
          trainingBlockWeeks: 6,
          trainingFrequencyDaysPerWeek: 3,
          trainingGoal: "build-muscle",
          weeklyRepTargets: createPresetWeeklyRepTargets("balanced"),
          workoutTemplates: createTrainingPlan().workoutTemplates,
        },
        isStale: true,
      },
    });

    await expect(trainingPlanService.acceptTrainingPlanDraft()).rejects.toThrow(
      "Cannot accept Stale Builder Output. Reset Draft from current Plan Builder choices first.",
    );
  });

  it("resets Stale Builder Output from the current Plan Blueprint choices", async () => {
    const blueprint = createCompleteBlueprint();

    await savePlanBlueprint({
      ...blueprint,
      split: "upper-lower-4-day",
      trainingFrequencyDaysPerWeek: 4,
      trainingPlanDraft: {
        content: {
          mainCompoundRotationPools: [],
          repRangeStyle: "balanced_hypertrophy",
          split: "Alternating Full Body A/B",
          trainingBlockWeeks: 6,
          trainingFrequencyDaysPerWeek: 3,
          trainingGoal: "build-muscle",
          weeklyRepTargets: createPresetWeeklyRepTargets("balanced"),
          workoutTemplates: createTrainingPlan().workoutTemplates,
        },
        isStale: true,
      },
    });

    const resetDraft = await trainingPlanService.resetTrainingPlanDraft();

    expect(resetDraft).toMatchObject({
      content: {
        split: "4-Day Upper/Lower",
        trainingFrequencyDaysPerWeek: 4,
      },
      isStale: false,
    });
    expect(await getCurrentPlanBlueprint()).toMatchObject({
      id: blueprint.id,
      trainingPlanDraft: {
        content: {
          split: "4-Day Upper/Lower",
          trainingFrequencyDaysPerWeek: 4,
        },
        isStale: false,
      },
    });
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

function createRelativeUtcDay(dayOffset: number): Date {
  const now = new Date();

  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + dayOffset, 9, 0, 0),
  );
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
