import { getExerciseCatalogExercise, isMainCompoundEligible } from "./exercise-catalog";
import {
  createDefaultExerciseSelectionPreferences,
  type ExerciseSelectionPreferenceItem,
  type ExerciseSelectionPreferences,
  normalizeExerciseSelectionPreferences,
} from "./exercise-selection-preferences";
import {
  applyMainCompoundRotationPoolUpdate,
  normalizeMainCompoundRotationPools,
} from "./main-compound-rotation-pool";
import { isRepRangeStyleId } from "./plan-blueprint-options";

export { resolvePlanBlueprintRecommendedDefaults } from "./plan-blueprint-default-resolution";
export {
  defaultRepRangeStyleId,
  getRepRangeStyle,
  getTrainingFrequencyRecommendation,
  getValidRepRangeStyleId,
  isRepRangeStyleId,
  isTrainingFrequencyDaysPerWeek,
  repRangeStyles,
  trainingFrequencyOptions,
} from "./plan-blueprint-options";

import {
  defaultConfirmedBuilderSteps,
  getConfirmedBuilderSteps,
  isVolumeStepComplete,
} from "./plan-blueprint-progress";
import {
  getWeeklyMovementCoverage,
  normalizeMainCompoundSelections,
} from "./weekly-movement-coverage";

export {
  getPlanBuilderRedirectStep,
  hasConfiguredExercises,
  hasConfiguredTrainingVolume,
  hasValidTrainingFrequency,
  isExercisesStepComplete,
  isFrequencyStepComplete,
  isRepRangesStepComplete,
  isSplitStepComplete,
  isVolumeStepComplete,
} from "./plan-blueprint-progress";
export { summarizePlanBlueprint } from "./plan-blueprint-summary";

import type {
  ConfirmExerciseSelectionPreferencesOptions,
  ConfirmRepRangeStyleOptions,
  ConfirmTrainingFrequencyOptions,
  ConfirmTrainingSplitOptions,
  ConfirmTrainingVolumeOptions,
  CreateDefaultPlanBlueprintOptions,
  InitializeTrainingVolumeOptions,
  PlanBlueprint,
  SelectMainCompoundOptions,
  SelectRepRangeStyleOptions,
  SelectTrainingFrequencyOptions,
  SelectTrainingSplitOptions,
  SelectTrainingVolumePresetOptions,
  SetOptionalVolumeTargetEnabledOptions,
  StoredPlanBlueprint,
  TrainingFrequencyDaysPerWeek,
  UpdateExerciseSelectionPreferencesOptions,
  UpdateMainCompoundRotationPoolOptions,
} from "./plan-blueprint-types";

export type {
  PlanBlueprint,
  PlanBlueprintSummary,
  PlanBuilderGuardedStep,
  PlanBuilderRedirectStep,
  RepRangeStyle,
  RepRangeStyleId,
  TrainingFrequencyDaysPerWeek,
  TrainingFrequencyOption,
} from "./plan-blueprint-types";

import type { TrainingSplitId } from "./training-split";
import { isTrainingSplitCompatible } from "./training-split";
import {
  createRecommendedTrainingVolumeConfiguration,
  createTrainingVolumeConfiguration,
  isTrainingVolumeConfiguration,
  isVolumePresetId,
  normalizeTrainingVolumeConfiguration,
  selectTrainingVolumeConfiguration,
  setOptionalWeeklyRepTargetEnabled,
} from "./training-volume";

export function createDefaultPlanBlueprint({
  id,
  timestamp,
}: CreateDefaultPlanBlueprintOptions): PlanBlueprint {
  return {
    id,
    createdAt: timestamp,
    updatedAt: timestamp,
    trainingGoal: "build-muscle",
    trainingFrequencyDaysPerWeek: 3,
    split: null,
    repRanges: null,
    volumePreset: null,
    volumePresetSource: null,
    weeklyRepTargets: null,
    mainCompoundSelections: [],
    mainCompoundRotationPools: [],
    exerciseSelectionPreferences: createDefaultExerciseSelectionPreferences(),
    confirmedBuilderSteps: getConfirmedBuilderSteps({
      confirmedBuilderSteps: defaultConfirmedBuilderSteps,
    }),
  };
}

export function normalizePlanBlueprint(blueprint: StoredPlanBlueprint): PlanBlueprint {
  const mainCompoundSelections = normalizeMainCompoundSelections(blueprint.mainCompoundSelections);

  return {
    ...blueprint,
    ...normalizeTrainingVolumeConfiguration(blueprint),
    exerciseSelectionPreferences: normalizeExerciseSelectionPreferences(
      blueprint.exerciseSelectionPreferences,
    ),
    mainCompoundSelections,
    mainCompoundRotationPools: normalizeMainCompoundRotationPools({
      mainCompoundSelections,
      rotationPools: blueprint.mainCompoundRotationPools,
    }),
    confirmedBuilderSteps: getConfirmedBuilderSteps(blueprint),
  };
}

export function selectTrainingFrequency({
  blueprint,
  timestamp,
  trainingFrequencyDaysPerWeek,
}: SelectTrainingFrequencyOptions): PlanBlueprint {
  const split = getCompatibleSelectedTrainingSplit({
    selectedTrainingSplit: blueprint.split,
    trainingFrequencyDaysPerWeek,
  });
  const hasTrainingFrequencyChanged =
    blueprint.trainingFrequencyDaysPerWeek !== trainingFrequencyDaysPerWeek;
  const hasSplitChanged = blueprint.split !== split;
  let confirmedBuilderSteps = getConfirmedBuilderSteps(blueprint);

  if (hasTrainingFrequencyChanged) {
    confirmedBuilderSteps = {
      ...confirmedBuilderSteps,
      exercises: false,
      frequency: false,
      split: false,
    };
  } else if (hasSplitChanged) {
    confirmedBuilderSteps = {
      ...confirmedBuilderSteps,
      exercises: false,
      split: false,
    };
  }

  return {
    ...blueprint,
    confirmedBuilderSteps,
    split,
    trainingFrequencyDaysPerWeek,
    updatedAt: timestamp,
  };
}

export function selectTrainingSplit(options: SelectTrainingSplitOptions): PlanBlueprint {
  const selectedTrainingSplitId = getSelectedTrainingSplitId(options);

  if (
    !isTrainingSplitCompatible(
      selectedTrainingSplitId,
      options.blueprint.trainingFrequencyDaysPerWeek,
    )
  ) {
    throw new Error(
      `Training Split "${selectedTrainingSplitId}" is not compatible with ${options.blueprint.trainingFrequencyDaysPerWeek} days/week.`,
    );
  }

  const confirmedBuilderSteps = getConfirmedBuilderSteps(options.blueprint);
  const isSameTrainingSplit = options.blueprint.split === selectedTrainingSplitId;

  return {
    ...options.blueprint,
    confirmedBuilderSteps: {
      ...confirmedBuilderSteps,
      exercises: isSameTrainingSplit ? confirmedBuilderSteps.exercises : false,
      split: isSameTrainingSplit ? confirmedBuilderSteps.split : false,
    },
    split: selectedTrainingSplitId,
    updatedAt: options.timestamp,
  };
}

export function selectRepRangeStyle({
  blueprint,
  repRangeStyle,
  timestamp,
}: SelectRepRangeStyleOptions): PlanBlueprint {
  if (!isRepRangeStyleId(repRangeStyle)) {
    throw new Error(`Unknown Rep Range Style "${repRangeStyle}".`);
  }

  const confirmedBuilderSteps = getConfirmedBuilderSteps(blueprint);
  const isSameRepRangeStyle = blueprint.repRanges === repRangeStyle;

  return {
    ...blueprint,
    confirmedBuilderSteps: {
      ...confirmedBuilderSteps,
      exercises: isSameRepRangeStyle ? confirmedBuilderSteps.exercises : false,
      repRanges: isSameRepRangeStyle ? confirmedBuilderSteps.repRanges : false,
      volume: isSameRepRangeStyle ? confirmedBuilderSteps.volume : false,
    },
    repRanges: repRangeStyle,
    updatedAt: timestamp,
  };
}

export function initializeTrainingVolume({
  blueprint,
  timestamp,
}: InitializeTrainingVolumeOptions): PlanBlueprint {
  if (isTrainingVolumeConfiguration(blueprint)) {
    return blueprint;
  }

  return {
    ...blueprint,
    ...createRecommendedTrainingVolumeConfiguration(),
    confirmedBuilderSteps: {
      ...getConfirmedBuilderSteps(blueprint),
      exercises: false,
      volume: false,
    },
    updatedAt: timestamp,
  };
}

export function selectTrainingVolumePreset({
  blueprint,
  timestamp,
  volumePreset,
}: SelectTrainingVolumePresetOptions): PlanBlueprint {
  if (!isVolumePresetId(volumePreset)) {
    throw new Error(`Unknown Volume Preset "${volumePreset}".`);
  }

  const confirmedBuilderSteps = getConfirmedBuilderSteps(blueprint);
  const hasVolumePresetChanged = blueprint.volumePreset !== volumePreset;
  const nextTrainingVolumeConfiguration = isTrainingVolumeConfiguration(blueprint)
    ? selectTrainingVolumeConfiguration({
        trainingVolumeConfiguration: blueprint,
        volumePreset,
      })
    : createTrainingVolumeConfiguration({
        volumePreset,
        volumePresetSource: "user_selected",
      });

  return {
    ...blueprint,
    ...nextTrainingVolumeConfiguration,
    confirmedBuilderSteps: {
      ...confirmedBuilderSteps,
      exercises: hasVolumePresetChanged ? false : confirmedBuilderSteps.exercises,
      volume: hasVolumePresetChanged ? false : confirmedBuilderSteps.volume,
    },
    updatedAt: timestamp,
  };
}

export function setOptionalVolumeTargetEnabled({
  blueprint,
  isEnabled,
  muscleGroup,
  timestamp,
}: SetOptionalVolumeTargetEnabledOptions): PlanBlueprint {
  const confirmedBuilderSteps = getConfirmedBuilderSteps(blueprint);
  const trainingVolumeConfiguration = isTrainingVolumeConfiguration(blueprint)
    ? blueprint
    : createRecommendedTrainingVolumeConfiguration();
  const currentWeeklyRepTarget = trainingVolumeConfiguration.weeklyRepTargets.find(
    (weeklyRepTarget) => weeklyRepTarget.muscleGroup === muscleGroup,
  );
  const hasEnabledStateChanged = currentWeeklyRepTarget?.isEnabled !== isEnabled;
  const nextTrainingVolumeConfiguration = setOptionalWeeklyRepTargetEnabled({
    isEnabled,
    muscleGroup,
    trainingVolumeConfiguration,
  });

  return {
    ...blueprint,
    ...nextTrainingVolumeConfiguration,
    confirmedBuilderSteps: {
      ...confirmedBuilderSteps,
      exercises: hasEnabledStateChanged ? false : confirmedBuilderSteps.exercises,
      volume: hasEnabledStateChanged ? false : confirmedBuilderSteps.volume,
    },
    updatedAt: timestamp,
  };
}

export function updateExerciseSelectionPreferences({
  blueprint,
  exerciseSelectionPreferences,
  timestamp,
}: UpdateExerciseSelectionPreferencesOptions): PlanBlueprint {
  const normalizedExerciseSelectionPreferences = normalizeExerciseSelectionPreferences(
    exerciseSelectionPreferences,
  );
  const confirmedBuilderSteps = getConfirmedBuilderSteps(blueprint);
  const hasExerciseSelectionPreferencesChanged = !areExerciseSelectionPreferencesEqual(
    blueprint.exerciseSelectionPreferences,
    normalizedExerciseSelectionPreferences,
  );

  return {
    ...blueprint,
    confirmedBuilderSteps: {
      ...confirmedBuilderSteps,
      exercises: hasExerciseSelectionPreferencesChanged ? false : confirmedBuilderSteps.exercises,
    },
    exerciseSelectionPreferences: normalizedExerciseSelectionPreferences,
    updatedAt: timestamp,
  };
}

export function selectMainCompound({
  blueprint,
  exerciseId,
  movementPattern,
  timestamp,
}: SelectMainCompoundOptions): PlanBlueprint {
  const exercise = getExerciseCatalogExercise(exerciseId);

  if (!exercise || !isMainCompoundEligible(exercise)) {
    throw new Error(`Exercise "${exerciseId}" is not eligible as a main compound.`);
  }

  if (exercise.movementPattern !== movementPattern) {
    throw new Error(
      `Exercise "${exerciseId}" does not match movement pattern "${movementPattern}".`,
    );
  }

  const normalizedSelections = normalizeMainCompoundSelections(blueprint.mainCompoundSelections);
  const currentSelection = normalizedSelections.find(
    (selection) => selection.movementPattern === movementPattern,
  );
  const hasMainCompoundChanged = currentSelection?.exerciseId !== exerciseId;
  const nextSelection = {
    exerciseId,
    movementPattern,
    updatedAt: timestamp,
  };
  const nextMainCompoundSelections = normalizeMainCompoundSelections([
    ...normalizedSelections.filter((selection) => selection.movementPattern !== movementPattern),
    nextSelection,
  ]);
  const nextMainCompoundRotationPools = normalizeMainCompoundRotationPools({
    mainCompoundSelections: nextMainCompoundSelections,
    rotationPools: blueprint.mainCompoundRotationPools,
  });

  return {
    ...blueprint,
    confirmedBuilderSteps: {
      ...getConfirmedBuilderSteps(blueprint),
      exercises: hasMainCompoundChanged ? false : getConfirmedBuilderSteps(blueprint).exercises,
    },
    mainCompoundSelections: nextMainCompoundSelections,
    mainCompoundRotationPools: nextMainCompoundRotationPools,
    updatedAt: timestamp,
  };
}

export function updateMainCompoundRotationPool({
  blueprint,
  exerciseIds,
  movementPattern,
  timestamp,
}: UpdateMainCompoundRotationPoolOptions): PlanBlueprint {
  const mainCompoundSelections = normalizeMainCompoundSelections(blueprint.mainCompoundSelections);
  const nextMainCompoundRotationPools = applyMainCompoundRotationPoolUpdate({
    mainCompoundSelections,
    rotationPools: blueprint.mainCompoundRotationPools,
    update: {
      exerciseIds,
      movementPattern,
      updatedAt: timestamp,
    },
  });

  return {
    ...blueprint,
    confirmedBuilderSteps: {
      ...getConfirmedBuilderSteps(blueprint),
      exercises: false,
    },
    mainCompoundRotationPools: nextMainCompoundRotationPools,
    updatedAt: timestamp,
  };
}

export function confirmTrainingFrequency({
  blueprint,
  timestamp,
  trainingFrequencyDaysPerWeek,
}: ConfirmTrainingFrequencyOptions): PlanBlueprint {
  const updatedBlueprint = selectTrainingFrequency({
    blueprint,
    timestamp,
    trainingFrequencyDaysPerWeek,
  });

  return {
    ...updatedBlueprint,
    confirmedBuilderSteps: {
      ...updatedBlueprint.confirmedBuilderSteps,
      frequency: true,
    },
    updatedAt: timestamp,
  };
}

export function confirmTrainingSplit({
  blueprint,
  split,
  timestamp,
}: ConfirmTrainingSplitOptions): PlanBlueprint {
  const updatedBlueprint = selectTrainingSplit({
    blueprint,
    split,
    timestamp,
  });

  return {
    ...updatedBlueprint,
    confirmedBuilderSteps: {
      ...updatedBlueprint.confirmedBuilderSteps,
      split: true,
    },
    updatedAt: timestamp,
  };
}

export function confirmRepRangeStyle({
  blueprint,
  repRangeStyle,
  timestamp,
}: ConfirmRepRangeStyleOptions): PlanBlueprint {
  const updatedBlueprint = selectRepRangeStyle({
    blueprint,
    repRangeStyle,
    timestamp,
  });

  return {
    ...updatedBlueprint,
    confirmedBuilderSteps: {
      ...updatedBlueprint.confirmedBuilderSteps,
      repRanges: true,
    },
    updatedAt: timestamp,
  };
}

export function confirmTrainingVolume({
  blueprint,
  timestamp,
}: ConfirmTrainingVolumeOptions): PlanBlueprint {
  if (!isTrainingVolumeConfiguration(blueprint)) {
    throw new Error("Training Volume must be configured before it can be confirmed.");
  }

  return {
    ...blueprint,
    confirmedBuilderSteps: {
      ...blueprint.confirmedBuilderSteps,
      volume: true,
    },
    updatedAt: timestamp,
  };
}

export function confirmExerciseSelectionPreferences({
  blueprint,
  exerciseSelectionPreferences,
  timestamp,
}: ConfirmExerciseSelectionPreferencesOptions): PlanBlueprint {
  let blueprintToConfirm = blueprint;

  if (exerciseSelectionPreferences !== undefined) {
    blueprintToConfirm = updateExerciseSelectionPreferences({
      blueprint,
      exerciseSelectionPreferences,
      timestamp,
    });
  }

  if (!isVolumeStepComplete(blueprintToConfirm)) {
    throw new Error("Exercises cannot be confirmed before Training Volume is confirmed.");
  }

  if (!blueprintToConfirm.split) {
    throw new Error("Exercises cannot be confirmed before a Training Split is selected.");
  }

  if (
    !getWeeklyMovementCoverage({
      mainCompoundSelections: blueprintToConfirm.mainCompoundSelections,
      split: blueprintToConfirm.split,
      trainingFrequencyDaysPerWeek: blueprintToConfirm.trainingFrequencyDaysPerWeek,
    }).canConfirmExercises
  ) {
    throw new Error(
      "Exercises cannot be confirmed while required Weekly Movement Coverage is missing.",
    );
  }

  return {
    ...blueprintToConfirm,
    confirmedBuilderSteps: {
      ...blueprintToConfirm.confirmedBuilderSteps,
      exercises: true,
    },
    updatedAt: timestamp,
  };
}

function getCompatibleSelectedTrainingSplit({
  selectedTrainingSplit,
  trainingFrequencyDaysPerWeek,
}: {
  selectedTrainingSplit: TrainingSplitId | null;
  trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek;
}): TrainingSplitId | null {
  if (!selectedTrainingSplit) {
    return null;
  }

  if (!isTrainingSplitCompatible(selectedTrainingSplit, trainingFrequencyDaysPerWeek)) {
    return null;
  }

  return selectedTrainingSplit;
}

function areExerciseSelectionPreferencesEqual(
  left: ExerciseSelectionPreferences,
  right: ExerciseSelectionPreferences,
): boolean {
  return (
    left.equipmentPreset === right.equipmentPreset &&
    left.strategy === right.strategy &&
    areExerciseSelectionPreferenceItemsEqual(left.avoidedExercises, right.avoidedExercises) &&
    areExerciseSelectionPreferenceItemsEqual(left.preferredExercises, right.preferredExercises)
  );
}

function areExerciseSelectionPreferenceItemsEqual(
  left: ReadonlyArray<ExerciseSelectionPreferenceItem>,
  right: ReadonlyArray<ExerciseSelectionPreferenceItem>,
): boolean {
  return (
    left.length === right.length &&
    left.every(
      (item, index) =>
        item.id === right[index]?.id &&
        item.matchedExerciseId === right[index]?.matchedExerciseId &&
        item.rawText === right[index]?.rawText,
    )
  );
}

function getSelectedTrainingSplitId({
  split,
  trainingSplitId,
}: SelectTrainingSplitOptions): TrainingSplitId {
  return split ?? trainingSplitId;
}
