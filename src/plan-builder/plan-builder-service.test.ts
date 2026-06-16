import { beforeEach, describe, expect, it } from "vitest";
import { resetLocalDatabase } from "../app/local-database";
import type {
  ExerciseSelectionPreferenceItem,
  ExerciseSelectionPreferenceListId,
  ExerciseSelectionPreferences,
} from "./exercise-selection-preferences";
import type { PlanBlueprint } from "./plan-blueprint";
import { getCurrentPlanBlueprint, savePlanBlueprint } from "./plan-builder-repository";
import { planBuilderService } from "./plan-builder-service";
import { completeMainCompoundSelections } from "./plan-builder-test-fixtures";
import {
  createRecommendedTrainingVolumeConfiguration,
  createTrainingVolumeConfiguration,
} from "./training-volume";

type DraftExerciseSelectionPreferences = ExerciseSelectionPreferences & {
  automaticRules: ReadonlyArray<{ id: string }>;
  includedEquipment: ReadonlyArray<{ id: string; label: string }>;
  movementPatternCoverage: ReadonlyArray<{ id: string; patterns: ReadonlyArray<never> }>;
};

type ExercisePreferenceDraftUpdateCase = {
  addedAt: string;
  addedExercise: ExerciseSelectionPreferenceItem;
  confirmedAt: string;
  initialExercise: ExerciseSelectionPreferenceItem;
  listId: ExerciseSelectionPreferenceListId;
  removedAt: string;
  title: string;
};

const exercisePreferenceDraftUpdateCases = [
  {
    addedAt: "2026-05-30T10:16:00.000Z",
    addedExercise: { id: "preferred-2", rawText: "Incline dumbbell press" },
    confirmedAt: "2026-05-30T10:15:30.000Z",
    initialExercise: { id: "preferred-1", rawText: "Chest-supported row" },
    listId: "preferredExercises",
    removedAt: "2026-05-30T10:16:30.000Z",
    title: "Preferred Exercise",
  },
  {
    addedAt: "2026-05-30T10:17:00.000Z",
    addedExercise: { id: "avoided-2", rawText: "Behind-the-neck press" },
    confirmedAt: "2026-05-30T10:16:30.000Z",
    initialExercise: { id: "avoided-1", rawText: "Upright row" },
    listId: "avoidedExercises",
    removedAt: "2026-05-30T10:17:30.000Z",
    title: "Avoided Exercise",
  },
] satisfies ReadonlyArray<ExercisePreferenceDraftUpdateCase>;

describe("planBuilderService", () => {
  beforeEach(async () => {
    await resetLocalDatabase();
  });

  it("creates a blueprint once and resumes it on the next entry", async () => {
    const firstBlueprint = await planBuilderService.getOrCreatePlanBlueprint();
    const resumedBlueprint = await planBuilderService.getOrCreatePlanBlueprint();

    expect(firstBlueprint).toEqual(resumedBlueprint);
    expect(await getCurrentPlanBlueprint()).toEqual(firstBlueprint);
  });

  it("resumes blueprints saved before confirmed builder progress existed", async () => {
    const currentBlueprint = await planBuilderService.getOrCreatePlanBlueprint();
    const legacyBlueprint: Partial<PlanBlueprint> = { ...currentBlueprint };

    delete legacyBlueprint.confirmedBuilderSteps;

    await savePlanBlueprint(legacyBlueprint as PlanBlueprint);

    const resumedBlueprint = await planBuilderService.getOrCreatePlanBlueprint();
    const updatedBlueprint = await planBuilderService.updateTrainingFrequency({
      timestamp: "2026-05-30T10:14:00.000Z",
      trainingFrequencyDaysPerWeek: 4,
    });

    expect(resumedBlueprint).toEqual({
      ...legacyBlueprint,
      confirmedBuilderSteps: {
        exercises: false,
        frequency: false,
        repRanges: false,
        split: false,
        volume: false,
      },
    });
    expect(updatedBlueprint.confirmedBuilderSteps).toEqual({
      exercises: false,
      frequency: false,
      repRanges: false,
      split: false,
      volume: false,
    });
  });

  it("resumes blueprints saved before Exercise Selection Preferences existed with the v1 defaults", async () => {
    const currentBlueprint = await planBuilderService.getOrCreatePlanBlueprint();
    const legacyBlueprint: Partial<PlanBlueprint> = { ...currentBlueprint };

    delete legacyBlueprint.exerciseSelectionPreferences;

    await savePlanBlueprint(legacyBlueprint as PlanBlueprint);

    expect(await planBuilderService.getOrCreatePlanBlueprint()).toMatchObject({
      exerciseSelectionPreferences: {
        avoidedExercises: [],
        equipmentPreset: "full_gym",
        preferredExercises: [],
        strategy: "balanced",
      },
    });
  });

  it("resumes blueprints saved before Main Compound Selections existed with an empty canonical shape", async () => {
    const currentBlueprint = await planBuilderService.getOrCreatePlanBlueprint();
    const legacyBlueprint: Partial<PlanBlueprint> = { ...currentBlueprint };

    delete legacyBlueprint.mainCompoundSelections;

    await savePlanBlueprint(legacyBlueprint as PlanBlueprint);

    expect(await planBuilderService.getOrCreatePlanBlueprint()).toMatchObject({
      mainCompoundSelections: [],
    });
  });

  it("persists draft Exercise Selection Preferences without changing confirmed builder progress", async () => {
    const initialBlueprint = await planBuilderService.getOrCreatePlanBlueprint();
    const configuredBlueprint: PlanBlueprint = {
      ...initialBlueprint,
      ...createRecommendedTrainingVolumeConfiguration(),
      confirmedBuilderSteps: {
        exercises: false,
        frequency: true,
        repRanges: true,
        split: true,
        volume: true,
      },
      repRanges: "balanced_hypertrophy",
      split: "upper-lower-4-day",
      trainingFrequencyDaysPerWeek: 4,
      updatedAt: "2026-05-30T10:14:30.000Z",
    };

    await savePlanBlueprint(configuredBlueprint);

    const draftExerciseSelectionPreferences = {
      automaticRules: [{ id: "compound_priority" }],
      avoidedExercises: [{ id: "avoided-1", rawText: "Upright row" }],
      equipmentPreset: "full_gym",
      includedEquipment: [{ id: "barbell", label: "Barbell" }],
      movementPatternCoverage: [{ id: "upper_body", patterns: [] }],
      preferredExercises: [
        { id: "preferred-1", matchedExerciseId: "exercise-42", rawText: "Incline dumbbell press" },
      ],
      strategy: "balanced",
    } satisfies DraftExerciseSelectionPreferences;
    const expectedExerciseSelectionPreferences: ExerciseSelectionPreferences = {
      avoidedExercises: [{ id: "avoided-1", rawText: "Upright row" }],
      equipmentPreset: "full_gym",
      preferredExercises: [
        {
          id: "preferred-1",
          matchedExerciseId: "exercise-42",
          rawText: "Incline dumbbell press",
        },
      ],
      strategy: "balanced",
    };

    const updatedBlueprint = await planBuilderService.updateExerciseSelectionPreferences({
      exerciseSelectionPreferences: draftExerciseSelectionPreferences,
      timestamp: "2026-05-30T10:15:00.000Z",
    });
    const resumedBlueprint = await planBuilderService.getOrCreatePlanBlueprint();

    expect(updatedBlueprint).toEqual({
      ...configuredBlueprint,
      equipmentPresetSource: "user_selected",
      exerciseSelectionPreferences: expectedExerciseSelectionPreferences,
      updatedAt: "2026-05-30T10:15:00.000Z",
    });
    expect(resumedBlueprint).toEqual(updatedBlueprint);
  });

  it.each(
    exercisePreferenceDraftUpdateCases,
  )("persists committed $title draft add/remove changes while clearing confirmed Exercises", async ({
    addedAt,
    addedExercise,
    confirmedAt,
    initialExercise,
    listId,
    removedAt,
  }) => {
    const initialBlueprint = await planBuilderService.getOrCreatePlanBlueprint();
    const initialExercises = [initialExercise];
    const exercisesAfterAdd = [...initialExercises, addedExercise];
    const exercisesAfterRemove = exercisesAfterAdd.filter(
      (exercise) => exercise.id !== initialExercise.id,
    );
    const confirmedBlueprint: PlanBlueprint = {
      ...initialBlueprint,
      ...createRecommendedTrainingVolumeConfiguration(),
      confirmedBuilderSteps: {
        exercises: true,
        frequency: true,
        repRanges: true,
        split: true,
        volume: true,
      },
      exerciseSelectionPreferences: {
        ...initialBlueprint.exerciseSelectionPreferences,
        [listId]: initialExercises,
      },
      mainCompoundSelections: completeMainCompoundSelections,
      repRanges: "balanced_hypertrophy",
      split: "upper-lower-4-day",
      trainingFrequencyDaysPerWeek: 4,
      updatedAt: confirmedAt,
    };

    await savePlanBlueprint(confirmedBlueprint);

    const addedExerciseBlueprint = await planBuilderService.updateExerciseSelectionPreferences({
      exerciseSelectionPreferences: {
        ...confirmedBlueprint.exerciseSelectionPreferences,
        [listId]: exercisesAfterAdd,
      },
      timestamp: addedAt,
    });
    const expectedConfirmedBuilderStepsAfterDraftChange = {
      ...confirmedBlueprint.confirmedBuilderSteps,
      exercises: false,
    };
    const expectedAddedExerciseBlueprint: PlanBlueprint = {
      ...confirmedBlueprint,
      confirmedBuilderSteps: expectedConfirmedBuilderStepsAfterDraftChange,
      equipmentPresetSource: "user_selected",
      exerciseSelectionPreferences: {
        ...confirmedBlueprint.exerciseSelectionPreferences,
        [listId]: exercisesAfterAdd,
      },
      updatedAt: addedAt,
    };

    expect(addedExerciseBlueprint).toEqual(expectedAddedExerciseBlueprint);

    const removedExerciseBlueprint = await planBuilderService.updateExerciseSelectionPreferences({
      exerciseSelectionPreferences: {
        ...addedExerciseBlueprint.exerciseSelectionPreferences,
        [listId]: exercisesAfterRemove,
      },
      timestamp: removedAt,
    });
    const expectedRemovedExerciseBlueprint: PlanBlueprint = {
      ...expectedAddedExerciseBlueprint,
      exerciseSelectionPreferences: {
        ...expectedAddedExerciseBlueprint.exerciseSelectionPreferences,
        [listId]: exercisesAfterRemove,
      },
      updatedAt: removedAt,
    };

    expect(removedExerciseBlueprint).toEqual(expectedRemovedExerciseBlueprint);
    expect(await planBuilderService.getOrCreatePlanBlueprint()).toEqual(removedExerciseBlueprint);
  });

  it("persists the final Step 5 Exercise Selection Preferences when Exercises is confirmed", async () => {
    const initialBlueprint = await planBuilderService.getOrCreatePlanBlueprint();
    const configuredBlueprint: PlanBlueprint = {
      ...initialBlueprint,
      ...createRecommendedTrainingVolumeConfiguration(),
      confirmedBuilderSteps: {
        exercises: false,
        frequency: true,
        repRanges: true,
        split: true,
        volume: true,
      },
      mainCompoundSelections: completeMainCompoundSelections,
      repRanges: "balanced_hypertrophy",
      split: "upper-lower-4-day",
      trainingFrequencyDaysPerWeek: 4,
      updatedAt: "2026-05-30T10:15:30.000Z",
    };

    await savePlanBlueprint(configuredBlueprint);

    const finalExerciseSelectionPreferences = {
      automaticRules: [{ id: "rest_scaling" }],
      avoidedExercises: [{ id: "avoided-1", rawText: "Behind the neck press" }],
      equipmentPreset: "full_gym",
      includedEquipment: [{ id: "machines", label: "Machines" }],
      movementPatternCoverage: [{ id: "lower_body", patterns: [] }],
      preferredExercises: [
        { id: "preferred-1", matchedExerciseId: "exercise-7", rawText: "Hack squat" },
      ],
      strategy: "balanced",
    } satisfies DraftExerciseSelectionPreferences;
    const expectedExerciseSelectionPreferences: ExerciseSelectionPreferences = {
      avoidedExercises: [{ id: "avoided-1", rawText: "Behind the neck press" }],
      equipmentPreset: "full_gym",
      preferredExercises: [
        { id: "preferred-1", matchedExerciseId: "exercise-7", rawText: "Hack squat" },
      ],
      strategy: "balanced",
    };

    const confirmedBlueprint = await planBuilderService.confirmSelectedExerciseSelectionPreferences(
      {
        exerciseSelectionPreferences: finalExerciseSelectionPreferences,
        timestamp: "2026-05-30T10:16:00.000Z",
      },
    );

    expect(confirmedBlueprint).toEqual({
      ...configuredBlueprint,
      confirmedBuilderSteps: {
        exercises: true,
        frequency: true,
        repRanges: true,
        split: true,
        volume: true,
      },
      equipmentPresetSource: "user_selected",
      exerciseSelectionPreferences: expectedExerciseSelectionPreferences,
      updatedAt: "2026-05-30T10:16:00.000Z",
    });
    expect(await planBuilderService.getOrCreatePlanBlueprint()).toEqual(confirmedBlueprint);
  });

  it("preserves Exercise Selection Preferences while marking Exercises unconfirmed when Training Frequency changes", async () => {
    const initialBlueprint = await planBuilderService.getOrCreatePlanBlueprint();
    const exerciseSelectionPreferences: ExerciseSelectionPreferences = {
      avoidedExercises: [{ id: "avoided-1", rawText: "Behind the neck press" }],
      equipmentPreset: "full_gym",
      preferredExercises: [
        { id: "preferred-1", matchedExerciseId: "exercise-7", rawText: "Hack squat" },
      ],
      strategy: "balanced",
    };
    const configuredBlueprint: PlanBlueprint = {
      ...initialBlueprint,
      ...createTrainingVolumeConfiguration({
        volumePreset: "higher_volume",
        volumePresetSource: "user_selected",
      }),
      confirmedBuilderSteps: {
        exercises: true,
        frequency: true,
        repRanges: true,
        split: true,
        volume: true,
      },
      exerciseSelectionPreferences,
      mainCompoundSelections: completeMainCompoundSelections,
      repRanges: "controlled_higher_reps",
      split: "rotating-push-pull-legs",
      trainingFrequencyDaysPerWeek: 4,
      updatedAt: "2026-05-30T10:16:30.000Z",
    };

    await savePlanBlueprint(configuredBlueprint);

    const updatedBlueprint = await planBuilderService.updateTrainingFrequency({
      timestamp: "2026-05-30T10:17:00.000Z",
      trainingFrequencyDaysPerWeek: 5,
    });

    expect(updatedBlueprint).toEqual({
      ...configuredBlueprint,
      confirmedBuilderSteps: {
        exercises: false,
        frequency: false,
        repRanges: true,
        split: false,
        volume: true,
      },
      trainingFrequencyDaysPerWeek: 5,
      updatedAt: "2026-05-30T10:17:00.000Z",
    });
    expect(await planBuilderService.getOrCreatePlanBlueprint()).toEqual(updatedBlueprint);
  });

  it("persists a changed training frequency for the next resume", async () => {
    const initialBlueprint = await planBuilderService.getOrCreatePlanBlueprint();

    const updatedBlueprint = await planBuilderService.updateTrainingFrequency({
      timestamp: "2026-05-30T10:15:00.000Z",
      trainingFrequencyDaysPerWeek: 5,
    });
    const resumedBlueprint = await planBuilderService.getOrCreatePlanBlueprint();

    expect(updatedBlueprint).toEqual({
      ...initialBlueprint,
      trainingFrequencyDaysPerWeek: 5,
      updatedAt: "2026-05-30T10:15:00.000Z",
    });
    expect(resumedBlueprint).toEqual(updatedBlueprint);
  });

  it("persists a selected Training Split for the next resume", async () => {
    const initialBlueprint = await planBuilderService.getOrCreatePlanBlueprint();

    const updatedBlueprint = await planBuilderService.updateTrainingSplit({
      split: "upper-lower-full-body",
      timestamp: "2026-05-30T10:20:00.000Z",
    });
    const resumedBlueprint = await planBuilderService.getOrCreatePlanBlueprint();

    expect(updatedBlueprint).toEqual({
      ...initialBlueprint,
      split: "upper-lower-full-body",
      updatedAt: "2026-05-30T10:20:00.000Z",
    });
    expect(resumedBlueprint).toEqual(updatedBlueprint);
  });

  it("preserves Exercise Selection Preferences and clears confirmed Exercises when the Training Split changes", async () => {
    const initialBlueprint = await planBuilderService.getOrCreatePlanBlueprint();
    const exerciseSelectionPreferences = {
      avoidedExercises: [{ id: "avoided-1", rawText: "Behind the neck press" }],
      equipmentPreset: "full_gym",
      preferredExercises: [{ id: "preferred-1", rawText: "Hack squat" }],
      strategy: "balanced",
    } satisfies ExerciseSelectionPreferences;
    const configuredBlueprint: PlanBlueprint = {
      ...initialBlueprint,
      ...createRecommendedTrainingVolumeConfiguration(),
      confirmedBuilderSteps: {
        exercises: true,
        frequency: true,
        repRanges: true,
        split: true,
        volume: true,
      },
      exerciseSelectionPreferences,
      mainCompoundSelections: completeMainCompoundSelections,
      repRanges: "balanced_hypertrophy",
      split: "upper-lower-4-day",
      trainingFrequencyDaysPerWeek: 4,
      updatedAt: "2026-05-30T10:20:30.000Z",
    };

    await savePlanBlueprint(configuredBlueprint);

    const updatedBlueprint = await planBuilderService.updateTrainingSplit({
      split: "rotating-push-pull-legs",
      timestamp: "2026-05-30T10:21:00.000Z",
    });

    expect(updatedBlueprint).toEqual({
      ...configuredBlueprint,
      confirmedBuilderSteps: {
        exercises: false,
        frequency: true,
        repRanges: true,
        split: false,
        volume: true,
      },
      split: "rotating-push-pull-legs",
      updatedAt: "2026-05-30T10:21:00.000Z",
    });
    expect(await planBuilderService.getOrCreatePlanBlueprint()).toEqual(updatedBlueprint);
  });

  it("persists a selected Rep Range Style for the next resume", async () => {
    const initialBlueprint = await planBuilderService.getOrCreatePlanBlueprint();

    const updatedBlueprint = await planBuilderService.updateRepRangeStyle({
      repRangeStyle: "strength_leaning",
      timestamp: "2026-05-30T10:22:00.000Z",
    });
    const resumedBlueprint = await planBuilderService.getOrCreatePlanBlueprint();

    expect(updatedBlueprint).toEqual({
      ...initialBlueprint,
      repRanges: "strength_leaning",
      updatedAt: "2026-05-30T10:22:00.000Z",
    });
    expect(resumedBlueprint).toEqual(updatedBlueprint);
  });

  it("initializes the recommended default Training Volume once and persists it", async () => {
    await planBuilderService.confirmSelectedTrainingFrequency({
      timestamp: "2026-05-30T10:23:00.000Z",
      trainingFrequencyDaysPerWeek: 4,
    });
    await planBuilderService.confirmSelectedTrainingSplit({
      split: "upper-lower-4-day",
      timestamp: "2026-05-30T10:24:00.000Z",
    });
    await planBuilderService.confirmSelectedRepRangeStyle({
      repRangeStyle: "balanced_hypertrophy",
      timestamp: "2026-05-30T10:25:00.000Z",
    });

    const initializedBlueprint = await planBuilderService.initializeTrainingVolume({
      timestamp: "2026-05-30T10:26:00.000Z",
    });
    const resumedBlueprint = await planBuilderService.getOrCreatePlanBlueprint();

    expect(initializedBlueprint).toMatchObject({
      confirmedBuilderSteps: {
        frequency: true,
        repRanges: true,
        split: true,
        volume: false,
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
    expect(initializedBlueprint.updatedAt).toBe("2026-05-30T10:26:00.000Z");
    expect(resumedBlueprint).toEqual(initializedBlueprint);
  });
});
