import {
  confirmTrainingFrequency,
  confirmTrainingSplit,
  createDefaultPlanBlueprint,
  normalizePlanBlueprint,
  type RepRangeStyleId,
  selectRepRangeStyle,
  selectTrainingFrequency,
  selectTrainingSplit,
  type TrainingFrequencyDaysPerWeek,
} from "./plan-blueprint";
import { getCurrentPlanBlueprint, savePlanBlueprint } from "./plan-builder-repository";
import type { TrainingSplitId } from "./training-split";

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

type ConfirmTrainingFrequencyOptions = {
  timestamp?: string;
  trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek;
};

type ConfirmTrainingSplitOptions = {
  split: TrainingSplitId;
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

export const planBuilderService = {
  confirmSelectedTrainingFrequency,
  confirmSelectedTrainingSplit,
  getOrCreatePlanBlueprint,
  updateRepRangeStyle,
  updateTrainingSplit,
  updateTrainingFrequency,
};
