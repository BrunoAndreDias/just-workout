import { describe, expect, it } from "vitest";
import type { PlanBlueprint } from "../../plan-builder/plan-blueprint";
import { completeMainCompoundSelections } from "../../plan-builder/plan-builder-test-fixtures";
import { createPresetWeeklyRepTargets } from "../../training-taxonomy";
import {
  generateTrainingPlanFromBlueprint,
  type TrainingPlan,
  type TrainingPlanSlot,
  type WorkoutTemplate,
} from "../training-plan";
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

  it("builds Volume Target Notices from top-end prescribed reps for primary target muscles only", () => {
    const trainingPlan = createTrainingPlan({
      weeklyRepTargets: [
        { isEnabled: true, muscleGroup: "chest", source: "custom", target: 30 },
        { isEnabled: true, muscleGroup: "shoulders", source: "custom", target: 45 },
        { isEnabled: true, muscleGroup: "hamstrings", source: "custom", target: 30 },
        { isEnabled: true, muscleGroup: "calves", source: "custom", target: 120 },
      ],
      workoutTemplates: [
        createWorkoutTemplate([
          {
            exerciseId: "flat-barbell-bench-press",
            exerciseName: "Flat Barbell Bench Press",
            kind: "exercise",
            movementPattern: "horizontal_push",
            role: "main_compound",
            slotLabel: "Push",
            targetMuscles: ["chest"],
            trainingPrescription: {
              repRange: { max: 8, min: 6 },
              setCount: 3,
            },
          },
          {
            exerciseId: "barbell-romanian-deadlifts",
            exerciseName: "Barbell Romanian Deadlifts",
            kind: "exercise",
            movementPattern: "hip_hamstring_dominant",
            role: "main_compound",
            slotLabel: "Hinge",
            targetMuscles: ["hamstrings", "glutes"],
            trainingPrescription: {
              repRange: { max: 8, min: 6 },
              setCount: 3,
            },
          },
          {
            exerciseId: "standing-calf-raises",
            exerciseName: "Standing Calf Raises",
            kind: "exercise",
            movementPattern: "calves_accessories",
            role: "isolation",
            slotLabel: "Calves",
            targetMuscles: ["calves"],
            trainingPrescription: {
              repRange: { max: 15, min: 10 },
              setCount: 3,
            },
          },
        ]),
      ],
    });

    const readModel = getActiveTrainingPlanPageReadModel({ trainingPlan });

    expect(readModel.overview.volumeTargetNotices).toEqual([
      {
        muscleGroup: "Chest",
        prescribedTopEndReps: 24,
        shortfallReps: 6,
        targetReps: 30,
      },
      {
        muscleGroup: "Shoulders",
        prescribedTopEndReps: 0,
        shortfallReps: 45,
        targetReps: 45,
      },
      {
        muscleGroup: "Hamstrings",
        prescribedTopEndReps: 24,
        shortfallReps: 6,
        targetReps: 30,
      },
      {
        muscleGroup: "Calves",
        prescribedTopEndReps: 45,
        shortfallReps: 75,
        targetReps: 120,
      },
    ]);
  });

  it("ignores disabled Optional Volume Targets when building Volume Target Notices", () => {
    const trainingPlan = createTrainingPlan({
      weeklyRepTargets: [
        { isEnabled: false, muscleGroup: "calves", source: "custom", target: 120 },
      ],
      workoutTemplates: [
        createWorkoutTemplate([
          {
            exerciseId: "standing-calf-raises",
            exerciseName: "Standing Calf Raises",
            kind: "exercise",
            movementPattern: "calves_accessories",
            role: "isolation",
            slotLabel: "Calves",
            targetMuscles: ["calves"],
            trainingPrescription: {
              repRange: { max: 15, min: 10 },
              setCount: 3,
            },
          },
        ]),
      ],
    });

    const readModel = getActiveTrainingPlanPageReadModel({ trainingPlan });

    expect(readModel.overview.volumeTargetNotices).toEqual([]);
  });

  it("counts full top-end prescribed reps for each matching primary target muscle", () => {
    const trainingPlan = createTrainingPlan({
      weeklyRepTargets: [
        { isEnabled: true, muscleGroup: "biceps", source: "custom", target: 40 },
        { isEnabled: true, muscleGroup: "triceps", source: "custom", target: 40 },
      ],
      workoutTemplates: [
        createWorkoutTemplate([
          {
            exerciseId: "arm-superset-test-slot",
            exerciseName: "Arm Superset Test Slot",
            kind: "exercise",
            movementPattern: "elbow_flexion",
            role: "isolation",
            slotLabel: "Arms",
            targetMuscles: ["biceps", "triceps"],
            trainingPrescription: {
              repRange: { max: 10, min: 8 },
              setCount: 3,
            },
          },
        ]),
      ],
    });

    const readModel = getActiveTrainingPlanPageReadModel({ trainingPlan });

    expect(readModel.overview.volumeTargetNotices).toEqual([
      {
        muscleGroup: "Biceps",
        prescribedTopEndReps: 30,
        shortfallReps: 10,
        targetReps: 40,
      },
      {
        muscleGroup: "Triceps",
        prescribedTopEndReps: 30,
        shortfallReps: 10,
        targetReps: 40,
      },
    ]);
  });

  it("uses legacy default prescriptions when stored Training Plan slots have no generated prescription", () => {
    const trainingPlan = createTrainingPlan({
      weeklyRepTargets: [{ isEnabled: true, muscleGroup: "biceps", source: "custom", target: 40 }],
      workoutTemplates: [
        createWorkoutTemplate([
          {
            exerciseId: "standing-barbell-curls",
            exerciseName: "Standing Barbell Curls",
            kind: "exercise",
            movementPattern: "elbow_flexion",
            role: "isolation",
            slotLabel: "Curl",
            targetMuscles: ["biceps"],
          },
        ]),
      ],
    });

    const readModel = getActiveTrainingPlanPageReadModel({ trainingPlan });

    expect(readModel.overview.volumeTargetNotices).toEqual([
      {
        muscleGroup: "Biceps",
        prescribedTopEndReps: 36,
        shortfallReps: 4,
        targetReps: 40,
      },
    ]);
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
    Partial<Pick<PlanBlueprint, "weeklyRepTargets">> &
    Partial<Pick<TrainingPlan, "mainCompoundRotationPools" | "workoutTemplates">> = {},
): TrainingPlan {
  const { mainCompoundRotationPools, workoutTemplates, ...blueprintOverrides } = overrides;
  const trainingPlan = generateTrainingPlanFromBlueprint({
    blueprint: createCompleteBlueprint(blueprintOverrides),
    id: "training-plan-test",
    timestamp: "2026-06-07T10:00:00.000Z",
  });

  return {
    ...trainingPlan,
    ...(mainCompoundRotationPools ? { mainCompoundRotationPools } : {}),
    ...(workoutTemplates ? { workoutTemplates } : {}),
  };
}

function createWorkoutTemplate(slots: TrainingPlanSlot[]): WorkoutTemplate {
  return {
    id: "template-1",
    label: "Full Body A",
    supersetGroups: [
      {
        id: "group-1",
        slots,
        title: "Superset 1",
        type: "superset",
      },
    ],
  };
}

function createCompleteBlueprint({
  split = "alternating-full-body-a-b",
  trainingFrequencyDaysPerWeek = 3,
  weeklyRepTargets = createPresetWeeklyRepTargets("balanced"),
}: Partial<
  Pick<PlanBlueprint, "split" | "trainingFrequencyDaysPerWeek" | "weeklyRepTargets">
> = {}): PlanBlueprint {
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
    weeklyRepTargets,
  };
}
