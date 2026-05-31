import { describe, expect, it } from "vitest";
import {
  confirmTrainingFrequency,
  confirmTrainingSplit,
  createDefaultPlanBlueprint,
  defaultRepRangeStyleId,
  getPlanBuilderRedirectStep,
  getRepRangeStyle,
  getTrainingFrequencyRecommendation,
  hasValidTrainingFrequency,
  isFrequencyStepComplete,
  isRepRangeStyleId,
  isSplitStepComplete,
  isTrainingFrequencyDaysPerWeek,
  type PlanBlueprint,
  selectRepRangeStyle,
  selectTrainingFrequency,
  selectTrainingSplit,
  summarizePlanBlueprint,
  trainingFrequencyOptions,
} from "./plan-blueprint";

const testBlueprintOptions = {
  id: "blueprint-1",
  timestamp: "2026-05-30T10:00:00.000Z",
} as const;

const firstUpdateTimestamp = "2026-05-30T10:05:00.000Z";
const secondUpdateTimestamp = "2026-05-30T10:10:00.000Z";

function createTestPlanBlueprint(overrides: Partial<PlanBlueprint> = {}): PlanBlueprint {
  return {
    ...createDefaultPlanBlueprint(testBlueprintOptions),
    ...overrides,
  };
}

describe("plan blueprint", () => {
  it("creates a default blueprint with the issue-2 assumptions", () => {
    expect(createDefaultPlanBlueprint(testBlueprintOptions)).toEqual({
      id: testBlueprintOptions.id,
      createdAt: testBlueprintOptions.timestamp,
      updatedAt: testBlueprintOptions.timestamp,
      trainingGoal: "build-muscle",
      trainingFrequencyDaysPerWeek: 3,
      split: null,
      repRanges: null,
      volumePreset: null,
      equipment: null,
      confirmedBuilderSteps: {
        frequency: false,
        split: false,
      },
    });
  });

  it("limits training frequency choices to the v1 supported values", () => {
    expect(trainingFrequencyOptions.map((option) => option.daysPerWeek)).toEqual([2, 3, 4, 5]);
    expect(isTrainingFrequencyDaysPerWeek(2)).toBe(true);
    expect(isTrainingFrequencyDaysPerWeek(5)).toBe(true);
    expect(isTrainingFrequencyDaysPerWeek(6)).toBe(false);
  });

  it("updates the selected training frequency without filling future builder choices", () => {
    const blueprint = createTestPlanBlueprint();

    expect(
      selectTrainingFrequency({
        blueprint,
        timestamp: firstUpdateTimestamp,
        trainingFrequencyDaysPerWeek: 5,
      }),
    ).toEqual({
      ...blueprint,
      trainingFrequencyDaysPerWeek: 5,
      updatedAt: firstUpdateTimestamp,
    });
  });

  it("stores a typed split id and derives the user-facing summary from it", () => {
    const blueprint = createTestPlanBlueprint();

    const updatedBlueprint = selectTrainingSplit({
      blueprint,
      timestamp: firstUpdateTimestamp,
      trainingSplitId: "upper-lower-full-body",
    });

    expect(updatedBlueprint).toEqual({
      ...blueprint,
      split: "upper-lower-full-body",
      updatedAt: firstUpdateTimestamp,
    });
    expect(summarizePlanBlueprint(updatedBlueprint).split).toBe("Upper / Lower / Full Body");
  });

  it("keeps Rep Range Style unset on a new blueprint while exposing Balanced hypertrophy as the step-entry default", () => {
    const blueprint = createTestPlanBlueprint();

    expect(defaultRepRangeStyleId).toBe("balanced_hypertrophy");
    expect(blueprint.repRanges).toBeNull();
    expect(summarizePlanBlueprint(blueprint)).toMatchObject({
      nextStep: "Choose a Training Split",
      repRanges: "Choose Rep ranges",
    });
  });

  it("recognizes only approved Rep Range Style ids", () => {
    expect(isRepRangeStyleId("strength_leaning")).toBe(true);
    expect(isRepRangeStyleId("balanced_hypertrophy")).toBe(true);
    expect(isRepRangeStyleId("controlled_higher_reps")).toBe(true);
    expect(isRepRangeStyleId("powerbuilding")).toBe(false);
  });

  it("exposes the Balanced hypertrophy Rep Range Style metadata", () => {
    expect(getRepRangeStyle("balanced_hypertrophy")).toMatchObject({
      id: "balanced_hypertrophy",
      isRecommended: true,
      title: "Balanced hypertrophy",
    });
  });

  it("stores a selected Rep Range Style and summarizes the selected label", () => {
    const blueprint = createTestPlanBlueprint({
      split: "upper-lower-4-day",
      trainingFrequencyDaysPerWeek: 4,
    });

    const updatedBlueprint = selectRepRangeStyle({
      blueprint,
      repRangeStyle: "balanced_hypertrophy",
      timestamp: firstUpdateTimestamp,
    });

    expect(updatedBlueprint).toEqual({
      ...blueprint,
      repRanges: "balanced_hypertrophy",
      updatedAt: firstUpdateTimestamp,
    });
    expect(summarizePlanBlueprint(updatedBlueprint)).toMatchObject({
      nextStep: "Volume",
      repRanges: "Balanced hypertrophy",
    });
  });

  it("rejects invalid Rep Range Style ids", () => {
    const blueprint = createTestPlanBlueprint();

    expect(() =>
      selectRepRangeStyle({
        blueprint,
        repRangeStyle: "powerbuilding" as never,
        timestamp: firstUpdateTimestamp,
      }),
    ).toThrow('Unknown Rep Range Style "powerbuilding".');
  });

  it("clears incompatible selected splits when training frequency changes without resetting other choices", () => {
    const blueprint: PlanBlueprint = createTestPlanBlueprint({
      equipment: "full-gym",
      repRanges: "balanced_hypertrophy",
      split: "upper-lower-full-body",
      volumePreset: "standard",
    });

    expect(
      selectTrainingFrequency({
        blueprint,
        timestamp: secondUpdateTimestamp,
        trainingFrequencyDaysPerWeek: 5,
      }),
    ).toEqual({
      ...blueprint,
      trainingFrequencyDaysPerWeek: 5,
      split: null,
      updatedAt: secondUpdateTimestamp,
    });
  });

  it("preserves a saved Rep Range Style when Training Split and Training Frequency change", () => {
    const blueprint = createTestPlanBlueprint({
      repRanges: "strength_leaning",
      split: "upper-lower-4-day",
      trainingFrequencyDaysPerWeek: 4,
    });

    const blueprintWithNewSplit = selectTrainingSplit({
      blueprint,
      split: "rotating-push-pull-legs",
      timestamp: firstUpdateTimestamp,
    });
    const blueprintWithNewFrequency = selectTrainingFrequency({
      blueprint: blueprintWithNewSplit,
      timestamp: secondUpdateTimestamp,
      trainingFrequencyDaysPerWeek: 3,
    });

    expect(blueprintWithNewSplit.repRanges).toBe("strength_leaning");
    expect(blueprintWithNewFrequency).toMatchObject({
      confirmedBuilderSteps: {
        frequency: false,
        split: false,
      },
      repRanges: "strength_leaning",
      split: null,
      trainingFrequencyDaysPerWeek: 3,
    });
  });

  it("keeps a valid training frequency configurable without treating the step as complete until it is confirmed", () => {
    const blueprint = createTestPlanBlueprint();
    const confirmedBlueprint = confirmTrainingFrequency({
      blueprint,
      timestamp: firstUpdateTimestamp,
      trainingFrequencyDaysPerWeek: blueprint.trainingFrequencyDaysPerWeek,
    });

    const blueprintWithUnsupportedFrequency = {
      ...blueprint,
      trainingFrequencyDaysPerWeek: 6,
    };

    expect(hasValidTrainingFrequency(blueprint)).toBe(true);
    expect(isFrequencyStepComplete(null)).toBe(false);
    expect(isFrequencyStepComplete(blueprint)).toBe(false);
    expect(isFrequencyStepComplete(blueprintWithUnsupportedFrequency)).toBe(false);
    expect(isFrequencyStepComplete(confirmedBlueprint)).toBe(true);
  });

  it("stores confirmed Frequency and Split progress separately from the configured values", () => {
    const blueprint = createTestPlanBlueprint({
      trainingFrequencyDaysPerWeek: 4,
    });

    const confirmedFrequencyBlueprint = confirmTrainingFrequency({
      blueprint,
      timestamp: firstUpdateTimestamp,
      trainingFrequencyDaysPerWeek: 4,
    });
    const confirmedSplitBlueprint = confirmTrainingSplit({
      blueprint: {
        ...confirmedFrequencyBlueprint,
        split: "upper-lower-4-day",
      },
      split: "upper-lower-4-day",
      timestamp: secondUpdateTimestamp,
    });

    expect(confirmedFrequencyBlueprint).toMatchObject({
      confirmedBuilderSteps: {
        frequency: true,
        split: false,
      },
      trainingFrequencyDaysPerWeek: 4,
    });
    expect(isSplitStepComplete(confirmedFrequencyBlueprint)).toBe(false);
    expect(confirmedSplitBlueprint).toMatchObject({
      confirmedBuilderSteps: {
        frequency: true,
        split: true,
      },
      split: "upper-lower-4-day",
    });
    expect(isSplitStepComplete(confirmedSplitBlueprint)).toBe(true);
  });

  it("redirects guarded routes to the earliest unconfirmed or invalid prerequisite step", () => {
    const blueprint = createTestPlanBlueprint({
      confirmedBuilderSteps: {
        frequency: true,
        split: true,
      },
      split: "upper-lower-full-body",
      trainingFrequencyDaysPerWeek: 5,
    });

    expect(getPlanBuilderRedirectStep(createTestPlanBlueprint(), "split")).toBe("frequency");
    expect(getPlanBuilderRedirectStep(createTestPlanBlueprint(), "rep-ranges")).toBe("frequency");
    expect(getPlanBuilderRedirectStep(blueprint, "rep-ranges")).toBe("split");
  });

  it("describes the default 3-day recommendation", () => {
    expect(getTrainingFrequencyRecommendation(3)).toEqual({
      description:
        "Flexible split options, steady recovery, and enough training frequency to build momentum.",
      title: "Practical starting point",
    });
  });

  it("derives split summary details from the selected Training Split", () => {
    const blueprint = createTestPlanBlueprint({
      split: "upper-lower-4-day",
      trainingFrequencyDaysPerWeek: 4,
    });

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
    const blueprint = createTestPlanBlueprint({
      split: "rotating-push-pull-legs",
      trainingFrequencyDaysPerWeek: 4,
    });

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
