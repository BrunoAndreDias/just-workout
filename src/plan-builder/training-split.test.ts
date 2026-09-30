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
      "rotating-upper-lower",
    ]);
    expect(getCompatibleTrainingSplitOptions(4).map((option) => option.id)).toEqual([
      "upper-lower-4-day",
      "rotating-push-pull-legs",
    ]);
    expect(getCompatibleTrainingSplitOptions(5).map((option) => option.id)).toEqual([
      "rotating-upper-lower",
      "rotating-push-pull-legs",
    ]);

    expect(getRecommendedTrainingSplitOption(2).id).toBe("full-body-2-day");
    expect(getRecommendedTrainingSplitOption(3).id).toBe("full-body-3-day");
    expect(getRecommendedTrainingSplitOption(4).id).toBe("upper-lower-4-day");
    expect(getRecommendedTrainingSplitOption(5).id).toBe("rotating-upper-lower");
  });

  it("recommends 4-Day Upper/Lower while keeping Rotating Push/Pull/Legs compatible for 4 days/week", () => {
    expect(getRecommendedTrainingSplitId(4)).toBe("upper-lower-4-day");
    expect(getCompatibleTrainingSplits(4).map((split) => split.id)).toEqual([
      "upper-lower-4-day",
      "rotating-push-pull-legs",
    ]);
  });

  it("keeps 2 days/week on a single compatible split instead of dead-ending", () => {
    expect(getRecommendedTrainingSplitId(2)).toBe("full-body-2-day");
    expect(getCompatibleTrainingSplits(2).map((split) => split.id)).toEqual(["full-body-2-day"]);
  });

  it("recommends Rotating Upper/Lower for 5 days/week and keeps it compatible for 3 days/week only", () => {
    expect(getRecommendedTrainingSplitId(5)).toBe("rotating-upper-lower");
    expect(getCompatibleTrainingSplits(5).map((split) => split.id)).toEqual([
      "rotating-upper-lower",
      "rotating-push-pull-legs",
    ]);
    expect(isTrainingSplitCompatible("rotating-upper-lower", 3)).toBe(true);
    expect(isTrainingSplitCompatible("rotating-upper-lower", 5)).toBe(true);
    expect(isTrainingSplitCompatible("rotating-upper-lower", 2)).toBe(false);
    expect(isTrainingSplitCompatible("rotating-upper-lower", 4)).toBe(false);

    const schedule = getTrainingSplit("rotating-upper-lower").schedule;

    expect(schedule.kind).toBe("rotating-cycle");
    expect(
      schedule.kind === "rotating-cycle"
        ? schedule.cycle.map((session) => session.sessionLabel)
        : [],
    ).toEqual(["Upper A", "Lower A", "Upper B", "Lower B"]);
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
        { id: "push-a", sessionLabel: "Push A" },
        { id: "pull-a", sessionLabel: "Pull A" },
        { id: "legs-a", sessionLabel: "Legs A" },
        { id: "push-b", sessionLabel: "Push B" },
        { id: "pull-b", sessionLabel: "Pull B" },
        { id: "legs-b", sessionLabel: "Legs B" },
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
