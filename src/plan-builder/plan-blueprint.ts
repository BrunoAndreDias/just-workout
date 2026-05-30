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

const defaultPlanBlueprintValues = {
  trainingGoal: "build-muscle",
  trainingFrequencyDaysPerWeek: 3,
  split: null,
  repRanges: null,
  volumePreset: null,
  equipment: null,
} satisfies Omit<PlanBlueprint, "id" | "createdAt" | "updatedAt">;

const trainingGoalLabels = {
  "build-muscle": "Build Muscle",
} satisfies Record<TrainingGoal, string>;

const planBlueprintSummaryFallbacks = {
  unselectedBuilderChoice: "Not chosen yet",
  unconfiguredEquipment: "Not configured yet",
  pendingGenerationStatus: "Not ready yet",
} as const;

export function createDefaultPlanBlueprint({
  id,
  timestamp,
}: CreateDefaultPlanBlueprintOptions): PlanBlueprint {
  return {
    id,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...defaultPlanBlueprintValues,
  };
}

export function summarizePlanBlueprint(blueprint: PlanBlueprint): PlanBlueprintSummary {
  return {
    trainingGoal: formatTrainingGoal(blueprint.trainingGoal),
    trainingFrequency: formatTrainingFrequency(blueprint.trainingFrequencyDaysPerWeek),
    split: blueprint.split ?? planBlueprintSummaryFallbacks.unselectedBuilderChoice,
    repRanges: blueprint.repRanges ?? planBlueprintSummaryFallbacks.unselectedBuilderChoice,
    volumePreset: blueprint.volumePreset ?? planBlueprintSummaryFallbacks.unselectedBuilderChoice,
    equipment: blueprint.equipment ?? planBlueprintSummaryFallbacks.unconfiguredEquipment,
    generationStatus: planBlueprintSummaryFallbacks.pendingGenerationStatus,
  };
}

function formatTrainingGoal(trainingGoal: TrainingGoal): string {
  return trainingGoalLabels[trainingGoal];
}

function formatTrainingFrequency(
  trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek,
): string {
  return `${trainingFrequencyDaysPerWeek} days/week`;
}
