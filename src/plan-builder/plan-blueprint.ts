import type { TrainingSplitId } from "./training-split";
import { isTrainingSplitCompatible, summarizeTrainingSplit } from "./training-split";

export type TrainingGoal = "build-muscle";
export type TrainingFrequencyDaysPerWeek = 2 | 3 | 4 | 5;
export type TrainingFrequencyOption = {
  daysPerWeek: TrainingFrequencyDaysPerWeek;
  helperText: string;
};
export type TrainingFrequencyRecommendation = {
  description: string;
  title: string;
};

export type PlanBlueprint = {
  id: string;
  createdAt: string;
  updatedAt: string;
  trainingGoal: TrainingGoal;
  trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek;
  split: TrainingSplitId | null;
  repRanges: string | null;
  volumePreset: string | null;
  equipment: string | null;
};

export type PlanBlueprintSummary = {
  generationStatus: string;
  muscleFrequency: string;
  nextStep: string;
  recovery: string;
  split: string;
  trainingFrequency: string;
  trainingGoal: string;
  weeklyRhythm: string;
};

type CreateDefaultPlanBlueprintOptions = {
  id: string;
  timestamp: string;
};

type SelectTrainingFrequencyOptions = {
  blueprint: PlanBlueprint;
  timestamp: string;
  trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek;
};

type SelectTrainingSplitOptions = {
  blueprint: PlanBlueprint;
  split: TrainingSplitId;
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

export const trainingFrequencyOptions = [
  {
    daysPerWeek: 2,
    helperText: "Focused full-body week",
  },
  {
    daysPerWeek: 3,
    helperText: "Flexible split options",
  },
  {
    daysPerWeek: 4,
    helperText: "More split variety",
  },
  {
    daysPerWeek: 5,
    helperText: "Higher weekly frequency",
  },
] as const satisfies ReadonlyArray<TrainingFrequencyOption>;

const planBlueprintSummaryFallbacks = {
  generationStatus: "No Training Plan yet. Review creates the full Training Plan.",
  nextStep: "Choose a Training Split",
  pendingSplitDerivedDetail: "Choose a compatible split to see this detail.",
  split: "Choose a Training Split",
} as const;

const trainingFrequencyRecommendations = {
  2: {
    description:
      "Two focused sessions keep the plan realistic when your week is tight and you still want time to recover well.",
    title: "Keep the week realistic",
  },
  3: {
    description:
      "Flexible split options, steady recovery, and enough training frequency to build momentum.",
    title: "Practical starting point",
  },
  4: {
    description:
      "Four days/week opens up more split variety while still leaving room for steady progress and recovery.",
    title: "Expand your split options",
  },
  5: {
    description:
      "Five days/week supports higher weekly frequency and shorter sessions when you can stay consistent with recovery.",
    title: "Use more frequent sessions",
  },
} satisfies Record<TrainingFrequencyDaysPerWeek, TrainingFrequencyRecommendation>;

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

export function getTrainingFrequencyRecommendation(
  trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek,
): TrainingFrequencyRecommendation {
  return trainingFrequencyRecommendations[trainingFrequencyDaysPerWeek];
}

export function isTrainingFrequencyDaysPerWeek(
  value: unknown,
): value is TrainingFrequencyDaysPerWeek {
  return trainingFrequencyOptions.some((option) => option.daysPerWeek === value);
}

type FrequencyStepCompletionCandidate = {
  trainingFrequencyDaysPerWeek: unknown;
};

export function isFrequencyStepComplete(
  blueprint: FrequencyStepCompletionCandidate | null | undefined,
): boolean {
  if (!blueprint) {
    return false;
  }

  return isTrainingFrequencyDaysPerWeek(blueprint.trainingFrequencyDaysPerWeek);
}

export function selectTrainingFrequency({
  blueprint,
  timestamp,
  trainingFrequencyDaysPerWeek,
}: SelectTrainingFrequencyOptions): PlanBlueprint {
  return {
    ...blueprint,
    split: isTrainingSplitCompatible(blueprint.split, trainingFrequencyDaysPerWeek)
      ? blueprint.split
      : null,
    trainingFrequencyDaysPerWeek,
    updatedAt: timestamp,
  };
}

export function selectTrainingSplit({
  blueprint,
  split,
  timestamp,
}: SelectTrainingSplitOptions): PlanBlueprint {
  if (!isTrainingSplitCompatible(split, blueprint.trainingFrequencyDaysPerWeek)) {
    throw new Error(
      `Training Split "${split}" is not compatible with ${blueprint.trainingFrequencyDaysPerWeek} days/week.`,
    );
  }

  return {
    ...blueprint,
    split,
    updatedAt: timestamp,
  };
}

export function summarizePlanBlueprint(blueprint: PlanBlueprint): PlanBlueprintSummary {
  const splitSummary = isTrainingSplitCompatible(
    blueprint.split,
    blueprint.trainingFrequencyDaysPerWeek,
  )
    ? summarizeTrainingSplit(blueprint.split)
    : null;

  return {
    generationStatus: planBlueprintSummaryFallbacks.generationStatus,
    muscleFrequency:
      splitSummary?.muscleFrequency ?? planBlueprintSummaryFallbacks.pendingSplitDerivedDetail,
    nextStep: splitSummary ? "Rep ranges" : planBlueprintSummaryFallbacks.nextStep,
    recovery: splitSummary?.recovery ?? planBlueprintSummaryFallbacks.pendingSplitDerivedDetail,
    split: splitSummary?.split ?? planBlueprintSummaryFallbacks.split,
    trainingGoal: formatTrainingGoal(blueprint.trainingGoal),
    trainingFrequency: formatTrainingFrequency(blueprint.trainingFrequencyDaysPerWeek),
    weeklyRhythm:
      splitSummary?.weeklyRhythm ?? planBlueprintSummaryFallbacks.pendingSplitDerivedDetail,
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
