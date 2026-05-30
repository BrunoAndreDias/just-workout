import { describe, expect, it } from "vitest";
import { createDefaultPlanBlueprint } from "./plan-blueprint";

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
});
