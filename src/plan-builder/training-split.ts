import type { TrainingFrequencyDaysPerWeek } from "./plan-blueprint";

export type TrainingSplitId =
  | "full-body-2-day"
  | "full-body-3-day"
  | "upper-lower-full-body"
  | "alternating-full-body-a-b"
  | "upper-lower-4-day"
  | "rotating-push-pull-legs";

type FixedWeekTrainingSplitSchedule = {
  description: string;
  kind: "fixed-week";
  week: ReadonlyArray<{
    dayLabel: string;
    sessionLabel: string;
  }>;
};

type RotatingCycleTrainingSplitSchedule = {
  cadence: string;
  description: string;
  cycle: ReadonlyArray<{
    id: string;
    sessionLabel: string;
  }>;
  kind: "rotating-cycle";
};

export type TrainingSplitSchedule =
  | FixedWeekTrainingSplitSchedule
  | RotatingCycleTrainingSplitSchedule;

export type TrainingSplitDefinition = {
  cardDescription: string;
  id: TrainingSplitId;
  label: string;
  muscleFrequency: string;
  recovery: string;
  schedule: TrainingSplitSchedule;
  supportedTrainingFrequencies: ReadonlyArray<TrainingFrequencyDaysPerWeek>;
  weeklyRhythm: string;
};

export type TrainingSplitOption = Pick<TrainingSplitDefinition, "id" | "label">;

export type TrainingSplitSummary = {
  muscleFrequency: string;
  recovery: string;
  split: string;
  weeklyRhythm: string;
};

type TrainingSplitCompatibilityOptions = {
  trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek;
  trainingSplitId: TrainingSplitId;
};

const trainingSplitDefinitions = [
  {
    cardDescription: "Two focused full-body sessions keep lower-frequency weeks effective.",
    id: "full-body-2-day",
    label: "2-Day Full Body",
    muscleFrequency: "Each major muscle group is trained about twice per week.",
    recovery: "Longer recovery windows between sessions keep the week realistic.",
    schedule: {
      description: "Two anchored sessions leave several recovery days between repeats.",
      kind: "fixed-week",
      week: [
        { dayLabel: "Day 1", sessionLabel: "Full Body" },
        { dayLabel: "Day 2", sessionLabel: "Rest or light activity" },
        { dayLabel: "Day 3", sessionLabel: "Rest or light activity" },
        { dayLabel: "Day 4", sessionLabel: "Full Body" },
        { dayLabel: "Day 5", sessionLabel: "Rest or light activity" },
        { dayLabel: "Day 6", sessionLabel: "Rest or light activity" },
        { dayLabel: "Day 7", sessionLabel: "Rest or light activity" },
      ],
    },
    supportedTrainingFrequencies: [2],
    weeklyRhythm: "Two anchored full-body sessions across the week.",
  },
  {
    cardDescription: "A simple three-day full-body rhythm keeps training frequent and balanced.",
    id: "full-body-3-day",
    label: "3-Day Full Body",
    muscleFrequency: "Each major muscle group is trained around three times per week.",
    recovery: "Recovery stays steady because every session spreads stress across the full body.",
    schedule: {
      description: "Three evenly spaced sessions keep the week easy to picture and repeat.",
      kind: "fixed-week",
      week: [
        { dayLabel: "Day 1", sessionLabel: "Full Body" },
        { dayLabel: "Day 2", sessionLabel: "Rest or light activity" },
        { dayLabel: "Day 3", sessionLabel: "Full Body" },
        { dayLabel: "Day 4", sessionLabel: "Rest or light activity" },
        { dayLabel: "Day 5", sessionLabel: "Full Body" },
        { dayLabel: "Day 6", sessionLabel: "Rest or light activity" },
        { dayLabel: "Day 7", sessionLabel: "Rest or light activity" },
      ],
    },
    supportedTrainingFrequencies: [3],
    weeklyRhythm: "Three full-body sessions with an easy repeatable cadence.",
  },
  {
    cardDescription: "Upper, lower, and full-body sessions add variety without losing balance.",
    id: "upper-lower-full-body",
    label: "Upper / Lower / Full Body",
    muscleFrequency: "Most muscle groups land around two quality exposures per week.",
    recovery:
      "The split alternates emphasis so upper and lower work each get time to recover before repeating.",
    schedule: {
      description: "This week starts with focused upper and lower work before a full-body anchor.",
      kind: "fixed-week",
      week: [
        { dayLabel: "Day 1", sessionLabel: "Upper" },
        { dayLabel: "Day 2", sessionLabel: "Rest or light activity" },
        { dayLabel: "Day 3", sessionLabel: "Lower" },
        { dayLabel: "Day 4", sessionLabel: "Rest or light activity" },
        { dayLabel: "Day 5", sessionLabel: "Full Body" },
        { dayLabel: "Day 6", sessionLabel: "Rest or light activity" },
        { dayLabel: "Day 7", sessionLabel: "Rest or light activity" },
      ],
    },
    supportedTrainingFrequencies: [3],
    weeklyRhythm: "Upper and lower emphasis lead into one full-body anchor session.",
  },
  {
    cardDescription: "Two full-body templates rotate through a three-day week for more variation.",
    id: "alternating-full-body-a-b",
    label: "Alternating Full Body A/B",
    muscleFrequency: "Each major muscle group is still trained around three times per week.",
    recovery:
      "Alternating templates spreads exercise stress while keeping the same full-body training rhythm.",
    schedule: {
      description:
        "Template A and Template B alternate across the week instead of repeating one session.",
      kind: "fixed-week",
      week: [
        { dayLabel: "Day 1", sessionLabel: "Full Body A" },
        { dayLabel: "Day 2", sessionLabel: "Rest or light activity" },
        { dayLabel: "Day 3", sessionLabel: "Full Body B" },
        { dayLabel: "Day 4", sessionLabel: "Rest or light activity" },
        { dayLabel: "Day 5", sessionLabel: "Full Body A" },
        { dayLabel: "Day 6", sessionLabel: "Rest or light activity" },
        { dayLabel: "Day 7", sessionLabel: "Rest or light activity" },
      ],
    },
    supportedTrainingFrequencies: [3],
    weeklyRhythm: "Two full-body templates alternate across three weekly sessions.",
  },
  {
    cardDescription:
      "Four anchored sessions give upper and lower work dedicated space twice each week.",
    id: "upper-lower-4-day",
    label: "4-Day Upper/Lower",
    muscleFrequency: "Each major muscle group is trained about twice per week with focused volume.",
    recovery:
      "Upper and lower sessions alternate so each region gets recovery before the next hard effort.",
    schedule: {
      description: "A stable four-session week makes the training rhythm easy to keep consistent.",
      kind: "fixed-week",
      week: [
        { dayLabel: "Day 1", sessionLabel: "Upper" },
        { dayLabel: "Day 2", sessionLabel: "Lower" },
        { dayLabel: "Day 3", sessionLabel: "Rest or light activity" },
        { dayLabel: "Day 4", sessionLabel: "Upper" },
        { dayLabel: "Day 5", sessionLabel: "Lower" },
        { dayLabel: "Day 6", sessionLabel: "Rest or light activity" },
        { dayLabel: "Day 7", sessionLabel: "Rest or light activity" },
      ],
    },
    supportedTrainingFrequencies: [4],
    weeklyRhythm: "Two upper sessions and two lower sessions in a stable weekly layout.",
  },
  {
    cardDescription:
      "A rotating Push/Pull/Legs cycle stays flexible when your available weekdays move around.",
    id: "rotating-push-pull-legs",
    label: "Rotating Push/Pull/Legs",
    muscleFrequency:
      "Most muscle groups are trained every 4-6 days as the push, pull, and legs cycle keeps rotating.",
    recovery:
      "The cycle separates related stress across different session types, but calendar-week recovery can flex with your schedule.",
    schedule: {
      cadence:
        "Schedule-flexible: the cycle rotates across available weekdays and can land as 4-5 sessions in a calendar week.",
      description:
        "This option does not lock to fixed weekdays. You continue the next Push, Pull, or Legs session each time you train.",
      cycle: [
        { id: "push-1", sessionLabel: "Push" },
        { id: "pull-1", sessionLabel: "Pull" },
        { id: "legs-1", sessionLabel: "Legs" },
        { id: "push-2", sessionLabel: "Push" },
        { id: "pull-2", sessionLabel: "Pull" },
      ],
      kind: "rotating-cycle",
    },
    supportedTrainingFrequencies: [4, 5],
    weeklyRhythm:
      "A rotating Push/Pull/Legs cycle that flexes across available weekdays instead of locking to one fixed week.",
  },
] as const satisfies ReadonlyArray<TrainingSplitDefinition>;

const recommendedTrainingSplitByFrequency = {
  2: "full-body-2-day",
  3: "full-body-3-day",
  4: "upper-lower-4-day",
  5: "rotating-push-pull-legs",
} as const satisfies Record<TrainingFrequencyDaysPerWeek, TrainingSplitId>;

export function getRecommendedTrainingSplitId(
  trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek,
): TrainingSplitId {
  return recommendedTrainingSplitByFrequency[trainingFrequencyDaysPerWeek];
}

export function getRecommendedTrainingSplitOption(
  trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek,
): TrainingSplitOption {
  return getTrainingSplitOption(getRecommendedTrainingSplitId(trainingFrequencyDaysPerWeek));
}

export function getCompatibleTrainingSplits(
  trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek,
): ReadonlyArray<TrainingSplitDefinition> {
  return trainingSplitDefinitions.filter((split) =>
    supportsTrainingFrequency(split, trainingFrequencyDaysPerWeek),
  );
}

export function getCompatibleTrainingSplitOptions(
  trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek,
): ReadonlyArray<TrainingSplitOption> {
  return getCompatibleTrainingSplits(trainingFrequencyDaysPerWeek).map(({ id, label }) => ({
    id,
    label,
  }));
}

export function getTrainingSplit(splitId: TrainingSplitId): TrainingSplitDefinition {
  const split = trainingSplitDefinitions.find((definition) => definition.id === splitId);

  if (!split) {
    throw new Error(`Unknown Training Split "${splitId}".`);
  }

  return split;
}

export function getTrainingSplitLabel(trainingSplitId: TrainingSplitId): string {
  return getTrainingSplit(trainingSplitId).label;
}

export function isTrainingSplitId(value: unknown): value is TrainingSplitId {
  return trainingSplitDefinitions.some((split) => split.id === value);
}

export function isTrainingSplitCompatible(
  splitId: unknown,
  trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek,
): splitId is TrainingSplitId;
export function isTrainingSplitCompatible(options: TrainingSplitCompatibilityOptions): boolean;
export function isTrainingSplitCompatible(
  splitOrOptions: TrainingSplitCompatibilityOptions | unknown,
  trainingFrequencyDaysPerWeek?: TrainingFrequencyDaysPerWeek,
): boolean {
  if (isTrainingSplitCompatibilityOptions(splitOrOptions)) {
    return isCompatibleTrainingSplitId(
      splitOrOptions.trainingSplitId,
      splitOrOptions.trainingFrequencyDaysPerWeek,
    );
  }

  if (trainingFrequencyDaysPerWeek === undefined) {
    return false;
  }

  return isCompatibleTrainingSplitId(splitOrOptions, trainingFrequencyDaysPerWeek);
}

export function summarizeTrainingSplit(splitId: TrainingSplitId): TrainingSplitSummary {
  const split = getTrainingSplit(splitId);

  return {
    muscleFrequency: split.muscleFrequency,
    recovery: split.recovery,
    split: split.label,
    weeklyRhythm: split.weeklyRhythm,
  };
}

function getTrainingSplitOption(trainingSplitId: TrainingSplitId): TrainingSplitOption {
  const { id, label } = getTrainingSplit(trainingSplitId);

  return { id, label };
}

function isTrainingSplitCompatibilityOptions(
  value: TrainingSplitCompatibilityOptions | unknown,
): value is TrainingSplitCompatibilityOptions {
  return (
    typeof value === "object" &&
    value !== null &&
    "trainingFrequencyDaysPerWeek" in value &&
    "trainingSplitId" in value
  );
}

function isCompatibleTrainingSplitId(
  splitId: unknown,
  trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek,
): splitId is TrainingSplitId {
  if (!isTrainingSplitId(splitId)) {
    return false;
  }

  return getCompatibleTrainingSplits(trainingFrequencyDaysPerWeek).some(
    (split) => split.id === splitId,
  );
}

function supportsTrainingFrequency(
  split: TrainingSplitDefinition,
  trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek,
): boolean {
  return split.supportedTrainingFrequencies.some(
    (supportedFrequency) => supportedFrequency === trainingFrequencyDaysPerWeek,
  );
}

export const unsupportedTrainingSplitCategories = [
  {
    description:
      "Body-part split weeks usually drop muscle frequency too low for the 2-5 days/week builder options, so Just Workout keeps them out of this step.",
    title: "Body-part split weeks",
  },
] as const;
