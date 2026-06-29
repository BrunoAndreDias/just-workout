import { describe, expect, it } from "vitest";
import { createDefaultExerciseSelectionPreferences } from "./exercise-selection-preferences";
import {
  recommendMainCompoundSelection,
  recommendMissingMainCompoundSelections,
} from "./main-compound-recommendation";

describe("main compound recommendation", () => {
  it("uses the default fallback for a Movement Pattern when preferences do not match", () => {
    expect(
      recommendMainCompoundSelection({
        exerciseSelectionPreferences: createDefaultExerciseSelectionPreferences(),
        movementPattern: "horizontal_push",
      }),
    ).toEqual({
      exerciseId: "flat-barbell-bench-press",
      movementPattern: "horizontal_push",
    });
  });

  it("prefers matching preferred exercises before the default fallback", () => {
    expect(
      recommendMainCompoundSelection({
        exerciseSelectionPreferences: {
          ...createDefaultExerciseSelectionPreferences(),
          preferredExercises: [{ id: "preferred-1", rawText: "Flat Dumbbell Bench Press" }],
        },
        movementPattern: "horizontal_push",
      }),
    ).toEqual({
      exerciseId: "flat-dumbbell-bench-press",
      movementPattern: "horizontal_push",
    });
  });

  it("uses ranked Main Compound Preferences before flat Exercise Selection Preferences and defaults", () => {
    expect(
      recommendMainCompoundSelection({
        exerciseSelectionPreferences: {
          ...createDefaultExerciseSelectionPreferences(),
          preferredExercises: [{ id: "preferred-1", rawText: "Flat Dumbbell Bench Press" }],
        },
        mainCompoundPreferences: [
          {
            exerciseIds: ["incline-dumbbell-bench-press", "flat-barbell-bench-press"],
            movementPattern: "horizontal_push",
          },
        ],
        movementPattern: "horizontal_push",
      }),
    ).toEqual({
      exerciseId: "incline-dumbbell-bench-press",
      movementPattern: "horizontal_push",
    });
  });

  it("treats avoided exercises as hard exclusions before falling back", () => {
    expect(
      recommendMainCompoundSelection({
        exerciseSelectionPreferences: {
          ...createDefaultExerciseSelectionPreferences(),
          avoidedExercises: [{ id: "avoided-1", rawText: "Flat Barbell Bench Press" }],
        },
        movementPattern: "horizontal_push",
      }),
    ).toEqual({
      exerciseId: "flat-dumbbell-bench-press",
      movementPattern: "horizontal_push",
    });
  });

  it("recommends missing Main Compound Selections for all Weekly Movement Coverage rows", () => {
    expect(
      recommendMissingMainCompoundSelections({
        exerciseSelectionPreferences: createDefaultExerciseSelectionPreferences(),
        mainCompoundSelections: [
          {
            exerciseId: "flat-barbell-bench-press",
            movementPattern: "horizontal_push",
          },
        ],
        split: "full-body-3-day",
        trainingFrequencyDaysPerWeek: 3,
      }),
    ).toEqual([
      {
        exerciseId: "bent-over-barbell-rows",
        movementPattern: "horizontal_pull",
      },
      {
        exerciseId: "standing-overhead-barbell-press",
        movementPattern: "vertical_push",
      },
      {
        exerciseId: "pull-ups",
        movementPattern: "vertical_pull",
      },
      {
        exerciseId: "barbell-squats",
        movementPattern: "quad_dominant",
      },
      {
        exerciseId: "barbell-romanian-deadlifts",
        movementPattern: "hip_hamstring_dominant",
      },
    ]);
  });
});
