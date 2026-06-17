import { describe, expect, it } from "vitest";
import type { ExerciseFoundationCompoundOption } from "../../exercise-foundation-read-model";
import { filterExerciseFoundationOptions } from "./exercise-foundation-option-picker";

describe("exercise foundation option picker", () => {
  it("filters options by search query and active filter", () => {
    const options = [
      createOption({
        filterIds: ["barbell"],
        filterTags: ["Barbell"],
        id: "flat-barbell-bench-press",
        name: "Flat Barbell Bench Press",
      }),
      createOption({
        filterIds: ["dumbbells"],
        filterTags: ["Dumbbells"],
        id: "flat-dumbbell-bench-press",
        name: "Flat Dumbbell Bench Press",
      }),
      createOption({
        filterIds: ["machine", "joint_friendly"],
        filterTags: ["Machine", "Joint-friendly"],
        id: "machine-chest-press",
        name: "Machine Chest Press",
      }),
    ];

    expect(
      filterExerciseFoundationOptions({
        activeFilterId: "all",
        options,
        searchQuery: "  bench  ",
      }).map((option) => option.id),
    ).toEqual(["flat-barbell-bench-press", "flat-dumbbell-bench-press"]);

    expect(
      filterExerciseFoundationOptions({
        activeFilterId: "all",
        options,
        searchQuery: "flat barbell",
      }).map((option) => option.id),
    ).toEqual(["flat-barbell-bench-press"]);

    expect(
      filterExerciseFoundationOptions({
        activeFilterId: "machine",
        options,
        searchQuery: "press",
      }).map((option) => option.id),
    ).toEqual(["machine-chest-press"]);
  });
});

function createOption(
  overrides: Pick<ExerciseFoundationCompoundOption, "filterIds" | "filterTags" | "id" | "name">,
): ExerciseFoundationCompoundOption {
  return {
    catalogMuscleGroup: "chest",
    metadata: "Available main compound",
    movementPattern: "horizontal_push",
    primaryMuscleGroups: ["chest"],
    role: "compound",
    secondaryMuscleGroups: ["shoulders", "triceps"],
    ...overrides,
  };
}
