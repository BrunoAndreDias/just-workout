import { describe, expect, it } from "vitest";
import { createExerciseLoadHistory, isCompletedSet } from "./exercise-load-history";
import type { TrainingSession, TrainingSessionExerciseEntry } from "./training-session";

describe("Exercise Load History", () => {
  it("treats draft sets as not completed and legacy sets without a done flag as completed", () => {
    expect(isCompletedSet({ done: false, reps: 8, setIndex: 1, weight: 100 })).toBe(false);
    expect(isCompletedSet({ done: true, reps: 8, setIndex: 1, weight: 100 })).toBe(true);
    expect(isCompletedSet({ reps: 8, setIndex: 1, weight: 100 })).toBe(true);
  });

  it("ignores sets that were never marked done", () => {
    const history = createExerciseLoadHistory([
      createSession({
        completedAt: "2026-07-01T10:00:00.000Z",
        exercises: [benchPress([{ done: true, reps: 8, setIndex: 1, weight: 90 }])],
      }),
      createSession({
        completedAt: "2026-07-08T10:00:00.000Z",
        exercises: [benchPress([{ done: false, reps: 8, setIndex: 1, weight: 120 }])],
      }),
    ]);

    expect(history.latestLoad("flat-barbell-bench-press")).toBe(90);
    expect(history.previousSet("flat-barbell-bench-press", 1)).toEqual({ reps: 8, weight: 90 });
  });

  it("orders history by completedAt, never by updatedAt, and skips unfinished sessions", () => {
    const history = createExerciseLoadHistory([
      createSession({
        completedAt: "2026-07-01T10:00:00.000Z",
        // A Historical Bodyweight Correction bumped this older session's updatedAt.
        exercises: [benchPress([{ reps: 8, setIndex: 1, weight: 90 }])],
        updatedAt: "2026-07-20T10:00:00.000Z",
      }),
      createSession({
        completedAt: "2026-07-08T10:00:00.000Z",
        exercises: [benchPress([{ reps: 8, setIndex: 1, weight: 100 }])],
      }),
      createSession({
        completedAt: null,
        exercises: [benchPress([{ reps: 8, setIndex: 1, weight: 110 }])],
      }),
    ]);

    expect(history.latestLoad("flat-barbell-bench-press")).toBe(100);
    expect(history.previousSet("flat-barbell-bench-press", 1)).toEqual({ reps: 8, weight: 100 });
  });

  it("returns the last completed set's load and keeps zero or negative bodyweight adjustments", () => {
    const history = createExerciseLoadHistory([
      createSession({
        completedAt: "2026-07-01T10:00:00.000Z",
        exercises: [
          benchPress([
            { reps: 8, setIndex: 2, weight: 100 },
            { reps: 10, setIndex: 1, weight: 95 },
            { reps: 0, setIndex: 3, weight: 102.5 },
            { reps: 6, setIndex: 4, weight: 0 },
          ]),
          exercise("pull-ups", "Pull-Ups", [{ reps: 8, setIndex: 1, weight: 0 }]),
          exercise("assisted-pull-ups", "Assisted Pull-Ups", [
            { reps: 8, setIndex: 1, weight: -12.5 },
          ]),
        ],
      }),
    ]);

    expect(history.latestLoad("flat-barbell-bench-press")).toBe(100);
    expect(history.latestLoad("pull-ups")).toBe(0);
    expect(history.latestLoad("assisted-pull-ups")).toBe(-12.5);
    expect(history.latestLoad("chin-ups")).toBeNull();
  });

  it("filters the latest performance by Training Block and orders its sets by set index", () => {
    const history = createExerciseLoadHistory([
      createSession({
        completedAt: "2026-07-01T10:00:00.000Z",
        exercises: [
          benchPress([
            { reps: 8, setIndex: 2, weight: 92.5 },
            { reps: 8, setIndex: 1, weight: 90 },
          ]),
        ],
        trainingBlockId: "training-block-1",
      }),
      createSession({
        completedAt: "2026-07-08T10:00:00.000Z",
        exercises: [benchPress([{ reps: 8, setIndex: 1, weight: 100 }])],
        trainingBlockId: "training-block-2",
      }),
    ]);

    const currentBlock = history.latestPerformance("flat-barbell-bench-press", {
      trainingBlockId: "training-block-1",
    });

    expect(currentBlock?.session.trainingBlockId).toBe("training-block-1");
    expect(currentBlock?.sets.map((set) => set.weight)).toEqual([90, 92.5]);
    expect(history.latestPerformance("flat-barbell-bench-press")?.session.trainingBlockId).toBe(
      "training-block-2",
    );
    expect(
      history.latestPerformance("flat-barbell-bench-press", {
        trainingBlockId: "training-block-3",
      }),
    ).toBeNull();
  });

  it("uses the first completed entry when an exercise repeats within a session", () => {
    const history = createExerciseLoadHistory([
      createSession({
        completedAt: "2026-07-01T10:00:00.000Z",
        exercises: [
          benchPress([{ done: false, reps: 8, setIndex: 1, weight: 120 }]),
          benchPress([{ reps: 8, setIndex: 1, weight: 100 }]),
          benchPress([{ reps: 5, setIndex: 1, weight: 110 }]),
        ],
      }),
    ]);

    expect(history.latestLoad("flat-barbell-bench-press")).toBe(100);
    expect(history.previousSet("flat-barbell-bench-press", 1)).toEqual({ reps: 8, weight: 100 });
  });

  it("finds the previous set per set index, falling back to older sessions", () => {
    const history = createExerciseLoadHistory([
      createSession({
        completedAt: "2026-07-01T10:00:00.000Z",
        exercises: [
          benchPress([
            { reps: 10, setIndex: 1, weight: 80 },
            { reps: 9, setIndex: 2, weight: 80 },
            { reps: 8, setIndex: 3, weight: 80 },
          ]),
        ],
      }),
      createSession({
        completedAt: "2026-07-08T10:00:00.000Z",
        exercises: [
          benchPress([
            { reps: 8, setIndex: 1, weight: 90 },
            { reps: 7, setIndex: 2, weight: 90 },
            { done: false, reps: 8, setIndex: 3, weight: 90 },
          ]),
        ],
      }),
    ]);

    expect(history.previousSet("flat-barbell-bench-press", 1)).toEqual({ reps: 8, weight: 90 });
    expect(history.previousSet("flat-barbell-bench-press", 3)).toEqual({ reps: 8, weight: 80 });
    expect(history.previousSet("flat-barbell-bench-press", 4)).toBeNull();
    expect(history.previousSet("pull-ups", 1)).toBeNull();
  });
});

function benchPress(sets: TrainingSessionExerciseEntry["sets"]): TrainingSessionExerciseEntry {
  return exercise("flat-barbell-bench-press", "Flat Barbell Bench Press", sets);
}

function exercise(
  exerciseId: string,
  exerciseName: string,
  sets: TrainingSessionExerciseEntry["sets"],
): TrainingSessionExerciseEntry {
  return { exerciseId, exerciseName, movementPattern: "horizontal_push", sets };
}

function createSession({
  completedAt,
  exercises,
  trainingBlockId = null,
  updatedAt,
}: {
  completedAt: string | null;
  exercises: TrainingSession["exercises"];
  trainingBlockId?: string | null;
  updatedAt?: string;
}): TrainingSession {
  const timestamp = completedAt ?? "2026-07-30T10:00:00.000Z";

  return {
    completedAt,
    createdAt: timestamp,
    exercises,
    id: `session-${timestamp}`,
    planId: "training-plan-1",
    sessionIntent: "planned",
    status: "completed",
    templateId: "template-1",
    templateLabel: "Full Body A",
    trainingBlockCycleNumber: 1,
    trainingBlockId,
    trainingBlockWeekNumber: 1,
    updatedAt: updatedAt ?? timestamp,
    volumeByMovementPattern: [],
  };
}
