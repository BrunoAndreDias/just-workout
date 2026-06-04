import { describe, expect, it } from "vitest";
import type { ExerciseSelectionPreferences } from "./exercise-selection-preferences";
import {
  confirmExerciseSelectionPreferences,
  confirmRepRangeStyle,
  confirmTrainingFrequency,
  confirmTrainingSplit,
  createDefaultPlanBlueprint,
  getPlanBuilderRedirectStep,
  getTrainingFrequencyRecommendation,
  type PlanBlueprint,
  selectRepRangeStyle,
  selectTrainingFrequency,
  selectTrainingSplit,
  selectTrainingVolumePreset,
  setOptionalVolumeTargetEnabled,
  summarizePlanBlueprint,
} from "./plan-blueprint";
import { createRecommendedTrainingVolumeConfiguration } from "./training-volume";

const testBlueprintOptions = {
  id: "blueprint-1",
  timestamp: "2026-05-30T10:00:00.000Z",
} as const;

const firstUpdateTimestamp = "2026-05-30T10:05:00.000Z";
const secondUpdateTimestamp = "2026-05-30T10:10:00.000Z";

type TestPlanBlueprintOverrides = Omit<Partial<PlanBlueprint>, "confirmedBuilderSteps"> & {
  confirmedBuilderSteps?: Partial<PlanBlueprint["confirmedBuilderSteps"]>;
};

function createTestPlanBlueprint(overrides: TestPlanBlueprintOverrides = {}): PlanBlueprint {
  const defaultBlueprint = createDefaultPlanBlueprint(testBlueprintOptions);

  return {
    ...defaultBlueprint,
    ...overrides,
    confirmedBuilderSteps: {
      ...defaultBlueprint.confirmedBuilderSteps,
      ...overrides.confirmedBuilderSteps,
    },
  };
}

const confirmedPlanBlueprintSteps = {
  exercises: false,
  frequency: true,
  repRanges: true,
  split: true,
  volume: true,
} satisfies PlanBlueprint["confirmedBuilderSteps"];

function createConfirmedPlanBlueprint(overrides: TestPlanBlueprintOverrides = {}): PlanBlueprint {
  return createTestPlanBlueprint({
    ...createRecommendedTrainingVolumeConfiguration(),
    repRanges: "balanced_hypertrophy",
    split: "upper-lower-4-day",
    trainingFrequencyDaysPerWeek: 4,
    ...overrides,
    confirmedBuilderSteps: {
      ...confirmedPlanBlueprintSteps,
      ...overrides.confirmedBuilderSteps,
    },
  });
}

describe("plan blueprint invalidation and redirects", () => {
  it("marks Volume unconfirmed when a confirmed Volume Preset changes", () => {
    const blueprint = createTestPlanBlueprint({
      ...createRecommendedTrainingVolumeConfiguration(),
      confirmedBuilderSteps: {
        frequency: true,
        repRanges: true,
        split: true,
        volume: true,
      },
      repRanges: "balanced_hypertrophy",
      split: "upper-lower-4-day",
      trainingFrequencyDaysPerWeek: 4,
    });

    expect(
      selectTrainingVolumePreset({
        blueprint,
        timestamp: secondUpdateTimestamp,
        volumePreset: "conservative",
      }),
    ).toMatchObject({
      confirmedBuilderSteps: {
        frequency: true,
        repRanges: true,
        split: true,
        volume: false,
      },
      volumePreset: "conservative",
      volumePresetSource: "user_selected",
      weeklyRepTargets: [
        { isEnabled: true, muscleGroup: "chest", source: "preset", target: 60 },
        { isEnabled: true, muscleGroup: "back", source: "preset", target: 60 },
        { isEnabled: true, muscleGroup: "quads", source: "preset", target: 60 },
        { isEnabled: true, muscleGroup: "hamstrings", source: "preset", target: 60 },
        { isEnabled: true, muscleGroup: "shoulders", source: "preset", target: 30 },
        { isEnabled: true, muscleGroup: "biceps", source: "preset", target: 30 },
        { isEnabled: true, muscleGroup: "triceps", source: "preset", target: 30 },
        { isEnabled: false, muscleGroup: "calves", source: "preset", target: null },
        { isEnabled: false, muscleGroup: "abs", source: "preset", target: null },
      ],
    });
  });

  it("marks Volume unconfirmed when an optional Weekly Rep Target is added or removed", () => {
    const blueprint = createTestPlanBlueprint({
      ...createRecommendedTrainingVolumeConfiguration(),
      confirmedBuilderSteps: {
        frequency: true,
        repRanges: true,
        split: true,
        volume: true,
      },
      repRanges: "balanced_hypertrophy",
      split: "upper-lower-4-day",
      trainingFrequencyDaysPerWeek: 4,
    });

    const enabledBlueprint = setOptionalVolumeTargetEnabled({
      blueprint,
      isEnabled: true,
      muscleGroup: "calves",
      timestamp: firstUpdateTimestamp,
    });

    expect(enabledBlueprint).toMatchObject({
      confirmedBuilderSteps: {
        frequency: true,
        repRanges: true,
        split: true,
        volume: false,
      },
      weeklyRepTargets: [
        { isEnabled: true, muscleGroup: "chest", source: "preset", target: 90 },
        { isEnabled: true, muscleGroup: "back", source: "preset", target: 90 },
        { isEnabled: true, muscleGroup: "quads", source: "preset", target: 90 },
        { isEnabled: true, muscleGroup: "hamstrings", source: "preset", target: 90 },
        { isEnabled: true, muscleGroup: "shoulders", source: "preset", target: 45 },
        { isEnabled: true, muscleGroup: "biceps", source: "preset", target: 45 },
        { isEnabled: true, muscleGroup: "triceps", source: "preset", target: 45 },
        { isEnabled: true, muscleGroup: "calves", source: "preset", target: 45 },
        { isEnabled: false, muscleGroup: "abs", source: "preset", target: null },
      ],
    });

    expect(
      setOptionalVolumeTargetEnabled({
        blueprint: {
          ...enabledBlueprint,
          confirmedBuilderSteps: {
            ...enabledBlueprint.confirmedBuilderSteps,
            volume: true,
          },
        },
        isEnabled: false,
        muscleGroup: "calves",
        timestamp: secondUpdateTimestamp,
      }),
    ).toMatchObject({
      confirmedBuilderSteps: {
        frequency: true,
        repRanges: true,
        split: true,
        volume: false,
      },
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

  it("preserves compatible configured Split, Rep ranges, and Volume data when Frequency changes while invalidating only dependent confirmations", () => {
    const blueprint = createConfirmedPlanBlueprint({
      repRanges: "controlled_higher_reps",
      split: "rotating-push-pull-legs",
      trainingFrequencyDaysPerWeek: 4,
    });

    const frequencyChangedBlueprint = selectTrainingFrequency({
      blueprint,
      timestamp: firstUpdateTimestamp,
      trainingFrequencyDaysPerWeek: 5,
    });

    expect(frequencyChangedBlueprint).toMatchObject({
      ...createRecommendedTrainingVolumeConfiguration(),
      confirmedBuilderSteps: {
        frequency: false,
        repRanges: true,
        split: false,
        volume: true,
      },
      repRanges: "controlled_higher_reps",
      split: "rotating-push-pull-legs",
      trainingFrequencyDaysPerWeek: 5,
    });
    expect(getPlanBuilderRedirectStep(frequencyChangedBlueprint, "exercises")).toBe("frequency");

    const reconfirmedFrequencyBlueprint = confirmTrainingFrequency({
      blueprint: frequencyChangedBlueprint,
      timestamp: secondUpdateTimestamp,
      trainingFrequencyDaysPerWeek: 5,
    });
    const reconfirmedSplitBlueprint = confirmTrainingSplit({
      blueprint: reconfirmedFrequencyBlueprint,
      split: "rotating-push-pull-legs",
      timestamp: secondUpdateTimestamp,
    });

    expect(getPlanBuilderRedirectStep(reconfirmedFrequencyBlueprint, "exercises")).toBe(
      "frequency",
    );
    expect(getPlanBuilderRedirectStep(reconfirmedSplitBlueprint, "exercises")).toBeNull();
  });

  it("preserves saved Rep ranges and Volume data when Split changes while invalidating only downstream readiness", () => {
    const blueprint = createConfirmedPlanBlueprint({
      repRanges: "strength_leaning",
      split: "full-body-3-day",
      trainingFrequencyDaysPerWeek: 3,
    });

    const splitChangedBlueprint = selectTrainingSplit({
      blueprint,
      split: "alternating-full-body-a-b",
      timestamp: firstUpdateTimestamp,
    });

    expect(splitChangedBlueprint).toMatchObject({
      ...createRecommendedTrainingVolumeConfiguration(),
      confirmedBuilderSteps: {
        frequency: true,
        repRanges: true,
        split: false,
        volume: true,
      },
      repRanges: "strength_leaning",
      split: "alternating-full-body-a-b",
    });
    expect(getPlanBuilderRedirectStep(splitChangedBlueprint, "exercises")).toBe("frequency");

    expect(
      getPlanBuilderRedirectStep(
        confirmTrainingSplit({
          blueprint: splitChangedBlueprint,
          split: "alternating-full-body-a-b",
          timestamp: secondUpdateTimestamp,
        }),
        "exercises",
      ),
    ).toBeNull();
  });

  it("preserves Exercise Selection Preferences and invalidates Exercises when Split changes", () => {
    const exerciseSelectionPreferences = {
      avoidedExercises: [{ id: "avoided-1", rawText: "Behind the neck press" }],
      equipmentPreset: "full_gym",
      preferredExercises: [{ id: "preferred-1", rawText: "Hack squat" }],
      strategy: "balanced",
    } satisfies ExerciseSelectionPreferences;
    const blueprint = confirmExerciseSelectionPreferences({
      blueprint: createConfirmedPlanBlueprint({
        exerciseSelectionPreferences,
      }),
      timestamp: firstUpdateTimestamp,
    });

    const splitChangedBlueprint = selectTrainingSplit({
      blueprint,
      split: "rotating-push-pull-legs",
      timestamp: secondUpdateTimestamp,
    });

    expect(splitChangedBlueprint).toMatchObject({
      confirmedBuilderSteps: {
        exercises: false,
        frequency: true,
        repRanges: true,
        split: false,
        volume: true,
      },
      exerciseSelectionPreferences,
      split: "rotating-push-pull-legs",
    });
    expect(getPlanBuilderRedirectStep(splitChangedBlueprint, "review")).toBe("frequency");

    expect(
      getPlanBuilderRedirectStep(
        confirmTrainingSplit({
          blueprint: splitChangedBlueprint,
          split: "rotating-push-pull-legs",
          timestamp: "2026-05-30T10:15:00.000Z",
        }),
        "review",
      ),
    ).toBe("exercises");
  });

  it("preserves canonical Weekly Rep Targets when Rep ranges change while invalidating Volume confirmation", () => {
    const blueprint = createConfirmedPlanBlueprint({
      repRanges: "balanced_hypertrophy",
      split: "upper-lower-4-day",
      trainingFrequencyDaysPerWeek: 4,
    });

    const repRangesChangedBlueprint = selectRepRangeStyle({
      blueprint,
      repRangeStyle: "strength_leaning",
      timestamp: firstUpdateTimestamp,
    });

    expect(repRangesChangedBlueprint).toMatchObject({
      ...createRecommendedTrainingVolumeConfiguration(),
      confirmedBuilderSteps: {
        frequency: true,
        repRanges: false,
        split: true,
        volume: false,
      },
      repRanges: "strength_leaning",
    });
    expect(getPlanBuilderRedirectStep(repRangesChangedBlueprint, "exercises")).toBe("rep-ranges");

    expect(
      getPlanBuilderRedirectStep(
        confirmRepRangeStyle({
          blueprint: repRangesChangedBlueprint,
          repRangeStyle: "strength_leaning",
          timestamp: secondUpdateTimestamp,
        }),
        "exercises",
      ),
    ).toBe("volume");
  });

  it("preserves Exercise Selection Preferences while invalidating confirmed Exercises when Rep ranges change", () => {
    const exerciseSelectionPreferences = {
      avoidedExercises: [{ id: "avoided-1", rawText: "Behind the neck press" }],
      equipmentPreset: "full_gym",
      preferredExercises: [{ id: "preferred-1", rawText: "Hack squat" }],
      strategy: "balanced",
    } satisfies ExerciseSelectionPreferences;
    const blueprint = createConfirmedPlanBlueprint({
      confirmedBuilderSteps: {
        exercises: true,
      },
      exerciseSelectionPreferences,
      repRanges: "balanced_hypertrophy",
      split: "upper-lower-4-day",
      trainingFrequencyDaysPerWeek: 4,
    });

    const repRangesChangedBlueprint = selectRepRangeStyle({
      blueprint,
      repRangeStyle: "strength_leaning",
      timestamp: firstUpdateTimestamp,
    });

    expect(repRangesChangedBlueprint).toMatchObject({
      confirmedBuilderSteps: {
        exercises: false,
        frequency: true,
        repRanges: false,
        split: true,
        volume: false,
      },
      exerciseSelectionPreferences,
      repRanges: "strength_leaning",
    });
    expect(getPlanBuilderRedirectStep(repRangesChangedBlueprint, "review")).toBe("rep-ranges");
  });

  it("redirects guarded routes to the earliest unconfirmed or invalid prerequisite step", () => {
    const blueprintWithIncompatibleSplit = createTestPlanBlueprint({
      confirmedBuilderSteps: {
        frequency: true,
        repRanges: false,
        split: true,
        volume: false,
      },
      split: "upper-lower-full-body",
      trainingFrequencyDaysPerWeek: 5,
    });
    const blueprintWithUnconfirmedRepRanges = createTestPlanBlueprint({
      confirmedBuilderSteps: {
        frequency: true,
        repRanges: false,
        split: true,
        volume: false,
      },
      repRanges: "balanced_hypertrophy",
      split: "upper-lower-4-day",
      trainingFrequencyDaysPerWeek: 4,
    });
    const blueprintWithInvalidRepRanges = createTestPlanBlueprint({
      confirmedBuilderSteps: {
        frequency: true,
        repRanges: true,
        split: true,
        volume: false,
      },
      repRanges: "powerbuilding" as never,
      split: "upper-lower-4-day",
      trainingFrequencyDaysPerWeek: 4,
    });
    const blueprintWithUnconfirmedVolume = createTestPlanBlueprint({
      ...createRecommendedTrainingVolumeConfiguration(),
      confirmedBuilderSteps: {
        frequency: true,
        repRanges: true,
        split: true,
        volume: false,
      },
      repRanges: "balanced_hypertrophy",
      split: "upper-lower-4-day",
      trainingFrequencyDaysPerWeek: 4,
    });
    const blueprintWithInvalidVolume = createTestPlanBlueprint({
      confirmedBuilderSteps: {
        frequency: true,
        repRanges: true,
        split: true,
        volume: true,
      },
      repRanges: "balanced_hypertrophy",
      split: "upper-lower-4-day",
      trainingFrequencyDaysPerWeek: 4,
      volumePreset: null,
      volumePresetSource: null,
      weeklyRepTargets: null,
    });
    const blueprintWithUnconfirmedExercises = createConfirmedPlanBlueprint({});
    const blueprintWithConfirmedExercises = createConfirmedPlanBlueprint({
      confirmedBuilderSteps: {
        exercises: true,
      },
    });

    expect(getPlanBuilderRedirectStep(createTestPlanBlueprint(), "rep-ranges")).toBe("frequency");
    expect(getPlanBuilderRedirectStep(blueprintWithIncompatibleSplit, "rep-ranges")).toBe(
      "frequency",
    );
    expect(getPlanBuilderRedirectStep(blueprintWithUnconfirmedRepRanges, "volume")).toBe(
      "rep-ranges",
    );
    expect(getPlanBuilderRedirectStep(blueprintWithInvalidRepRanges, "volume")).toBe("rep-ranges");
    expect(getPlanBuilderRedirectStep(blueprintWithUnconfirmedVolume, "exercises")).toBe("volume");
    expect(getPlanBuilderRedirectStep(blueprintWithInvalidVolume, "exercises")).toBe("volume");
    expect(getPlanBuilderRedirectStep(blueprintWithUnconfirmedVolume, "review")).toBe("volume");
    expect(getPlanBuilderRedirectStep(blueprintWithUnconfirmedExercises, "review")).toBe(
      "exercises",
    );
    expect(getPlanBuilderRedirectStep(blueprintWithConfirmedExercises, "review")).toBeNull();
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
      generationStatus: "Not ready yet",
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
