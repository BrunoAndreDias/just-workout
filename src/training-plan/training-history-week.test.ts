import { describe, expect, it } from "vitest";
import { buildTrainingHistoryWeekReport } from "./training-history-week";
import type { TrainingPlan } from "./training-plan";
import type { TrainingSession } from "./training-session";

describe("buildTrainingHistoryWeekReport", () => {
  it("builds a weekly verdict, previous-week volume reference, and same-template session progression", () => {
    const trainingPlan = createTrainingPlan();
    const trainingSessions: ReadonlyArray<TrainingSession> = [
      createTrainingSession({
        completedAt: "2026-06-06T09:00:00.000Z",
        id: "selected-week-a",
        templateId: "template-a",
        templateLabel: "Full Body A",
        volumeByMovementPattern: [
          {
            movementPattern: "horizontal_push",
            volume: 1200,
          },
        ],
      }),
      createTrainingSession({
        completedAt: "2026-06-05T09:00:00.000Z",
        id: "selected-week-b",
        templateId: "template-b",
        templateLabel: "Full Body B",
        volumeByMovementPattern: [
          {
            movementPattern: "quad_dominant",
            volume: 800,
          },
        ],
      }),
      createTrainingSession({
        completedAt: "2026-05-30T09:00:00.000Z",
        id: "previous-week-a",
        templateId: "template-a",
        templateLabel: "Full Body A",
        volumeByMovementPattern: [
          {
            movementPattern: "horizontal_push",
            volume: 1000,
          },
        ],
      }),
      createTrainingSession({
        completedAt: "2026-05-29T09:00:00.000Z",
        id: "previous-week-b",
        templateId: "template-b",
        templateLabel: "Full Body B",
        volumeByMovementPattern: [
          {
            movementPattern: "quad_dominant",
            volume: 900,
          },
        ],
      }),
    ];

    const report = buildTrainingHistoryWeekReport({
      selectedWeekEndKey: null,
      trainingPlan,
      trainingSessions,
    });

    expect(report.summary).toEqual(
      expect.objectContaining({
        completedSessions: 2,
        progressVerdict: "progressed",
        previousWeekVolumeReference: expect.objectContaining({
          totalVolume: 1900,
        }),
      }),
    );
    expect(report.selectedSessions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          templateId: "template-a",
          volumeProgression: expect.objectContaining({
            deltaVolume: 200,
            previousComparableCompletedAt: "2026-05-30T09:00:00.000Z",
            previousComparableVolume: 1000,
            verdict: "progressed",
          }),
        }),
        expect.objectContaining({
          templateId: "template-b",
          volumeProgression: expect.objectContaining({
            deltaVolume: -100,
            previousComparableCompletedAt: "2026-05-29T09:00:00.000Z",
            previousComparableVolume: 900,
            verdict: "regressed",
          }),
        }),
      ]),
    );
  });

  it("compares same-template session progression when the template label changed", () => {
    const report = buildTrainingHistoryWeekReport({
      selectedWeekEndKey: null,
      trainingPlan: createTrainingPlan(),
      trainingSessions: [
        createTrainingSession({
          completedAt: "2026-06-06T09:00:00.000Z",
          id: "selected-week-renamed-template",
          templateId: "template-a",
          templateLabel: "Upper Strength",
          volumeByMovementPattern: [{ movementPattern: "horizontal_push", volume: 1200 }],
        }),
        createTrainingSession({
          completedAt: "2026-05-30T09:00:00.000Z",
          id: "previous-week-original-template",
          templateId: "template-a",
          templateLabel: "Full Body A",
          volumeByMovementPattern: [{ movementPattern: "horizontal_push", volume: 1000 }],
        }),
      ],
    });

    expect(report.selectedSessions).toEqual([
      expect.objectContaining({
        templateId: "template-a",
        templateLabel: "Upper Strength",
        volumeProgression: {
          deltaVolume: 200,
          previousComparableCompletedAt: "2026-05-30T09:00:00.000Z",
          previousComparableVolume: 1000,
          verdict: "progressed",
        },
      }),
    ]);
  });

  it("marks weekly progress unchanged when selected and previous weeks have the same total volume", () => {
    const report = buildTrainingHistoryWeekReport({
      selectedWeekEndKey: null,
      trainingPlan: createTrainingPlan(),
      trainingSessions: [
        createTrainingSession({
          completedAt: "2026-06-06T09:00:00.000Z",
          id: "selected-week",
          templateLabel: "Full Body A",
          volumeByMovementPattern: [{ movementPattern: "horizontal_push", volume: 1000 }],
        }),
        createTrainingSession({
          completedAt: "2026-05-30T09:00:00.000Z",
          id: "previous-week",
          templateLabel: "Full Body A",
          volumeByMovementPattern: [{ movementPattern: "horizontal_push", volume: 1000 }],
        }),
      ],
    });

    expect(report.summary.progressVerdict).toBe("unchanged");
    expect(report.summary.previousWeekVolumeReference).toEqual(
      expect.objectContaining({
        totalVolume: 1000,
      }),
    );
  });

  it("marks weekly progress not comparable when there is no prior week reference", () => {
    const report = buildTrainingHistoryWeekReport({
      selectedWeekEndKey: null,
      trainingPlan: createTrainingPlan(),
      trainingSessions: [
        createTrainingSession({
          completedAt: "2026-06-06T09:00:00.000Z",
          id: "selected-week",
          templateLabel: "Full Body A",
          volumeByMovementPattern: [{ movementPattern: "horizontal_push", volume: 1000 }],
        }),
      ],
    });

    expect(report.summary.progressVerdict).toBe("not_comparable");
    expect(report.summary.previousWeekVolumeReference).toBeNull();
  });

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
    expect(report.progressInsights).toEqual({
      bestProgress: comparisonByPattern.get("vertical_push"),
      increasedMovementPatternCount: 1,
      needsAttention: comparisonByPattern.get("vertical_pull"),
      newMovementPatternCount: 1,
      pushPullBalance: {
        deltaVolume: 1150,
        leadingPatternGroup: "push",
        pullVolume: 400,
        pushVolume: 1550,
      },
    });
  });

  it("marks missing bodyweight history as partial instead of silently counting it as zero", () => {
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
        sessionBodyweight: null,
        sessionBodyweightSource: null,
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
    expect(report.summary.hasPartialVolume).toBe(true);
    expect(report.selectedSessions).toEqual([
      expect.objectContaining({
        completedAt: "2026-06-06T09:00:00.000Z",
        completedLoadVolume: 0,
        exercises: [
          {
            completedLoadVolume: 0,
            exerciseId: "pull-ups",
            exerciseName: "Pull-Ups",
            hasPartialVolume: true,
            loadedSetCount: 0,
            movementPattern: "vertical_pull",
            movementPatternLabel: "Vertical Pull",
          },
        ],
        hasBodyweightExercises: true,
        hasPartialVolume: true,
        id: "bodyweight-session",
        loadedSetCount: 0,
        sessionBodyweight: null,
        templateId: "template-1",
        templateLabel: "Full Body A",
        volumeProgression: {
          deltaVolume: null,
          previousComparableCompletedAt: null,
          previousComparableVolume: null,
          verdict: "not_comparable",
        },
      }),
    ]);
  });

  it("counts known Session Bodyweight in Training history summaries for bodyweight exercises", () => {
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
            sets: [{ reps: 8, setIndex: 1, weight: 5 }],
          },
        ],
        id: "bodyweight-session",
        planId: "training-plan-test",
        sessionBodyweight: 80,
        sessionBodyweightSource: "session_override",
        status: "completed",
        templateId: "template-1",
        templateLabel: "Full Body A",
        updatedAt: "2026-06-06T09:00:00.000Z",
        volumeByMovementPattern: [
          {
            movementPattern: "vertical_pull",
            volume: 680,
          },
        ],
      },
    ];

    const report = buildTrainingHistoryWeekReport({
      selectedWeekEndKey: null,
      trainingPlan,
      trainingSessions,
    });

    expect(report.summary.loadedSetCount).toBe(1);
    expect(report.summary.totalVolume).toBe(680);
    expect(report.summary.hasPartialVolume).toBe(false);
    expect(report.selectedSessions).toEqual([
      expect.objectContaining({
        completedAt: "2026-06-06T09:00:00.000Z",
        completedLoadVolume: 680,
        exercises: [
          {
            completedLoadVolume: 680,
            exerciseId: "pull-ups",
            exerciseName: "Pull-Ups",
            hasPartialVolume: false,
            loadedSetCount: 1,
            movementPattern: "vertical_pull",
            movementPatternLabel: "Vertical Pull",
          },
        ],
        hasBodyweightExercises: true,
        hasPartialVolume: false,
        id: "bodyweight-session",
        loadedSetCount: 1,
        sessionBodyweight: 80,
        templateId: "template-1",
        templateLabel: "Full Body A",
        volumeProgression: {
          deltaVolume: null,
          previousComparableCompletedAt: null,
          previousComparableVolume: null,
          verdict: "not_comparable",
        },
      }),
    ]);
  });

  it("ignores corrupted completed sessions with invalid completion dates", () => {
    const trainingPlan = createTrainingPlan();
    const trainingSessions: ReadonlyArray<TrainingSession> = [
      createTrainingSession({
        completedAt: "not-a-date",
        id: "corrupted-session",
        templateLabel: "Corrupted Session",
        volumeByMovementPattern: [
          {
            movementPattern: "horizontal_push",
            volume: 1000,
          },
        ],
      }),
      createTrainingSession({
        completedAt: "2026-06-06T09:00:00.000Z",
        id: "valid-session",
        templateLabel: "Full Body A",
        volumeByMovementPattern: [
          {
            movementPattern: "horizontal_pull",
            volume: 400,
          },
        ],
      }),
    ];

    const report = buildTrainingHistoryWeekReport({
      selectedWeekEndKey: "not-a-week",
      trainingPlan,
      trainingSessions,
    });

    expect(report.selectedSessions).toHaveLength(1);
    expect(report.selectedSessions[0]).toEqual(
      expect.objectContaining({
        id: "valid-session",
        templateLabel: "Full Body A",
      }),
    );
    expect(report.summary.totalVolume).toBe(400);
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
          volume: 600,
        },
        {
          movementPattern: "horizontal_pull",
          volume: 400,
        },
        { movementPattern: "quad_dominant", volume: 500 },
      ],
    }),
    createTrainingSession({
      completedAt: "2026-06-05T09:00:00.000Z",
      id: "selected-week-2",
      templateLabel: "Full Body B",
      volumeByMovementPattern: [
        {
          movementPattern: "horizontal_push",
          volume: 600,
        },
        { movementPattern: "vertical_push", volume: 350 },
      ],
    }),
    createTrainingSession({
      completedAt: "2026-05-30T09:00:00.000Z",
      id: "previous-week-1",
      templateLabel: "Upper",
      volumeByMovementPattern: [
        {
          movementPattern: "horizontal_push",
          volume: 900,
        },
        {
          movementPattern: "horizontal_pull",
          volume: 700,
        },
      ],
    }),
    createTrainingSession({
      completedAt: "2026-05-29T09:00:00.000Z",
      id: "previous-week-2",
      templateLabel: "Lower",
      volumeByMovementPattern: [
        { movementPattern: "quad_dominant", volume: 500 },
        { movementPattern: "vertical_pull", volume: 650 },
      ],
    }),
  ];
}

function createTrainingSession({
  completedAt,
  id,
  templateId = `${id}-template`,
  templateLabel,
  volumeByMovementPattern,
}: {
  completedAt: string;
  id: string;
  templateId?: string;
  templateLabel: string;
  volumeByMovementPattern: TrainingSession["volumeByMovementPattern"];
}): TrainingSession {
  return {
    completedAt,
    createdAt: completedAt,
    exercises: volumeByMovementPattern.map((row, index) => ({
      exerciseId: `${id}-exercise-${index + 1}`,
      exerciseName: `${id}-exercise-${index + 1}`,
      movementPattern: row.movementPattern,
      sets: row.volume > 0 ? [{ reps: 1, setIndex: 1, weight: row.volume }] : [],
    })),
    id,
    planId: "training-plan-test",
    status: "completed",
    templateId,
    templateLabel,
    updatedAt: completedAt,
    volumeByMovementPattern,
  };
}
