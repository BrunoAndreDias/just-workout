import type { TrainingFrequencyDaysPerWeek } from "./plan-blueprint";

export type TrainingSplitId =
  | "full-body-2-day"
  | "full-body-3-day"
  | "upper-lower-full-body"
  | "alternating-full-body-a-b"
  | "upper-lower-4-day"
  | "rotating-push-pull-legs";

export type TrainingSplitOption = {
  id: TrainingSplitId;
  label: string;
};

const trainingSplitOptions = [
  { id: "full-body-2-day", label: "2-Day Full Body" },
  { id: "full-body-3-day", label: "3-Day Full Body" },
  { id: "upper-lower-full-body", label: "Upper / Lower / Full Body" },
  { id: "alternating-full-body-a-b", label: "Alternating Full Body A/B" },
  { id: "upper-lower-4-day", label: "4-Day Upper/Lower" },
  { id: "rotating-push-pull-legs", label: "Rotating Push/Pull/Legs" },
] as const satisfies ReadonlyArray<TrainingSplitOption>;

const compatibleTrainingSplitIdsByFrequency = {
  2: ["full-body-2-day"],
  3: ["full-body-3-day", "upper-lower-full-body", "alternating-full-body-a-b"],
  4: ["upper-lower-4-day", "rotating-push-pull-legs"],
  5: ["rotating-push-pull-legs"],
} as const satisfies Record<TrainingFrequencyDaysPerWeek, ReadonlyArray<TrainingSplitId>>;

const recommendedTrainingSplitIdsByFrequency = {
  2: "full-body-2-day",
  3: "full-body-3-day",
  4: "upper-lower-4-day",
  5: "rotating-push-pull-legs",
} as const satisfies Record<TrainingFrequencyDaysPerWeek, TrainingSplitId>;

export function getCompatibleTrainingSplitOptions(
  trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek,
): ReadonlyArray<TrainingSplitOption> {
  return compatibleTrainingSplitIdsByFrequency[trainingFrequencyDaysPerWeek].map(
    getTrainingSplitOption,
  );
}

export function getRecommendedTrainingSplitOption(
  trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek,
): TrainingSplitOption {
  return getTrainingSplitOption(
    recommendedTrainingSplitIdsByFrequency[trainingFrequencyDaysPerWeek],
  );
}

export function getTrainingSplitLabel(trainingSplitId: TrainingSplitId): string {
  return getTrainingSplitOption(trainingSplitId).label;
}

export function isTrainingSplitCompatible({
  trainingFrequencyDaysPerWeek,
  trainingSplitId,
}: {
  trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek;
  trainingSplitId: TrainingSplitId;
}): boolean {
  return compatibleTrainingSplitIdsByFrequency[trainingFrequencyDaysPerWeek].some(
    (compatibleTrainingSplitId) => compatibleTrainingSplitId === trainingSplitId,
  );
}

export function isTrainingSplitId(value: unknown): value is TrainingSplitId {
  return trainingSplitOptions.some((option) => option.id === value);
}

function getTrainingSplitOption(trainingSplitId: TrainingSplitId): TrainingSplitOption {
  const option = trainingSplitOptions.find((candidate) => candidate.id === trainingSplitId);

  if (!option) {
    throw new Error(`Unknown training split id: ${trainingSplitId}`);
  }

  return option;
}
