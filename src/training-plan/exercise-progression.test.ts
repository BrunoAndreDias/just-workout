import { describe, expect, it } from "vitest";
import { suggestNextExerciseTarget } from "./exercise-progression";

const mainRange = { max: 8, min: 6 };

function sets(weight: number, reps: ReadonlyArray<number>, rir: number | null) {
  return reps.map((repCount) => ({ reps: repCount, rir, weight }));
}

describe("suggestNextExerciseTarget", () => {
  it("drops one rep at the same load when last session was harder than its RIR target", () => {
    // Week 3 targeted 2 RIR but the sets were at 1 RIR; week 4 also targets 2 RIR.
    expect(
      suggestNextExerciseTarget({
        availableLoadIncrement: 2.5,
        isBodyweightLoad: false,
        nextTargetRir: 2,
        previousSets: sets(80, [8, 8, 8], 1),
        previousTargetRir: 2,
        repRange: mainRange,
      }),
    ).toMatchObject({ load: 80, loadChange: "keep", reps: 7 });
  });

  it("adds a rep when the effort target stays the same and the sets went as planned", () => {
    expect(
      suggestNextExerciseTarget({
        availableLoadIncrement: 2.5,
        isBodyweightLoad: false,
        nextTargetRir: 2,
        previousSets: sets(80, [6, 6, 6], 2),
        previousTargetRir: 2,
        repRange: mainRange,
      }),
    ).toMatchObject({ load: 80, loadChange: "keep", reps: 7 });
  });

  it("adds reps as the weekly RIR target gets harder", () => {
    // Week 1 at 4 RIR -> week 2 at 3 RIR: one more rep at the same load.
    expect(
      suggestNextExerciseTarget({
        availableLoadIncrement: 2.5,
        isBodyweightLoad: false,
        nextTargetRir: 3,
        previousSets: sets(80, [6, 6, 6], 4),
        previousTargetRir: 4,
        repRange: mainRange,
      }),
    ).toMatchObject({ load: 80, loadChange: "keep", reps: 7 });
  });

  it("adds the smallest load increment when the rep target passes the top of the range", () => {
    const target = suggestNextExerciseTarget({
      availableLoadIncrement: 2.5,
      isBodyweightLoad: false,
      nextTargetRir: 2,
      previousSets: sets(80, [8, 8, 8], 3),
      previousTargetRir: 3,
      repRange: mainRange,
    });

    expect(target).toMatchObject({ load: 82.5, loadChange: "increase" });
    expect(target?.reps).toBeGreaterThanOrEqual(mainRange.min);
    expect(target?.reps).toBeLessThanOrEqual(mainRange.max);
  });

  it("reduces the load when the rep target would fall below the range", () => {
    const target = suggestNextExerciseTarget({
      availableLoadIncrement: 2.5,
      isBodyweightLoad: false,
      nextTargetRir: 2,
      previousSets: sets(80, [6, 5, 4], 0),
      previousTargetRir: 2,
      repRange: mainRange,
    });

    expect(target?.loadChange).toBe("reduce");
    expect(target?.load).toBeLessThan(80);
    expect(target?.reps).toBe(mainRange.min);
  });

  it("assumes the planned RIR when RIR was not logged", () => {
    expect(
      suggestNextExerciseTarget({
        availableLoadIncrement: 2.5,
        isBodyweightLoad: false,
        nextTargetRir: 1,
        previousSets: sets(20, [12, 12, 12], null),
        previousTargetRir: 2,
        repRange: { max: 15, min: 10 },
      }),
    ).toMatchObject({ load: 20, loadChange: "keep", reps: 13 });
  });

  it("lets isolation work reach 0 RIR in the peak week", () => {
    expect(
      suggestNextExerciseTarget({
        availableLoadIncrement: 2.5,
        isBodyweightLoad: false,
        nextTargetRir: 0,
        previousSets: sets(20, [12, 12, 12], 1),
        previousTargetRir: 1,
        repRange: { max: 15, min: 10 },
      }),
    ).toMatchObject({ load: 20, reps: 13 });
  });

  it("moves bodyweight load adjustments by the increment and restarts at the bottom of the range", () => {
    expect(
      suggestNextExerciseTarget({
        availableLoadIncrement: 2.5,
        isBodyweightLoad: true,
        nextTargetRir: 2,
        previousSets: sets(0, [10, 10, 10], 3),
        previousTargetRir: 2,
        repRange: mainRange,
      }),
    ).toMatchObject({ load: 2.5, loadChange: "increase", reps: 6 });
  });

  it("returns null without completed sets", () => {
    expect(
      suggestNextExerciseTarget({
        availableLoadIncrement: 2.5,
        isBodyweightLoad: false,
        nextTargetRir: 2,
        previousSets: [],
        previousTargetRir: 2,
        repRange: mainRange,
      }),
    ).toBeNull();
  });
});
