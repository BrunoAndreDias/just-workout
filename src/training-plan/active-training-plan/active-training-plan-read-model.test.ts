import { describe, expect, it } from "vitest";
import type { PlanBlueprint } from "../../plan-builder/plan-blueprint";
import { completeMainCompoundSelections } from "../../plan-builder/plan-builder-test-fixtures";
import { createPresetWeeklyRepTargets } from "../../training-taxonomy";
import { generateTrainingPlanFromBlueprint, type TrainingPlan } from "../training-plan";
import {
  type ActiveTrainingPlanTabId,
  getActiveTrainingPlanPageReadModel,
} from "./active-training-plan-read-model";

describe("getActiveTrainingPlanPageReadModel", () => {
  it("selects a workout tab and exposes its route action", () => {
    const trainingPlan = createTrainingPlan();

    const readModel = getActiveTrainingPlanPageReadModel({
      activeTabId: "workout-1",
      trainingPlan,
    });

    expect(readModel.activeTab).toMatchObject({
      id: "workout-1",
      isActive: true,
      label: "Full Body B",
      panel: {
        kind: "workout",
        startAction: {
          label: "Start Full Body B session",
          routeTarget: {
            params: {
              planId: "training-plan-test",
              templateId: "template-2",
            },
            to: "/training-plans/$planId/sessions/new/$templateId",
          },
        },
      },
    });
    expect(readModel.tabs.find((tab) => tab.id === "workout-1")?.isActive).toBe(true);
  });

  it("falls back to Overview when the requested tab no longer exists", () => {
    const trainingPlan = createTrainingPlan();

    const readModel = getActiveTrainingPlanPageReadModel({
      activeTabId: "workout-99" as ActiveTrainingPlanTabId,
      trainingPlan,
    });

    expect(readModel.activeTab).toMatchObject({
      id: "overview",
      isActive: true,
      label: "Overview",
      panel: {
        kind: "overview",
      },
    });
    expect(readModel.tabs.find((tab) => tab.id === "overview")?.isActive).toBe(true);
  });

  it("concentrates header and overview summary values", () => {
    const trainingPlan = createTrainingPlan({
      mainCompoundRotationPools: [
        {
          exerciseIds: ["incline-dumbbell-bench-press"],
          movementPattern: "horizontal_push",
        },
      ],
    });

    const readModel = getActiveTrainingPlanPageReadModel({ trainingPlan });

    expect(readModel.header).toEqual({
      description: "3 days/week with 2 workout templates configured.",
      title: "Alternating Full Body A/B",
    });
    expect(readModel.overview.summary).toEqual({
      blockLength: "6 weeks",
      currentPlan: "Alternating Full Body A/B",
      frequency: "3 days/week",
      nextWorkout: "Full Body A",
      repRangeStyle: "Balanced Hypertrophy",
      rotationPools: "1 configured",
      volumeTargets: "7 enabled",
    });
  });

  it("precomputes compare movement coverage rows", () => {
    const trainingPlan = createTrainingPlan({
      split: "upper-lower-full-body",
      trainingFrequencyDaysPerWeek: 3,
    });

    const readModel = getActiveTrainingPlanPageReadModel({
      activeTabId: "compare",
      trainingPlan,
    });

    expect(readModel.compare.sessionCountLabel).toBe("3 sessions");
    expect(readModel.compare.movementCoverage.columns.map((column) => column.label)).toEqual([
      "Upper",
      "Lower",
      "Full Body A",
    ]);
    expect(
      readModel.compare.movementCoverage.rows.find((row) => row.label === "Horizontal Push"),
    ).toMatchObject({
      cells: [{ covered: true }, { covered: false }, { covered: true }],
      weeklyCoverage: "2 of 3 sessions",
    });
    expect(
      readModel.compare.movementCoverage.rows.find((row) => row.label === "Quad Dominant"),
    ).toMatchObject({
      cells: [{ covered: false }, { covered: true }, { covered: true }],
      weeklyCoverage: "2 of 3 sessions",
    });
  });

  it("exposes fallback next-workout and history route targets", () => {
    const trainingPlan = {
      ...createTrainingPlan(),
      workoutTemplates: [],
    };

    const readModel = getActiveTrainingPlanPageReadModel({ trainingPlan });

    expect(readModel.actions.startNextWorkout).toEqual({
      label: "Start next workout",
      routeTarget: {
        params: {
          planId: "training-plan-test",
          templateId: "template-1",
        },
        to: "/training-plans/$planId/sessions/new/$templateId",
      },
    });
    expect(readModel.actions.trainingHistory).toEqual({
      label: "View training history",
      routeTarget: {
        params: {
          planId: "training-plan-test",
        },
        to: "/training-plans/$planId/sessions",
      },
    });
  });
});

function createTrainingPlan(
  overrides: Partial<Pick<PlanBlueprint, "split" | "trainingFrequencyDaysPerWeek">> &
    Partial<Pick<TrainingPlan, "mainCompoundRotationPools">> = {},
): TrainingPlan {
  const { mainCompoundRotationPools, ...blueprintOverrides } = overrides;
  const trainingPlan = generateTrainingPlanFromBlueprint({
    blueprint: createCompleteBlueprint(blueprintOverrides),
    id: "training-plan-test",
    timestamp: "2026-06-07T10:00:00.000Z",
  });

  return {
    ...trainingPlan,
    ...(mainCompoundRotationPools ? { mainCompoundRotationPools } : {}),
  };
}

function createCompleteBlueprint({
  split = "alternating-full-body-a-b",
  trainingFrequencyDaysPerWeek = 3,
}: Partial<Pick<PlanBlueprint, "split" | "trainingFrequencyDaysPerWeek">> = {}): PlanBlueprint {
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
    id: "plan-blueprint-test",
    isolationExercisePreferences: [],
    mainCompoundPreferences: [],
    mainCompoundRotationPreferences: [],
    mainCompoundRotationPools: [],
    mainCompoundSelections: completeMainCompoundSelections,
    repRanges: "balanced_hypertrophy",
    split,
    trainingFrequencyDaysPerWeek,
    trainingGoal: "build-muscle",
    updatedAt: "2026-06-07T09:00:00.000Z",
    volumePreset: "balanced",
    volumePresetSource: "user_selected",
    weeklyRepTargets: createPresetWeeklyRepTargets("balanced"),
  };
}
