import {
  type EquipmentPresetId,
  getAvoidedExerciseIds,
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
  formatMovementPatternLabel,
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
  blockingIssues: ReadonlyArray<PlanBlueprintGenerationBlockingIssue>;
  isReady: boolean;
  recommendedDefaults: ReadonlyArray<PlanBlueprintRecommendedDefault>;
  resolvedBlueprint: PlanBlueprint;
};

export type PlanBlueprintGenerationBlockingIssue = {
  kind: "no_valid_main_compound_selection";
  message: string;
  movementPattern: MainCompoundSelection["movementPattern"];
};

export function resolvePlanBlueprintRecommendedDefaults(
  blueprint: PlanBlueprint,
): PlanBlueprintDefaultResolution {
  const recommendedDefaults: Array<PlanBlueprintRecommendedDefault> = [];
  const blockingIssues: Array<PlanBlueprintGenerationBlockingIssue> = [];
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
  const avoidedExerciseIds = getAvoidedExerciseIds(normalizedExerciseSelectionPreferences);
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
    const filteredMainCompoundSelections = normalizeMainCompoundSelections(
      resolvedBlueprint.mainCompoundSelections,
    ).filter((selection) => !avoidedExerciseIds.has(selection.exerciseId));

    if (filteredMainCompoundSelections.length !== resolvedBlueprint.mainCompoundSelections.length) {
      resolvedBlueprint = {
        ...resolvedBlueprint,
        mainCompoundSelections: filteredMainCompoundSelections,
      };
    }

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

    const requiredMovementPatterns = getWeeklyMovementCoverage({
      mainCompoundSelections: resolvedBlueprint.mainCompoundSelections,
      split: resolvedSplit,
      trainingFrequencyDaysPerWeek: resolvedBlueprint.trainingFrequencyDaysPerWeek,
    })
      .rows.filter((row) => row.requirement === "required")
      .map((row) => row.movementPattern);
    const selectedMovementPatterns = new Set(
      resolvedBlueprint.mainCompoundSelections.map((selection) => selection.movementPattern),
    );

    for (const movementPattern of requiredMovementPatterns) {
      if (selectedMovementPatterns.has(movementPattern)) {
        continue;
      }

      blockingIssues.push({
        kind: "no_valid_main_compound_selection",
        message: getNoValidMainCompoundSelectionMessage(movementPattern),
        movementPattern,
      });
    }
  }

  resolvedBlueprint = {
    ...resolvedBlueprint,
    mainCompoundRotationPools: deriveMainCompoundRotationPools({
      exerciseSelectionPreferences: normalizedExerciseSelectionPreferences,
      mainCompoundSelections: resolvedBlueprint.mainCompoundSelections,
      rotationPools: resolvedBlueprint.mainCompoundRotationPools,
      rotationPreferences: resolvedBlueprint.mainCompoundRotationPreferences,
    }),
  };

  return {
    blockingIssues,
    isReady: recommendedDefaults.length === 0 && blockingIssues.length === 0,
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

function getNoValidMainCompoundSelectionMessage(
  movementPattern: MainCompoundSelection["movementPattern"],
): string {
  return `Weekly Movement Coverage is blocked for ${formatMovementPatternLabel(movementPattern)} because Exercise Selection Preferences avoid every valid exercise in that Movement Pattern. Remove an avoidance or choose another valid exercise before generating.`;
}
