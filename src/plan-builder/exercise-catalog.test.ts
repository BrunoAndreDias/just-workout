import { describe, expect, it } from "vitest";
import {
  type ExerciseCatalogExercise,
  exerciseCatalogExercises,
  exerciseCatalogMuscleGroups,
  getExerciseCatalogExercise,
  getExerciseCatalogExercisesByMovementPattern,
  isCompoundCapableMovementPattern,
  isMainCompoundEligible,
} from "./exercise-catalog";

describe("exercise catalog", () => {
  it("keeps one rich exercise catalog without duplicate ids or names", () => {
    expect(exerciseCatalogExercises).toHaveLength(65);
    expect(new Set(exerciseCatalogExercises.map((exercise) => exercise.id)).size).toBe(65);
    expect(new Set(exerciseCatalogExercises.map((exercise) => exercise.name)).size).toBe(65);
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
    ).toBe(65);
    expect(
      exerciseCatalogMuscleGroups.find((muscleGroup) => muscleGroup.id === "chest")?.exercises,
    ).toContain("Flat Barbell or Dumbbell Bench Press");
    expect(
      exerciseCatalogMuscleGroups.find((muscleGroup) => muscleGroup.id === "triceps")?.exercises,
    ).toContain("Cable Press-Downs");
  });

  it("can query exercises by movement pattern from the same catalog", () => {
    expect(
      getExerciseCatalogExercisesByMovementPattern("vertical_pull").map(
        (exercise) => exercise.name,
      ),
    ).toEqual(["Pull-Ups", "Chin-Ups", "Lat Pull-Downs"]);
    expect(
      getExerciseCatalogExercisesByMovementPattern("horizontal_push").map(
        (exercise) => exercise.name,
      ),
    ).toContain("Flat Barbell or Dumbbell Bench Press");
  });

  it("classifies compound and isolation roles needed by exercise selection rules", () => {
    expect(findExercise("flat-barbell-or-dumbbell-bench-press")).toMatchObject({
      catalogMuscleGroup: "chest",
      movementPattern: "horizontal_push",
      primaryMuscleGroups: ["chest"],
      role: "compound",
      secondaryMuscleGroups: ["shoulders", "triceps"],
    });
    expect(findExercise("bent-over-barbell-or-dumbbell-rows")).toMatchObject({
      catalogMuscleGroup: "back",
      movementPattern: "horizontal_pull",
      primaryMuscleGroups: ["back"],
      role: "compound",
      secondaryMuscleGroups: ["biceps", "forearms"],
    });
    expect(findExercise("standing-overhead-barbell-or-dumbbell-press")).toMatchObject({
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
    expect(findExercise("dumbbell-cable-or-machine-lateral-raises")).toMatchObject({
      catalogMuscleGroup: "shoulders",
      movementPattern: "vertical_push",
      primaryMuscleGroups: ["shoulders"],
      role: "isolation",
      secondaryMuscleGroups: [],
    });
    expect(findExercise("standing-barbell-or-dumbbell-curls")).toMatchObject({
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
    expect(
      isMainCompoundEligible(findExistingExercise("flat-barbell-or-dumbbell-bench-press")),
    ).toBe(true);
    expect(isMainCompoundEligible(findExistingExercise("flat-dumbbell-flyes"))).toBe(false);
    expect(
      isMainCompoundEligible(findExistingExercise("barbell-dumbbell-or-machine-upright-rows")),
    ).toBe(false);
    expect(isCompoundCapableMovementPattern("vertical_push")).toBe(true);
    expect(isCompoundCapableMovementPattern("elbow_extension")).toBe(false);
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
