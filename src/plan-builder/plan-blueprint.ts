import type { TrainingSplitId, TrainingSplitSummary } from "./training-split";
import {
  getRecommendedTrainingSplitId,
  isTrainingSplitCompatible,
  summarizeTrainingSplit,
} from "./training-split";

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
export type RepRangeStyleId =
  | "strength_leaning"
  | "balanced_hypertrophy"
  | "controlled_higher_reps";
export type RepRangeStyle = {
  description: string;
  id: RepRangeStyleId;
  isRecommended: boolean;
  note: string;
  planEffects: readonly [string, string, string];
  targets: ReadonlyArray<{
    label: string;
    reps: string;
  }>;
  title: string;
};

type PlanBuilderConfirmedSteps = {
  frequency: boolean;
  repRanges: boolean;
  split: boolean;
};

export type PlanBlueprint = {
  id: string;
  createdAt: string;
  updatedAt: string;
  trainingGoal: TrainingGoal;
  trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek;
  split: TrainingSplitId | null;
  repRanges: RepRangeStyleId | null;
  volumePreset: string | null;
  equipment: string | null;
  confirmedBuilderSteps: PlanBuilderConfirmedSteps;
};

export type PlanBlueprintSummary = {
  generationStatus: string;
  muscleFrequency: string;
  nextStep: string;
  repRanges: string;
  recovery: string;
  split: string;
  splitStatus: "Recommended" | "Also works" | null;
  trainingFrequency: string;
  trainingFrequencyStatus: "Completed";
  trainingGoal: string;
  weeklyRhythm: string;
};

type PlanBlueprintSplitSummaryDetails = {
  splitStatus: PlanBlueprintSummary["splitStatus"];
  splitSummary: TrainingSplitSummary | null;
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

type SelectTrainingSplitOptions =
  | {
      blueprint: PlanBlueprint;
      split: TrainingSplitId;
      timestamp: string;
      trainingSplitId?: never;
    }
  | {
      blueprint: PlanBlueprint;
      split?: never;
      timestamp: string;
      trainingSplitId: TrainingSplitId;
    };

type SelectRepRangeStyleOptions = {
  blueprint: PlanBlueprint;
  repRangeStyle: RepRangeStyleId;
  timestamp: string;
};

type ConfirmTrainingFrequencyOptions = {
  blueprint: PlanBlueprint;
  timestamp: string;
  trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek;
};

type ConfirmTrainingSplitOptions = {
  blueprint: PlanBlueprint;
  split: TrainingSplitId;
  timestamp: string;
};

type ConfirmRepRangeStyleOptions = {
  blueprint: PlanBlueprint;
  repRangeStyle: RepRangeStyleId;
  timestamp: string;
};

type PlanBlueprintWithOptionalConfirmedSteps = Omit<PlanBlueprint, "confirmedBuilderSteps"> & {
  confirmedBuilderSteps?: Partial<PlanBuilderConfirmedSteps>;
};

const defaultConfirmedBuilderSteps = {
  frequency: false,
  repRanges: false,
  split: false,
} satisfies PlanBuilderConfirmedSteps;

const defaultPlanBlueprintValues = {
  trainingGoal: "build-muscle",
  trainingFrequencyDaysPerWeek: 3,
  split: null,
  repRanges: null,
  volumePreset: null,
  equipment: null,
  confirmedBuilderSteps: defaultConfirmedBuilderSteps,
} satisfies Omit<PlanBlueprint, "id" | "createdAt" | "updatedAt">;

const trainingGoalLabels = {
  "build-muscle": "Build muscle",
} satisfies Record<TrainingGoal, string>;

const repRangeStyleLabels = {
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
    note: "Biases the week toward lower-rep top work on the main lifts before accessories climb.",
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
  },
  {
    description: "A strong default for building muscle while still progressing on main lifts.",
    id: "balanced_hypertrophy",
    isRecommended: true,
    note: "Best fit for 4 days/week, Upper/Lower, and a muscle-building goal.",
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
  },
  {
    description: "Higher reps with slightly lighter loads and more controlled work.",
    id: "controlled_higher_reps",
    isRecommended: false,
    note: "Useful when you want slightly lighter loading and more controlled fatigue across the week.",
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
  },
] as const satisfies ReadonlyArray<RepRangeStyle>;

export const trainingFrequencyOptions = [
  {
    daysPerWeek: 2,
    helperText: "Full Body A/B only",
  },
  {
    daysPerWeek: 3,
    helperText: "Full Body recommended",
  },
  {
    daysPerWeek: 4,
    helperText: "Upper/Lower recommended",
  },
  {
    daysPerWeek: 5,
    helperText: "Advanced Push/Pull/Legs variation",
  },
] as const satisfies ReadonlyArray<TrainingFrequencyOption>;

const planBlueprintSummaryFallbacks = {
  generationStatus: "No Training Plan yet. Review creates the full Training Plan.",
  nextStep: "Choose a Training Split",
  pendingSplitDerivedDetail: "Choose a compatible split to see this detail.",
  repRanges: "Choose Rep ranges",
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
    description: "4 days/week is a strong balance of progress, recovery, and schedule flexibility.",
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
    confirmedBuilderSteps: getConfirmedBuilderSteps(defaultPlanBlueprintValues),
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

export function isRepRangeStyleId(value: unknown): value is RepRangeStyleId {
  return repRangeStyles.some((style) => style.id === value);
}

export function getRepRangeStyle(repRangeStyleId: RepRangeStyleId): RepRangeStyle {
  const style = repRangeStyles.find(({ id }) => id === repRangeStyleId);

  if (!style) {
    throw new Error(`Unknown Rep Range Style "${repRangeStyleId}".`);
  }

  return style;
}

type FrequencyStepCompletionCandidate = {
  confirmedBuilderSteps?: Partial<PlanBuilderConfirmedSteps>;
  trainingFrequencyDaysPerWeek: unknown;
};

export function hasValidTrainingFrequency(
  blueprint: FrequencyStepCompletionCandidate | null | undefined,
): boolean {
  if (!blueprint) {
    return false;
  }

  return isTrainingFrequencyDaysPerWeek(blueprint.trainingFrequencyDaysPerWeek);
}

type SplitStepCompletionCandidate = {
  confirmedBuilderSteps?: Partial<PlanBuilderConfirmedSteps>;
  split: TrainingSplitId | null;
  trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek;
};

type RepRangesStepCompletionCandidate = {
  confirmedBuilderSteps?: Partial<PlanBuilderConfirmedSteps>;
  repRanges: unknown;
};

export function normalizePlanBlueprint(
  blueprint: PlanBlueprintWithOptionalConfirmedSteps,
): PlanBlueprint {
  return {
    ...blueprint,
    confirmedBuilderSteps: getConfirmedBuilderSteps(blueprint),
  };
}

export function isFrequencyStepComplete(
  blueprint: FrequencyStepCompletionCandidate | null | undefined,
): boolean {
  if (!blueprint || !hasValidTrainingFrequency(blueprint)) {
    return false;
  }

  return getConfirmedBuilderSteps(blueprint).frequency;
}

export function isSplitStepComplete(
  blueprint: SplitStepCompletionCandidate | null | undefined,
): boolean {
  if (!blueprint) {
    return false;
  }

  return (
    getConfirmedBuilderSteps(blueprint).split &&
    isTrainingSplitCompatible(blueprint.split, blueprint.trainingFrequencyDaysPerWeek)
  );
}

export function isRepRangesStepComplete(
  blueprint: RepRangesStepCompletionCandidate | null | undefined,
): boolean {
  if (!blueprint) {
    return false;
  }

  return getConfirmedBuilderSteps(blueprint).repRanges && isRepRangeStyleId(blueprint.repRanges);
}

export function getPlanBuilderRedirectStep(
  blueprint: PlanBlueprint,
  targetStep: "split" | "rep-ranges" | "volume",
): "frequency" | "split" | "rep-ranges" | null {
  if (!isFrequencyStepComplete(blueprint)) {
    return "frequency";
  }

  if (targetStep === "split") {
    return null;
  }

  if (!isSplitStepComplete(blueprint)) {
    return "split";
  }

  if (targetStep === "rep-ranges") {
    return null;
  }

  return isRepRangesStepComplete(blueprint) ? null : "rep-ranges";
}

export function selectTrainingFrequency({
  blueprint,
  timestamp,
  trainingFrequencyDaysPerWeek,
}: SelectTrainingFrequencyOptions): PlanBlueprint {
  const split = getCompatibleSelectedTrainingSplit({
    selectedTrainingSplit: blueprint.split,
    trainingFrequencyDaysPerWeek,
  });
  const hasTrainingFrequencyChanged =
    blueprint.trainingFrequencyDaysPerWeek !== trainingFrequencyDaysPerWeek;
  const hasSplitChanged = blueprint.split !== split;
  let confirmedBuilderSteps = getConfirmedBuilderSteps(blueprint);

  if (hasTrainingFrequencyChanged) {
    confirmedBuilderSteps = {
      ...confirmedBuilderSteps,
      frequency: false,
      split: false,
    };
  } else if (hasSplitChanged) {
    confirmedBuilderSteps = {
      ...confirmedBuilderSteps,
      split: false,
    };
  }

  return {
    ...blueprint,
    confirmedBuilderSteps,
    split,
    trainingFrequencyDaysPerWeek,
    updatedAt: timestamp,
  };
}

export function selectTrainingSplit(options: SelectTrainingSplitOptions): PlanBlueprint {
  const selectedTrainingSplitId = getSelectedTrainingSplitId(options);

  if (
    !isTrainingSplitCompatible(
      selectedTrainingSplitId,
      options.blueprint.trainingFrequencyDaysPerWeek,
    )
  ) {
    throw new Error(
      `Training Split "${selectedTrainingSplitId}" is not compatible with ${options.blueprint.trainingFrequencyDaysPerWeek} days/week.`,
    );
  }

  const confirmedBuilderSteps = getConfirmedBuilderSteps(options.blueprint);
  const isSameTrainingSplit = options.blueprint.split === selectedTrainingSplitId;

  return {
    ...options.blueprint,
    confirmedBuilderSteps: {
      ...confirmedBuilderSteps,
      split: isSameTrainingSplit ? confirmedBuilderSteps.split : false,
    },
    split: selectedTrainingSplitId,
    updatedAt: options.timestamp,
  };
}

export function selectRepRangeStyle({
  blueprint,
  repRangeStyle,
  timestamp,
}: SelectRepRangeStyleOptions): PlanBlueprint {
  if (!isRepRangeStyleId(repRangeStyle)) {
    throw new Error(`Unknown Rep Range Style "${repRangeStyle}".`);
  }

  const confirmedBuilderSteps = getConfirmedBuilderSteps(blueprint);
  const isSameRepRangeStyle = blueprint.repRanges === repRangeStyle;

  return {
    ...blueprint,
    confirmedBuilderSteps: {
      ...confirmedBuilderSteps,
      repRanges: isSameRepRangeStyle ? confirmedBuilderSteps.repRanges : false,
    },
    repRanges: repRangeStyle,
    updatedAt: timestamp,
  };
}

export function confirmTrainingFrequency({
  blueprint,
  timestamp,
  trainingFrequencyDaysPerWeek,
}: ConfirmTrainingFrequencyOptions): PlanBlueprint {
  const updatedBlueprint = selectTrainingFrequency({
    blueprint,
    timestamp,
    trainingFrequencyDaysPerWeek,
  });

  return {
    ...updatedBlueprint,
    confirmedBuilderSteps: {
      ...updatedBlueprint.confirmedBuilderSteps,
      frequency: true,
    },
    updatedAt: timestamp,
  };
}

export function confirmTrainingSplit({
  blueprint,
  split,
  timestamp,
}: ConfirmTrainingSplitOptions): PlanBlueprint {
  const updatedBlueprint = selectTrainingSplit({
    blueprint,
    split,
    timestamp,
  });

  return {
    ...updatedBlueprint,
    confirmedBuilderSteps: {
      ...updatedBlueprint.confirmedBuilderSteps,
      split: true,
    },
    updatedAt: timestamp,
  };
}

export function confirmRepRangeStyle({
  blueprint,
  repRangeStyle,
  timestamp,
}: ConfirmRepRangeStyleOptions): PlanBlueprint {
  const updatedBlueprint = selectRepRangeStyle({
    blueprint,
    repRangeStyle,
    timestamp,
  });

  return {
    ...updatedBlueprint,
    confirmedBuilderSteps: {
      ...updatedBlueprint.confirmedBuilderSteps,
      repRanges: true,
    },
    updatedAt: timestamp,
  };
}

export function summarizePlanBlueprint(blueprint: PlanBlueprint): PlanBlueprintSummary {
  const { splitStatus, splitSummary } = getPlanBlueprintSplitSummaryDetails(blueprint);
  const pendingSplitDetail = planBlueprintSummaryFallbacks.pendingSplitDerivedDetail;
  const selectedRepRangeStyleId = blueprint.repRanges;
  const hasRepRangeStyle = isRepRangeStyleId(selectedRepRangeStyleId);

  return {
    generationStatus: planBlueprintSummaryFallbacks.generationStatus,
    muscleFrequency: splitSummary?.muscleFrequency ?? pendingSplitDetail,
    nextStep: getPlanBlueprintNextStep({ hasRepRangeStyle, splitSummary }),
    repRanges: hasRepRangeStyle
      ? formatRepRangeStyle(selectedRepRangeStyleId)
      : planBlueprintSummaryFallbacks.repRanges,
    recovery: splitSummary?.recovery ?? pendingSplitDetail,
    split: splitSummary?.split ?? planBlueprintSummaryFallbacks.split,
    splitStatus,
    trainingGoal: formatTrainingGoal(blueprint.trainingGoal),
    trainingFrequency: formatTrainingFrequency(blueprint.trainingFrequencyDaysPerWeek),
    trainingFrequencyStatus: "Completed",
    weeklyRhythm: splitSummary?.weeklyRhythm ?? pendingSplitDetail,
  };
}

function getPlanBlueprintNextStep({
  hasRepRangeStyle,
  splitSummary,
}: {
  hasRepRangeStyle: boolean;
  splitSummary: TrainingSplitSummary | null;
}): string {
  if (!splitSummary) {
    return planBlueprintSummaryFallbacks.nextStep;
  }

  return hasRepRangeStyle ? "Volume" : "Rep ranges";
}

function getPlanBlueprintSplitSummaryDetails(
  blueprint: PlanBlueprint,
): PlanBlueprintSplitSummaryDetails {
  const selectedSplit = blueprint.split;

  if (!isTrainingSplitCompatible(selectedSplit, blueprint.trainingFrequencyDaysPerWeek)) {
    return {
      splitStatus: null,
      splitSummary: null,
    };
  }

  const recommendedSplit = getRecommendedTrainingSplitId(blueprint.trainingFrequencyDaysPerWeek);

  return {
    splitStatus: selectedSplit === recommendedSplit ? "Recommended" : "Also works",
    splitSummary: summarizeTrainingSplit(selectedSplit),
  };
}

function formatTrainingGoal(trainingGoal: TrainingGoal): string {
  return trainingGoalLabels[trainingGoal];
}

function formatRepRangeStyle(repRangeStyleId: RepRangeStyleId): string {
  return repRangeStyleLabels[repRangeStyleId];
}

function formatTrainingFrequency(
  trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek,
): string {
  return `${trainingFrequencyDaysPerWeek} days/week`;
}

function getCompatibleSelectedTrainingSplit({
  selectedTrainingSplit,
  trainingFrequencyDaysPerWeek,
}: {
  selectedTrainingSplit: TrainingSplitId | null;
  trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek;
}): TrainingSplitId | null {
  if (!selectedTrainingSplit) {
    return null;
  }

  if (!isTrainingSplitCompatible(selectedTrainingSplit, trainingFrequencyDaysPerWeek)) {
    return null;
  }

  return selectedTrainingSplit;
}

function getConfirmedBuilderSteps({
  confirmedBuilderSteps,
}: {
  confirmedBuilderSteps?: Partial<PlanBuilderConfirmedSteps>;
}): PlanBuilderConfirmedSteps {
  return {
    frequency: confirmedBuilderSteps?.frequency === true,
    repRanges: confirmedBuilderSteps?.repRanges === true,
    split: confirmedBuilderSteps?.split === true,
  };
}

function getSelectedTrainingSplitId({
  split,
  trainingSplitId,
}: SelectTrainingSplitOptions): TrainingSplitId {
  return split ?? trainingSplitId;
}
