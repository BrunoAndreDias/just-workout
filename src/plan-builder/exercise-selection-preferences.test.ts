import { describe, expect, it } from "vitest";
import {
  commitPendingExerciseSelectionPreferences,
  createDefaultExerciseSelectionPreferences,
  deriveAutomaticExerciseSelectionRules,
  deriveMovementPatternCoverage,
  type ExerciseSelectionPendingInputs,
  type ExerciseSelectionPreferences,
  type ExerciseSelectionPreferenceValidationErrors,
  exerciseCatalogMuscleGroups,
  getEquipmentPreset,
  isExerciseSelectionPreferencesConfirmationReady,
  normalizeExerciseSelectionPreferences,
  removeExerciseSelectionPreferenceItem,
} from "./exercise-selection-preferences";
import {
  createRecommendedTrainingVolumeConfiguration,
  setOptionalWeeklyRepTargetEnabled,
} from "./training-volume";

describe("exercise selection preferences", () => {
  it("creates the balanced v1 defaults and derives full gym equipment, movement coverage, and automatic rules", () => {
    const preferences = createDefaultExerciseSelectionPreferences();
    const trainingVolume = createRecommendedTrainingVolumeConfiguration();

    expect(preferences).toEqual({
      avoidedExercises: [],
      equipmentPreset: "full_gym",
      preferredExercises: [],
      strategy: "balanced",
    });
    expect(getEquipmentPreset(preferences.equipmentPreset)).toEqual({
      id: "full_gym",
      includedEquipment: [
        { id: "barbell", label: "Barbell" },
        { id: "dumbbells", label: "Dumbbells" },
        { id: "machines", label: "Machines" },
        { id: "cables", label: "Cables" },
        { id: "pull_up_bar", label: "Pull-up bar" },
        { id: "bodyweight", label: "Bodyweight" },
      ],
      title: "Full gym",
    });
    expect(
      deriveMovementPatternCoverage({
        split: "upper-lower-4-day",
        strategy: preferences.strategy,
        weeklyRepTargets: trainingVolume.weeklyRepTargets,
      }),
    ).toEqual([
      {
        id: "upper_body",
        patterns: [
          { id: "horizontal_push", isDirectlyTargeted: true, label: "Horizontal push" },
          { id: "horizontal_pull", isDirectlyTargeted: true, label: "Horizontal pull" },
          { id: "vertical_push", isDirectlyTargeted: true, label: "Vertical push" },
          { id: "vertical_pull", isDirectlyTargeted: true, label: "Vertical pull" },
          { id: "elbow_flexion", isDirectlyTargeted: true, label: "Elbow flexion" },
          { id: "elbow_extension", isDirectlyTargeted: true, label: "Elbow extension" },
        ],
        sessionBias: "Covered across the split's upper sessions while lower days stay focused.",
        title: "Upper body movement patterns",
      },
      {
        id: "lower_body",
        patterns: [
          { id: "quad_dominant", isDirectlyTargeted: true, label: "Quad dominant" },
          {
            id: "hip_hamstring_dominant",
            isDirectlyTargeted: true,
            label: "Hip/hamstring dominant",
          },
          {
            id: "calves_accessories",
            isDirectlyTargeted: false,
            label: "Calves/accessories",
          },
        ],
        sessionBias:
          "Covered across the split's lower sessions with room for direct accessory work.",
        title: "Lower body movement patterns",
      },
    ]);
    expect(deriveAutomaticExerciseSelectionRules(preferences.strategy)).toEqual([
      {
        description:
          "Main work favors stable compound lifts before smaller isolation choices fill gaps.",
        id: "compound_priority",
        label: "Prioritize compounds for main work",
      },
      {
        description:
          "Isolation exercises can support weekly rep targets when direct muscle work is needed.",
        id: "targeted_isolation_support",
        label: "Use isolation work for targeted volume",
      },
      {
        description:
          "Exercise picks stay distributed across key movement patterns instead of overloading one pattern.",
        id: "movement_pattern_balance",
        label: "Keep movement-pattern coverage balanced",
      },
      {
        description: "Weekly muscle-group targets shape how much direct work each area receives.",
        id: "weekly_volume_alignment",
        label: "Align exercise selection with Weekly Rep Targets",
      },
      {
        description:
          "Marked avoided exercises stay excluded so painful, unavailable, or unsuitable movements are not silently included later.",
        id: "hard_avoid_exclusions",
        label: "Respect avoided exercises as hard exclusions",
      },
      {
        description: "Rest times adapt to exercise demand and rep range.",
        id: "adaptive_rest_timing",
        label: "Apply rest timing automatically",
      },
    ]);
  });

  it("provides the source-backed Step 5 exercise catalog grouped by muscle", () => {
    expect(exerciseCatalogMuscleGroups).toHaveLength(11);
    expect(exerciseCatalogMuscleGroups.map((muscleGroup) => muscleGroup.title)).toEqual([
      "Chest",
      "Back",
      "Shoulders",
      "Quadriceps",
      "Hamstrings",
      "Biceps",
      "Triceps",
      "Forearms",
      "Abs",
      "Glutes",
      "Calves",
    ]);
    expect(
      exerciseCatalogMuscleGroups.reduce(
        (exerciseCount, muscleGroup) => exerciseCount + muscleGroup.exercises.length,
        0,
      ),
    ).toBe(81);
    expect(exerciseCatalogMuscleGroups[0]?.exercises).toContain(
      "Flat Barbell or Dumbbell Bench Press",
    );
    expect(
      exerciseCatalogMuscleGroups.find((muscleGroup) => muscleGroup.id === "triceps")?.exercises,
    ).toContain("Cable Press-Downs");
    expect(
      exerciseCatalogMuscleGroups.find((muscleGroup) => muscleGroup.id === "abs")?.exercises,
    ).toContain("Cable Crunches");
    expect(
      exerciseCatalogMuscleGroups.find((muscleGroup) => muscleGroup.id === "abs")?.exercises,
    ).toEqual(expect.arrayContaining(["Ab Wheel Rollouts", "Dead Bugs", "Side Planks"]));
    expect(
      exerciseCatalogMuscleGroups.find((muscleGroup) => muscleGroup.id === "calves")?.exercises,
    ).toContain("Standing Calf Raises");
  });

  it("normalizes saved preference items and re-derives calves coverage from the current Weekly Rep Targets", () => {
    const preferences = normalizeExerciseSelectionPreferences({
      avoidedExercises: [{ id: "avoided-1", rawText: "Upright row" }, { rawText: "Bad item" }],
      equipmentPreset: "unsupported",
      preferredExercises: [
        { id: "preferred-1", matchedExerciseId: "exercise-42", rawText: "Incline press" },
        { id: "preferred-2", rawText: "Chest-supported row" },
      ],
      strategy: "unsupported",
    });
    const trainingVolume = setOptionalWeeklyRepTargetEnabled({
      isEnabled: true,
      muscleGroup: "calves",
      trainingVolumeConfiguration: createRecommendedTrainingVolumeConfiguration(),
    });

    expect(preferences).toEqual({
      avoidedExercises: [{ id: "avoided-1", rawText: "Upright row" }],
      equipmentPreset: "full_gym",
      preferredExercises: [
        { id: "preferred-1", matchedExerciseId: "exercise-42", rawText: "Incline press" },
        { id: "preferred-2", rawText: "Chest-supported row" },
      ],
      strategy: "balanced",
    });
    expect(
      deriveMovementPatternCoverage({
        split: "rotating-push-pull-legs",
        strategy: preferences.strategy,
        weeklyRepTargets: trainingVolume.weeklyRepTargets,
      }),
    ).toContainEqual({
      id: "lower_body",
      patterns: [
        { id: "quad_dominant", isDirectlyTargeted: true, label: "Quad dominant" },
        {
          id: "hip_hamstring_dominant",
          isDirectlyTargeted: true,
          label: "Hip/hamstring dominant",
        },
        {
          id: "calves_accessories",
          isDirectlyTargeted: true,
          label: "Calves/accessories",
        },
      ],
      sessionBias:
        "Covered when legs sessions come up in the rotation, with accessory work added as needed.",
      title: "Lower body movement patterns",
    });
  });

  it("auto-commits valid pending exercise inputs with normalized text and clears the pending draft", () => {
    const result = commitPendingExerciseSelectionPreferences({
      createId: (() => {
        let index = 0;

        return () => `exercise-${++index}`;
      })(),
      exerciseSelectionPreferences: createDefaultExerciseSelectionPreferences(),
      pendingInputs: {
        avoidedExercise: "  Upright   row  ",
        preferredExercise: " Incline   dumbbell press ",
      },
    });

    expect(result).toEqual({
      exerciseSelectionPreferences: {
        avoidedExercises: [{ id: "exercise-2", rawText: "Upright row" }],
        equipmentPreset: "full_gym",
        preferredExercises: [{ id: "exercise-1", rawText: "Incline dumbbell press" }],
        strategy: "balanced",
      },
      pendingInputs: {
        avoidedExercise: "",
        preferredExercise: "",
      },
      validationErrors: {},
    });
  });

  it("blocks exact duplicates within each list and Preferred/Avoided conflicts after trimming and case-folding", () => {
    const exerciseSelectionPreferences = normalizeExerciseSelectionPreferences({
      avoidedExercises: [{ id: "avoided-1", rawText: "Upright row" }],
      preferredExercises: [{ id: "preferred-1", rawText: "Incline Dumbbell Press" }],
    });

    expectPendingExerciseSelectionPreferencesValidationError({
      exerciseSelectionPreferences,
      pendingInputs: {
        avoidedExercise: "",
        preferredExercise: "  incline dumbbell press ",
      },
      validationErrors: {
        preferredExercise: "This exercise is already in Preferred Exercises.",
      },
    });

    expectPendingExerciseSelectionPreferencesValidationError({
      exerciseSelectionPreferences,
      pendingInputs: {
        avoidedExercise: "  upright   ROW ",
        preferredExercise: "",
      },
      validationErrors: {
        avoidedExercise: "This exercise is already in Avoided Exercises.",
      },
    });

    expectPendingExerciseSelectionPreferencesValidationError({
      exerciseSelectionPreferences,
      pendingInputs: {
        avoidedExercise: "  incline dumbbell press ",
        preferredExercise: "",
      },
      validationErrors: {
        avoidedExercise:
          "This exercise is already in Preferred Exercises. Remove it there or change this entry.",
      },
    });

    expectPendingExerciseSelectionPreferencesValidationError({
      exerciseSelectionPreferences,
      pendingInputs: {
        avoidedExercise: "",
        preferredExercise: "  upright   ROW ",
      },
      validationErrors: {
        preferredExercise:
          "This exercise is already in Avoided Exercises. Remove it there or change this entry.",
      },
    });
  });

  it("reports confirmation readiness from the pending draft state and removes committed items by id", () => {
    const exerciseSelectionPreferences = normalizeExerciseSelectionPreferences({
      avoidedExercises: [{ id: "avoided-1", rawText: "Upright row" }],
      preferredExercises: [{ id: "preferred-1", rawText: "Incline Dumbbell Press" }],
    });

    expect(
      isExerciseSelectionPreferencesConfirmationReady({
        exerciseSelectionPreferences,
        pendingInputs: {
          avoidedExercise: "Incline dumbbell press",
          preferredExercise: "",
        },
      }),
    ).toBe(false);
    expect(
      isExerciseSelectionPreferencesConfirmationReady({
        exerciseSelectionPreferences,
        pendingInputs: {
          avoidedExercise: "",
          preferredExercise: "Chest-supported row",
        },
      }),
    ).toBe(true);
    expect(
      removeExerciseSelectionPreferenceItem({
        exerciseSelectionPreferences,
        itemId: "preferred-1",
        listId: "preferredExercises",
      }),
    ).toEqual({
      avoidedExercises: [{ id: "avoided-1", rawText: "Upright row" }],
      equipmentPreset: "full_gym",
      preferredExercises: [],
      strategy: "balanced",
    });
  });
});

function expectPendingExerciseSelectionPreferencesValidationError({
  exerciseSelectionPreferences,
  pendingInputs,
  validationErrors,
}: {
  exerciseSelectionPreferences: ExerciseSelectionPreferences;
  pendingInputs: ExerciseSelectionPendingInputs;
  validationErrors: ExerciseSelectionPreferenceValidationErrors;
}) {
  expect(
    commitPendingExerciseSelectionPreferences({
      createId: () => "unused",
      exerciseSelectionPreferences,
      pendingInputs,
    }),
  ).toEqual({
    exerciseSelectionPreferences,
    pendingInputs,
    validationErrors,
  });
}
