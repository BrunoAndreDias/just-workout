import type { ExerciseCatalogMuscleGroupId } from "./exercise-catalog";
import type { ExerciseSelectionPreferences } from "./exercise-selection-preferences";
import type { WorkoutTemplatePurpose } from "../training-plan";
import {
  applyPlanBlueprintTransition,
  createDefaultPlanBlueprint,
  normalizePlanBlueprint,
  type PlanBlueprint,
  type PlanBlueprintTransition,
  type RepRangeStyleId,
  renameTrainingPlanDraftWorkoutTemplate,
  reorderTrainingPlanDraftWorkoutTemplate,
  type TrainingFrequencyDaysPerWeek,
  updateTrainingPlanDraftWorkoutTemplatePurpose,
  replaceTrainingPlanDraftWorkoutTemplateWithCustomFocus,
} from "./plan-blueprint";
import { getCurrentPlanBlueprint, savePlanBlueprint } from "./plan-builder-repository";
import type { TrainingSplitId } from "./training-split";
import type {
  OptionalVolumeMuscleGroupId,
  TrainingVolumeConfiguration,
  VolumePresetId,
} from "./training-volume";
import type { MainCompoundSelection } from "./weekly-movement-coverage";

export type PlanBlueprintCommand =
  | {
      transition: PlanBlueprintTransition;
      type: "planBlueprintTransition";
    }
  | {
      timestamp: string;
      type: "renameTrainingPlanDraftWorkoutTemplate";
      label: string;
      templateId: string;
    }
  | {
      timestamp: string;
      type: "reorderTrainingPlanDraftWorkoutTemplate";
      targetIndex: number;
      templateId: string;
    }
  | {
      timestamp: string;
      type: "updateTrainingPlanDraftWorkoutTemplatePurpose";
      purpose: WorkoutTemplatePurpose;
      templateId: string;
    }
  | {
      timestamp: string;
      type: "replaceTrainingPlanDraftWorkoutTemplateWithCustomFocus";
      templateId: string;
    }
  | {
      blueprint: PlanBlueprint;
      type: "replacePlanBlueprint";
    };

type ProjectPlanBlueprintCommandOptions = {
  blueprint: PlanBlueprint;
  command: PlanBlueprintCommand;
};

type UpdateTrainingFrequencyCommandOptions = {
  timestamp?: string;
  trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek;
};

type UpdateTrainingSplitCommandOptions =
  | {
      split: TrainingSplitId;
      timestamp?: string;
      trainingSplitId?: never;
    }
  | {
      split?: never;
      timestamp?: string;
      trainingSplitId: TrainingSplitId;
    };

type UpdateRepRangeStyleCommandOptions = {
  repRangeStyle: RepRangeStyleId;
  timestamp?: string;
};

type UpdateTrainingVolumePresetCommandOptions = {
  timestamp?: string;
  volumePreset: VolumePresetId;
};

type UpdateOptionalVolumeTargetCommandOptions = {
  isEnabled: boolean;
  muscleGroup: OptionalVolumeMuscleGroupId;
  timestamp?: string;
};

type UpdateExerciseSelectionPreferencesCommandOptions = {
  exerciseSelectionPreferences: ExerciseSelectionPreferences;
  timestamp?: string;
};

type SelectMainCompoundCommandOptions = {
  exerciseId: string;
  movementPattern: MainCompoundSelection["movementPattern"];
  timestamp?: string;
};

type UpdateMainCompoundRotationPoolCommandOptions = {
  exerciseIds: ReadonlyArray<string>;
  movementPattern: MainCompoundSelection["movementPattern"];
  timestamp?: string;
};

type UpdateMainCompoundRotationPreferencesCommandOptions = {
  exerciseIds: ReadonlyArray<string>;
  movementPattern: MainCompoundSelection["movementPattern"];
  timestamp?: string;
};

type UpdateMainCompoundPreferencesCommandOptions = {
  exerciseIds: ReadonlyArray<string>;
  movementPattern: MainCompoundSelection["movementPattern"];
  timestamp?: string;
};

type UpdateIsolationExercisePreferencesCommandOptions = {
  exerciseIds: ReadonlyArray<string>;
  primaryMuscleGroup: ExerciseCatalogMuscleGroupId;
  timestamp?: string;
};

type ConfirmTrainingFrequencyCommandOptions = {
  timestamp?: string;
  trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek;
};

type ConfirmTrainingSplitCommandOptions = {
  split: TrainingSplitId;
  timestamp?: string;
};

type ConfirmRepRangeStyleCommandOptions = {
  repRangeStyle: RepRangeStyleId;
  timestamp?: string;
};

type ConfirmTrainingVolumeCommandOptions = {
  timestamp?: string;
  trainingVolumeConfiguration: TrainingVolumeConfiguration;
};

type ConfirmExerciseSelectionPreferencesCommandOptions = {
  exerciseSelectionPreferences?: ExerciseSelectionPreferences;
  timestamp?: string;
};

type InitializeTrainingVolumeCommandOptions = {
  timestamp?: string;
};

type ApplyResolvedPlanBlueprintCommandOptions = {
  blueprint: PlanBlueprint;
};

type RenameTrainingPlanDraftWorkoutTemplateCommandOptions = {
  label: string;
  templateId: string;
  timestamp?: string;
};

type ReorderTrainingPlanDraftWorkoutTemplateCommandOptions = {
  targetIndex: number;
  templateId: string;
  timestamp?: string;
};

type UpdateTrainingPlanDraftWorkoutTemplatePurposeCommandOptions = {
  purpose: WorkoutTemplatePurpose;
  templateId: string;
  timestamp?: string;
};

type ReplaceTrainingPlanDraftWorkoutTemplateWithCustomFocusCommandOptions = {
  templateId: string;
  timestamp?: string;
};

export async function getOrCreatePlanBlueprint() {
  const existingBlueprint = await getCurrentPlanBlueprint();

  if (existingBlueprint) {
    return normalizePlanBlueprint(existingBlueprint);
  }

  const blueprint = createDefaultPlanBlueprint({
    id: crypto.randomUUID(),
    timestamp: getPlanBlueprintCommandTimestamp(),
  });

  return savePlanBlueprint(blueprint);
}

export async function persistPlanBlueprintCommand(command: PlanBlueprintCommand) {
  if (command.type === "replacePlanBlueprint") {
    return savePlanBlueprint(command.blueprint);
  }

  const blueprint = await getOrCreatePlanBlueprint();

  return savePlanBlueprint(projectPlanBlueprintCommand({ blueprint, command }));
}

export function projectPlanBlueprintCommand({
  blueprint,
  command,
}: ProjectPlanBlueprintCommandOptions): PlanBlueprint {
  switch (command.type) {
    case "planBlueprintTransition":
      return applyPlanBlueprintTransition({
        blueprint,
        transition: command.transition,
      });
    case "renameTrainingPlanDraftWorkoutTemplate":
      return renameTrainingPlanDraftWorkoutTemplate({
        blueprint,
        label: command.label,
        templateId: command.templateId,
        timestamp: command.timestamp,
      });
    case "reorderTrainingPlanDraftWorkoutTemplate":
      return reorderTrainingPlanDraftWorkoutTemplate({
        blueprint,
        targetIndex: command.targetIndex,
        templateId: command.templateId,
        timestamp: command.timestamp,
      });
    case "updateTrainingPlanDraftWorkoutTemplatePurpose":
      return updateTrainingPlanDraftWorkoutTemplatePurpose({
        blueprint,
        purpose: command.purpose,
        templateId: command.templateId,
        timestamp: command.timestamp,
      });
    case "replaceTrainingPlanDraftWorkoutTemplateWithCustomFocus":
      return replaceTrainingPlanDraftWorkoutTemplateWithCustomFocus({
        blueprint,
        templateId: command.templateId,
        timestamp: command.timestamp,
      });
    case "replacePlanBlueprint":
      return command.blueprint;
  }
}

export const planBlueprintCommandBuilders = {
  applyResolvedPlanBlueprint({ blueprint }: ApplyResolvedPlanBlueprintCommandOptions) {
    return {
      blueprint,
      type: "replacePlanBlueprint",
    } satisfies PlanBlueprintCommand;
  },
  renameTrainingPlanDraftWorkoutTemplate({
    label,
    templateId,
    timestamp,
  }: RenameTrainingPlanDraftWorkoutTemplateCommandOptions) {
    return {
      label,
      templateId,
      timestamp: getPlanBlueprintCommandTimestamp(timestamp),
      type: "renameTrainingPlanDraftWorkoutTemplate",
    } satisfies PlanBlueprintCommand;
  },
  reorderTrainingPlanDraftWorkoutTemplate({
    targetIndex,
    templateId,
    timestamp,
  }: ReorderTrainingPlanDraftWorkoutTemplateCommandOptions) {
    return {
      targetIndex,
      templateId,
      timestamp: getPlanBlueprintCommandTimestamp(timestamp),
      type: "reorderTrainingPlanDraftWorkoutTemplate",
    } satisfies PlanBlueprintCommand;
  },
  updateTrainingPlanDraftWorkoutTemplatePurpose({
    purpose,
    templateId,
    timestamp,
  }: UpdateTrainingPlanDraftWorkoutTemplatePurposeCommandOptions) {
    return {
      purpose,
      templateId,
      timestamp: getPlanBlueprintCommandTimestamp(timestamp),
      type: "updateTrainingPlanDraftWorkoutTemplatePurpose",
    } satisfies PlanBlueprintCommand;
  },
  replaceTrainingPlanDraftWorkoutTemplateWithCustomFocus({
    templateId,
    timestamp,
  }: ReplaceTrainingPlanDraftWorkoutTemplateWithCustomFocusCommandOptions) {
    return {
      templateId,
      timestamp: getPlanBlueprintCommandTimestamp(timestamp),
      type: "replaceTrainingPlanDraftWorkoutTemplateWithCustomFocus",
    } satisfies PlanBlueprintCommand;
  },
  confirmExerciseSelectionPreferences({
    exerciseSelectionPreferences,
    timestamp,
  }: ConfirmExerciseSelectionPreferencesCommandOptions = {}) {
    return buildPlanBlueprintTransitionCommand({
      exerciseSelectionPreferences,
      timestamp: getPlanBlueprintCommandTimestamp(timestamp),
      type: "confirmExerciseSelectionPreferences",
    });
  },
  confirmRepRangeStyle({ repRangeStyle, timestamp }: ConfirmRepRangeStyleCommandOptions) {
    return buildPlanBlueprintTransitionCommand({
      repRangeStyle,
      timestamp: getPlanBlueprintCommandTimestamp(timestamp),
      type: "confirmRepRangeStyle",
    });
  },
  confirmTrainingFrequency({
    timestamp,
    trainingFrequencyDaysPerWeek,
  }: ConfirmTrainingFrequencyCommandOptions) {
    return buildPlanBlueprintTransitionCommand({
      timestamp: getPlanBlueprintCommandTimestamp(timestamp),
      trainingFrequencyDaysPerWeek,
      type: "confirmTrainingFrequency",
    });
  },
  confirmTrainingSplit({ split, timestamp }: ConfirmTrainingSplitCommandOptions) {
    return buildPlanBlueprintTransitionCommand({
      split,
      timestamp: getPlanBlueprintCommandTimestamp(timestamp),
      type: "confirmTrainingSplit",
    });
  },
  confirmTrainingVolume({
    timestamp,
    trainingVolumeConfiguration,
  }: ConfirmTrainingVolumeCommandOptions) {
    return buildPlanBlueprintTransitionCommand({
      timestamp: getPlanBlueprintCommandTimestamp(timestamp),
      trainingVolumeConfiguration,
      type: "confirmTrainingVolume",
    });
  },
  initializeTrainingVolume({ timestamp }: InitializeTrainingVolumeCommandOptions = {}) {
    return buildPlanBlueprintTransitionCommand({
      timestamp: getPlanBlueprintCommandTimestamp(timestamp),
      type: "initializeTrainingVolume",
    });
  },
  updateExerciseSelectionPreferences({
    exerciseSelectionPreferences,
    timestamp,
  }: UpdateExerciseSelectionPreferencesCommandOptions) {
    return buildPlanBlueprintTransitionCommand({
      exerciseSelectionPreferences,
      timestamp: getPlanBlueprintCommandTimestamp(timestamp),
      type: "updateExerciseSelectionPreferences",
    });
  },
  updateMainCompoundRotationPool({
    exerciseIds,
    movementPattern,
    timestamp,
  }: UpdateMainCompoundRotationPoolCommandOptions) {
    return buildPlanBlueprintTransitionCommand({
      exerciseIds,
      movementPattern,
      timestamp: getPlanBlueprintCommandTimestamp(timestamp),
      type: "updateMainCompoundRotationPool",
    });
  },
  updateMainCompoundRotationPreferences({
    exerciseIds,
    movementPattern,
    timestamp,
  }: UpdateMainCompoundRotationPreferencesCommandOptions) {
    return buildPlanBlueprintTransitionCommand({
      exerciseIds,
      movementPattern,
      timestamp: getPlanBlueprintCommandTimestamp(timestamp),
      type: "updateMainCompoundRotationPreferences",
    });
  },
  updateMainCompoundPreferences({
    exerciseIds,
    movementPattern,
    timestamp,
  }: UpdateMainCompoundPreferencesCommandOptions) {
    return buildPlanBlueprintTransitionCommand({
      exerciseIds,
      movementPattern,
      timestamp: getPlanBlueprintCommandTimestamp(timestamp),
      type: "updateMainCompoundPreferences",
    });
  },
  updateIsolationExercisePreferences({
    exerciseIds,
    primaryMuscleGroup,
    timestamp,
  }: UpdateIsolationExercisePreferencesCommandOptions) {
    return buildPlanBlueprintTransitionCommand({
      exerciseIds,
      primaryMuscleGroup,
      timestamp: getPlanBlueprintCommandTimestamp(timestamp),
      type: "updateIsolationExercisePreferences",
    });
  },
  updateMainCompoundSelection({
    exerciseId,
    movementPattern,
    timestamp,
  }: SelectMainCompoundCommandOptions) {
    return buildPlanBlueprintTransitionCommand({
      exerciseId,
      movementPattern,
      timestamp: getPlanBlueprintCommandTimestamp(timestamp),
      type: "selectMainCompound",
    });
  },
  updateOptionalVolumeTarget({
    isEnabled,
    muscleGroup,
    timestamp,
  }: UpdateOptionalVolumeTargetCommandOptions) {
    return buildPlanBlueprintTransitionCommand({
      isEnabled,
      muscleGroup,
      timestamp: getPlanBlueprintCommandTimestamp(timestamp),
      type: "setOptionalVolumeTargetEnabled",
    });
  },
  updateRepRangeStyle({ repRangeStyle, timestamp }: UpdateRepRangeStyleCommandOptions) {
    return buildPlanBlueprintTransitionCommand({
      repRangeStyle,
      timestamp: getPlanBlueprintCommandTimestamp(timestamp),
      type: "selectRepRangeStyle",
    });
  },
  updateTrainingVolumePreset({
    timestamp,
    volumePreset,
  }: UpdateTrainingVolumePresetCommandOptions) {
    return buildPlanBlueprintTransitionCommand({
      timestamp: getPlanBlueprintCommandTimestamp(timestamp),
      type: "selectTrainingVolumePreset",
      volumePreset,
    });
  },
  updateTrainingFrequency({
    timestamp,
    trainingFrequencyDaysPerWeek,
  }: UpdateTrainingFrequencyCommandOptions) {
    return buildPlanBlueprintTransitionCommand({
      timestamp: getPlanBlueprintCommandTimestamp(timestamp),
      trainingFrequencyDaysPerWeek,
      type: "selectTrainingFrequency",
    });
  },
  updateTrainingSplit(options: UpdateTrainingSplitCommandOptions) {
    return buildPlanBlueprintTransitionCommand({
      split: options.split ?? options.trainingSplitId,
      timestamp: getPlanBlueprintCommandTimestamp(options.timestamp),
      type: "selectTrainingSplit",
    });
  },
};

function buildPlanBlueprintTransitionCommand(
  transition: PlanBlueprintTransition,
): PlanBlueprintCommand {
  return {
    transition,
    type: "planBlueprintTransition",
  };
}

function getPlanBlueprintCommandTimestamp(timestamp?: string) {
  return timestamp ?? new Date().toISOString();
}
