import { describe, expect, it } from "vitest";
import {
  confirmExerciseSelectionPreferences,
  confirmRepRangeStyle,
  confirmTrainingFrequency,
  confirmTrainingSplit,
  confirmTrainingVolume,
  createDefaultPlanBlueprint,
  defaultRepRangeStyleId,
  getRepRangeStyle,
  hasValidTrainingFrequency,
  isExercisesStepComplete,
  isFrequencyStepComplete,
  isRepRangeStyleId,
  isRepRangesStepComplete,
  isSplitStepComplete,
  isTrainingFrequencyDaysPerWeek,
  isVolumeStepComplete,
  normalizePlanBlueprint,
  type PlanBlueprint,
  selectRepRangeStyle,
  selectTrainingFrequency,
  selectTrainingSplit,
  summarizePlanBlueprint,
  trainingFrequencyOptions,
  updateExerciseSelectionPreferences,
} from "./plan-blueprint";
import { createRecommendedTrainingVolumeConfiguration } from "./training-volume";

const testBlueprintOptions = {
  id: "blueprint-1",
  timestamp: "2026-05-30T10:00:00.000Z",
} as const;

const completeMainCompoundSelections = [
  {
    exerciseId: "flat-barbell-or-dumbbell-bench-press",
    movementPattern: "horizontal_push",
  },
  {
    exerciseId: "bent-over-barbell-or-dumbbell-rows",
    movementPattern: "horizontal_pull",
  },
  {
    exerciseId: "standing-overhead-barbell-or-dumbbell-press",
    movementPattern: "vertical_push",
  },
  {
    exerciseId: "pull-ups",
    movementPattern: "vertical_pull",
  },
  {
    exerciseId: "barbell-or-dumbbell-squats",
    movementPattern: "quad_dominant",
  },
  {
    exerciseId: "barbell-or-dumbbell-romanian-deadlifts",
    movementPattern: "hip_hamstring_dominant",
  },
] as const;

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

describe("plan blueprint", () => {
  it("creates a default blueprint with the issue-2 assumptions plus Exercise Selection Preferences defaults", () => {
    expect(createDefaultPlanBlueprint(testBlueprintOptions)).toEqual({
      id: testBlueprintOptions.id,
      createdAt: testBlueprintOptions.timestamp,
      updatedAt: testBlueprintOptions.timestamp,
      trainingGoal: "build-muscle",
      trainingFrequencyDaysPerWeek: 3,
      split: null,
      repRanges: null,
      volumePreset: null,
      volumePresetSource: null,
      weeklyRepTargets: null,
      mainCompoundSelections: [],
      exerciseSelectionPreferences: {
        avoidedExercises: [],
        equipmentPreset: "full_gym",
        preferredExercises: [],
        strategy: "balanced",
      },
      confirmedBuilderSteps: {
        exercises: false,
        frequency: false,
        repRanges: false,
        split: false,
        volume: false,
      },
    });
  });

  it("normalizes missing or malformed Exercise Selection Preferences to the v1 defaults while preserving valid exercise items", () => {
    expect(
      normalizePlanBlueprint({
        createdAt: testBlueprintOptions.timestamp,
        id: testBlueprintOptions.id,
        trainingFrequencyDaysPerWeek: 3,
        trainingGoal: "build-muscle",
        repRanges: null,
        split: null,
        updatedAt: testBlueprintOptions.timestamp,
      }),
    ).toMatchObject({
      mainCompoundSelections: [],
      exerciseSelectionPreferences: {
        avoidedExercises: [],
        equipmentPreset: "full_gym",
        preferredExercises: [],
        strategy: "balanced",
      },
    });

    expect(
      normalizePlanBlueprint({
        createdAt: testBlueprintOptions.timestamp,
        exerciseSelectionPreferences: {
          avoidedExercises: [
            { id: "avoided-1", rawText: "Behind-the-neck press" },
            { rawText: "Missing id" },
          ],
          ignored: true,
          equipmentPreset: "garage_gym",
          preferredExercises: [
            { id: "preferred-1", matchedExerciseId: "exercise-42", rawText: "Incline press" },
            { id: 42, rawText: "Bad item" },
          ],
          strategy: "unsupported",
        },
        id: testBlueprintOptions.id,
        trainingFrequencyDaysPerWeek: 3,
        trainingGoal: "build-muscle",
        repRanges: null,
        split: null,
        updatedAt: testBlueprintOptions.timestamp,
        mainCompoundSelections: [
          {
            exerciseId: "flat-barbell-or-dumbbell-bench-press",
            movementPattern: "horizontal_push",
          },
          {
            exerciseId: "flat-dumbbell-flyes",
            movementPattern: "horizontal_push",
            updatedAt: 42 as unknown as string,
          },
          {
            exerciseId: "pull-ups",
            movementPattern: "vertical_pull",
            updatedAt: "2026-05-30T10:05:00.000Z",
          },
          {
            exerciseId: "not-a-real-exercise",
            movementPattern: "elbow_extension" as unknown as "horizontal_push",
          },
        ],
      }),
    ).toMatchObject({
      mainCompoundSelections: [
        {
          exerciseId: "flat-dumbbell-flyes",
          movementPattern: "horizontal_push",
        },
        {
          exerciseId: "pull-ups",
          movementPattern: "vertical_pull",
          updatedAt: "2026-05-30T10:05:00.000Z",
        },
      ],
      exerciseSelectionPreferences: {
        avoidedExercises: [{ id: "avoided-1", rawText: "Behind-the-neck press" }],
        equipmentPreset: "full_gym",
        preferredExercises: [
          { id: "preferred-1", matchedExerciseId: "exercise-42", rawText: "Incline press" },
        ],
        strategy: "balanced",
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
      volumeEstimationRepRange: {
        max: 12,
        min: 8,
      },
    });
  });

  it("stores a selected Rep Range Style and summarizes the selected label", () => {
    const blueprint = createTestPlanBlueprint({
      confirmedBuilderSteps: {
        frequency: true,
        repRanges: false,
        split: true,
        volume: false,
      },
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
      repRanges: "balanced_hypertrophy",
      split: "upper-lower-full-body",
      volumePreset: "balanced",
      volumePresetSource: "recommended_default",
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
        repRanges: false,
        split: false,
        volume: false,
      },
      trainingFrequencyDaysPerWeek: 4,
    });
    expect(isSplitStepComplete(confirmedFrequencyBlueprint)).toBe(false);
    expect(confirmedSplitBlueprint).toMatchObject({
      confirmedBuilderSteps: {
        frequency: true,
        repRanges: false,
        split: true,
        volume: false,
      },
      split: "upper-lower-4-day",
    });
    expect(isSplitStepComplete(confirmedSplitBlueprint)).toBe(true);
  });

  it("stores confirmed Rep ranges progress separately from the selected Rep Range Style", () => {
    const blueprint = createTestPlanBlueprint({
      confirmedBuilderSteps: {
        frequency: true,
        repRanges: false,
        split: true,
        volume: false,
      },
      split: "upper-lower-4-day",
      trainingFrequencyDaysPerWeek: 4,
    });

    const selectedBlueprint = selectRepRangeStyle({
      blueprint,
      repRangeStyle: "balanced_hypertrophy",
      timestamp: firstUpdateTimestamp,
    });
    const confirmedBlueprint = confirmRepRangeStyle({
      blueprint: selectedBlueprint,
      repRangeStyle: "balanced_hypertrophy",
      timestamp: secondUpdateTimestamp,
    });

    expect(selectedBlueprint).toMatchObject({
      confirmedBuilderSteps: {
        frequency: true,
        repRanges: false,
        split: true,
        volume: false,
      },
      repRanges: "balanced_hypertrophy",
    });
    expect(isRepRangesStepComplete(selectedBlueprint)).toBe(false);
    expect(confirmedBlueprint).toMatchObject({
      confirmedBuilderSteps: {
        frequency: true,
        repRanges: true,
        split: true,
        volume: false,
      },
      repRanges: "balanced_hypertrophy",
    });
    expect(isRepRangesStepComplete(confirmedBlueprint)).toBe(true);
  });

  it("stores confirmed Volume progress separately from the configured Weekly Rep Targets", () => {
    const blueprint = createTestPlanBlueprint({
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

    const confirmedBlueprint = confirmTrainingVolume({
      blueprint,
      timestamp: secondUpdateTimestamp,
    });

    expect(isVolumeStepComplete(blueprint)).toBe(false);
    expect(confirmedBlueprint).toMatchObject({
      confirmedBuilderSteps: {
        frequency: true,
        repRanges: true,
        split: true,
        volume: true,
      },
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
    expect(isVolumeStepComplete(confirmedBlueprint)).toBe(true);
  });

  it("stores confirmed Exercises progress separately from draft Exercise Selection Preferences", () => {
    const blueprint = createConfirmedPlanBlueprint({
      mainCompoundSelections: completeMainCompoundSelections,
    });

    const confirmedBlueprint = confirmExerciseSelectionPreferences({
      blueprint,
      timestamp: firstUpdateTimestamp,
    });
    const updatedBlueprint = updateExerciseSelectionPreferences({
      blueprint: confirmedBlueprint,
      exerciseSelectionPreferences: {
        ...confirmedBlueprint.exerciseSelectionPreferences,
        preferredExercises: [{ id: "preferred-1", rawText: "Incline dumbbell press" }],
      },
      timestamp: secondUpdateTimestamp,
    });

    expect(isExercisesStepComplete(blueprint)).toBe(false);
    expect(isExercisesStepComplete(confirmedBlueprint)).toBe(true);
    expect(updatedBlueprint).toMatchObject({
      confirmedBuilderSteps: {
        exercises: false,
        frequency: true,
        repRanges: true,
        split: true,
        volume: true,
      },
      exerciseSelectionPreferences: {
        preferredExercises: [{ id: "preferred-1", rawText: "Incline dumbbell press" }],
      },
    });
  });

  it("summarizes Exercises as the next step once Volume is confirmed", () => {
    const blueprint = createConfirmedPlanBlueprint({});

    expect(summarizePlanBlueprint(blueprint)).toMatchObject({
      nextStep: "Exercises",
      repRanges: "Balanced hypertrophy",
      split: "4-Day Upper/Lower",
      volumePreset: "Balanced",
    });
  });

  it("summarizes Review as the next step once Exercises is confirmed", () => {
    const blueprint = confirmExerciseSelectionPreferences({
      blueprint: createConfirmedPlanBlueprint({
        mainCompoundSelections: completeMainCompoundSelections,
      }),
      timestamp: firstUpdateTimestamp,
    });

    expect(summarizePlanBlueprint(blueprint)).toMatchObject({
      nextStep: "Review",
    });
  });

  it("blocks Exercises confirmation when required Weekly Movement Coverage is missing", () => {
    expect(() =>
      confirmExerciseSelectionPreferences({
        blueprint: createConfirmedPlanBlueprint({
          mainCompoundSelections: [
            {
              exerciseId: "flat-barbell-or-dumbbell-bench-press",
              movementPattern: "horizontal_push",
            },
            {
              exerciseId: "bent-over-barbell-or-dumbbell-rows",
              movementPattern: "horizontal_pull",
            },
          ],
        }),
        timestamp: firstUpdateTimestamp,
      }),
    ).toThrowError(
      "Exercises cannot be confirmed while required Weekly Movement Coverage is missing.",
    );
  });
});
