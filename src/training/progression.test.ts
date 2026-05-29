import { describe, expect, it } from "vitest";
import { recommendProgression } from "./progression";

describe("recommendProgression", () => {
  it("increases load when every prescribed set reaches the top of the rep range", () => {
    expect(
      recommendProgression({
        completedSets: [8, 8, 8],
        currentLoad: 40,
        loadStep: 2.5,
        targetRepMax: 8,
        targetSets: 3,
      }),
    ).toEqual({
      kind: "increase-load",
      nextLoad: 42.5,
      reason: "all-target-reps-completed",
    });
  });

  it("repeats load when any prescribed set misses the top of the rep range", () => {
    expect(
      recommendProgression({
        completedSets: [8, 7, 8],
        currentLoad: 40,
        loadStep: 2.5,
        targetRepMax: 8,
        targetSets: 3,
      }),
    ).toEqual({
      kind: "repeat-load",
      nextLoad: 40,
      reason: "target-reps-not-yet-completed",
    });
  });
});
