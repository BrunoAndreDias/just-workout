export type TrainingGoal = "build-muscle";
export type TrainingFrequencyDaysPerWeek = 2 | 3 | 4 | 5;

export type PlanBlueprint = {
  id: string;
  createdAt: string;
  updatedAt: string;
  trainingGoal: TrainingGoal;
  trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek;
  split: string | null;
  repRanges: string | null;
  volumePreset: string | null;
  equipment: string | null;
};

export type PlanBlueprintSummary = {
  trainingGoal: string;
  trainingFrequency: string;
  split: string;
  repRanges: string;
  volumePreset: string;
  equipment: string;
  generationStatus: string;
};

type CreateDefaultPlanBlueprintOptions = {
  id: string;
  timestamp: string;
};

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
    equipment: null,
  };
}

export function summarizePlanBlueprint(blueprint: PlanBlueprint): PlanBlueprintSummary {
  return {
    trainingGoal: formatTrainingGoal(blueprint.trainingGoal),
    trainingFrequency: formatTrainingFrequency(blueprint.trainingFrequencyDaysPerWeek),
    split: blueprint.split ?? "Not chosen yet",
    repRanges: blueprint.repRanges ?? "Not chosen yet",
    volumePreset: blueprint.volumePreset ?? "Not chosen yet",
    equipment: blueprint.equipment ?? "Not configured yet",
    generationStatus: "Not ready yet",
  };
}

function formatTrainingGoal(trainingGoal: TrainingGoal) {
  switch (trainingGoal) {
    case "build-muscle":
      return "Build Muscle";
  }
}

function formatTrainingFrequency(trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek) {
  return `${trainingFrequencyDaysPerWeek} days/week`;
}
