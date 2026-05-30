import { describe, expect, it } from "vitest";
import {
  getCompatibleTrainingSplits,
  getRecommendedTrainingSplitId,
  getTrainingSplit,
  summarizeTrainingSplit,
} from "./training-split";

describe("training split definitions", () => {
  it("recommends 4-Day Upper/Lower while keeping Rotating Push/Pull/Legs compatible for 4 days/week", () => {
    expect(getRecommendedTrainingSplitId(4)).toBe("upper-lower-4-day");
    expect(getCompatibleTrainingSplits(4).map((split) => split.id)).toEqual([
      "upper-lower-4-day",
      "rotating-push-pull-legs",
    ]);
  });

  it("limits 3 days/week to the three approved selectable Training Splits", () => {
    expect(getRecommendedTrainingSplitId(3)).toBe("full-body-3-day");
    expect(getCompatibleTrainingSplits(3).map((split) => split.id)).toEqual([
      "full-body-3-day",
      "upper-lower-full-body",
      "alternating-full-body-a-b",
    ]);
  });

  it("keeps 2 days/week and 5 days/week on a single compatible split instead of dead-ending", () => {
    expect(getRecommendedTrainingSplitId(2)).toBe("full-body-2-day");
    expect(getCompatibleTrainingSplits(2).map((split) => split.id)).toEqual(["full-body-2-day"]);
    expect(getRecommendedTrainingSplitId(5)).toBe("rotating-push-pull-legs");
    expect(getCompatibleTrainingSplits(5).map((split) => split.id)).toEqual([
      "rotating-push-pull-legs",
    ]);
  });

  it("describes Rotating Push/Pull/Legs as a rotating cycle with derived summary details", () => {
    expect(getTrainingSplit("rotating-push-pull-legs").schedule).toEqual({
      cadence:
        "Schedule-flexible: the cycle rotates across available weekdays and can land as 4-5 sessions in a calendar week.",
      cycle: [
        { id: "push-1", sessionLabel: "Push" },
        { id: "pull-1", sessionLabel: "Pull" },
        { id: "legs-1", sessionLabel: "Legs" },
        { id: "push-2", sessionLabel: "Push" },
        { id: "pull-2", sessionLabel: "Pull" },
      ],
      description:
        "This option does not lock to fixed weekdays. You continue the next Push, Pull, or Legs session each time you train.",
      kind: "rotating-cycle",
    });
    expect(summarizeTrainingSplit("rotating-push-pull-legs")).toEqual({
      muscleFrequency:
        "Most muscle groups are trained every 4-6 days as the push, pull, and legs cycle keeps rotating.",
      recovery:
        "The cycle separates related stress across different session types, but calendar-week recovery can flex with your schedule.",
      split: "Rotating Push/Pull/Legs",
      weeklyRhythm:
        "A rotating Push/Pull/Legs cycle that flexes across available weekdays instead of locking to one fixed week.",
    });
  });
});
