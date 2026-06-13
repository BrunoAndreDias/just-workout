import { describe, expect, it } from "vitest";
import { buildTrainingHistoryWeekReport } from "./training-history-week";
import type { TrainingPlan } from "./training-plan";
import type { TrainingSession } from "./training-session";

describe("buildTrainingHistoryWeekReport", () => {
  it("builds Movement Pattern comparison rows for increase, regression, same, new, and dropped states", () => {
    const trainingPlan = createTrainingPlan();
    const trainingSessions = createTrainingSessions();

    const report = buildTrainingHistoryWeekReport({
      selectedWeekEndKey: null,
      trainingPlan,
      trainingSessions,
    });

    expect(report.movementPatternComparisons).toHaveLength(5);

    const comparisonByPattern = new Map(
      report.movementPatternComparisons.map((row) => [row.movementPattern, row] as const),
    );

    expect(comparisonByPattern.get("horizontal_push")).toEqual(
      expect.objectContaining({
        change: "increase",
        changePercentage: 33,
        currentVolume: 1200,
        deltaVolume: 300,
        movementPattern: "horizontal_push",
        movementPatternLabel: "Horizontal Push",
        previousVolume: 900,
        relativeVolumePercentage: 100,
      }),
    );
    expect(comparisonByPattern.get("horizontal_pull")).toEqual(
      expect.objectContaining({
        change: "decrease",
        changePercentage: -43,
        currentVolume: 400,
        deltaVolume: -300,
        movementPattern: "horizontal_pull",
        movementPatternLabel: "Horizontal Pull",
        previousVolume: 700,
      }),
    );
    expect(comparisonByPattern.get("quad_dominant")).toEqual(
      expect.objectContaining({
        change: "same",
        changePercentage: 0,
        currentVolume: 500,
        deltaVolume: 0,
        movementPattern: "quad_dominant",
        movementPatternLabel: "Quad Dominant",
        previousVolume: 500,
      }),
    );
    expect(comparisonByPattern.get("vertical_push")).toEqual(
      expect.objectContaining({
        change: "new",
        changePercentage: null,
        currentVolume: 350,
        deltaVolume: 350,
        movementPattern: "vertical_push",
        movementPatternLabel: "Vertical Push",
        previousVolume: 0,
      }),
    );
    expect(comparisonByPattern.get("vertical_pull")).toEqual(
      expect.objectContaining({
        change: "dropped",
        changePercentage: -100,
        currentVolume: 0,
        deltaVolume: -650,
        movementPattern: "vertical_pull",
        movementPatternLabel: "Vertical Pull",
        previousVolume: 650,
        relativeVolumePercentage: 0,
      }),
    );
  });

  it("keeps bodyweight-only exercises visible in selected session summaries without counting loaded work", () => {
    const trainingPlan = createTrainingPlan();
    const trainingSessions: ReadonlyArray<TrainingSession> = [
      {
        completedAt: "2026-06-06T09:00:00.000Z",
        createdAt: "2026-06-06T09:00:00.000Z",
        exercises: [
          {
            exerciseId: "pull-ups",
            exerciseName: "Pull-Ups",
            movementPattern: "vertical_pull",
            sets: [{ reps: 12, setIndex: 1, weight: 0 }],
          },
        ],
        id: "bodyweight-session",
        planId: "training-plan-test",
        status: "completed",
        templateId: "template-1",
        templateLabel: "Full Body A",
        updatedAt: "2026-06-06T09:00:00.000Z",
        volumeByMovementPattern: [],
      },
    ];

    const report = buildTrainingHistoryWeekReport({
      selectedWeekEndKey: null,
      trainingPlan,
      trainingSessions,
    });

    expect(report.summary.loadedSetCount).toBe(0);
    expect(report.summary.totalVolume).toBe(0);
    expect(report.selectedSessions).toEqual([
      {
        completedAt: "2026-06-06T09:00:00.000Z",
        completedLoadVolume: 0,
        exercises: [
          {
            completedLoadVolume: 0,
            exerciseId: "pull-ups",
            exerciseName: "Pull-Ups",
            loadedSetCount: 0,
            movementPattern: "vertical_pull",
            movementPatternLabel: "Vertical Pull",
          },
        ],
        id: "bodyweight-session",
        loadedSetCount: 0,
        templateLabel: "Full Body A",
      },
    ]);
  });
});

function createTrainingPlan(): TrainingPlan {
  return {
    active: true,
    generatedAt: "2026-06-01T09:00:00.000Z",
    id: "training-plan-test",
    mainCompoundRotationPools: [],
    repRangeStyle: "balanced_hypertrophy",
    sourceBlueprintId: "plan-blueprint-test",
    split: "Alternating Full Body A/B",
    trainingBlockWeeks: 6,
    trainingFrequencyDaysPerWeek: 3,
    trainingGoal: "build-muscle",
    updatedAt: "2026-06-01T09:00:00.000Z",
    weeklyRepTargets: [],
    workoutTemplates: [],
  };
}

function createTrainingSessions(): ReadonlyArray<TrainingSession> {
  return [
    createTrainingSession({
      completedAt: "2026-06-06T09:00:00.000Z",
      id: "selected-week-1",
      templateLabel: "Full Body A",
      volumeByMovementPattern: [
        {
          movementPattern: "horizontal_push",
          movementPatternLabel: "Horizontal Push",
          volume: 600,
        },
        {
          movementPattern: "horizontal_pull",
          movementPatternLabel: "Horizontal Pull",
          volume: 400,
        },
        { movementPattern: "quad_dominant", movementPatternLabel: "Quad Dominant", volume: 500 },
      ],
    }),
    createTrainingSession({
      completedAt: "2026-06-05T09:00:00.000Z",
      id: "selected-week-2",
      templateLabel: "Full Body B",
      volumeByMovementPattern: [
        {
          movementPattern: "horizontal_push",
          movementPatternLabel: "Horizontal Push",
          volume: 600,
        },
        { movementPattern: "vertical_push", movementPatternLabel: "Vertical Push", volume: 350 },
      ],
    }),
    createTrainingSession({
      completedAt: "2026-05-30T09:00:00.000Z",
      id: "previous-week-1",
      templateLabel: "Upper",
      volumeByMovementPattern: [
        {
          movementPattern: "horizontal_push",
          movementPatternLabel: "Horizontal Push",
          volume: 900,
        },
        {
          movementPattern: "horizontal_pull",
          movementPatternLabel: "Horizontal Pull",
          volume: 700,
        },
      ],
    }),
    createTrainingSession({
      completedAt: "2026-05-29T09:00:00.000Z",
      id: "previous-week-2",
      templateLabel: "Lower",
      volumeByMovementPattern: [
        { movementPattern: "quad_dominant", movementPatternLabel: "Quad Dominant", volume: 500 },
        { movementPattern: "vertical_pull", movementPatternLabel: "Vertical Pull", volume: 650 },
      ],
    }),
  ];
}

function createTrainingSession({
  completedAt,
  id,
  templateLabel,
  volumeByMovementPattern,
}: {
  completedAt: string;
  id: string;
  templateLabel: string;
  volumeByMovementPattern: TrainingSession["volumeByMovementPattern"];
}): TrainingSession {
  return {
    completedAt,
    createdAt: completedAt,
    exercises: volumeByMovementPattern.map((row, index) => ({
      exerciseId: `${id}-exercise-${index + 1}`,
      exerciseName: row.movementPatternLabel,
      movementPattern: row.movementPattern,
      sets: row.volume > 0 ? [{ reps: 1, setIndex: 1, weight: row.volume }] : [],
    })),
    id,
    planId: "training-plan-test",
    status: "completed",
    templateId: `${id}-template`,
    templateLabel,
    updatedAt: completedAt,
    volumeByMovementPattern,
  };
}
