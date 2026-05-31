import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../app/local-database";
import type { ExerciseSelectionPreferences } from "./exercise-selection-preferences";
import type { PlanBlueprint, RepRangeStyleId } from "./plan-blueprint";
import { planBuilderService } from "./plan-builder-service";
import {
  createRecommendedTrainingVolumeConfiguration,
  isTrainingVolumeConfiguration,
} from "./training-volume";

type DraftExerciseSelectionPreferences = ExerciseSelectionPreferences & {
  automaticRules: ReadonlyArray<{ id: string }>;
  includedEquipment: ReadonlyArray<{ id: string; label: string }>;
  movementPatternCoverage: ReadonlyArray<{ id: string; patterns: ReadonlyArray<never> }>;
};

describe("planBuilderService", () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it("creates a blueprint once and resumes it on the next entry", async () => {
    const firstBlueprint = await planBuilderService.getOrCreatePlanBlueprint();
    const resumedBlueprint = await planBuilderService.getOrCreatePlanBlueprint();

    expect(firstBlueprint).toEqual(resumedBlueprint);
    expect(await db.planBlueprints.toArray()).toEqual([firstBlueprint]);
  });

  it("resumes blueprints saved before confirmed builder progress existed", async () => {
    const currentBlueprint = await planBuilderService.getOrCreatePlanBlueprint();
    const legacyBlueprint: Partial<PlanBlueprint> = { ...currentBlueprint };

    delete legacyBlueprint.confirmedBuilderSteps;

    await db.planBlueprints.clear();
    await db.planBlueprints.put(legacyBlueprint as PlanBlueprint);

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

    await db.planBlueprints.clear();
    await db.planBlueprints.put(legacyBlueprint as PlanBlueprint);

    expect(await planBuilderService.getOrCreatePlanBlueprint()).toMatchObject({
      exerciseSelectionPreferences: {
        avoidedExercises: [],
        equipmentPreset: "full_gym",
        preferredExercises: [],
        strategy: "balanced",
      },
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

    await db.planBlueprints.clear();
    await db.planBlueprints.put(configuredBlueprint);

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
      exerciseSelectionPreferences: expectedExerciseSelectionPreferences,
      updatedAt: "2026-05-30T10:15:00.000Z",
    });
    expect(resumedBlueprint).toEqual(updatedBlueprint);
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
      repRanges: "balanced_hypertrophy",
      split: "upper-lower-4-day",
      trainingFrequencyDaysPerWeek: 4,
      updatedAt: "2026-05-30T10:15:30.000Z",
    };

    await db.planBlueprints.clear();
    await db.planBlueprints.put(configuredBlueprint);

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
      exerciseSelectionPreferences: expectedExerciseSelectionPreferences,
      updatedAt: "2026-05-30T10:16:00.000Z",
    });
    expect(await planBuilderService.getOrCreatePlanBlueprint()).toEqual(confirmedBlueprint);
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
      repRanges: "balanced_hypertrophy",
      split: "upper-lower-4-day",
      trainingFrequencyDaysPerWeek: 4,
      updatedAt: "2026-05-30T10:20:30.000Z",
    };

    await db.planBlueprints.clear();
    await db.planBlueprints.put(configuredBlueprint);

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

  it("does not overwrite an existing Training Volume configuration when Volume re-initializes", async () => {
    const initialBlueprint = await planBuilderService.getOrCreatePlanBlueprint();
    const configuredBlueprint: PlanBlueprint = {
      ...initialBlueprint,
      confirmedBuilderSteps: {
        exercises: false,
        frequency: true,
        repRanges: true,
        split: true,
        volume: false,
      },
      repRanges: "balanced_hypertrophy",
      split: "upper-lower-4-day",
      trainingFrequencyDaysPerWeek: 4,
      updatedAt: "2026-05-30T10:27:00.000Z",
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
    };

    await db.planBlueprints.clear();
    await db.planBlueprints.put(configuredBlueprint);

    const initializedBlueprint = await planBuilderService.initializeTrainingVolume({
      timestamp: "2026-05-30T10:28:00.000Z",
    });

    expect(initializedBlueprint).toEqual(configuredBlueprint);
  });

  it("persists optional Volume Target add and remove actions while marking Volume unconfirmed", async () => {
    const initialBlueprint = await planBuilderService.getOrCreatePlanBlueprint();
    const configuredBlueprint: PlanBlueprint = {
      ...initialBlueprint,
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
      updatedAt: "2026-05-30T10:27:30.000Z",
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
    };

    await db.planBlueprints.clear();
    await db.planBlueprints.put(configuredBlueprint);

    const enabledBlueprint = await planBuilderService.updateOptionalVolumeTarget({
      isEnabled: true,
      muscleGroup: "calves",
      timestamp: "2026-05-30T10:28:00.000Z",
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
      await planBuilderService.updateOptionalVolumeTarget({
        isEnabled: false,
        muscleGroup: "calves",
        timestamp: "2026-05-30T10:28:30.000Z",
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

  it("persists Volume confirmation with the current saved Weekly Rep Targets", async () => {
    await planBuilderService.confirmSelectedTrainingFrequency({
      timestamp: "2026-05-30T10:29:00.000Z",
      trainingFrequencyDaysPerWeek: 4,
    });
    await planBuilderService.confirmSelectedTrainingSplit({
      split: "upper-lower-4-day",
      timestamp: "2026-05-30T10:30:00.000Z",
    });
    await planBuilderService.confirmSelectedRepRangeStyle({
      repRangeStyle: "balanced_hypertrophy",
      timestamp: "2026-05-30T10:31:00.000Z",
    });

    const initializedBlueprint = await planBuilderService.initializeTrainingVolume({
      timestamp: "2026-05-30T10:32:00.000Z",
    });

    if (!isTrainingVolumeConfiguration(initializedBlueprint)) {
      throw new Error("Expected initialized Training Volume before confirmation.");
    }

    const confirmedBlueprint = await planBuilderService.confirmSelectedTrainingVolume({
      trainingVolumeConfiguration: initializedBlueprint,
      timestamp: "2026-05-30T10:33:00.000Z",
    });

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
    expect(confirmedBlueprint.updatedAt).toBe("2026-05-30T10:33:00.000Z");
    expect(await planBuilderService.getOrCreatePlanBlueprint()).toEqual(confirmedBlueprint);
  });

  it("clears an incompatible selected Training Split when the training frequency changes", async () => {
    await planBuilderService.updateTrainingSplit({
      timestamp: "2026-05-30T10:20:00.000Z",
      trainingSplitId: "upper-lower-full-body",
    });

    const updatedBlueprint = await planBuilderService.updateTrainingFrequency({
      timestamp: "2026-05-30T10:25:00.000Z",
      trainingFrequencyDaysPerWeek: 5,
    });
    const resumedBlueprint = await planBuilderService.getOrCreatePlanBlueprint();

    expect(updatedBlueprint).toMatchObject({
      split: null,
      trainingFrequencyDaysPerWeek: 5,
      trainingGoal: "build-muscle",
      updatedAt: "2026-05-30T10:25:00.000Z",
    });
    expect(resumedBlueprint).toEqual(updatedBlueprint);
  });

  it("keeps configured Frequency and Split separate from confirmed builder progress", async () => {
    const blueprintWithFrequency = await planBuilderService.updateTrainingFrequency({
      timestamp: "2026-05-30T10:15:00.000Z",
      trainingFrequencyDaysPerWeek: 4,
    });
    const confirmedFrequencyBlueprint = await planBuilderService.confirmSelectedTrainingFrequency({
      timestamp: "2026-05-30T10:16:00.000Z",
      trainingFrequencyDaysPerWeek: 4,
    });
    const blueprintWithSplit = await planBuilderService.updateTrainingSplit({
      split: "upper-lower-4-day",
      timestamp: "2026-05-30T10:20:00.000Z",
    });
    const confirmedSplitBlueprint = await planBuilderService.confirmSelectedTrainingSplit({
      split: "upper-lower-4-day",
      timestamp: "2026-05-30T10:21:00.000Z",
    });

    expect(blueprintWithFrequency.confirmedBuilderSteps).toEqual({
      exercises: false,
      frequency: false,
      repRanges: false,
      split: false,
      volume: false,
    });
    expect(confirmedFrequencyBlueprint.confirmedBuilderSteps).toEqual({
      exercises: false,
      frequency: true,
      repRanges: false,
      split: false,
      volume: false,
    });
    expect(blueprintWithSplit.confirmedBuilderSteps).toEqual({
      exercises: false,
      frequency: true,
      repRanges: false,
      split: false,
      volume: false,
    });
    expect(confirmedSplitBlueprint.confirmedBuilderSteps).toEqual({
      exercises: false,
      frequency: true,
      repRanges: false,
      split: true,
      volume: false,
    });
  });

  it("confirms a saved Rep Range Style separately from the selection and preserves that confirmation when the same style is re-saved", async () => {
    await planBuilderService.confirmSelectedTrainingFrequency({
      timestamp: "2026-05-30T10:16:00.000Z",
      trainingFrequencyDaysPerWeek: 4,
    });
    await planBuilderService.confirmSelectedTrainingSplit({
      split: "upper-lower-4-day",
      timestamp: "2026-05-30T10:17:00.000Z",
    });

    const selectedBlueprint = await planBuilderService.updateRepRangeStyle({
      repRangeStyle: "balanced_hypertrophy",
      timestamp: "2026-05-30T10:18:00.000Z",
    });
    const confirmedBlueprint = await planBuilderService.confirmSelectedRepRangeStyle({
      repRangeStyle: "balanced_hypertrophy",
      timestamp: "2026-05-30T10:19:00.000Z",
    });
    const reSavedBlueprint = await planBuilderService.updateRepRangeStyle({
      repRangeStyle: "balanced_hypertrophy",
      timestamp: "2026-05-30T10:20:00.000Z",
    });

    expect(selectedBlueprint.confirmedBuilderSteps).toEqual({
      exercises: false,
      frequency: true,
      repRanges: false,
      split: true,
      volume: false,
    });
    expect(confirmedBlueprint.confirmedBuilderSteps).toEqual({
      exercises: false,
      frequency: true,
      repRanges: true,
      split: true,
      volume: false,
    });
    expect(reSavedBlueprint.confirmedBuilderSteps).toEqual({
      exercises: false,
      frequency: true,
      repRanges: true,
      split: true,
      volume: false,
    });
  });

  it("preserves a saved Rep Range Style when earlier builder choices change", async () => {
    await planBuilderService.updateRepRangeStyle({
      repRangeStyle: "controlled_higher_reps",
      timestamp: "2026-05-30T10:18:00.000Z",
    });

    const blueprintWithSplit = await planBuilderService.updateTrainingSplit({
      split: "upper-lower-full-body",
      timestamp: "2026-05-30T10:20:00.000Z",
    });
    const blueprintWithNewFrequency = await planBuilderService.updateTrainingFrequency({
      timestamp: "2026-05-30T10:25:00.000Z",
      trainingFrequencyDaysPerWeek: 5,
    });

    expect(blueprintWithSplit).toMatchObject({
      repRanges: "controlled_higher_reps",
      split: "upper-lower-full-body",
    });
    expect(blueprintWithNewFrequency).toMatchObject({
      confirmedBuilderSteps: {
        frequency: false,
        split: false,
      },
      repRanges: "controlled_higher_reps",
      split: null,
      trainingFrequencyDaysPerWeek: 5,
    });
  });

  it("rejects invalid Rep Range Style values without overwriting the saved blueprint", async () => {
    const savedBlueprint = await planBuilderService.updateRepRangeStyle({
      repRangeStyle: "balanced_hypertrophy",
      timestamp: "2026-05-30T10:18:00.000Z",
    });

    await expect(
      planBuilderService.updateRepRangeStyle({
        repRangeStyle: "powerbuilding" as RepRangeStyleId,
        timestamp: "2026-05-30T10:19:00.000Z",
      }),
    ).rejects.toThrow('Unknown Rep Range Style "powerbuilding".');
    expect(await planBuilderService.getOrCreatePlanBlueprint()).toEqual(savedBlueprint);
  });
});
