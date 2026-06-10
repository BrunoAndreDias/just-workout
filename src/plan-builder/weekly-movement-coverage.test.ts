import { describe, expect, it } from "vitest";
import { completeMainCompoundSelections } from "./plan-builder-test-fixtures";
import {
  getWeeklyMovementCoverage,
  normalizeMainCompoundSelections,
} from "./weekly-movement-coverage";

describe("weekly movement coverage", () => {
  it("treats Vertical Push as recommended rather than required for Full Body", () => {
    const coverage = getWeeklyMovementCoverage({
      mainCompoundSelections: [
        {
          exerciseId: "flat-barbell-bench-press",
          movementPattern: "horizontal_push",
        },
        {
          exerciseId: "bent-over-barbell-rows",
          movementPattern: "horizontal_pull",
        },
        {
          exerciseId: "pull-ups",
          movementPattern: "vertical_pull",
        },
        {
          exerciseId: "barbell-squats",
          movementPattern: "quad_dominant",
        },
      ],
      split: "full-body-3-day",
      trainingFrequencyDaysPerWeek: 3,
    });

    expect(coverage.coverageRuleFamily).toBe("full_body");
    expect(coverage.requiredPatternCount).toBe(5);
    expect(coverage.coveredRequiredPatternCount).toBe(4);
    expect(coverage.missingRequiredPatterns).toEqual(["hip_hamstring_dominant"]);
    expect(coverage.recommendedPatterns).toEqual(["vertical_push"]);
    expect(coverage.rows.find((row) => row.movementPattern === "vertical_push")).toMatchObject({
      isCovered: false,
      requirement: "recommended",
    });
    expect(coverage.canConfirmExercises).toBe(false);
  });

  it("requires all six compound-capable movement patterns for Upper/Lower", () => {
    const coverage = getWeeklyMovementCoverage({
      mainCompoundSelections: [
        {
          exerciseId: "flat-barbell-bench-press",
          movementPattern: "horizontal_push",
        },
        {
          exerciseId: "bent-over-barbell-rows",
          movementPattern: "horizontal_pull",
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
      ],
      split: "upper-lower-4-day",
      trainingFrequencyDaysPerWeek: 4,
    });

    expect(coverage.coverageRuleFamily).toBe("upper_lower");
    expect(coverage.requiredPatternCount).toBe(6);
    expect(coverage.coveredRequiredPatternCount).toBe(5);
    expect(coverage.missingRequiredPatterns).toEqual(["vertical_push"]);
    expect(coverage.canConfirmExercises).toBe(false);
  });

  it("recomputes required counts from the active Coverage Rule Family for the same selections", () => {
    const selectionsWithoutVerticalPush = completeMainCompoundSelections.filter(
      (selection) => selection.movementPattern !== "vertical_push",
    );

    expect(
      getWeeklyMovementCoverage({
        mainCompoundSelections: selectionsWithoutVerticalPush,
        split: "full-body-3-day",
        trainingFrequencyDaysPerWeek: 3,
      }),
    ).toMatchObject({
      canConfirmExercises: true,
      coveredRequiredPatternCount: 5,
      missingRequiredPatterns: [],
      recommendedPatterns: ["vertical_push"],
      requiredPatternCount: 5,
    });

    expect(
      getWeeklyMovementCoverage({
        mainCompoundSelections: selectionsWithoutVerticalPush,
        split: "upper-lower-4-day",
        trainingFrequencyDaysPerWeek: 4,
      }),
    ).toMatchObject({
      canConfirmExercises: false,
      coveredRequiredPatternCount: 5,
      missingRequiredPatterns: ["vertical_push"],
      requiredPatternCount: 6,
    });

    expect(
      getWeeklyMovementCoverage({
        mainCompoundSelections: selectionsWithoutVerticalPush,
        split: "rotating-push-pull-legs",
        trainingFrequencyDaysPerWeek: 4,
      }),
    ).toMatchObject({
      canConfirmExercises: false,
      coveredRequiredPatternCount: 5,
      missingRequiredPatterns: ["vertical_push"],
      requiredPatternCount: 6,
    });
  });

  it("uses split bucket copy for Push/Pull/Legs missing requirements", () => {
    const coverage = getWeeklyMovementCoverage({
      mainCompoundSelections: [
        {
          exerciseId: "flat-barbell-bench-press",
          movementPattern: "horizontal_push",
        },
        {
          exerciseId: "standing-overhead-barbell-press",
          movementPattern: "vertical_push",
        },
        {
          exerciseId: "barbell-squats",
          movementPattern: "quad_dominant",
        },
        {
          exerciseId: "barbell-romanian-deadlifts",
          movementPattern: "hip_hamstring_dominant",
        },
      ],
      split: "rotating-push-pull-legs",
      trainingFrequencyDaysPerWeek: 4,
    });

    expect(coverage.coverageRuleFamily).toBe("push_pull_legs");
    expect(coverage.missingRequiredPatterns).toEqual(["horizontal_pull", "vertical_pull"]);
    expect(coverage.missingRequiredSummary).toBe("Missing 2 required movement patterns.");
    expect(coverage.rows.find((row) => row.movementPattern === "vertical_pull")).toMatchObject({
      bucket: "Pull",
      isCovered: false,
      requirement: "required",
    });
  });

  it("counts only exact compound movement matches toward coverage", () => {
    const coverage = getWeeklyMovementCoverage({
      mainCompoundSelections: [
        {
          exerciseId: "flat-dumbbell-flyes",
          movementPattern: "horizontal_push",
        },
        {
          exerciseId: "dips-elbows-close-no-forward-lean",
          movementPattern: "vertical_push",
        },
        {
          exerciseId: "barbell-upright-rows",
          movementPattern: "vertical_push",
        },
        {
          exerciseId: "pull-ups",
          movementPattern: "vertical_pull",
        },
      ],
      split: "upper-lower-full-body",
      trainingFrequencyDaysPerWeek: 3,
    });

    expect(coverage.coveredRequiredPatternCount).toBe(1);
    expect(coverage.missingRequiredPatterns).toEqual([
      "horizontal_push",
      "horizontal_pull",
      "vertical_push",
      "quad_dominant",
      "hip_hamstring_dominant",
    ]);
  });

  it("normalizes malformed main compound selections into a canonical per-pattern shape", () => {
    expect(
      normalizeMainCompoundSelections([
        {
          exerciseId: "flat-barbell-bench-press",
          movementPattern: "horizontal_push",
          updatedAt: "2026-05-30T10:05:00.000Z",
        },
        {
          exerciseId: "decline-chest-press-machine",
          movementPattern: "horizontal_push",
        },
        {
          exerciseId: "pull-ups",
          movementPattern: "vertical_pull",
        },
        {
          exerciseId: "cable-press-downs",
          movementPattern: "elbow_extension",
        },
        {
          movementPattern: "quad_dominant",
        },
      ]),
    ).toEqual([
      {
        exerciseId: "decline-chest-press-machine",
        movementPattern: "horizontal_push",
      },
      {
        exerciseId: "pull-ups",
        movementPattern: "vertical_pull",
      },
    ]);
  });
});
