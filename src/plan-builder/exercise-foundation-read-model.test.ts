import { describe, expect, it } from "vitest";
import {
  type ExerciseFoundationReadyBlueprint,
  getExerciseFoundationReadModel,
} from "./exercise-foundation-read-model";
import { createDefaultPlanBlueprint } from "./plan-blueprint";
import { completeMainCompoundSelections } from "./plan-builder-test-fixtures";
import {
  createRecommendedTrainingVolumeConfiguration,
  setOptionalWeeklyRepTargetEnabled,
  type TrainingVolumeConfiguration,
} from "./training-volume";

const testBlueprintOptions = {
  id: "blueprint-1",
  timestamp: "2026-06-16T10:00:00.000Z",
};

function createReadyBlueprint(
  overrides: Partial<ExerciseFoundationReadyBlueprint> = {},
): ExerciseFoundationReadyBlueprint {
  return {
    ...createDefaultPlanBlueprint(testBlueprintOptions),
    split: "full-body-3-day",
    ...overrides,
  };
}

function createReadModel({
  blueprint = createReadyBlueprint(),
  trainingVolume = createRecommendedTrainingVolumeConfiguration(),
}: {
  blueprint?: ExerciseFoundationReadyBlueprint;
  trainingVolume?: TrainingVolumeConfiguration;
} = {}) {
  return getExerciseFoundationReadModel({
    blueprint,
    weeklyRepTargets: trainingVolume.weeklyRepTargets,
  });
}

describe("exercise foundation read model", () => {
  it("presents suggested Full Body foundation rows before the user confirms selections", () => {
    const readModel = createReadModel();
    const horizontalPushRow = readModel.rows.find(
      (row) => row.movementPattern === "horizontal_push",
    );
    const verticalPushRow = readModel.rows.find((row) => row.movementPattern === "vertical_push");

    expect(readModel.summary).toBe("5 suggested main compounds");
    expect(readModel.guidance).toBe("Choose horizontal push next.");
    expect(readModel.canContinueToGenerate).toBe(false);
    expect(horizontalPushRow).toMatchObject({
      movementPatternLabel: "Horizontal push",
      shownExercise: {
        exerciseId: "flat-barbell-bench-press",
        exerciseName: "Flat Barbell Bench Press",
      },
      status: "suggested",
      statusLabel: "Suggested",
    });
    expect(horizontalPushRow?.metadata).toBe(
      `Suggested · ${(horizontalPushRow?.mainCompoundOptions.length ?? 1) - 1} options`,
    );
    expect(
      horizontalPushRow?.mainCompoundOptions.find(
        (option) => option.id === "flat-barbell-bench-press",
      ),
    ).toMatchObject({
      filterTags: ["Barbell"],
      metadata: "Suggested, not confirmed",
    });
    expect(verticalPushRow).toMatchObject({
      requirement: "recommended",
      shownExercise: null,
      status: "recommended",
    });
  });

  it("returns missing required coverage guidance once the user has started selecting main compounds", () => {
    const readModel = createReadModel({
      blueprint: createReadyBlueprint({
        mainCompoundSelections: [
          {
            exerciseId: "flat-barbell-bench-press",
            movementPattern: "horizontal_push",
          },
        ],
      }),
    });
    const horizontalPullRow = readModel.rows.find(
      (row) => row.movementPattern === "horizontal_pull",
    );

    expect(readModel.summary).toBe("1 of 5 main compounds selected, 4 missing");
    expect(readModel.guidance).toBe("Choose horizontal pull next.");
    expect(readModel.nextRequiredPattern).toBe("horizontal_pull");
    expect(horizontalPullRow).toMatchObject({
      accessibleLabel: "Horizontal pull. Required movement pattern missing. Bent Over Barbell Rows",
      isMissing: true,
      shownExercise: {
        exerciseId: "bent-over-barbell-rows",
        exerciseName: "Bent Over Barbell Rows",
      },
      status: "missing",
    });
  });

  it("returns saved and suggested rotation pool previews from selected main compounds", () => {
    const readModel = createReadModel({
      blueprint: createReadyBlueprint({
        mainCompoundRotationPools: [
          {
            exerciseIds: ["incline-barbell-bench-press"],
            movementPattern: "horizontal_push",
          },
        ],
        mainCompoundSelections: completeMainCompoundSelections,
        split: "upper-lower-4-day",
        trainingFrequencyDaysPerWeek: 4,
      }),
    });
    const horizontalPushRow = readModel.rows.find(
      (row) => row.movementPattern === "horizontal_push",
    );
    const quadRow = readModel.rows.find((row) => row.movementPattern === "quad_dominant");

    expect(readModel.canContinueToGenerate).toBe(true);
    expect(horizontalPushRow?.rotationPool).toMatchObject({
      isSuggested: false,
      selectedExerciseCount: 1,
      selectedExerciseIds: ["incline-barbell-bench-press"],
      status: "1 selected",
    });
    expect(quadRow?.rotationPool).toMatchObject({
      isSuggested: true,
      selectedExerciseCount: 3,
      status: "3 suggested",
    });
    expect(quadRow?.rotationPool?.selectedExerciseIds).not.toContain("barbell-squats");
    expect(quadRow?.rotationPool?.options.map((option) => option.id)).not.toContain(
      "barbell-squats",
    );
  });

  it("filters optional accessory exercises from enabled Optional Volume Targets", () => {
    const baseVolume = createRecommendedTrainingVolumeConfiguration();
    const defaultReadModel = createReadModel({ trainingVolume: baseVolume });
    const absEnabled = setOptionalWeeklyRepTargetEnabled({
      isEnabled: true,
      muscleGroup: "abs",
      trainingVolumeConfiguration: baseVolume,
    });
    const absAndCalvesEnabled = setOptionalWeeklyRepTargetEnabled({
      isEnabled: true,
      muscleGroup: "calves",
      trainingVolumeConfiguration: absEnabled,
    });
    const optionalReadModel = createReadModel({ trainingVolume: absAndCalvesEnabled });

    expect(defaultReadModel.accessoryExerciseIds).not.toContain("decline-crunch");
    expect(defaultReadModel.accessoryExerciseIds).not.toContain("calf-raise");
    expect(defaultReadModel.recommendedAccessoryCount).toBe(2);
    expect(defaultReadModel.optionalAccessoryCount).toBe(4);
    expect(optionalReadModel.accessoryExerciseIds).toEqual(
      expect.arrayContaining(["decline-crunch", "calf-raise"]),
    );
    expect(optionalReadModel.recommendedAccessoryCount).toBe(3);
    expect(optionalReadModel.optionalAccessoryCount).toBe(5);
  });
});
