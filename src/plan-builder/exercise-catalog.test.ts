import { describe, expect, it } from "vitest";
import {
  type ExerciseCatalogExercise,
  exerciseCatalogExercises,
  exerciseCatalogMuscleGroups,
  getConcreteExerciseCatalogExerciseId,
  getExerciseCatalogExercise,
  getExerciseCatalogExercisesByMovementPattern,
  isCompoundCapableMovementPattern,
  isMainCompoundEligible,
} from "./exercise-catalog";

describe("exercise catalog", () => {
  it("keeps one rich exercise catalog without duplicate ids or names", () => {
    expect(exerciseCatalogExercises).toHaveLength(114);
    expect(new Set(exerciseCatalogExercises.map((exercise) => exercise.id)).size).toBe(114);
    expect(new Set(exerciseCatalogExercises.map((exercise) => exercise.name)).size).toBe(114);
    expect(exerciseCatalogExercises.map((exercise) => exercise.name)).not.toEqual(
      expect.arrayContaining([
        expect.stringMatching(/\b(?:barbell|dumbbell|cable|machine)\b.*\bor\b/i),
      ]),
    );
  });

  it("derives the muscle-group browsing view from the rich catalog", () => {
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
    ).toBe(114);
    expect(
      exerciseCatalogMuscleGroups.find((muscleGroup) => muscleGroup.id === "chest")?.exercises,
    ).toContain("Flat Barbell Bench Press");
    expect(
      exerciseCatalogMuscleGroups.find((muscleGroup) => muscleGroup.id === "triceps")?.exercises,
    ).toContain("Cable Press-Downs");
    expect(
      exerciseCatalogMuscleGroups.find((muscleGroup) => muscleGroup.id === "abs")?.exercises,
    ).toContain("Cable Crunches");
    expect(
      exerciseCatalogMuscleGroups.find((muscleGroup) => muscleGroup.id === "abs")?.exercises,
    ).toEqual(
      expect.arrayContaining(["Ab Wheel Rollouts", "Dead Bugs", "Planks", "Reverse Crunches"]),
    );
    expect(
      exerciseCatalogMuscleGroups.find((muscleGroup) => muscleGroup.id === "calves")?.exercises,
    ).toContain("Standing Calf Raises");
  });

  it("can query exercises by movement pattern from the same catalog", () => {
    expect(
      getExerciseCatalogExercisesByMovementPattern("vertical_pull").map(
        (exercise) => exercise.name,
      ),
    ).toEqual([
      "Pull-Ups",
      "Chin-Ups",
      "Lat Pull-Downs",
      "Neutral-Grip Pulldown",
      "Assisted Pull-Up",
      "Wide-Grip Lat Pulldown",
      "Close-Grip Lat Pulldown",
      "Reverse-Grip Lat Pulldown",
      "Close Neutral-Grip Pulldown",
      "Medium-Grip Lat Pulldown",
    ]);
    expect(
      getExerciseCatalogExercisesByMovementPattern("horizontal_push").map(
        (exercise) => exercise.name,
      ),
    ).toContain("Flat Barbell Bench Press");
  });

  it("classifies compound and isolation roles needed by exercise selection rules", () => {
    expect(findExercise("flat-barbell-bench-press")).toMatchObject({
      catalogMuscleGroup: "chest",
      movementPattern: "horizontal_push",
      primaryMuscleGroups: ["chest"],
      role: "compound",
      secondaryMuscleGroups: ["shoulders", "triceps"],
    });
    expect(findExercise("bent-over-barbell-rows")).toMatchObject({
      catalogMuscleGroup: "back",
      movementPattern: "horizontal_pull",
      primaryMuscleGroups: ["back"],
      role: "compound",
      secondaryMuscleGroups: ["biceps", "forearms"],
    });
    expect(findExercise("standing-overhead-barbell-press")).toMatchObject({
      catalogMuscleGroup: "shoulders",
      movementPattern: "vertical_push",
      primaryMuscleGroups: ["shoulders"],
      role: "compound",
      secondaryMuscleGroups: ["triceps"],
    });
    expect(findExercise("flat-dumbbell-flyes")).toMatchObject({
      catalogMuscleGroup: "chest",
      movementPattern: "horizontal_push",
      primaryMuscleGroups: ["chest"],
      role: "isolation",
      secondaryMuscleGroups: [],
    });
    expect(findExercise("dumbbell-lateral-raises")).toMatchObject({
      catalogMuscleGroup: "shoulders",
      movementPattern: "vertical_push",
      primaryMuscleGroups: ["shoulders"],
      role: "isolation",
      secondaryMuscleGroups: [],
    });
    expect(findExercise("standing-barbell-curls")).toMatchObject({
      catalogMuscleGroup: "biceps",
      movementPattern: "elbow_flexion",
      primaryMuscleGroups: ["biceps"],
      role: "isolation",
    });
    expect(findExercise("cable-press-downs")).toMatchObject({
      catalogMuscleGroup: "triceps",
      movementPattern: "elbow_extension",
      primaryMuscleGroups: ["triceps"],
      role: "isolation",
    });
  });

  it("wraps main compound eligibility behind a domain helper", () => {
    expect(isMainCompoundEligible(findExistingExercise("flat-barbell-bench-press"))).toBe(true);
    expect(isMainCompoundEligible(findExistingExercise("flat-dumbbell-flyes"))).toBe(false);
    expect(isMainCompoundEligible(findExistingExercise("barbell-upright-rows"))).toBe(false);
    expect(isCompoundCapableMovementPattern("vertical_push")).toBe(true);
    expect(isCompoundCapableMovementPattern("elbow_extension")).toBe(false);
  });

  it("resolves legacy combined exercise ids to concrete exercises", () => {
    expect(getConcreteExerciseCatalogExerciseId("barbell-or-dumbbell-lunges")).toBe(
      "barbell-lunges",
    );
    expect(getExerciseCatalogExercise("barbell-or-dumbbell-lunges")).toMatchObject({
      id: "barbell-lunges",
      name: "Barbell Lunges",
    });
    expect(getExerciseCatalogExercise("standing-overhead-barbell-or-dumbbell-press")).toMatchObject(
      {
        id: "standing-overhead-barbell-press",
        name: "Standing Overhead Barbell Press",
      },
    );
  });
});

function findExercise(exerciseId: string): ExerciseCatalogExercise {
  const exercise = exerciseCatalogExercises.find(({ id }) => id === exerciseId);

  if (!exercise) {
    throw new Error(`Missing exercise "${exerciseId}".`);
  }

  return exercise;
}

function findExistingExercise(exerciseId: string): ExerciseCatalogExercise {
  const exercise = getExerciseCatalogExercise(exerciseId);

  if (!exercise) {
    throw new Error(`Missing exercise "${exerciseId}".`);
  }

  return exercise;
}
