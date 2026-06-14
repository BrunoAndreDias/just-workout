import {
  exerciseCatalogExercises,
  getConcreteExerciseCatalogExerciseId,
  getExerciseCatalogExercisesByMovementPattern,
  isMainCompoundEligible,
} from "./exercise-catalog";
import {
  type EquipmentPresetId,
  normalizeExerciseSelectionPreferences,
} from "./exercise-selection-preferences";
import { normalizeMainCompoundRotationPools } from "./main-compound-rotation-pool";
import { defaultRepRangeStyleId, isRepRangeStyleId } from "./plan-blueprint-options";
import {
  type PlanBlueprint,
  type RepRangeStyleId,
  userSelectedEquipmentPresetSource,
} from "./plan-blueprint-types";
import {
  getRecommendedTrainingSplitId,
  isTrainingSplitCompatible,
  type TrainingSplitId,
} from "./training-split";
import {
  createRecommendedTrainingVolumeConfiguration,
  isTrainingVolumeConfiguration,
  type TrainingVolumeConfiguration,
} from "./training-volume";
import {
  getWeeklyMovementCoverage,
  type MainCompoundSelection,
  normalizeMainCompoundSelections,
} from "./weekly-movement-coverage";

export type PlanBlueprintRecommendedDefault =
  | {
      kind: "training_split";
      split: TrainingSplitId;
    }
  | {
      kind: "rep_range_style";
      repRangeStyle: RepRangeStyleId;
    }
  | ({
      kind: "training_volume";
    } & TrainingVolumeConfiguration)
  | {
      kind: "equipment_preset";
      equipmentPreset: EquipmentPresetId;
    }
  | {
      exerciseId: string;
      kind: "main_compound_selection";
      movementPattern: MainCompoundSelection["movementPattern"];
    };

export type PlanBlueprintDefaultResolution = {
  isReady: boolean;
  recommendedDefaults: ReadonlyArray<PlanBlueprintRecommendedDefault>;
  resolvedBlueprint: PlanBlueprint;
};

export function resolvePlanBlueprintRecommendedDefaults(
  blueprint: PlanBlueprint,
): PlanBlueprintDefaultResolution {
  const recommendedDefaults: Array<PlanBlueprintRecommendedDefault> = [];
  let resolvedBlueprint = blueprint;

  if (!isTrainingSplitCompatible(blueprint.split, blueprint.trainingFrequencyDaysPerWeek)) {
    const split = getRecommendedTrainingSplitId(blueprint.trainingFrequencyDaysPerWeek);

    recommendedDefaults.push({
      kind: "training_split",
      split,
    });
    resolvedBlueprint = {
      ...resolvedBlueprint,
      split,
    };
  }

  if (!isRepRangeStyleId(blueprint.repRanges)) {
    recommendedDefaults.push({
      kind: "rep_range_style",
      repRangeStyle: defaultRepRangeStyleId,
    });
    resolvedBlueprint = {
      ...resolvedBlueprint,
      repRanges: defaultRepRangeStyleId,
    };
  }

  if (!isTrainingVolumeConfiguration(blueprint)) {
    const trainingVolumeConfiguration = createRecommendedTrainingVolumeConfiguration();

    recommendedDefaults.push({
      kind: "training_volume",
      ...trainingVolumeConfiguration,
    });
    resolvedBlueprint = {
      ...resolvedBlueprint,
      ...trainingVolumeConfiguration,
    };
  }

  const normalizedExerciseSelectionPreferences = normalizeExerciseSelectionPreferences(
    blueprint.exerciseSelectionPreferences,
  );
  const needsEquipmentPresetDefault =
    blueprint.equipmentPresetSource !== userSelectedEquipmentPresetSource;

  if (needsEquipmentPresetDefault) {
    recommendedDefaults.push({
      kind: "equipment_preset",
      equipmentPreset: normalizedExerciseSelectionPreferences.equipmentPreset,
    });
    resolvedBlueprint = {
      ...resolvedBlueprint,
      equipmentPresetSource: userSelectedEquipmentPresetSource,
      exerciseSelectionPreferences: normalizedExerciseSelectionPreferences,
    };
  }

  const resolvedSplit = resolvedBlueprint.split;

  if (resolvedSplit) {
    const missingMainCompoundSelections = recommendMissingMainCompoundSelections({
      ...resolvedBlueprint,
      split: resolvedSplit,
    });

    if (missingMainCompoundSelections.length > 0) {
      recommendedDefaults.push(
        ...missingMainCompoundSelections.map((selection) => ({
          exerciseId: selection.exerciseId,
          kind: "main_compound_selection" as const,
          movementPattern: selection.movementPattern,
        })),
      );
      const mainCompoundSelections = normalizeMainCompoundSelections([
        ...resolvedBlueprint.mainCompoundSelections,
        ...missingMainCompoundSelections,
      ]);

      resolvedBlueprint = {
        ...resolvedBlueprint,
        mainCompoundRotationPools: normalizeMainCompoundRotationPools({
          mainCompoundSelections,
          rotationPools: resolvedBlueprint.mainCompoundRotationPools,
        }),
        mainCompoundSelections,
      };
    }
  }

  return {
    isReady: recommendedDefaults.length === 0,
    recommendedDefaults,
    resolvedBlueprint,
  };
}

function recommendMissingMainCompoundSelections(
  blueprint: PlanBlueprint & { split: NonNullable<PlanBlueprint["split"]> },
): ReadonlyArray<MainCompoundSelection> {
  const existingSelections = normalizeMainCompoundSelections(blueprint.mainCompoundSelections);
  const selectedPatterns = new Set(
    existingSelections.map((selection) => selection.movementPattern),
  );
  const targetPatterns = getWeeklyMovementCoverage({
    mainCompoundSelections: existingSelections,
    split: blueprint.split,
    trainingFrequencyDaysPerWeek: blueprint.trainingFrequencyDaysPerWeek,
  }).rows.map((row) => row.movementPattern);

  return targetPatterns.flatMap((movementPattern) => {
    if (selectedPatterns.has(movementPattern)) {
      return [];
    }

    const exerciseId = getRecommendedMainCompoundExerciseId({
      blueprint,
      movementPattern,
    });

    return exerciseId ? [{ exerciseId, movementPattern }] : [];
  });
}

function getRecommendedMainCompoundExerciseId({
  blueprint,
  movementPattern,
}: {
  blueprint: PlanBlueprint;
  movementPattern: MainCompoundSelection["movementPattern"];
}): string | null {
  const availableExercises =
    getExerciseCatalogExercisesByMovementPattern(movementPattern).filter(isMainCompoundEligible);
  const avoidedExerciseIds = new Set(
    blueprint.exerciseSelectionPreferences.avoidedExercises
      .map(getPreferredOrAvoidedExerciseId)
      .filter((exerciseId): exerciseId is string => exerciseId !== null),
  );
  const preferredExerciseIds = blueprint.exerciseSelectionPreferences.preferredExercises
    .map(getPreferredOrAvoidedExerciseId)
    .filter((exerciseId): exerciseId is string => exerciseId !== null);

  for (const preferredExerciseId of preferredExerciseIds) {
    const preferredExercise = availableExercises.find(({ id }) => id === preferredExerciseId);

    if (preferredExercise && !avoidedExerciseIds.has(preferredExercise.id)) {
      return preferredExercise.id;
    }
  }

  const recommendedExerciseId =
    recommendedMainCompoundExerciseIdsByMovementPattern[movementPattern];

  if (
    recommendedExerciseId &&
    availableExercises.some(({ id }) => id === recommendedExerciseId) &&
    !avoidedExerciseIds.has(recommendedExerciseId)
  ) {
    return recommendedExerciseId;
  }

  return availableExercises.find((exercise) => !avoidedExerciseIds.has(exercise.id))?.id ?? null;
}

function getPreferredOrAvoidedExerciseId(
  preference: PlanBlueprint["exerciseSelectionPreferences"]["avoidedExercises"][number],
): string | null {
  if (typeof preference.matchedExerciseId === "string") {
    return getConcreteExerciseCatalogExerciseId(preference.matchedExerciseId);
  }

  const normalizedRawText = normalizeExercisePreferenceText(preference.rawText);

  return exerciseIdByNormalizedName.get(normalizedRawText) ?? null;
}

const exerciseIdByNormalizedName = new Map(
  exerciseCatalogExercises.map(
    (exercise) => [normalizeExercisePreferenceText(exercise.name), exercise.id] as const,
  ),
);

const recommendedMainCompoundExerciseIdsByMovementPattern = {
  hip_hamstring_dominant: "barbell-romanian-deadlifts",
  horizontal_pull: "bent-over-barbell-rows",
  horizontal_push: "flat-barbell-bench-press",
  quad_dominant: "barbell-squats",
  vertical_pull: "pull-ups",
  vertical_push: "standing-overhead-barbell-press",
} as const satisfies Record<MainCompoundSelection["movementPattern"], string>;

function normalizeExercisePreferenceText(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}
