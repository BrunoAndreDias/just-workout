import type { ExerciseSelectionPreferences } from "./exercise-selection-preferences";
import {
  applyPlanBlueprintTransition,
  createDefaultPlanBlueprint,
  normalizePlanBlueprint,
  type PlanBlueprint,
  type PlanBlueprintTransition,
  type RepRangeStyleId,
  type TrainingFrequencyDaysPerWeek,
} from "./plan-blueprint";
import { getCurrentPlanBlueprint, savePlanBlueprint } from "./plan-builder-repository";
import type { TrainingSplitId } from "./training-split";
import type {
  OptionalVolumeMuscleGroupId,
  TrainingVolumeConfiguration,
  VolumePresetId,
} from "./training-volume";
import type { MainCompoundSelection } from "./weekly-movement-coverage";

async function getOrCreatePlanBlueprint() {
  const existingBlueprint = await getCurrentPlanBlueprint();

  if (existingBlueprint) {
    return normalizePlanBlueprint(existingBlueprint);
  }

  const blueprint = createDefaultPlanBlueprint({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  });

  return savePlanBlueprint(blueprint);
}

type UpdateTrainingFrequencyOptions = {
  timestamp?: string;
  trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek;
};

type UpdateTrainingSplitOptions =
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

type UpdateRepRangeStyleOptions = {
  repRangeStyle: RepRangeStyleId;
  timestamp?: string;
};

type UpdateTrainingVolumePresetOptions = {
  timestamp?: string;
  volumePreset: VolumePresetId;
};

type UpdateOptionalVolumeTargetOptions = {
  isEnabled: boolean;
  muscleGroup: OptionalVolumeMuscleGroupId;
  timestamp?: string;
};

type UpdateExerciseSelectionPreferencesOptions = {
  exerciseSelectionPreferences: ExerciseSelectionPreferences;
  timestamp?: string;
};

type SelectMainCompoundOptions = {
  exerciseId: string;
  movementPattern: MainCompoundSelection["movementPattern"];
  timestamp?: string;
};

type UpdateMainCompoundRotationPoolOptions = {
  exerciseIds: ReadonlyArray<string>;
  movementPattern: MainCompoundSelection["movementPattern"];
  timestamp?: string;
};

type ConfirmTrainingFrequencyOptions = {
  timestamp?: string;
  trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek;
};

type ConfirmTrainingSplitOptions = {
  split: TrainingSplitId;
  timestamp?: string;
};

type ConfirmRepRangeStyleOptions = {
  repRangeStyle: RepRangeStyleId;
  timestamp?: string;
};

type ConfirmTrainingVolumeOptions = {
  timestamp?: string;
  trainingVolumeConfiguration: TrainingVolumeConfiguration;
};

type ConfirmExerciseSelectionPreferencesOptions = {
  exerciseSelectionPreferences?: ExerciseSelectionPreferences;
  timestamp?: string;
};

type InitializeTrainingVolumeOptions = {
  timestamp?: string;
};

type ApplyResolvedPlanBlueprintOptions = {
  blueprint: PlanBlueprint;
};

async function savePlanBlueprintTransition(transition: PlanBlueprintTransition) {
  const blueprint = await getOrCreatePlanBlueprint();

  return savePlanBlueprint(
    applyPlanBlueprintTransition({
      blueprint,
      transition,
    }),
  );
}

async function updateTrainingFrequency({
  timestamp = new Date().toISOString(),
  trainingFrequencyDaysPerWeek,
}: UpdateTrainingFrequencyOptions) {
  return savePlanBlueprintTransition({
    timestamp,
    trainingFrequencyDaysPerWeek,
    type: "selectTrainingFrequency",
  });
}

async function updateTrainingSplit(options: UpdateTrainingSplitOptions) {
  return savePlanBlueprintTransition({
    split: options.split ?? options.trainingSplitId,
    timestamp: options.timestamp ?? new Date().toISOString(),
    type: "selectTrainingSplit",
  });
}

async function updateRepRangeStyle({
  repRangeStyle,
  timestamp = new Date().toISOString(),
}: UpdateRepRangeStyleOptions) {
  return savePlanBlueprintTransition({
    repRangeStyle,
    timestamp,
    type: "selectRepRangeStyle",
  });
}

async function updateTrainingVolumePreset({
  timestamp = new Date().toISOString(),
  volumePreset,
}: UpdateTrainingVolumePresetOptions) {
  return savePlanBlueprintTransition({
    timestamp,
    type: "selectTrainingVolumePreset",
    volumePreset,
  });
}

async function updateOptionalVolumeTarget({
  isEnabled,
  muscleGroup,
  timestamp = new Date().toISOString(),
}: UpdateOptionalVolumeTargetOptions) {
  return savePlanBlueprintTransition({
    isEnabled,
    muscleGroup,
    timestamp,
    type: "setOptionalVolumeTargetEnabled",
  });
}

async function updateExerciseSelectionPreferences({
  exerciseSelectionPreferences,
  timestamp = new Date().toISOString(),
}: UpdateExerciseSelectionPreferencesOptions) {
  return savePlanBlueprintTransition({
    exerciseSelectionPreferences,
    timestamp,
    type: "updateExerciseSelectionPreferences",
  });
}

async function updateMainCompoundSelection({
  exerciseId,
  movementPattern,
  timestamp = new Date().toISOString(),
}: SelectMainCompoundOptions) {
  return savePlanBlueprintTransition({
    exerciseId,
    movementPattern,
    timestamp,
    type: "selectMainCompound",
  });
}

async function updateMainCompoundRotationPool({
  exerciseIds,
  movementPattern,
  timestamp = new Date().toISOString(),
}: UpdateMainCompoundRotationPoolOptions) {
  return savePlanBlueprintTransition({
    exerciseIds,
    movementPattern,
    timestamp,
    type: "updateMainCompoundRotationPool",
  });
}

async function confirmSelectedTrainingFrequency({
  timestamp = new Date().toISOString(),
  trainingFrequencyDaysPerWeek,
}: ConfirmTrainingFrequencyOptions) {
  return savePlanBlueprintTransition({
    timestamp,
    trainingFrequencyDaysPerWeek,
    type: "confirmTrainingFrequency",
  });
}

async function confirmSelectedTrainingSplit({
  split,
  timestamp = new Date().toISOString(),
}: ConfirmTrainingSplitOptions) {
  return savePlanBlueprintTransition({
    split,
    timestamp,
    type: "confirmTrainingSplit",
  });
}

async function confirmSelectedRepRangeStyle({
  repRangeStyle,
  timestamp = new Date().toISOString(),
}: ConfirmRepRangeStyleOptions) {
  return savePlanBlueprintTransition({
    repRangeStyle,
    timestamp,
    type: "confirmRepRangeStyle",
  });
}

async function confirmSelectedTrainingVolume({
  timestamp = new Date().toISOString(),
  trainingVolumeConfiguration,
}: ConfirmTrainingVolumeOptions) {
  return savePlanBlueprintTransition({
    timestamp,
    trainingVolumeConfiguration,
    type: "confirmTrainingVolume",
  });
}

async function confirmSelectedExerciseSelectionPreferences({
  exerciseSelectionPreferences,
  timestamp = new Date().toISOString(),
}: ConfirmExerciseSelectionPreferencesOptions = {}) {
  return savePlanBlueprintTransition({
    exerciseSelectionPreferences,
    timestamp,
    type: "confirmExerciseSelectionPreferences",
  });
}

async function initializeTrainingVolume({
  timestamp = new Date().toISOString(),
}: InitializeTrainingVolumeOptions = {}) {
  return savePlanBlueprintTransition({
    timestamp,
    type: "initializeTrainingVolume",
  });
}

async function applyResolvedPlanBlueprint({ blueprint }: ApplyResolvedPlanBlueprintOptions) {
  return savePlanBlueprint(blueprint);
}

export const planBuilderService = {
  applyResolvedPlanBlueprint,
  confirmSelectedExerciseSelectionPreferences,
  confirmSelectedRepRangeStyle,
  confirmSelectedTrainingFrequency,
  confirmSelectedTrainingSplit,
  confirmSelectedTrainingVolume,
  getOrCreatePlanBlueprint,
  initializeTrainingVolume,
  updateExerciseSelectionPreferences,
  updateMainCompoundRotationPool,
  updateMainCompoundSelection,
  updateOptionalVolumeTarget,
  updateRepRangeStyle,
  updateTrainingSplit,
  updateTrainingFrequency,
  updateTrainingVolumePreset,
};
