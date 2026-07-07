import { describe, expect, it, vi } from "vitest";
import type { PlanBlueprint } from "../plan-builder/plan-blueprint";
import { completeMainCompoundSelections } from "../plan-builder/plan-builder-test-fixtures";
import { createPresetWeeklyRepTargets } from "../training-taxonomy";
import type { TrainingPlan } from "./training-plan";
import {
  acceptTrainingPlanDraftFromCurrentPlanBlueprint,
  generateActiveTrainingPlanFromCurrentPlanBlueprint,
  generateTrainingPlanDraftFromCurrentPlanBlueprint,
  resetTrainingPlanDraftFromCurrentPlanBlueprint,
  saveTrainingPlanDraftSetupFromCurrentPlanBlueprint,
} from "./training-plan-generation";

describe("generateActiveTrainingPlanFromCurrentPlanBlueprint", () => {
  it("loads and normalizes the current Plan Blueprint before saving the generated Active Training Plan", async () => {
    const legacyBlueprint: Partial<PlanBlueprint> = createCompleteBlueprint();

    delete legacyBlueprint.mainCompoundRotationPools;

    const savedTrainingPlans: TrainingPlan[] = [];
    const trainingPlan = await generateActiveTrainingPlanFromCurrentPlanBlueprint({
      createTrainingPlanId: () => "training-plan-test",
      getCurrentPlanBlueprint: async () => legacyBlueprint as PlanBlueprint,
      getTimestamp: () => "2026-06-07T10:00:00.000Z",
      saveActiveTrainingPlan: async (plan) => {
        savedTrainingPlans.push(plan);

        return plan;
      },
    });

    expect(savedTrainingPlans).toHaveLength(1);
    expect(trainingPlan).toMatchObject({
      active: true,
      generatedAt: "2026-06-07T10:00:00.000Z",
      id: "training-plan-test",
      mainCompoundRotationPools: [
        {
          exerciseIds: [
            "flat-dumbbell-bench-press",
            "incline-barbell-bench-press",
            "incline-dumbbell-bench-press",
          ],
          movementPattern: "horizontal_push",
        },
        {
          exerciseIds: ["bent-over-dumbbell-rows", "t-bar-rows", "seated-cable-rows"],
          movementPattern: "horizontal_pull",
        },
        {
          exerciseIds: [
            "seated-overhead-barbell-press",
            "seated-overhead-dumbbell-press",
            "standing-overhead-dumbbell-press",
          ],
          movementPattern: "vertical_push",
        },
        {
          exerciseIds: ["chin-ups", "lat-pull-downs", "neutral-grip-pulldown"],
          movementPattern: "vertical_pull",
        },
        {
          exerciseIds: ["dumbbell-squats", "barbell-front-squats", "dumbbell-front-squats"],
          movementPattern: "quad_dominant",
        },
        {
          exerciseIds: [
            "dumbbell-romanian-deadlifts",
            "barbell-straight-leg-deadlifts",
            "dumbbell-straight-leg-deadlifts",
          ],
          movementPattern: "hip_hamstring_dominant",
        },
      ],
      sourceBlueprintId: "plan-blueprint-test",
      updatedAt: "2026-06-07T10:00:00.000Z",
    });
    expect(trainingPlan.workoutTemplates).toHaveLength(4);
  });

  it("does not save a Training Plan when there is no current Plan Blueprint", async () => {
    const saveActiveTrainingPlan = vi.fn();

    await expect(
      generateActiveTrainingPlanFromCurrentPlanBlueprint({
        createTrainingPlanId: () => "training-plan-test",
        getCurrentPlanBlueprint: async () => null,
        getTimestamp: () => "2026-06-07T10:00:00.000Z",
        saveActiveTrainingPlan,
      }),
    ).rejects.toThrow("Cannot generate a Training Plan without a Plan Blueprint.");

    expect(saveActiveTrainingPlan).not.toHaveBeenCalled();
  });

  it("does not save a Training Plan when avoided exercises leave no valid non-avoided option for a required Movement Pattern", async () => {
    const saveActiveTrainingPlan = vi.fn();

    await expect(
      generateActiveTrainingPlanFromCurrentPlanBlueprint({
        createTrainingPlanId: () => "training-plan-test",
        getCurrentPlanBlueprint: async () => ({
          ...createCompleteBlueprint(),
          exerciseSelectionPreferences: {
            avoidedExercises: [
              { id: "avoided-1", rawText: "Flat Barbell Bench Press" },
              { id: "avoided-2", rawText: "Flat Dumbbell Bench Press" },
              { id: "avoided-3", rawText: "Incline Barbell Bench Press" },
              { id: "avoided-4", rawText: "Incline Dumbbell Bench Press" },
              { id: "avoided-5", rawText: "Decline Barbell Bench Press" },
              { id: "avoided-6", rawText: "Decline Dumbbell Bench Press" },
              { id: "avoided-7", rawText: "Flat Chest Press Machine" },
              { id: "avoided-8", rawText: "Incline Chest Press Machine" },
              { id: "avoided-9", rawText: "Decline Chest Press Machine" },
              { id: "avoided-10", rawText: "Dips (Parallel Bars, Slight Forward Lean)" },
              { id: "avoided-11", rawText: "Push-Ups" },
              { id: "avoided-12", rawText: "Dips (Elbows Close, No Forward Lean)" },
              { id: "avoided-13", rawText: "Flat Close Grip Bench Press" },
              { id: "avoided-14", rawText: "Decline Close Grip Bench Press" },
              { id: "avoided-15", rawText: "Close Grip Push-Ups" },
              { id: "avoided-16", rawText: "Bench Dips" },
            ],
            equipmentPreset: "full_gym",
            preferredExercises: [],
            strategy: "balanced",
          },
        }),
        getTimestamp: () => "2026-06-07T10:00:00.000Z",
        saveActiveTrainingPlan,
      }),
    ).rejects.toThrow(
      "Cannot generate a Training Plan because Weekly Movement Coverage is blocked for Horizontal push because Exercise Selection Preferences avoid every valid exercise in that Movement Pattern. Remove an avoidance or choose another valid exercise before generating.",
    );

    expect(saveActiveTrainingPlan).not.toHaveBeenCalled();
  });

  it("does not save a Training Plan while avoided Main Compound Selections need replacement defaults", async () => {
    const saveActiveTrainingPlan = vi.fn();

    await expect(
      generateActiveTrainingPlanFromCurrentPlanBlueprint({
        createTrainingPlanId: () => "training-plan-test",
        getCurrentPlanBlueprint: async () => ({
          ...createCompleteBlueprint(),
          exerciseSelectionPreferences: {
            avoidedExercises: [{ id: "avoided-1", rawText: "Flat Barbell Bench Press" }],
            equipmentPreset: "full_gym",
            preferredExercises: [],
            strategy: "balanced",
          },
        }),
        getTimestamp: () => "2026-06-07T10:00:00.000Z",
        saveActiveTrainingPlan,
      }),
    ).rejects.toThrow("Cannot generate a Training Plan while Recommended Defaults are pending.");

    expect(saveActiveTrainingPlan).not.toHaveBeenCalled();
  });

  it("saves draft-local setup values onto the current Training Plan Draft", async () => {
    const { dependencies, getCurrentBlueprint } = createDraftGenerationTestContext();
    const generatedDraft = await generateTrainingPlanDraftFromCurrentPlanBlueprint(dependencies);
    const firstSuggestion = getFirstStartingLoadSuggestion(generatedDraft);

    await saveTrainingPlanDraftSetupFromCurrentPlanBlueprint({
      dependencies,
      update: {
        baselineBodyweight: 82,
        kind: "baseline_bodyweight",
      },
    });
    await saveTrainingPlanDraftSetupFromCurrentPlanBlueprint({
      dependencies,
      update: {
        kind: "starting_load_suggestions",
        startingLoadSuggestions: setEditedLoad({
          draft: generatedDraft,
          exerciseId: firstSuggestion.exerciseId,
          userEditedLoad: 42.5,
        }),
      },
    });

    expect(getCurrentBlueprint().trainingPlanDraft).toMatchObject({
      content: {
        baselineBodyweight: 82,
        startingLoadSuggestions: expect.arrayContaining([
          expect.objectContaining({
            effectiveLoad: 42.5,
            exerciseId: firstSuggestion.exerciseId,
            userEditedLoad: 42.5,
          }),
        ]),
      },
    });
  });

  it("revalidates draft warnings after saving Baseline Bodyweight setup", async () => {
    const { dependencies } = createDraftGenerationTestContext();
    const generatedDraft = await generateTrainingPlanDraftFromCurrentPlanBlueprint(dependencies);

    expect(generatedDraft.validation.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "missing_baseline_bodyweight",
        }),
      ]),
    );

    const savedDraft = await saveTrainingPlanDraftSetupFromCurrentPlanBlueprint({
      dependencies,
      update: {
        baselineBodyweight: 82,
        kind: "baseline_bodyweight",
      },
    });

    expect(savedDraft.validation.warnings).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "missing_baseline_bodyweight",
        }),
      ]),
    );
  });

  it("accepts draft-local setup values into the Active Training Plan", async () => {
    const { dependencies } = createDraftGenerationTestContext();
    const generatedDraft = await generateTrainingPlanDraftFromCurrentPlanBlueprint(dependencies);
    const firstSuggestion = getFirstStartingLoadSuggestion(generatedDraft);

    await saveTrainingPlanDraftSetupFromCurrentPlanBlueprint({
      dependencies,
      update: {
        baselineBodyweight: 82,
        kind: "baseline_bodyweight",
      },
    });
    await saveTrainingPlanDraftSetupFromCurrentPlanBlueprint({
      dependencies,
      update: {
        kind: "starting_load_suggestions",
        startingLoadSuggestions: setEditedLoad({
          draft: generatedDraft,
          exerciseId: firstSuggestion.exerciseId,
          userEditedLoad: 42.5,
        }),
      },
    });

    const acceptedTrainingPlan =
      await acceptTrainingPlanDraftFromCurrentPlanBlueprint(dependencies);

    expect(acceptedTrainingPlan).toMatchObject({
      baselineBodyweight: 82,
      startingLoadSuggestions: expect.arrayContaining([
        expect.objectContaining({
          effectiveLoad: 42.5,
          exerciseId: firstSuggestion.exerciseId,
          userEditedLoad: 42.5,
        }),
      ]),
    });
  });

  it("resets draft-local setup values from the current Plan Blueprint choices", async () => {
    const { dependencies } = createDraftGenerationTestContext();
    const generatedDraft = await generateTrainingPlanDraftFromCurrentPlanBlueprint(dependencies);
    const firstSuggestion = getFirstStartingLoadSuggestion(generatedDraft);

    await saveTrainingPlanDraftSetupFromCurrentPlanBlueprint({
      dependencies,
      update: {
        baselineBodyweight: 82,
        kind: "baseline_bodyweight",
      },
    });
    await saveTrainingPlanDraftSetupFromCurrentPlanBlueprint({
      dependencies,
      update: {
        kind: "starting_load_suggestions",
        startingLoadSuggestions: setEditedLoad({
          draft: generatedDraft,
          exerciseId: firstSuggestion.exerciseId,
          userEditedLoad: 42.5,
        }),
      },
    });

    const resetDraft = await resetTrainingPlanDraftFromCurrentPlanBlueprint(dependencies);

    expect(resetDraft.content.baselineBodyweight).toBeUndefined();
    expect(resetDraft.content).toMatchObject({
      startingLoadSuggestions: expect.arrayContaining([
        expect.objectContaining({
          effectiveLoad: null,
          exerciseId: firstSuggestion.exerciseId,
          userEditedLoad: null,
        }),
      ]),
    });
  });

  it("revalidates draft blockers before accepting the current Training Plan Draft", async () => {
    const { dependencies } = createDraftGenerationTestContext({
      trainingPlanDraft: {
        content: {
          ...createTrainingPlanDraftContent(),
          workoutTemplates: [
            {
              id: "template-1",
              label: "Upper A",
              purpose: "strength",
              supersetGroups: [
                {
                  id: "group-1",
                  slots: [
                    {
                      exerciseId: "flat-barbell-bench-press",
                      exerciseName: "Flat Barbell Bench Press",
                      kind: "exercise",
                      movementPattern: "horizontal_push",
                      role: "main_compound",
                      slotLabel: "A1",
                      targetMuscles: ["chest"],
                    },
                    {
                      exerciseId: "flat-barbell-bench-press",
                      exerciseName: "Flat Barbell Bench Press",
                      kind: "exercise",
                      movementPattern: "horizontal_push",
                      role: "secondary_compound",
                      slotLabel: "A2",
                      targetMuscles: ["chest"],
                    },
                  ],
                  title: "Upper Superset Group",
                  type: "superset",
                },
              ],
            },
          ],
        },
        isStale: false,
        validation: {
          blockers: [],
          warnings: [],
        },
      },
    });

    await expect(acceptTrainingPlanDraftFromCurrentPlanBlueprint(dependencies)).rejects.toThrow(
      "Workout Templates cannot repeat the same exercise in more than one slot.",
    );
  });
});

function createDraftGenerationTestContext(overrides: Partial<PlanBlueprint> = {}) {
  let currentBlueprint = {
    ...createCompleteBlueprint(),
    split: "alternating-full-body-a-b" as const,
    trainingFrequencyDaysPerWeek: 3 as const,
    ...overrides,
  };

  const dependencies = {
    createTrainingPlanId: () => "training-plan-test",
    getCurrentPlanBlueprint: async () => currentBlueprint,
    getTimestamp: () => "2026-06-07T10:00:00.000Z",
    saveActiveTrainingPlan: async (plan: TrainingPlan) => plan,
    savePlanBlueprint: async (blueprint: PlanBlueprint) => {
      currentBlueprint = blueprint;

      return blueprint;
    },
    updateCurrentPlanBlueprint: async (
      updateBlueprint: (blueprint: PlanBlueprint | null) => PlanBlueprint,
    ) => {
      currentBlueprint = updateBlueprint(currentBlueprint);

      return currentBlueprint;
    },
  };

  return {
    dependencies,
    getCurrentBlueprint: () => currentBlueprint,
  };
}

function getFirstStartingLoadSuggestion(
  draft: Awaited<ReturnType<typeof generateTrainingPlanDraftFromCurrentPlanBlueprint>>,
) {
  const firstSuggestion = draft.content.startingLoadSuggestions?.[0];

  if (!firstSuggestion) {
    throw new Error("Expected generated draft to include starting load suggestions.");
  }

  return firstSuggestion;
}

function setEditedLoad({
  draft,
  exerciseId,
  userEditedLoad,
}: {
  draft: Awaited<ReturnType<typeof generateTrainingPlanDraftFromCurrentPlanBlueprint>>;
  exerciseId: string;
  userEditedLoad: number;
}) {
  const startingLoadSuggestions = draft.content.startingLoadSuggestions;

  if (!startingLoadSuggestions) {
    throw new Error("Expected generated draft to include starting load suggestions.");
  }

  return startingLoadSuggestions.map((suggestion) =>
    suggestion.exerciseId === exerciseId
      ? {
          ...suggestion,
          effectiveLoad: userEditedLoad,
          userEditedLoad,
        }
      : suggestion,
  );
}

function createCompleteBlueprint(): PlanBlueprint {
  return {
    confirmedBuilderSteps: {
      exercises: true,
      frequency: true,
      repRanges: true,
      split: true,
      volume: true,
    },
    createdAt: "2026-06-07T09:00:00.000Z",
    exerciseSelectionPreferences: {
      avoidedExercises: [],
      equipmentPreset: "full_gym",
      preferredExercises: [],
      strategy: "balanced",
    },
    equipmentPresetSource: "user_selected",
    id: "plan-blueprint-test",
    isolationExercisePreferences: [],
    mainCompoundPreferences: [],
    mainCompoundRotationPreferences: [],
    mainCompoundRotationPools: [],
    mainCompoundSelections: completeMainCompoundSelections,
    repRanges: "balanced_hypertrophy",
    split: "upper-lower-4-day",
    trainingFrequencyDaysPerWeek: 4,
    trainingGoal: "build-muscle",
    trainingPlanDraft: null,
    updatedAt: "2026-06-07T09:00:00.000Z",
    volumePreset: "balanced",
    volumePresetSource: "user_selected",
    weeklyRepTargets: createPresetWeeklyRepTargets("balanced"),
  };
}

function createTrainingPlanDraftContent(): NonNullable<
  PlanBlueprint["trainingPlanDraft"]
>["content"] {
  return {
    baselineBodyweight: undefined,
    mainCompoundRotationPools: [],
    repRangeStyle: "balanced_hypertrophy",
    split: "Alternating Full Body A/B",
    trainingBlockWeeks: 6,
    trainingFrequencyDaysPerWeek: 3,
    trainingGoal: "build-muscle",
    weeklyRepTargets: createPresetWeeklyRepTargets("balanced"),
    workoutTemplates: [
      {
        id: "template-1",
        label: "Full Body A",
        purpose: "strength",
        supersetGroups: [
          {
            id: "group-1",
            slots: [
              {
                exerciseId: "flat-barbell-bench-press",
                exerciseName: "Flat Barbell Bench Press",
                kind: "exercise",
                movementPattern: "horizontal_push",
                role: "main_compound",
                slotLabel: "A1",
                targetMuscles: ["chest"],
              },
            ],
            title: "Upper Superset Group",
            type: "superset",
          },
        ],
      },
    ],
  };
}
