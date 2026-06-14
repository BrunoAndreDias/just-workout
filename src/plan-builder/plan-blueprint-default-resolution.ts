import {
  type EquipmentPresetId,
  normalizeExerciseSelectionPreferences,
} from "./exercise-selection-preferences";
import { defaultRepRangeStyleId, isRepRangeStyleId } from "./plan-blueprint-options";
import type { PlanBlueprint, RepRangeStyleId } from "./plan-blueprint-types";
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
  const currentEquipmentPreset = getExerciseSelectionEquipmentPreset(
    blueprint.exerciseSelectionPreferences,
  );

  if (currentEquipmentPreset !== normalizedExerciseSelectionPreferences.equipmentPreset) {
    recommendedDefaults.push({
      kind: "equipment_preset",
      equipmentPreset: normalizedExerciseSelectionPreferences.equipmentPreset,
    });
    resolvedBlueprint = {
      ...resolvedBlueprint,
      exerciseSelectionPreferences: normalizedExerciseSelectionPreferences,
    };
  }

  return {
    isReady: recommendedDefaults.length === 0,
    recommendedDefaults,
    resolvedBlueprint,
  };
}

function getExerciseSelectionEquipmentPreset(preferences: unknown): string | null {
  if (typeof preferences !== "object" || preferences === null) {
    return null;
  }

  if (!("equipmentPreset" in preferences)) {
    return null;
  }

  return typeof preferences.equipmentPreset === "string" ? preferences.equipmentPreset : null;
}
