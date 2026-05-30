import {
  createDefaultPlanBlueprint,
  selectTrainingFrequency,
  selectTrainingSplit,
  type TrainingFrequencyDaysPerWeek,
} from "./plan-blueprint";
import { getCurrentPlanBlueprint, savePlanBlueprint } from "./plan-builder-repository";
import type { TrainingSplitId } from "./training-split";

async function getOrCreatePlanBlueprint() {
  const existingBlueprint = await getCurrentPlanBlueprint();

  if (existingBlueprint) {
    return existingBlueprint;
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

export const planBuilderService = {
  getOrCreatePlanBlueprint,
  updateTrainingSplit,
  updateTrainingFrequency,
};
