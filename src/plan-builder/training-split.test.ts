import { describe, expect, it } from "vitest";
import {
  getCompatibleTrainingSplitOptions,
  getRecommendedTrainingSplitOption,
  getTrainingSplitLabel,
  isTrainingSplitCompatible,
  isTrainingSplitId,
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

  it("uses stable typed ids and compatibility checks instead of display text", () => {
    expect(isTrainingSplitId("rotating-push-pull-legs")).toBe(true);
    expect(isTrainingSplitId("Rotating Push/Pull/Legs")).toBe(false);
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
});
