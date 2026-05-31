import {
  confirmRepRangeStyle,
  confirmTrainingFrequency,
  confirmTrainingSplit,
  confirmTrainingVolume,
  createDefaultPlanBlueprint,
  initializeTrainingVolume as initializeTrainingVolumeState,
  normalizePlanBlueprint,
  type RepRangeStyleId,
  selectRepRangeStyle,
  selectTrainingFrequency,
  selectTrainingSplit,
  selectTrainingVolumePreset,
  setOptionalVolumeTargetEnabled,
  type TrainingFrequencyDaysPerWeek,
} from "./plan-blueprint";
import { getCurrentPlanBlueprint, savePlanBlueprint } from "./plan-builder-repository";
import type { TrainingSplitId } from "./training-split";
import type {
  OptionalVolumeMuscleGroupId,
  TrainingVolumeConfiguration,
  VolumePresetId,
} from "./training-volume";

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

type InitializeTrainingVolumeOptions = {
  timestamp?: string;
};

async function updateTrainingFrequency({
  timestamp = new Date().toISOString(),
  trainingFrequencyDaysPerWeek,
}: UpdateTrainingFrequencyOptions) {
  const blueprint = await getOrCreatePlanBlueprint();

  return savePlanBlueprint(
    selectTrainingFrequency({
      blueprint,
      timestamp,
      trainingFrequencyDaysPerWeek,
    }),
  );
}

async function updateTrainingSplit(options: UpdateTrainingSplitOptions) {
  const blueprint = await getOrCreatePlanBlueprint();

  return savePlanBlueprint(
    selectTrainingSplit({
      blueprint,
      split: options.split ?? options.trainingSplitId,
      timestamp: options.timestamp ?? new Date().toISOString(),
    }),
  );
}

async function updateRepRangeStyle({
  repRangeStyle,
  timestamp = new Date().toISOString(),
}: UpdateRepRangeStyleOptions) {
  const blueprint = await getOrCreatePlanBlueprint();

  return savePlanBlueprint(
    selectRepRangeStyle({
      blueprint,
      repRangeStyle,
      timestamp,
    }),
  );
}

async function updateTrainingVolumePreset({
  timestamp = new Date().toISOString(),
  volumePreset,
}: UpdateTrainingVolumePresetOptions) {
  const blueprint = await getOrCreatePlanBlueprint();

  return savePlanBlueprint(
    selectTrainingVolumePreset({
      blueprint,
      timestamp,
      volumePreset,
    }),
  );
}

async function updateOptionalVolumeTarget({
  isEnabled,
  muscleGroup,
  timestamp = new Date().toISOString(),
}: UpdateOptionalVolumeTargetOptions) {
  const blueprint = await getOrCreatePlanBlueprint();

  return savePlanBlueprint(
    setOptionalVolumeTargetEnabled({
      blueprint,
      isEnabled,
      muscleGroup,
      timestamp,
    }),
  );
}

async function confirmSelectedTrainingFrequency({
  timestamp = new Date().toISOString(),
  trainingFrequencyDaysPerWeek,
}: ConfirmTrainingFrequencyOptions) {
  const blueprint = await getOrCreatePlanBlueprint();

  return savePlanBlueprint(
    confirmTrainingFrequency({
      blueprint,
      timestamp,
      trainingFrequencyDaysPerWeek,
    }),
  );
}

async function confirmSelectedTrainingSplit({
  split,
  timestamp = new Date().toISOString(),
}: ConfirmTrainingSplitOptions) {
  const blueprint = await getOrCreatePlanBlueprint();

  return savePlanBlueprint(
    confirmTrainingSplit({
      blueprint,
      split,
      timestamp,
    }),
  );
}

async function confirmSelectedRepRangeStyle({
  repRangeStyle,
  timestamp = new Date().toISOString(),
}: ConfirmRepRangeStyleOptions) {
  const blueprint = await getOrCreatePlanBlueprint();

  return savePlanBlueprint(
    confirmRepRangeStyle({
      blueprint,
      repRangeStyle,
      timestamp,
    }),
  );
}

async function confirmSelectedTrainingVolume({
  timestamp = new Date().toISOString(),
  trainingVolumeConfiguration,
}: ConfirmTrainingVolumeOptions) {
  const blueprint = await getOrCreatePlanBlueprint();

  return savePlanBlueprint(
    confirmTrainingVolume({
      blueprint: {
        ...blueprint,
        ...trainingVolumeConfiguration,
      },
      timestamp,
    }),
  );
}

async function initializeTrainingVolume({
  timestamp = new Date().toISOString(),
}: InitializeTrainingVolumeOptions = {}) {
  const blueprint = await getOrCreatePlanBlueprint();

  return savePlanBlueprint(
    initializeTrainingVolumeState({
      blueprint,
      timestamp,
    }),
  );
}

export const planBuilderService = {
  confirmSelectedRepRangeStyle,
  confirmSelectedTrainingFrequency,
  confirmSelectedTrainingSplit,
  confirmSelectedTrainingVolume,
  getOrCreatePlanBlueprint,
  initializeTrainingVolume,
  updateOptionalVolumeTarget,
  updateRepRangeStyle,
  updateTrainingSplit,
  updateTrainingFrequency,
  updateTrainingVolumePreset,
};
