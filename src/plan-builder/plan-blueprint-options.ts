import type {
  RepRangeStyle,
  RepRangeStyleId,
  TrainingFrequencyDaysPerWeek,
  TrainingFrequencyOption,
  TrainingFrequencyRecommendation,
} from "./plan-blueprint-types";

export const trainingGoalLabels = {
  "build-muscle": "Build muscle",
} as const;

export const repRangeStyleLabels = {
  balanced_hypertrophy: "Balanced hypertrophy",
  controlled_higher_reps: "Controlled higher reps",
  strength_leaning: "Strength-leaning",
} satisfies Record<RepRangeStyleId, string>;

export const defaultRepRangeStyleId = "balanced_hypertrophy" satisfies RepRangeStyleId;

export const repRangeStyles = [
  {
    description: "Heavier main lifts with slightly lower reps.",
    id: "strength_leaning",
    isRecommended: false,
    planEffects: [
      "Main compounds stay in the 4-6 rep range for heavier top work.",
      "Secondary compounds sit in the 6-8 rep range to bridge heavy lifts and accessories.",
      "Accessories stay in the 8-12 rep range so support work does not drift too high.",
    ],
    targets: [
      { label: "Main compounds", reps: "4-6 reps" },
      { label: "Secondary compounds", reps: "6-8 reps" },
      { label: "Accessories", reps: "8-12 reps" },
    ],
    title: repRangeStyleLabels.strength_leaning,
    volumeEstimationRepRange: {
      max: 10,
      min: 6,
    },
  },
  {
    description: "A strong default for building muscle while still progressing on main lifts.",
    id: "balanced_hypertrophy",
    isRecommended: true,
    planEffects: [
      "Main compounds stay in the 6-8 rep range for steady progression.",
      "Secondary compounds move to 8-10 reps for productive muscle-building work.",
      "Accessories stay in the 10-15 rep range to keep isolation work controlled and repeatable.",
    ],
    targets: [
      { label: "Main compounds", reps: "6-8 reps" },
      { label: "Secondary compounds", reps: "8-10 reps" },
      { label: "Accessories", reps: "10-15 reps" },
    ],
    title: repRangeStyleLabels.balanced_hypertrophy,
    volumeEstimationRepRange: {
      max: 12,
      min: 8,
    },
  },
  {
    description: "Higher reps with slightly lighter loads and more controlled work.",
    id: "controlled_higher_reps",
    isRecommended: false,
    planEffects: [
      "Main compounds move up to 8-10 reps for slightly lighter loading.",
      "Secondary compounds sit in the 10-12 rep range for more controlled work.",
      "Accessories extend to 12-20 reps so lighter lifts stay clearly higher-rep.",
    ],
    targets: [
      { label: "Main compounds", reps: "8-10 reps" },
      { label: "Secondary compounds", reps: "10-12 reps" },
      { label: "Accessories", reps: "12-20 reps" },
    ],
    title: repRangeStyleLabels.controlled_higher_reps,
    volumeEstimationRepRange: {
      max: 15,
      min: 10,
    },
  },
] as const satisfies ReadonlyArray<RepRangeStyle>;

export const trainingFrequencyOptions = [
  {
    daysPerWeek: 2,
  },
  {
    daysPerWeek: 3,
  },
  {
    daysPerWeek: 4,
  },
  {
    daysPerWeek: 5,
  },
] as const satisfies ReadonlyArray<TrainingFrequencyOption>;

export const trainingFrequencyRecommendations = {
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
    description: "4 days/week is a strong balance of progress, recovery, and schedule flexibility.",
    title: "Expand your split options",
  },
  5: {
    description:
      "Five days/week supports higher weekly frequency and shorter sessions when you can stay consistent with recovery.",
    title: "Use more frequent sessions",
  },
} satisfies Record<TrainingFrequencyDaysPerWeek, TrainingFrequencyRecommendation>;

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

export function isRepRangeStyleId(value: unknown): value is RepRangeStyleId {
  return repRangeStyles.some((style) => style.id === value);
}

export function getValidRepRangeStyleId(value: unknown): RepRangeStyleId | null {
  return isRepRangeStyleId(value) ? value : null;
}

export function getRepRangeStyle(repRangeStyleId: RepRangeStyleId): RepRangeStyle {
  const style = repRangeStyles.find(({ id }) => id === repRangeStyleId);

  if (!style) {
    throw new Error(`Unknown Rep Range Style "${repRangeStyleId}".`);
  }

  return style;
}
