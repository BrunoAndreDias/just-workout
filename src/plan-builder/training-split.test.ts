import { describe, expect, it } from "vitest";
import {
  getCompatibleTrainingSplitOptions,
  getCompatibleTrainingSplits,
  getRecommendedTrainingSplitId,
  getRecommendedTrainingSplitOption,
  getTrainingSplit,
  getTrainingSplitLabel,
  isTrainingSplitCompatible,
  isTrainingSplitId,
  summarizeTrainingSplit,
} from "./training-split";

describe("training split definitions", () => {
  it("exposes the compatible v1 split ids and recommendation for each supported frequency", () => {
    expect(getCompatibleTrainingSplitOptions(2).map((option) => option.id)).toEqual([
      "full-body-2-day",
    ]);
    expect(getCompatibleTrainingSplitOptions(3).map((option) => option.id)).toEqual([
      "full-body-3-day",
      "upper-lower-full-body",
      "alternating-full-body-a-b",
    ]);
    expect(getCompatibleTrainingSplitOptions(4).map((option) => option.id)).toEqual([
      "upper-lower-4-day",
      "rotating-push-pull-legs",
    ]);
    expect(getCompatibleTrainingSplitOptions(5).map((option) => option.id)).toEqual([
      "rotating-push-pull-legs",
    ]);

    expect(getRecommendedTrainingSplitOption(2).id).toBe("full-body-2-day");
    expect(getRecommendedTrainingSplitOption(3).id).toBe("full-body-3-day");
    expect(getRecommendedTrainingSplitOption(4).id).toBe("upper-lower-4-day");
    expect(getRecommendedTrainingSplitOption(5).id).toBe("rotating-push-pull-legs");
  });

  it("recommends 4-Day Upper/Lower while keeping Rotating Push/Pull/Legs compatible for 4 days/week", () => {
    expect(getRecommendedTrainingSplitId(4)).toBe("upper-lower-4-day");
    expect(getCompatibleTrainingSplits(4).map((split) => split.id)).toEqual([
      "upper-lower-4-day",
      "rotating-push-pull-legs",
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

  it("uses stable typed ids and compatibility checks instead of display text", () => {
    expect(isTrainingSplitId("rotating-push-pull-legs")).toBe(true);
    expect(isTrainingSplitId("Rotating Push/Pull/Legs")).toBe(false);
    expect(isTrainingSplitCompatible("rotating-push-pull-legs", 4)).toBe(true);
    expect(
      isTrainingSplitCompatible({
        trainingFrequencyDaysPerWeek: 4,
        trainingSplitId: "rotating-push-pull-legs",
      }),
    ).toBe(true);
    expect(
      isTrainingSplitCompatible({
        trainingFrequencyDaysPerWeek: 5,
        trainingSplitId: "upper-lower-4-day",
      }),
    ).toBe(false);
    expect(getTrainingSplitLabel("upper-lower-full-body")).toBe("Upper / Lower / Full Body");
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
