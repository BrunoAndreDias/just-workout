import {
  type EquipmentPresetId,
  normalizeExerciseSelectionPreferences,
} from "./exercise-selection-preferences";
import { recommendMissingMainCompoundSelections } from "./main-compound-recommendation";
import {
  deriveMainCompoundRotationPools,
  normalizeMainCompoundRotationPools,
} from "./main-compound-rotation-pool";
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
      exerciseSelectionPreferences: normalizedExerciseSelectionPreferences,
      mainCompoundPreferences: resolvedBlueprint.mainCompoundPreferences,
      mainCompoundSelections: resolvedBlueprint.mainCompoundSelections,
      split: resolvedSplit,
      trainingFrequencyDaysPerWeek: resolvedBlueprint.trainingFrequencyDaysPerWeek,
    });

    if (missingMainCompoundSelections.length > 0) {
      recommendedDefaults.push(
        ...missingMainCompoundSelections.map(createMainCompoundSelectionRecommendedDefault),
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

  resolvedBlueprint = {
    ...resolvedBlueprint,
    mainCompoundRotationPools: deriveMainCompoundRotationPools({
      mainCompoundSelections: resolvedBlueprint.mainCompoundSelections,
      rotationPools: resolvedBlueprint.mainCompoundRotationPools,
      rotationPreferences: resolvedBlueprint.mainCompoundRotationPreferences,
    }),
  };

  return {
    isReady: recommendedDefaults.length === 0,
    recommendedDefaults,
    resolvedBlueprint,
  };
}

function createMainCompoundSelectionRecommendedDefault(
  selection: MainCompoundSelection,
): PlanBlueprintRecommendedDefault {
  return {
    exerciseId: selection.exerciseId,
    kind: "main_compound_selection",
    movementPattern: selection.movementPattern,
  };
}
