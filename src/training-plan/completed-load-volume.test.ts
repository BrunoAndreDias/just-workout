import { describe, expect, it } from "vitest";
import {
  createCompletedLoadVolumeExerciseReport,
  isLoadedSet,
  summarizeCompletedLoadVolume,
} from "./completed-load-volume";

describe("Completed Load Volume", () => {
  it("counts only Loaded Sets with positive external weight and positive reps", () => {
    expect(isLoadedSet({ reps: 10, setIndex: 1, weight: 20 })).toBe(true);
    expect(isLoadedSet({ reps: 10, setIndex: 1, weight: 0 })).toBe(false);
    expect(isLoadedSet({ reps: 0, setIndex: 1, weight: 20 })).toBe(false);
  });

  it("keeps missing-bodyweight exercises visible while marking them as partial volume", () => {
    expect(
      createCompletedLoadVolumeExerciseReport({
        exerciseId: "pull-ups",
        exerciseName: "Pull-Ups",
        movementPattern: "vertical_pull",
        sets: [{ reps: 12, setIndex: 1, weight: 0 }],
      }),
    ).toEqual({
      completedLoadVolume: 0,
      exerciseId: "pull-ups",
      exerciseName: "Pull-Ups",
      hasPartialVolume: true,
      loadedSetCount: 0,
      movementPattern: "vertical_pull",
    });
  });

  it("counts known Session Bodyweight toward Completed Load Volume for bodyweight exercises", () => {
    expect(
      createCompletedLoadVolumeExerciseReport(
        {
          exerciseId: "pull-ups",
          exerciseName: "Pull-Ups",
          movementPattern: "vertical_pull",
          sets: [{ reps: 8, setIndex: 1, weight: 5 }],
        },
        { sessionBodyweight: 80 },
      ),
    ).toEqual({
      completedLoadVolume: 680,
      exerciseId: "pull-ups",
      exerciseName: "Pull-Ups",
      hasPartialVolume: false,
      loadedSetCount: 1,
      movementPattern: "vertical_pull",
    });
  });

  it("marks missing Session Bodyweight as partial volume instead of counting it as zero", () => {
    const summary = summarizeCompletedLoadVolume([
      {
        exerciseId: "pull-ups",
        exerciseName: "Pull-Ups",
        movementPattern: "vertical_pull",
        sets: [{ reps: 12, setIndex: 1, weight: 0 }],
      },
    ]);

    expect(summary).toMatchObject({
      hasPartialVolume: true,
      loadedSetCount: 0,
      totalVolume: 0,
    });
    expect(summary.exercises).toEqual([
      expect.objectContaining({
        completedLoadVolume: 0,
        exerciseId: "pull-ups",
        hasPartialVolume: true,
        loadedSetCount: 0,
      }),
    ]);
  });

  it("summarizes exercise, session, and Movement Pattern volume through one interface", () => {
    const summary = summarizeCompletedLoadVolume([
      {
        exerciseId: "bench-press",
        exerciseName: "Bench Press",
        movementPattern: "horizontal_push",
        sets: [
          { reps: 10, setIndex: 1, weight: 50 },
          { reps: 8, setIndex: 2, weight: 55 },
        ],
      },
      {
        exerciseId: "overhead-press",
        exerciseName: "Overhead Press",
        movementPattern: "vertical_push",
        sets: [
          { reps: 10, setIndex: 1, weight: 30 },
          { reps: 0, setIndex: 2, weight: 30 },
        ],
      },
      {
        exerciseId: "push-ups",
        exerciseName: "Push-Ups",
        movementPattern: "horizontal_push",
        sets: [{ reps: 12, setIndex: 1, weight: 0 }],
      },
    ]);

    expect(summary.loadedSetCount).toBe(3);
    expect(summary.totalVolume).toBe(1240);
    expect(summary.exercises).toEqual([
      expect.objectContaining({
        completedLoadVolume: 940,
        exerciseId: "bench-press",
        loadedSetCount: 2,
      }),
      expect.objectContaining({
        completedLoadVolume: 300,
        exerciseId: "overhead-press",
        loadedSetCount: 1,
      }),
      expect.objectContaining({
        completedLoadVolume: 0,
        exerciseId: "push-ups",
        loadedSetCount: 0,
      }),
    ]);
    expect(summary.volumeByMovementPattern).toEqual([
      {
        movementPattern: "horizontal_push",
        volume: 940,
      },
      {
        movementPattern: "vertical_push",
        volume: 300,
      },
    ]);
  });
});
