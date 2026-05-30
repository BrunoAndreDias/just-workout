import {
  createDefaultPlanBlueprint,
  selectTrainingFrequency,
  type TrainingFrequencyDaysPerWeek,
} from "./plan-blueprint";
import { getCurrentPlanBlueprint, savePlanBlueprint } from "./plan-builder-repository";

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

export const planBuilderService = {
  getOrCreatePlanBlueprint,
  updateTrainingFrequency,
};
