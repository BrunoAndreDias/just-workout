import {
  type TrainingPlanContent,
  validateTrainingPlanDraftContent,
  type WorkoutTemplate,
  type WorkoutTemplatePurpose,
} from "../training-plan/training-plan";
import { getExerciseCatalogExercise, isMainCompoundEligible } from "./exercise-catalog";
import {
  createDefaultExerciseSelectionPreferences,
  type ExerciseSelectionPreferenceItem,
  type ExerciseSelectionPreferences,
  normalizeExerciseSelectionPreferences,
} from "./exercise-selection-preferences";
import {
  normalizeIsolationExercisePreferences,
  updateIsolationExercisePreferenceBucket,
} from "./isolation-exercise-preferences";
import {
  normalizeMainCompoundPreferences,
  updateMainCompoundPreferenceBucket,
} from "./main-compound-preferences";
import {
  applyMainCompoundRotationPoolUpdate,
  normalizeMainCompoundRotationPools,
} from "./main-compound-rotation-pool";
import {
  normalizeMainCompoundRotationPreferences,
  updateMainCompoundRotationPreferenceBucket,
} from "./main-compound-rotation-preferences";
import { isRepRangeStyleId, isTrainingFrequencyDaysPerWeek } from "./plan-blueprint-options";

export {
  type PlanBlueprintDefaultResolution,
  type PlanBlueprintRecommendedDefault,
  resolvePlanBlueprintRecommendedDefaults,
} from "./plan-blueprint-default-resolution";
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

import { defaultConfirmedBuilderSteps, getConfirmedBuilderSteps } from "./plan-blueprint-progress";
import { normalizeMainCompoundSelections } from "./weekly-movement-coverage";

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
  ApplyPlanBlueprintTransitionOptions,
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
  UpdateIsolationExercisePreferencesOptions,
  UpdateMainCompoundPreferencesOptions,
  UpdateMainCompoundRotationPoolOptions,
  UpdateMainCompoundRotationPreferencesOptions,
} from "./plan-blueprint-types";
import {
  type EquipmentPresetSource,
  userSelectedEquipmentPresetSource,
} from "./plan-blueprint-types";

export type {
  PlanBlueprint,
  PlanBlueprintSummary,
  PlanBlueprintTransition,
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
    mainCompoundPreferences: [],
    mainCompoundRotationPreferences: [],
    isolationExercisePreferences: [],
    mainCompoundRotationPools: [],
    exerciseSelectionPreferences: createDefaultExerciseSelectionPreferences(),
    equipmentPresetSource: null,
    confirmedBuilderSteps: getConfirmedBuilderSteps({
      confirmedBuilderSteps: defaultConfirmedBuilderSteps,
    }),
    trainingPlanDraft: null,
  };
}

export function applyPlanBlueprintTransition({
  blueprint,
  transition,
}: ApplyPlanBlueprintTransitionOptions): PlanBlueprint {
  switch (transition.type) {
    case "selectTrainingFrequency":
      return selectTrainingFrequency({
        blueprint,
        timestamp: transition.timestamp,
        trainingFrequencyDaysPerWeek: transition.trainingFrequencyDaysPerWeek,
      });
    case "selectTrainingSplit":
      return selectTrainingSplit({
        blueprint,
        split: transition.split,
        timestamp: transition.timestamp,
      });
    case "selectRepRangeStyle":
      return selectRepRangeStyle({
        blueprint,
        repRangeStyle: transition.repRangeStyle,
        timestamp: transition.timestamp,
      });
    case "initializeTrainingVolume":
      return initializeTrainingVolume({
        blueprint,
        timestamp: transition.timestamp,
      });
    case "selectTrainingVolumePreset":
      return selectTrainingVolumePreset({
        blueprint,
        timestamp: transition.timestamp,
        volumePreset: transition.volumePreset,
      });
    case "setOptionalVolumeTargetEnabled":
      return setOptionalVolumeTargetEnabled({
        blueprint,
        isEnabled: transition.isEnabled,
        muscleGroup: transition.muscleGroup,
        timestamp: transition.timestamp,
      });
    case "updateExerciseSelectionPreferences":
      return updateExerciseSelectionPreferences({
        blueprint,
        exerciseSelectionPreferences: transition.exerciseSelectionPreferences,
        timestamp: transition.timestamp,
      });
    case "selectMainCompound":
      return selectMainCompound({
        blueprint,
        exerciseId: transition.exerciseId,
        movementPattern: transition.movementPattern,
        timestamp: transition.timestamp,
      });
    case "updateMainCompoundPreferences":
      return updateMainCompoundPreferences({
        blueprint,
        exerciseIds: transition.exerciseIds,
        movementPattern: transition.movementPattern,
        timestamp: transition.timestamp,
      });
    case "updateMainCompoundRotationPreferences":
      return updateMainCompoundRotationPreferences({
        blueprint,
        exerciseIds: transition.exerciseIds,
        movementPattern: transition.movementPattern,
        timestamp: transition.timestamp,
      });
    case "updateIsolationExercisePreferences":
      return updateIsolationExercisePreferences({
        blueprint,
        exerciseIds: transition.exerciseIds,
        primaryMuscleGroup: transition.primaryMuscleGroup,
        timestamp: transition.timestamp,
      });
    case "updateMainCompoundRotationPool":
      return updateMainCompoundRotationPool({
        blueprint,
        exerciseIds: transition.exerciseIds,
        movementPattern: transition.movementPattern,
        timestamp: transition.timestamp,
      });
    case "confirmTrainingFrequency":
      return confirmTrainingFrequency({
        blueprint,
        timestamp: transition.timestamp,
        trainingFrequencyDaysPerWeek: transition.trainingFrequencyDaysPerWeek,
      });
    case "confirmTrainingSplit":
      return confirmTrainingSplit({
        blueprint,
        split: transition.split,
        timestamp: transition.timestamp,
      });
    case "confirmRepRangeStyle":
      return confirmRepRangeStyle({
        blueprint,
        repRangeStyle: transition.repRangeStyle,
        timestamp: transition.timestamp,
      });
    case "confirmTrainingVolume":
      return confirmTrainingVolume({
        blueprint: transition.trainingVolumeConfiguration
          ? {
              ...blueprint,
              ...transition.trainingVolumeConfiguration,
            }
          : blueprint,
        timestamp: transition.timestamp,
      });
    case "confirmExerciseSelectionPreferences":
      return confirmExerciseSelectionPreferences({
        blueprint,
        exerciseSelectionPreferences: transition.exerciseSelectionPreferences,
        timestamp: transition.timestamp,
      });
  }
}

export function normalizePlanBlueprint(blueprint: StoredPlanBlueprint): PlanBlueprint {
  const mainCompoundSelections = normalizeMainCompoundSelections(blueprint.mainCompoundSelections);

  return {
    ...blueprint,
    ...normalizeTrainingVolumeConfiguration(blueprint),
    exerciseSelectionPreferences: normalizeExerciseSelectionPreferences(
      blueprint.exerciseSelectionPreferences,
    ),
    equipmentPresetSource: normalizeEquipmentPresetSource(blueprint),
    isolationExercisePreferences: normalizeIsolationExercisePreferences(
      blueprint.isolationExercisePreferences,
    ),
    mainCompoundPreferences: normalizeMainCompoundPreferences(blueprint.mainCompoundPreferences),
    mainCompoundRotationPreferences: normalizeMainCompoundRotationPreferences(
      blueprint.mainCompoundRotationPreferences,
    ),
    mainCompoundSelections,
    mainCompoundRotationPools: normalizeMainCompoundRotationPools({
      mainCompoundSelections,
      rotationPools: blueprint.mainCompoundRotationPools,
    }),
    confirmedBuilderSteps: getConfirmedBuilderSteps(blueprint),
    trainingPlanDraft: normalizeTrainingPlanDraft(blueprint.trainingPlanDraft),
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
    trainingPlanDraft: null,
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
    trainingPlanDraft: null,
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
    trainingPlanDraft: null,
    updatedAt: timestamp,
  };
}

function initializeTrainingVolume({
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
    trainingPlanDraft: null,
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
    trainingPlanDraft: null,
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
    trainingPlanDraft: null,
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
    equipmentPresetSource: userSelectedEquipmentPresetSource,
    exerciseSelectionPreferences: normalizedExerciseSelectionPreferences,
    trainingPlanDraft: null,
    updatedAt: timestamp,
  };
}

function selectMainCompound({
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
    trainingPlanDraft: null,
    updatedAt: timestamp,
  };
}

export function updateMainCompoundPreferences({
  blueprint,
  exerciseIds,
  movementPattern,
  timestamp,
}: UpdateMainCompoundPreferencesOptions): PlanBlueprint {
  const nextMainCompoundPreferences = updateMainCompoundPreferenceBucket({
    exerciseIds,
    movementPattern,
    preferences: blueprint.mainCompoundPreferences,
    updatedAt: timestamp,
  });
  const hasPreferencesChanged = !areMainCompoundPreferencesEqual(
    blueprint.mainCompoundPreferences,
    nextMainCompoundPreferences,
  );
  const confirmedBuilderSteps = getConfirmedBuilderSteps(blueprint);

  return {
    ...blueprint,
    confirmedBuilderSteps: {
      ...confirmedBuilderSteps,
      exercises: hasPreferencesChanged ? false : confirmedBuilderSteps.exercises,
    },
    mainCompoundPreferences: nextMainCompoundPreferences,
    trainingPlanDraft: null,
    updatedAt: timestamp,
  };
}

function updateMainCompoundRotationPreferences({
  blueprint,
  exerciseIds,
  movementPattern,
  timestamp,
}: UpdateMainCompoundRotationPreferencesOptions): PlanBlueprint {
  const nextMainCompoundRotationPreferences = updateMainCompoundRotationPreferenceBucket({
    exerciseIds,
    movementPattern,
    preferences: blueprint.mainCompoundRotationPreferences,
    updatedAt: timestamp,
  });
  const hasRotationPreferencesChanged = !areMainCompoundPreferencesEqual(
    blueprint.mainCompoundRotationPreferences,
    nextMainCompoundRotationPreferences,
  );
  const confirmedBuilderSteps = getConfirmedBuilderSteps(blueprint);

  return {
    ...blueprint,
    confirmedBuilderSteps: {
      ...confirmedBuilderSteps,
      exercises: hasRotationPreferencesChanged ? false : confirmedBuilderSteps.exercises,
    },
    mainCompoundRotationPreferences: nextMainCompoundRotationPreferences,
    trainingPlanDraft: null,
    updatedAt: timestamp,
  };
}

function updateIsolationExercisePreferences({
  blueprint,
  exerciseIds,
  primaryMuscleGroup,
  timestamp,
}: UpdateIsolationExercisePreferencesOptions): PlanBlueprint {
  const nextIsolationExercisePreferences = updateIsolationExercisePreferenceBucket({
    exerciseIds,
    preferences: blueprint.isolationExercisePreferences,
    primaryMuscleGroup,
    updatedAt: timestamp,
  });
  const hasPreferencesChanged = !areIsolationExercisePreferencesEqual(
    blueprint.isolationExercisePreferences,
    nextIsolationExercisePreferences,
  );
  const confirmedBuilderSteps = getConfirmedBuilderSteps(blueprint);

  return {
    ...blueprint,
    confirmedBuilderSteps: {
      ...confirmedBuilderSteps,
      exercises: hasPreferencesChanged ? false : confirmedBuilderSteps.exercises,
    },
    isolationExercisePreferences: nextIsolationExercisePreferences,
    trainingPlanDraft: null,
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
    trainingPlanDraft: null,
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
    trainingPlanDraft: null,
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
    trainingPlanDraft: null,
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
    trainingPlanDraft: null,
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
    trainingPlanDraft: null,
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

  return {
    ...blueprintToConfirm,
    confirmedBuilderSteps: {
      ...blueprintToConfirm.confirmedBuilderSteps,
      exercises: true,
    },
    equipmentPresetSource: userSelectedEquipmentPresetSource,
    trainingPlanDraft: null,
    updatedAt: timestamp,
  };
}

function normalizeEquipmentPresetSource(
  blueprint: StoredPlanBlueprint,
): EquipmentPresetSource | null {
  if (Object.hasOwn(blueprint, "equipmentPresetSource")) {
    return normalizeStoredEquipmentPresetSource(blueprint.equipmentPresetSource);
  }

  return hasStoredFullGymEquipmentPreset(blueprint.exerciseSelectionPreferences)
    ? userSelectedEquipmentPresetSource
    : null;
}

function normalizeTrainingPlanDraft(
  trainingPlanDraft: unknown,
): PlanBlueprint["trainingPlanDraft"] {
  if (!isRecord(trainingPlanDraft) || !isRecord(trainingPlanDraft.content)) {
    return null;
  }

  const content = normalizeTrainingPlanDraftContent(trainingPlanDraft.content);

  return content
    ? {
        content,
        validation: validateTrainingPlanDraftContent({ content }),
      }
    : null;
}

function normalizeTrainingPlanDraftContent(
  content: Record<string, unknown>,
): TrainingPlanContent | null {
  const normalizedContent = normalizeRequiredTrainingPlanDraftContent(content);

  if (!normalizedContent) {
    return null;
  }

  return applyOptionalTrainingPlanDraftContent(content, normalizedContent);
}

function normalizeRequiredTrainingPlanDraftContent(
  content: Record<string, unknown>,
): TrainingPlanContent | null {
  const {
    mainCompoundRotationPools,
    repRangeStyle,
    split,
    trainingBlockWeeks,
    trainingFrequencyDaysPerWeek,
    trainingGoal,
    weeklyRepTargets,
  } = content;
  const workoutTemplates = normalizeDraftWorkoutTemplates(content.workoutTemplates);

  if (
    !Array.isArray(mainCompoundRotationPools) ||
    !isRepRangeStyleId(repRangeStyle) ||
    typeof split !== "string" ||
    !isPositiveInteger(trainingBlockWeeks) ||
    !isTrainingFrequencyDaysPerWeek(trainingFrequencyDaysPerWeek) ||
    trainingGoal !== "build-muscle" ||
    !Array.isArray(weeklyRepTargets) ||
    !workoutTemplates
  ) {
    return null;
  }

  const normalizedContent: TrainingPlanContent = {
    mainCompoundRotationPools:
      mainCompoundRotationPools as TrainingPlanContent["mainCompoundRotationPools"],
    repRangeStyle,
    split,
    trainingBlockWeeks,
    trainingFrequencyDaysPerWeek,
    trainingGoal,
    weeklyRepTargets: weeklyRepTargets as TrainingPlanContent["weeklyRepTargets"],
    workoutTemplates,
  };

  return normalizedContent;
}

function applyOptionalTrainingPlanDraftContent(
  content: Record<string, unknown>,
  normalizedContent: TrainingPlanContent,
): TrainingPlanContent | null {
  if (
    !applyDraftBaselineBodyweight(content, normalizedContent) ||
    !applyDraftStartingLoadSuggestions(content, normalizedContent) ||
    !applyDraftTrainingBlock(content, normalizedContent)
  ) {
    return null;
  }

  if (hasDefinedContentField(content, "exerciseSelectionPreferences")) {
    normalizedContent.exerciseSelectionPreferences = normalizeExerciseSelectionPreferences(
      content.exerciseSelectionPreferences,
    );
  }

  if (hasDefinedContentField(content, "isolationExercisePreferences")) {
    normalizedContent.isolationExercisePreferences = normalizeIsolationExercisePreferences(
      content.isolationExercisePreferences,
    );
  }

  return normalizedContent;
}

function applyDraftBaselineBodyweight(
  content: Record<string, unknown>,
  normalizedContent: TrainingPlanContent,
): boolean {
  if (!hasDefinedContentField(content, "baselineBodyweight")) {
    return true;
  }

  if (typeof content.baselineBodyweight !== "number" && content.baselineBodyweight !== null) {
    return false;
  }

  normalizedContent.baselineBodyweight = content.baselineBodyweight;
  return true;
}

function applyDraftStartingLoadSuggestions(
  content: Record<string, unknown>,
  normalizedContent: TrainingPlanContent,
): boolean {
  if (!hasDefinedContentField(content, "startingLoadSuggestions")) {
    return true;
  }

  if (!Array.isArray(content.startingLoadSuggestions)) {
    return false;
  }

  normalizedContent.startingLoadSuggestions =
    content.startingLoadSuggestions as TrainingPlanContent["startingLoadSuggestions"];
  return true;
}

function applyDraftTrainingBlock(
  content: Record<string, unknown>,
  normalizedContent: TrainingPlanContent,
): boolean {
  if (!hasDefinedContentField(content, "trainingBlock")) {
    return true;
  }

  if (!isRecord(content.trainingBlock)) {
    return false;
  }

  normalizedContent.trainingBlock = content.trainingBlock as TrainingPlanContent["trainingBlock"];
  return true;
}

function hasDefinedContentField(
  content: Record<string, unknown>,
  field: keyof TrainingPlanContent,
): boolean {
  return Object.hasOwn(content, field) && content[field] !== undefined;
}

function normalizeDraftWorkoutTemplates(
  workoutTemplates: unknown,
): ReadonlyArray<WorkoutTemplate> | null {
  if (!Array.isArray(workoutTemplates)) {
    return null;
  }

  const normalizedWorkoutTemplates: WorkoutTemplate[] = [];

  for (const workoutTemplate of workoutTemplates) {
    const normalizedWorkoutTemplate = normalizeDraftWorkoutTemplate(workoutTemplate);

    if (!normalizedWorkoutTemplate) {
      return null;
    }

    normalizedWorkoutTemplates.push(normalizedWorkoutTemplate);
  }

  return normalizedWorkoutTemplates;
}

function normalizeDraftWorkoutTemplate(workoutTemplate: unknown): WorkoutTemplate | null {
  if (
    !isRecord(workoutTemplate) ||
    typeof workoutTemplate.id !== "string" ||
    typeof workoutTemplate.label !== "string" ||
    !Array.isArray(workoutTemplate.supersetGroups) ||
    (workoutTemplate.purpose !== undefined &&
      workoutTemplate.purpose !== null &&
      workoutTemplate.purpose !== "strength" &&
      workoutTemplate.purpose !== "custom-focus")
  ) {
    return null;
  }

  return {
    id: workoutTemplate.id,
    label: workoutTemplate.label,
    purpose: normalizeWorkoutTemplatePurpose(workoutTemplate.purpose),
    supersetGroups: workoutTemplate.supersetGroups as WorkoutTemplate["supersetGroups"],
  };
}

export function renameTrainingPlanDraftWorkoutTemplate({
  blueprint,
  label,
  templateId,
  timestamp,
}: {
  blueprint: PlanBlueprint;
  label: string;
  templateId: string;
  timestamp: string;
}): PlanBlueprint {
  return updateTrainingPlanDraft({
    blueprint,
    timestamp,
    workoutTemplates: blueprint.trainingPlanDraft?.content.workoutTemplates.map((template) =>
      template.id === templateId ? { ...template, label } : template,
    ),
  });
}

export function reorderTrainingPlanDraftWorkoutTemplate({
  blueprint,
  targetIndex,
  templateId,
  timestamp,
}: {
  blueprint: PlanBlueprint;
  targetIndex: number;
  templateId: string;
  timestamp: string;
}): PlanBlueprint {
  const workoutTemplates = blueprint.trainingPlanDraft?.content.workoutTemplates;

  if (!workoutTemplates) {
    return blueprint;
  }

  const currentIndex = workoutTemplates.findIndex((template) => template.id === templateId);

  if (currentIndex === -1 || targetIndex < 0 || targetIndex >= workoutTemplates.length) {
    return blueprint;
  }

  const reorderedTemplates = [...workoutTemplates];
  const [movedTemplate] = reorderedTemplates.splice(currentIndex, 1);

  if (!movedTemplate) {
    return blueprint;
  }

  reorderedTemplates.splice(targetIndex, 0, movedTemplate);

  return updateTrainingPlanDraft({
    blueprint,
    timestamp,
    workoutTemplates: reorderedTemplates,
  });
}

export function updateTrainingPlanDraftWorkoutTemplatePurpose({
  blueprint,
  purpose,
  templateId,
  timestamp,
}: {
  blueprint: PlanBlueprint;
  purpose: WorkoutTemplatePurpose;
  templateId: string;
  timestamp: string;
}): PlanBlueprint {
  return updateTrainingPlanDraft({
    blueprint,
    timestamp,
    workoutTemplates: blueprint.trainingPlanDraft?.content.workoutTemplates.map((template) =>
      template.id === templateId ? { ...template, purpose } : template,
    ),
  });
}

export function replaceTrainingPlanDraftWorkoutTemplateWithCustomFocus({
  blueprint,
  templateId,
  timestamp,
}: {
  blueprint: PlanBlueprint;
  templateId: string;
  timestamp: string;
}): PlanBlueprint {
  return updateTrainingPlanDraft({
    blueprint,
    timestamp,
    workoutTemplates: blueprint.trainingPlanDraft?.content.workoutTemplates.map((template) =>
      template.id === templateId
        ? {
            ...template,
            label: `${template.label} Cardio Focus`,
            purpose: "custom-focus",
            supersetGroups: [],
          }
        : template,
    ),
  });
}

function updateTrainingPlanDraft({
  blueprint,
  timestamp,
  workoutTemplates,
}: {
  blueprint: PlanBlueprint;
  timestamp: string;
  workoutTemplates: ReadonlyArray<WorkoutTemplate> | undefined;
}): PlanBlueprint {
  if (!blueprint.trainingPlanDraft || !workoutTemplates) {
    return blueprint;
  }

  const content = {
    ...blueprint.trainingPlanDraft.content,
    workoutTemplates,
  };

  return {
    ...blueprint,
    trainingPlanDraft: {
      content,
      validation: validateTrainingPlanDraftContent({ content }),
    },
    updatedAt: timestamp,
  };
}

function isRecord(candidate: unknown): candidate is Record<string, unknown> {
  return typeof candidate === "object" && candidate !== null;
}

function normalizeWorkoutTemplatePurpose(purpose: unknown): WorkoutTemplatePurpose {
  return purpose === "custom-focus" ? "custom-focus" : "strength";
}

function isPositiveInteger(candidate: unknown): candidate is number {
  return typeof candidate === "number" && Number.isInteger(candidate) && candidate > 0;
}

function normalizeStoredEquipmentPresetSource(candidate: unknown): EquipmentPresetSource | null {
  return candidate === userSelectedEquipmentPresetSource ? userSelectedEquipmentPresetSource : null;
}

function hasStoredFullGymEquipmentPreset(preferences: unknown): boolean {
  if (typeof preferences !== "object" || preferences === null) {
    return false;
  }

  if (!("equipmentPreset" in preferences)) {
    return false;
  }

  return preferences.equipmentPreset === "full_gym";
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

function areMainCompoundPreferencesEqual(
  left: PlanBlueprint["mainCompoundPreferences"],
  right: PlanBlueprint["mainCompoundPreferences"],
): boolean {
  return (
    left.length === right.length &&
    left.every(
      (preference, index) =>
        preference.movementPattern === right[index]?.movementPattern &&
        areOrderedExerciseIdsEqual(preference.exerciseIds, right[index]?.exerciseIds ?? []),
    )
  );
}

function areIsolationExercisePreferencesEqual(
  left: PlanBlueprint["isolationExercisePreferences"],
  right: PlanBlueprint["isolationExercisePreferences"],
): boolean {
  return (
    left.length === right.length &&
    left.every(
      (preference, index) =>
        preference.primaryMuscleGroup === right[index]?.primaryMuscleGroup &&
        areOrderedExerciseIdsEqual(preference.exerciseIds, right[index]?.exerciseIds ?? []),
    )
  );
}

function areOrderedExerciseIdsEqual(
  left: ReadonlyArray<string>,
  right: ReadonlyArray<string>,
): boolean {
  return (
    left.length === right.length &&
    left.every((exerciseId, exerciseIndex) => exerciseId === right[exerciseIndex])
  );
}

function getSelectedTrainingSplitId({
  split,
  trainingSplitId,
}: SelectTrainingSplitOptions): TrainingSplitId {
  return split ?? trainingSplitId;
}
