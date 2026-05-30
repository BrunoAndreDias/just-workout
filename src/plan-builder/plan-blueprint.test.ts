import { describe, expect, it } from "vitest";
import {
  createDefaultPlanBlueprint,
  defaultRepRangeStyleId,
  getRepRangeStyle,
  getTrainingFrequencyRecommendation,
  isFrequencyStepComplete,
  isRepRangeStyleId,
  isTrainingFrequencyDaysPerWeek,
  type PlanBlueprint,
  selectRepRangeStyle,
  selectTrainingFrequency,
  selectTrainingSplit,
  summarizePlanBlueprint,
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

  it("stores a typed split id and derives the user-facing summary from it", () => {
    const blueprint = createDefaultPlanBlueprint({
      id: "blueprint-1",
      timestamp: "2026-05-30T10:00:00.000Z",
    });

    const updatedBlueprint = selectTrainingSplit({
      blueprint,
      timestamp: "2026-05-30T10:05:00.000Z",
      trainingSplitId: "upper-lower-full-body",
    });

    expect(updatedBlueprint).toEqual({
      ...blueprint,
      split: "upper-lower-full-body",
      updatedAt: "2026-05-30T10:05:00.000Z",
    });
    expect(summarizePlanBlueprint(updatedBlueprint).split).toBe("Upper / Lower / Full Body");
  });

  it("keeps Rep Range Style unset on a new blueprint while exposing Balanced hypertrophy as the step-entry default", () => {
    const blueprint = createDefaultPlanBlueprint({
      id: "blueprint-1",
      timestamp: "2026-05-30T10:00:00.000Z",
    });

    expect(defaultRepRangeStyleId).toBe("balanced_hypertrophy");
    expect(blueprint.repRanges).toBeNull();
    expect(summarizePlanBlueprint(blueprint)).toMatchObject({
      nextStep: "Choose a Training Split",
      repRanges: "Choose Rep ranges",
    });
  });

  it("supports the approved Rep Range Styles, stores the selection, and summarizes the selected label", () => {
    const blueprint = {
      ...createDefaultPlanBlueprint({
        id: "blueprint-1",
        timestamp: "2026-05-30T10:00:00.000Z",
      }),
      split: "upper-lower-4-day" as const,
      trainingFrequencyDaysPerWeek: 4 as const,
    };

    const updatedBlueprint = selectRepRangeStyle({
      blueprint,
      repRangeStyle: "balanced_hypertrophy",
      timestamp: "2026-05-30T10:05:00.000Z",
    });

    expect(isRepRangeStyleId("strength_leaning")).toBe(true);
    expect(isRepRangeStyleId("balanced_hypertrophy")).toBe(true);
    expect(isRepRangeStyleId("controlled_higher_reps")).toBe(true);
    expect(isRepRangeStyleId("powerbuilding")).toBe(false);
    expect(getRepRangeStyle("balanced_hypertrophy")).toMatchObject({
      id: "balanced_hypertrophy",
      isRecommended: true,
      title: "Balanced hypertrophy",
    });
    expect(updatedBlueprint).toEqual({
      ...blueprint,
      repRanges: "balanced_hypertrophy",
      updatedAt: "2026-05-30T10:05:00.000Z",
    });
    expect(summarizePlanBlueprint(updatedBlueprint)).toMatchObject({
      nextStep: "Volume",
      repRanges: "Balanced hypertrophy",
    });
  });

  it("clears incompatible selected splits when training frequency changes without resetting other choices", () => {
    const blueprint: PlanBlueprint = {
      ...createDefaultPlanBlueprint({
        id: "blueprint-1",
        timestamp: "2026-05-30T10:00:00.000Z",
      }),
      equipment: "full-gym",
      repRanges: "balanced_hypertrophy",
      split: "upper-lower-full-body" as const,
      volumePreset: "standard",
    };

    expect(
      selectTrainingFrequency({
        blueprint,
        timestamp: "2026-05-30T10:10:00.000Z",
        trainingFrequencyDaysPerWeek: 5,
      }),
    ).toEqual({
      ...blueprint,
      trainingFrequencyDaysPerWeek: 5,
      split: null,
      updatedAt: "2026-05-30T10:10:00.000Z",
    });
  });

  it("preserves a saved Rep Range Style when Training Split and Training Frequency change", () => {
    const blueprint = {
      ...createDefaultPlanBlueprint({
        id: "blueprint-1",
        timestamp: "2026-05-30T10:00:00.000Z",
      }),
      repRanges: "strength_leaning" as const,
      split: "upper-lower-4-day" as const,
      trainingFrequencyDaysPerWeek: 4 as const,
    };

    const blueprintWithNewSplit = selectTrainingSplit({
      blueprint,
      split: "rotating-push-pull-legs",
      timestamp: "2026-05-30T10:05:00.000Z",
    });
    const blueprintWithNewFrequency = selectTrainingFrequency({
      blueprint: blueprintWithNewSplit,
      timestamp: "2026-05-30T10:10:00.000Z",
      trainingFrequencyDaysPerWeek: 3,
    });

    expect(blueprintWithNewSplit.repRanges).toBe("strength_leaning");
    expect(blueprintWithNewFrequency).toMatchObject({
      repRanges: "strength_leaning",
      split: null,
      trainingFrequencyDaysPerWeek: 3,
    });
  });

  it("rejects invalid Rep Range Style ids", () => {
    const blueprint = createDefaultPlanBlueprint({
      id: "blueprint-1",
      timestamp: "2026-05-30T10:00:00.000Z",
    });

    expect(() =>
      selectRepRangeStyle({
        blueprint,
        repRangeStyle: "powerbuilding" as never,
        timestamp: "2026-05-30T10:05:00.000Z",
      }),
    ).toThrow('Unknown Rep Range Style "powerbuilding".');
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

  it("derives split summary details from the selected Training Split", () => {
    const blueprint = {
      ...createDefaultPlanBlueprint({
        id: "blueprint-1",
        timestamp: "2026-05-30T10:00:00.000Z",
      }),
      split: "upper-lower-4-day" as const,
      trainingFrequencyDaysPerWeek: 4 as const,
    };

    expect(summarizePlanBlueprint(blueprint)).toMatchObject({
      generationStatus: "No Training Plan yet. Review creates the full Training Plan.",
      muscleFrequency:
        "Each major muscle group is trained about twice per week with focused volume.",
      nextStep: "Rep ranges",
      recovery:
        "Upper and lower sessions alternate so each region gets recovery before the next hard effort.",
      split: "4-Day Upper/Lower",
      splitStatus: "Recommended",
      trainingFrequency: "4 days/week",
      trainingFrequencyStatus: "Completed",
      weeklyRhythm: "Two upper sessions and two lower sessions in a stable weekly layout.",
    });
  });

  it("marks a compatible alternative split without losing the derived blueprint details", () => {
    const blueprint = {
      ...createDefaultPlanBlueprint({
        id: "blueprint-1",
        timestamp: "2026-05-30T10:00:00.000Z",
      }),
      split: "rotating-push-pull-legs" as const,
      trainingFrequencyDaysPerWeek: 4 as const,
    };

    expect(summarizePlanBlueprint(blueprint)).toMatchObject({
      muscleFrequency:
        "Most muscle groups are trained every 4-6 days as the push, pull, and legs cycle keeps rotating.",
      recovery:
        "The cycle separates related stress across different session types, but calendar-week recovery can flex with your schedule.",
      split: "Rotating Push/Pull/Legs",
      splitStatus: "Also works",
      weeklyRhythm:
        "A rotating Push/Pull/Legs cycle that flexes across available weekdays instead of locking to one fixed week.",
    });
  });
});
