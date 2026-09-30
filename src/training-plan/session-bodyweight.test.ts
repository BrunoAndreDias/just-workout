import { describe, expect, it } from "vitest";
import {
  applyWeeklyBodyweightUpdate,
  completeSessionBodyweightField,
  editSessionBodyweightField,
  initSessionBodyweightField,
  requiresSessionBodyweight,
  resolveTrainingWeekBodyweight,
} from "./session-bodyweight";
import type { TrainingPlan, WorkoutTemplate } from "./training-plan";
import type { TrainingSession, TrainingSessionBodyweightSource } from "./training-session";

// Training Weeks start on the plan's generatedAt day: 2026-06-07 to 2026-06-13, 2026-06-14 to ...
const WEEK_ONE_DATE = "2026-06-09T10:00:00.000Z";
const WEEK_TWO_DATE = "2026-06-16T10:00:00.000Z";
const WEEK_THREE_DATE = "2026-06-23T10:00:00.000Z";

describe("requiresSessionBodyweight", () => {
  it("detects bodyweight exercises in one Workout Template or across several", () => {
    const loadedTemplate = createWorkoutTemplate({
      exerciseId: "back-squat",
      exerciseName: "Squat",
    });
    const bodyweightTemplate = createWorkoutTemplate({
      exerciseId: "pull-ups",
      exerciseName: "Pull-Ups",
    });

    expect(requiresSessionBodyweight(loadedTemplate)).toBe(false);
    expect(requiresSessionBodyweight(bodyweightTemplate)).toBe(true);
    expect(requiresSessionBodyweight([loadedTemplate])).toBe(false);
    expect(requiresSessionBodyweight([loadedTemplate, bodyweightTemplate])).toBe(true);
  });
});

describe("resolveTrainingWeekBodyweight", () => {
  const weeklyBodyweightUpdates = [
    createWeeklyUpdate({ bodyweight: 81, weekEnd: "2026-06-13", weekStart: "2026-06-07" }),
    createWeeklyUpdate({ bodyweight: 83, weekEnd: "2026-06-27", weekStart: "2026-06-21" }),
  ];

  it("uses the Training Week's own Weekly Bodyweight Update first", () => {
    expect(
      resolveTrainingWeekBodyweight({
        referenceDate: WEEK_THREE_DATE,
        trainingPlan: createTrainingPlan({ baselineBodyweight: 80, weeklyBodyweightUpdates }),
      }),
    ).toEqual({
      bodyweight: 83,
      source: "inherited_weekly",
      weekEnd: "2026-06-27",
      weekStart: "2026-06-21",
    });
  });

  it("inherits the latest earlier Weekly Bodyweight Update before Baseline Bodyweight", () => {
    expect(
      resolveTrainingWeekBodyweight({
        referenceDate: WEEK_TWO_DATE,
        trainingPlan: createTrainingPlan({ baselineBodyweight: 80, weeklyBodyweightUpdates }),
      }),
    ).toEqual(expect.objectContaining({ bodyweight: 81, source: "inherited_weekly" }));
  });

  it("falls back to Baseline Bodyweight, then to no bodyweight", () => {
    expect(
      resolveTrainingWeekBodyweight({
        referenceDate: WEEK_ONE_DATE,
        trainingPlan: createTrainingPlan({ baselineBodyweight: 80 }),
      }),
    ).toEqual(expect.objectContaining({ bodyweight: 80, source: "baseline" }));
    expect(
      resolveTrainingWeekBodyweight({
        referenceDate: WEEK_ONE_DATE,
        trainingPlan: createTrainingPlan(),
      }),
    ).toEqual(expect.objectContaining({ bodyweight: null, source: null }));
  });
});

describe("Session Bodyweight field", () => {
  const bodyweightTemplate = createWorkoutTemplate({
    exerciseId: "pull-ups",
    exerciseName: "Pull-Ups",
  });

  it("starts from the Inherited Bodyweight Default when the Workout Template needs it", () => {
    expect(
      initSessionBodyweightField({
        referenceDate: WEEK_ONE_DATE,
        trainingPlan: createTrainingPlan({ baselineBodyweight: 80 }),
        workoutTemplate: bodyweightTemplate,
      }),
    ).toEqual({ error: null, input: "80", required: true, source: "baseline" });
    expect(
      initSessionBodyweightField({
        referenceDate: WEEK_ONE_DATE,
        trainingPlan: createTrainingPlan({ baselineBodyweight: 80 }),
        workoutTemplate: createWorkoutTemplate({ exerciseId: "back-squat", exerciseName: "Squat" }),
      }),
    ).toEqual({ error: null, input: "", required: false, source: null });
  });

  it("turns an edit into a Per-Session Bodyweight Override", () => {
    const field = initSessionBodyweightField({
      referenceDate: WEEK_ONE_DATE,
      trainingPlan: createTrainingPlan({ baselineBodyweight: 80 }),
      workoutTemplate: bodyweightTemplate,
    });

    expect(completeSessionBodyweightField(editSessionBodyweightField(field, "78.5"))).toEqual(
      expect.objectContaining({
        ok: true,
        sessionBodyweight: { bodyweight: 78.5, source: "session_override" },
      }),
    );
  });

  it("keeps the inherited source when completing without edits", () => {
    const field = initSessionBodyweightField({
      referenceDate: WEEK_ONE_DATE,
      trainingPlan: createTrainingPlan({ baselineBodyweight: 80 }),
      workoutTemplate: bodyweightTemplate,
    });

    expect(completeSessionBodyweightField(field)).toEqual(
      expect.objectContaining({
        ok: true,
        sessionBodyweight: { bodyweight: 80, source: "baseline" },
      }),
    );
  });

  it("requires a positive value before completing, and clears the error on the next edit", () => {
    const field = initSessionBodyweightField({
      referenceDate: WEEK_ONE_DATE,
      trainingPlan: createTrainingPlan(),
      workoutTemplate: bodyweightTemplate,
    });
    const completion = completeSessionBodyweightField(field);

    expect(completion).toEqual({
      field: expect.objectContaining({
        error: "Session Bodyweight is required to complete bodyweight volume.",
      }),
      ok: false,
    });
    expect(editSessionBodyweightField(completion.field, "79").error).toBeNull();
  });

  it("completes without Session Bodyweight when the Workout Template has no bodyweight exercise", () => {
    expect(
      completeSessionBodyweightField({ error: null, input: "", required: false, source: null }),
    ).toEqual(expect.objectContaining({ ok: true, sessionBodyweight: null }));
  });
});

describe("applyWeeklyBodyweightUpdate", () => {
  it("rewrites inherited sessions in that Training Week and preserves explicit session values", () => {
    const trainingPlan = createTrainingPlan({
      baselineBodyweight: 80,
      weeklyBodyweightUpdates: [
        createWeeklyUpdate({ bodyweight: 79, weekEnd: "2026-06-13", weekStart: "2026-06-07" }),
        createWeeklyUpdate({ bodyweight: 90, weekEnd: "2026-06-20", weekStart: "2026-06-14" }),
      ],
    });
    const sessions = [
      createTrainingSession({ id: "baseline", source: "baseline" }),
      createTrainingSession({ id: "inherited-weekly", source: "inherited_weekly" }),
      createTrainingSession({ id: "session-override", source: "session_override" }),
      createTrainingSession({ id: "historical-correction", source: "historical_correction" }),
      createTrainingSession({ id: "missing", source: null }),
      createTrainingSession({
        completedAt: WEEK_TWO_DATE,
        id: "other-week",
        source: "inherited_weekly",
      }),
    ];

    const result = applyWeeklyBodyweightUpdate({
      bodyweight: 82,
      referenceDate: WEEK_ONE_DATE,
      sessions,
      timestamp: "2026-06-10T12:00:00.000Z",
      trainingPlan,
    });

    expect(result.trainingPlan).toEqual(
      expect.objectContaining({
        baselineBodyweight: 80,
        updatedAt: "2026-06-10T12:00:00.000Z",
        weeklyBodyweightUpdates: [
          {
            bodyweight: 82,
            updatedAt: "2026-06-10T12:00:00.000Z",
            weekEnd: "2026-06-13",
            weekStart: "2026-06-07",
          },
          expect.objectContaining({ bodyweight: 90, weekStart: "2026-06-14" }),
        ],
      }),
    );
    expect(result.changedSessions).toEqual([
      expect.objectContaining({
        id: "baseline",
        sessionBodyweight: 82,
        sessionBodyweightSource: "inherited_weekly",
        updatedAt: "2026-06-10T12:00:00.000Z",
        volumeByMovementPattern: [{ movementPattern: "vertical_pull", volume: 656 }],
      }),
      expect.objectContaining({
        id: "inherited-weekly",
        sessionBodyweight: 82,
        sessionBodyweightSource: "inherited_weekly",
      }),
    ]);
  });
});

function createTrainingPlan(overrides: Partial<TrainingPlan> = {}): TrainingPlan {
  return {
    active: true,
    generatedAt: "2026-06-07T09:00:00.000Z",
    id: "training-plan-test",
    mainCompoundRotationPools: [],
    repRangeStyle: "balanced_hypertrophy",
    sourceBlueprintId: "plan-blueprint-test",
    split: "Alternating Full Body A/B",
    trainingBlockWeeks: 6,
    trainingFrequencyDaysPerWeek: 3,
    trainingGoal: "build-muscle",
    updatedAt: "2026-06-07T09:00:00.000Z",
    weeklyRepTargets: [],
    workoutTemplates: [],
    ...overrides,
  };
}

function createWorkoutTemplate({
  exerciseId,
  exerciseName,
}: {
  exerciseId: string;
  exerciseName: string;
}): WorkoutTemplate {
  return {
    id: `template-${exerciseId}`,
    label: exerciseName,
    purpose: "strength",
    supersetGroups: [
      {
        id: "group-1",
        slots: [
          {
            exerciseId,
            exerciseName,
            kind: "exercise",
            movementPattern: "vertical_pull",
            role: "main_compound",
            slotLabel: "Main",
            targetMuscles: [],
          },
        ],
        title: "Main",
        type: "superset",
      },
    ],
  };
}

function createWeeklyUpdate({
  bodyweight,
  weekEnd,
  weekStart,
}: {
  bodyweight: number;
  weekEnd: string;
  weekStart: string;
}) {
  return { bodyweight, updatedAt: `${weekStart}T12:00:00.000Z`, weekEnd, weekStart };
}

function createTrainingSession({
  completedAt = WEEK_ONE_DATE,
  id,
  source,
}: {
  completedAt?: string;
  id: string;
  source: TrainingSessionBodyweightSource | null;
}): TrainingSession {
  return {
    completedAt,
    createdAt: completedAt,
    exercises: [
      {
        exerciseId: "pull-ups",
        exerciseName: "Pull-Ups",
        movementPattern: "vertical_pull",
        sets: [{ reps: 8, setIndex: 1, weight: 0 }],
      },
    ],
    id,
    planId: "training-plan-test",
    sessionBodyweight: source === null ? null : 80,
    sessionBodyweightSource: source,
    sessionIntent: "planned",
    status: "completed",
    templateId: "template-pull-ups",
    templateLabel: "Pull-Ups",
    updatedAt: completedAt,
    volumeByMovementPattern: [],
  };
}
