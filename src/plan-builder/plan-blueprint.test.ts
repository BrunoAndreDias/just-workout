import { describe, expect, it } from "vitest";
import {
  createDefaultPlanBlueprint,
  getTrainingFrequencyRecommendation,
  isFrequencyStepComplete,
  isTrainingFrequencyDaysPerWeek,
  selectTrainingFrequency,
  trainingFrequencyOptions,
} from "./plan-blueprint";

describe("createDefaultPlanBlueprint", () => {
  it("creates a default blueprint with the issue-2 assumptions", () => {
    expect(
      createDefaultPlanBlueprint({
        id: "blueprint-1",
        timestamp: "2026-05-30T10:00:00.000Z",
      }),
    ).toEqual({
      id: "blueprint-1",
      createdAt: "2026-05-30T10:00:00.000Z",
      updatedAt: "2026-05-30T10:00:00.000Z",
      trainingGoal: "build-muscle",
      trainingFrequencyDaysPerWeek: 3,
      split: null,
      repRanges: null,
      volumePreset: null,
      equipment: null,
    });
  });

  it("limits training frequency choices to the v1 supported values", () => {
    expect(trainingFrequencyOptions.map((option) => option.daysPerWeek)).toEqual([2, 3, 4, 5]);
    expect(isTrainingFrequencyDaysPerWeek(2)).toBe(true);
    expect(isTrainingFrequencyDaysPerWeek(5)).toBe(true);
    expect(isTrainingFrequencyDaysPerWeek(6)).toBe(false);
  });

  it("updates the selected training frequency without filling future builder choices", () => {
    const blueprint = createDefaultPlanBlueprint({
      id: "blueprint-1",
      timestamp: "2026-05-30T10:00:00.000Z",
    });

    expect(
      selectTrainingFrequency({
        blueprint,
        timestamp: "2026-05-30T10:05:00.000Z",
        trainingFrequencyDaysPerWeek: 5,
      }),
    ).toEqual({
      ...blueprint,
      trainingFrequencyDaysPerWeek: 5,
      updatedAt: "2026-05-30T10:05:00.000Z",
    });
  });

  it("treats the frequency step as complete only when a supported frequency is available", () => {
    const blueprint = createDefaultPlanBlueprint({
      id: "blueprint-1",
      timestamp: "2026-05-30T10:00:00.000Z",
    });

    const blueprintWithUnsupportedFrequency = {
      ...blueprint,
      trainingFrequencyDaysPerWeek: 6,
    };

    expect(isFrequencyStepComplete(null)).toBe(false);
    expect(isFrequencyStepComplete(blueprintWithUnsupportedFrequency)).toBe(false);
    expect(isFrequencyStepComplete(blueprint)).toBe(true);
  });

  it("describes the default 3-day recommendation", () => {
    expect(getTrainingFrequencyRecommendation(3)).toEqual({
      description:
        "Flexible split options, steady recovery, and enough training frequency to build momentum.",
      title: "Practical starting point",
    });
  });
});
