import { describe, expect, it } from "vitest";
import { getRepRangeStyle } from "./plan-blueprint";
import {
  createRecommendedTrainingVolumeConfiguration,
  estimateWeeklySetRangeForTarget,
  getVolumePreset,
  isVolumePresetId,
  selectTrainingVolumeConfiguration,
  volumePresets,
} from "./training-volume";

describe("training volume", () => {
  it("defines the approved source-backed volume presets", () => {
    expect(volumePresets).toEqual([
      {
        id: "conservative",
        isRecommended: false,
        largerMuscleTarget: 60,
        smallerMuscleTarget: 30,
        title: "Conservative",
      },
      {
        id: "balanced",
        isRecommended: true,
        largerMuscleTarget: 90,
        smallerMuscleTarget: 45,
        title: "Balanced",
      },
      {
        id: "higher_volume",
        isRecommended: false,
        largerMuscleTarget: 120,
        smallerMuscleTarget: 60,
        title: "Higher volume",
      },
    ]);
    expect(isVolumePresetId("balanced")).toBe(true);
    expect(isVolumePresetId("higher_volume")).toBe(true);
    expect(isVolumePresetId("standard")).toBe(false);
    expect(getVolumePreset("balanced").title).toBe("Balanced");
  });

  it("creates the recommended default configuration with required and optional weekly rep targets", () => {
    expect(createRecommendedTrainingVolumeConfiguration()).toEqual({
      volumePreset: "balanced",
      volumePresetSource: "recommended_default",
      weeklyRepTargets: [
        { isEnabled: true, muscleGroup: "chest", source: "preset", target: 90 },
        { isEnabled: true, muscleGroup: "back", source: "preset", target: 90 },
        { isEnabled: true, muscleGroup: "quads", source: "preset", target: 90 },
        { isEnabled: true, muscleGroup: "hamstrings", source: "preset", target: 90 },
        { isEnabled: true, muscleGroup: "shoulders", source: "preset", target: 45 },
        { isEnabled: true, muscleGroup: "biceps", source: "preset", target: 45 },
        { isEnabled: true, muscleGroup: "triceps", source: "preset", target: 45 },
        { isEnabled: false, muscleGroup: "calves", source: "preset", target: null },
        { isEnabled: false, muscleGroup: "abs", source: "preset", target: null },
      ],
    });
  });

  it("derives estimated sets from weekly rep targets and the selected Rep Range Style", () => {
    const { volumeEstimationRepRange } = getRepRangeStyle("balanced_hypertrophy");
    const { weeklyRepTargets } = createRecommendedTrainingVolumeConfiguration();
    const chestTarget = weeklyRepTargets.find((target) => target.muscleGroup === "chest");
    const shoulderTarget = weeklyRepTargets.find((target) => target.muscleGroup === "shoulders");
    const calvesTarget = weeklyRepTargets.find((target) => target.muscleGroup === "calves");

    if (!chestTarget || !shoulderTarget || !calvesTarget) {
      throw new Error(
        "Expected the recommended default volume targets to include chest, shoulders, and calves.",
      );
    }

    expect(
      estimateWeeklySetRangeForTarget({
        volumeEstimationRepRange,
        weeklyRepTarget: chestTarget,
      }),
    ).toEqual({
      max: 12,
      min: 8,
    });
    expect(
      estimateWeeklySetRangeForTarget({
        volumeEstimationRepRange,
        weeklyRepTarget: shoulderTarget,
      }),
    ).toEqual({
      max: 6,
      min: 4,
    });
    expect(
      estimateWeeklySetRangeForTarget({
        volumeEstimationRepRange,
        weeklyRepTarget: calvesTarget,
      }),
    ).toBeNull();
  });

  it("switches preset-derived weekly rep targets to the selected Volume Preset without enabling optional rows", () => {
    expect(
      selectTrainingVolumeConfiguration({
        trainingVolumeConfiguration: createRecommendedTrainingVolumeConfiguration(),
        volumePreset: "higher_volume",
      }),
    ).toEqual({
      volumePreset: "higher_volume",
      volumePresetSource: "user_selected",
      weeklyRepTargets: [
        { isEnabled: true, muscleGroup: "chest", source: "preset", target: 120 },
        { isEnabled: true, muscleGroup: "back", source: "preset", target: 120 },
        { isEnabled: true, muscleGroup: "quads", source: "preset", target: 120 },
        { isEnabled: true, muscleGroup: "hamstrings", source: "preset", target: 120 },
        { isEnabled: true, muscleGroup: "shoulders", source: "preset", target: 60 },
        { isEnabled: true, muscleGroup: "biceps", source: "preset", target: 60 },
        { isEnabled: true, muscleGroup: "triceps", source: "preset", target: 60 },
        { isEnabled: false, muscleGroup: "calves", source: "preset", target: null },
        { isEnabled: false, muscleGroup: "abs", source: "preset", target: null },
      ],
    });
  });
});
