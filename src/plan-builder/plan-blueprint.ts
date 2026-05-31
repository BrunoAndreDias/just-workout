import {
  createDefaultExerciseSelectionPreferences,
  type ExerciseSelectionPreferenceItem,
  type ExerciseSelectionPreferences,
  normalizeExerciseSelectionPreferences,
} from "./exercise-selection-preferences";
import type { TrainingSplitId, TrainingSplitSummary } from "./training-split";
import {
  getRecommendedTrainingSplitId,
  isTrainingSplitCompatible,
  summarizeTrainingSplit,
} from "./training-split";
import {
  createRecommendedTrainingVolumeConfiguration,
  createTrainingVolumeConfiguration,
  getVolumePreset,
  isTrainingVolumeConfiguration,
  isVolumePresetId,
  normalizeTrainingVolumeConfiguration,
  type OptionalVolumeMuscleGroupId,
  selectTrainingVolumeConfiguration,
  setOptionalWeeklyRepTargetEnabled,
  type TrainingVolumeConfigurationCandidate,
  type VolumeEstimationRepRange,
  type VolumePresetId,
  type VolumePresetSource,
  type WeeklyRepTarget,
} from "./training-volume";

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
  volumeEstimationRepRange: VolumeEstimationRepRange;
};
export type PlanBuilderGuardedStep = "split" | "rep-ranges" | "volume" | "exercises" | "review";
export type PlanBuilderRedirectStep = "frequency" | "split" | "rep-ranges" | "volume" | "exercises";

type PlanBuilderConfirmedSteps = {
  exercises: boolean;
  frequency: boolean;
  repRanges: boolean;
  split: boolean;
  volume: boolean;
};

export type PlanBlueprint = {
  id: string;
  createdAt: string;
  updatedAt: string;
  trainingGoal: TrainingGoal;
  trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek;
  split: TrainingSplitId | null;
  repRanges: RepRangeStyleId | null;
  volumePreset: VolumePresetId | null;
  volumePresetSource: VolumePresetSource | null;
  weeklyRepTargets: ReadonlyArray<WeeklyRepTarget> | null;
  exerciseSelectionPreferences: ExerciseSelectionPreferences;
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
  volumePreset: string;
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

type SelectTrainingVolumePresetOptions = {
  blueprint: PlanBlueprint;
  timestamp: string;
  volumePreset: VolumePresetId;
};

type SetOptionalVolumeTargetEnabledOptions = {
  blueprint: PlanBlueprint;
  isEnabled: boolean;
  muscleGroup: OptionalVolumeMuscleGroupId;
  timestamp: string;
};

type UpdateExerciseSelectionPreferencesOptions = {
  blueprint: PlanBlueprint;
  exerciseSelectionPreferences: ExerciseSelectionPreferences;
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

type ConfirmTrainingVolumeOptions = {
  blueprint: PlanBlueprint;
  timestamp: string;
};

type ConfirmExerciseSelectionPreferencesOptions = {
  blueprint: PlanBlueprint;
  timestamp: string;
};

type StoredPlanBlueprint = Omit<
  PlanBlueprint,
  | "confirmedBuilderSteps"
  | "exerciseSelectionPreferences"
  | "volumePreset"
  | "volumePresetSource"
  | "weeklyRepTargets"
> & {
  confirmedBuilderSteps?: Partial<PlanBuilderConfirmedSteps>;
  exerciseSelectionPreferences?: unknown;
  volumePreset?: unknown;
  volumePresetSource?: unknown;
  weeklyRepTargets?: unknown;
};

const defaultConfirmedBuilderSteps = {
  exercises: false,
  frequency: false,
  repRanges: false,
  split: false,
  volume: false,
} satisfies PlanBuilderConfirmedSteps;

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
    volumeEstimationRepRange: {
      max: 10,
      min: 6,
    },
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
    volumeEstimationRepRange: {
      max: 12,
      min: 8,
    },
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
    volumeEstimationRepRange: {
      max: 15,
      min: 10,
    },
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
  generationStatus: "Not ready yet",
  nextStep: "Choose a Training Split",
  pendingSplitDerivedDetail: "Choose a compatible split to see this detail.",
  repRanges: "Choose Rep ranges",
  split: "Choose a Training Split",
  volumePreset: "Not chosen yet",
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
    trainingGoal: "build-muscle",
    trainingFrequencyDaysPerWeek: 3,
    split: null,
    repRanges: null,
    volumePreset: null,
    volumePresetSource: null,
    weeklyRepTargets: null,
    exerciseSelectionPreferences: createDefaultExerciseSelectionPreferences(),
    confirmedBuilderSteps: getConfirmedBuilderSteps({
      confirmedBuilderSteps: defaultConfirmedBuilderSteps,
    }),
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

type VolumeStepCompletionCandidate = TrainingVolumeConfigurationCandidate & {
  confirmedBuilderSteps?: Partial<PlanBuilderConfirmedSteps>;
};

type ExercisesStepCompletionCandidate = {
  confirmedBuilderSteps?: Partial<PlanBuilderConfirmedSteps>;
};

export function normalizePlanBlueprint(blueprint: StoredPlanBlueprint): PlanBlueprint {
  return {
    ...blueprint,
    ...normalizeTrainingVolumeConfiguration(blueprint),
    exerciseSelectionPreferences: normalizeExerciseSelectionPreferences(
      blueprint.exerciseSelectionPreferences,
    ),
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

export function isVolumeStepComplete(
  blueprint: VolumeStepCompletionCandidate | null | undefined,
): boolean {
  if (!blueprint) {
    return false;
  }

  return getConfirmedBuilderSteps(blueprint).volume && isTrainingVolumeConfiguration(blueprint);
}

export function isExercisesStepComplete(
  blueprint: ExercisesStepCompletionCandidate | null | undefined,
): boolean {
  if (!blueprint) {
    return false;
  }

  return getConfirmedBuilderSteps(blueprint).exercises;
}

export function getPlanBuilderRedirectStep(
  blueprint: PlanBlueprint,
  targetStep: PlanBuilderGuardedStep,
): PlanBuilderRedirectStep | null {
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

  if (!isRepRangesStepComplete(blueprint)) {
    return "rep-ranges";
  }

  if (targetStep === "volume") {
    return null;
  }

  if (!isVolumeStepComplete(blueprint)) {
    return "volume";
  }

  if (targetStep === "exercises") {
    return null;
  }

  if (isExercisesStepComplete(blueprint)) {
    return null;
  }

  return "exercises";
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
      exercises: false,
      frequency: false,
      split: false,
    };
  } else if (hasSplitChanged) {
    confirmedBuilderSteps = {
      ...confirmedBuilderSteps,
      exercises: false,
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
      exercises: isSameTrainingSplit ? confirmedBuilderSteps.exercises : false,
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
      exercises: isSameRepRangeStyle ? confirmedBuilderSteps.exercises : false,
      repRanges: isSameRepRangeStyle ? confirmedBuilderSteps.repRanges : false,
      volume: isSameRepRangeStyle ? confirmedBuilderSteps.volume : false,
    },
    repRanges: repRangeStyle,
    updatedAt: timestamp,
  };
}

type InitializeTrainingVolumeOptions = {
  blueprint: PlanBlueprint;
  timestamp: string;
};

export function initializeTrainingVolume({
  blueprint,
  timestamp,
}: InitializeTrainingVolumeOptions): PlanBlueprint {
  if (isTrainingVolumeConfiguration(blueprint)) {
    return blueprint;
  }

  return {
    ...blueprint,
    ...createRecommendedTrainingVolumeConfiguration(),
    confirmedBuilderSteps: {
      ...getConfirmedBuilderSteps(blueprint),
      exercises: false,
      volume: false,
    },
    updatedAt: timestamp,
  };
}

export function selectTrainingVolumePreset({
  blueprint,
  timestamp,
  volumePreset,
}: SelectTrainingVolumePresetOptions): PlanBlueprint {
  if (!isVolumePresetId(volumePreset)) {
    throw new Error(`Unknown Volume Preset "${volumePreset}".`);
  }

  const confirmedBuilderSteps = getConfirmedBuilderSteps(blueprint);
  const hasVolumePresetChanged = blueprint.volumePreset !== volumePreset;
  const nextTrainingVolumeConfiguration = isTrainingVolumeConfiguration(blueprint)
    ? selectTrainingVolumeConfiguration({
        trainingVolumeConfiguration: blueprint,
        volumePreset,
      })
    : createTrainingVolumeConfiguration({
        volumePreset,
        volumePresetSource: "user_selected",
      });

  return {
    ...blueprint,
    ...nextTrainingVolumeConfiguration,
    confirmedBuilderSteps: {
      ...confirmedBuilderSteps,
      exercises: hasVolumePresetChanged ? false : confirmedBuilderSteps.exercises,
      volume: hasVolumePresetChanged ? false : confirmedBuilderSteps.volume,
    },
    updatedAt: timestamp,
  };
}

export function setOptionalVolumeTargetEnabled({
  blueprint,
  isEnabled,
  muscleGroup,
  timestamp,
}: SetOptionalVolumeTargetEnabledOptions): PlanBlueprint {
  const confirmedBuilderSteps = getConfirmedBuilderSteps(blueprint);
  const trainingVolumeConfiguration = isTrainingVolumeConfiguration(blueprint)
    ? blueprint
    : createRecommendedTrainingVolumeConfiguration();
  const currentWeeklyRepTarget = trainingVolumeConfiguration.weeklyRepTargets.find(
    (weeklyRepTarget) => weeklyRepTarget.muscleGroup === muscleGroup,
  );
  const hasEnabledStateChanged = currentWeeklyRepTarget?.isEnabled !== isEnabled;
  const nextTrainingVolumeConfiguration = setOptionalWeeklyRepTargetEnabled({
    isEnabled,
    muscleGroup,
    trainingVolumeConfiguration,
  });

  return {
    ...blueprint,
    ...nextTrainingVolumeConfiguration,
    confirmedBuilderSteps: {
      ...confirmedBuilderSteps,
      exercises: hasEnabledStateChanged ? false : confirmedBuilderSteps.exercises,
      volume: hasEnabledStateChanged ? false : confirmedBuilderSteps.volume,
    },
    updatedAt: timestamp,
  };
}

export function updateExerciseSelectionPreferences({
  blueprint,
  exerciseSelectionPreferences,
  timestamp,
}: UpdateExerciseSelectionPreferencesOptions): PlanBlueprint {
  const normalizedExerciseSelectionPreferences = normalizeExerciseSelectionPreferences(
    exerciseSelectionPreferences,
  );
  const confirmedBuilderSteps = getConfirmedBuilderSteps(blueprint);
  const hasExerciseSelectionPreferencesChanged = !areExerciseSelectionPreferencesEqual(
    blueprint.exerciseSelectionPreferences,
    normalizedExerciseSelectionPreferences,
  );

  return {
    ...blueprint,
    confirmedBuilderSteps: {
      ...confirmedBuilderSteps,
      exercises: hasExerciseSelectionPreferencesChanged ? false : confirmedBuilderSteps.exercises,
    },
    exerciseSelectionPreferences: normalizedExerciseSelectionPreferences,
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

export function confirmTrainingVolume({
  blueprint,
  timestamp,
}: ConfirmTrainingVolumeOptions): PlanBlueprint {
  if (!isTrainingVolumeConfiguration(blueprint)) {
    throw new Error("Training Volume must be configured before it can be confirmed.");
  }

  return {
    ...blueprint,
    confirmedBuilderSteps: {
      ...blueprint.confirmedBuilderSteps,
      volume: true,
    },
    updatedAt: timestamp,
  };
}

export function confirmExerciseSelectionPreferences({
  blueprint,
  timestamp,
}: ConfirmExerciseSelectionPreferencesOptions): PlanBlueprint {
  if (!isVolumeStepComplete(blueprint)) {
    throw new Error("Exercises cannot be confirmed before Training Volume is confirmed.");
  }

  return {
    ...blueprint,
    confirmedBuilderSteps: {
      ...blueprint.confirmedBuilderSteps,
      exercises: true,
    },
    updatedAt: timestamp,
  };
}

export function summarizePlanBlueprint(blueprint: PlanBlueprint): PlanBlueprintSummary {
  const { splitStatus, splitSummary } = getPlanBlueprintSplitSummaryDetails(blueprint);
  const pendingSplitDetail = planBlueprintSummaryFallbacks.pendingSplitDerivedDetail;
  const selectedRepRangeStyleId = getValidRepRangeStyleId(blueprint.repRanges);
  const hasRepRangeStyle = selectedRepRangeStyleId !== null;
  const isExercisesConfirmed = isExercisesStepComplete(blueprint);
  const isVolumeConfirmed = isVolumeStepComplete(blueprint);
  const selectedVolumePresetId = isVolumePresetId(blueprint.volumePreset)
    ? blueprint.volumePreset
    : null;

  return {
    generationStatus: planBlueprintSummaryFallbacks.generationStatus,
    muscleFrequency: splitSummary?.muscleFrequency ?? pendingSplitDetail,
    nextStep: getPlanBlueprintNextStep({
      isExercisesConfirmed,
      hasCompatibleSplit: splitSummary !== null,
      hasRepRangeStyle,
      isVolumeConfirmed,
    }),
    repRanges: hasRepRangeStyle
      ? formatRepRangeStyle(selectedRepRangeStyleId)
      : planBlueprintSummaryFallbacks.repRanges,
    recovery: splitSummary?.recovery ?? pendingSplitDetail,
    split: splitSummary?.split ?? planBlueprintSummaryFallbacks.split,
    splitStatus,
    trainingGoal: formatTrainingGoal(blueprint.trainingGoal),
    trainingFrequency: formatTrainingFrequency(blueprint.trainingFrequencyDaysPerWeek),
    trainingFrequencyStatus: "Completed",
    volumePreset: selectedVolumePresetId
      ? formatVolumePreset(selectedVolumePresetId)
      : planBlueprintSummaryFallbacks.volumePreset,
    weeklyRhythm: splitSummary?.weeklyRhythm ?? pendingSplitDetail,
  };
}

function getPlanBlueprintNextStep({
  isExercisesConfirmed,
  hasCompatibleSplit,
  hasRepRangeStyle,
  isVolumeConfirmed,
}: {
  isExercisesConfirmed: boolean;
  hasCompatibleSplit: boolean;
  hasRepRangeStyle: boolean;
  isVolumeConfirmed: boolean;
}): string {
  if (!hasCompatibleSplit) {
    return planBlueprintSummaryFallbacks.nextStep;
  }

  if (!hasRepRangeStyle) {
    return "Rep ranges";
  }

  if (!isVolumeConfirmed) {
    return "Volume";
  }

  if (!isExercisesConfirmed) {
    return "Exercises";
  }

  return "Review";
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

function formatVolumePreset(volumePresetId: VolumePresetId): string {
  return getVolumePreset(volumePresetId).title;
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
    exercises: confirmedBuilderSteps?.exercises === true,
    frequency: confirmedBuilderSteps?.frequency === true,
    repRanges: confirmedBuilderSteps?.repRanges === true,
    split: confirmedBuilderSteps?.split === true,
    volume: confirmedBuilderSteps?.volume === true,
  };
}

function areExerciseSelectionPreferencesEqual(
  left: ExerciseSelectionPreferences,
  right: ExerciseSelectionPreferences,
): boolean {
  return (
    left.equipmentPreset === right.equipmentPreset &&
    left.strategy === right.strategy &&
    areExerciseSelectionPreferenceItemsEqual(left.avoidedExercises, right.avoidedExercises) &&
    areExerciseSelectionPreferenceItemsEqual(left.preferredExercises, right.preferredExercises)
  );
}

function areExerciseSelectionPreferenceItemsEqual(
  left: ReadonlyArray<ExerciseSelectionPreferenceItem>,
  right: ReadonlyArray<ExerciseSelectionPreferenceItem>,
): boolean {
  return (
    left.length === right.length &&
    left.every(
      (item, index) =>
        item.id === right[index]?.id &&
        item.matchedExerciseId === right[index]?.matchedExerciseId &&
        item.rawText === right[index]?.rawText,
    )
  );
}

function getSelectedTrainingSplitId({
  split,
  trainingSplitId,
}: SelectTrainingSplitOptions): TrainingSplitId {
  return split ?? trainingSplitId;
}
