import type { ExerciseSelectionPreferences } from "./exercise-selection-preferences";
import type { MainCompoundRotationPool } from "./main-compound-rotation-pool";
import type { TrainingSplitId, TrainingSplitSummary } from "./training-split";
import type {
  OptionalVolumeMuscleGroupId,
  TrainingVolumeConfigurationCandidate,
  VolumeEstimationRepRange,
  VolumePresetId,
  VolumePresetSource,
  WeeklyRepTarget,
} from "./training-volume";
import type { MainCompoundSelection } from "./weekly-movement-coverage";

export type TrainingGoal = "build-muscle";
export type TrainingFrequencyDaysPerWeek = 2 | 3 | 4 | 5;
export type TrainingFrequencyOption = {
  daysPerWeek: TrainingFrequencyDaysPerWeek;
  helperText?: string;
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
  planEffects: readonly [string, string, string];
  targets: ReadonlyArray<{
    label: string;
    reps: string;
  }>;
  title: string;
  volumeEstimationRepRange: VolumeEstimationRepRange;
};
export type PlanBuilderGuardedStep = "rep-ranges" | "volume" | "exercises" | "generate";
export type PlanBuilderRedirectStep = "frequency" | "rep-ranges" | "volume" | "exercises";

export type PlanBuilderConfirmedSteps = {
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
  mainCompoundSelections: ReadonlyArray<MainCompoundSelection>;
  mainCompoundRotationPools: ReadonlyArray<MainCompoundRotationPool>;
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

export type PlanBlueprintSplitSummaryDetails = {
  splitStatus: PlanBlueprintSummary["splitStatus"];
  splitSummary: TrainingSplitSummary | null;
};

export type CreateDefaultPlanBlueprintOptions = {
  id: string;
  timestamp: string;
};

export type SelectTrainingFrequencyOptions = {
  blueprint: PlanBlueprint;
  timestamp: string;
  trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek;
};

export type SelectTrainingSplitOptions =
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

export type SelectRepRangeStyleOptions = {
  blueprint: PlanBlueprint;
  repRangeStyle: RepRangeStyleId;
  timestamp: string;
};

export type InitializeTrainingVolumeOptions = {
  blueprint: PlanBlueprint;
  timestamp: string;
};

export type SelectTrainingVolumePresetOptions = {
  blueprint: PlanBlueprint;
  timestamp: string;
  volumePreset: VolumePresetId;
};

export type SetOptionalVolumeTargetEnabledOptions = {
  blueprint: PlanBlueprint;
  isEnabled: boolean;
  muscleGroup: OptionalVolumeMuscleGroupId;
  timestamp: string;
};

export type UpdateExerciseSelectionPreferencesOptions = {
  blueprint: PlanBlueprint;
  exerciseSelectionPreferences: ExerciseSelectionPreferences;
  timestamp: string;
};

export type SelectMainCompoundOptions = {
  blueprint: PlanBlueprint;
  exerciseId: string;
  movementPattern: MainCompoundSelection["movementPattern"];
  timestamp: string;
};

export type UpdateMainCompoundRotationPoolOptions = {
  blueprint: PlanBlueprint;
  exerciseIds: ReadonlyArray<string>;
  movementPattern: MainCompoundSelection["movementPattern"];
  timestamp: string;
};

export type ConfirmTrainingFrequencyOptions = {
  blueprint: PlanBlueprint;
  timestamp: string;
  trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek;
};

export type ConfirmTrainingSplitOptions = {
  blueprint: PlanBlueprint;
  split: TrainingSplitId;
  timestamp: string;
};

export type ConfirmRepRangeStyleOptions = {
  blueprint: PlanBlueprint;
  repRangeStyle: RepRangeStyleId;
  timestamp: string;
};

export type ConfirmTrainingVolumeOptions = {
  blueprint: PlanBlueprint;
  timestamp: string;
};

export type ConfirmExerciseSelectionPreferencesOptions = {
  blueprint: PlanBlueprint;
  exerciseSelectionPreferences?: ExerciseSelectionPreferences;
  timestamp: string;
};

export type StoredPlanBlueprint = Omit<
  PlanBlueprint,
  | "confirmedBuilderSteps"
  | "exerciseSelectionPreferences"
  | "mainCompoundSelections"
  | "mainCompoundRotationPools"
  | "volumePreset"
  | "volumePresetSource"
  | "weeklyRepTargets"
> & {
  confirmedBuilderSteps?: Partial<PlanBuilderConfirmedSteps>;
  exerciseSelectionPreferences?: unknown;
  mainCompoundSelections?: unknown;
  mainCompoundRotationPools?: unknown;
  volumePreset?: unknown;
  volumePresetSource?: unknown;
  weeklyRepTargets?: unknown;
};

export type FrequencyStepCompletionCandidate = {
  confirmedBuilderSteps?: Partial<PlanBuilderConfirmedSteps>;
  trainingFrequencyDaysPerWeek: unknown;
};

export type SplitStepCompletionCandidate = {
  confirmedBuilderSteps?: Partial<PlanBuilderConfirmedSteps>;
  split: TrainingSplitId | null;
  trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek;
};

export type RepRangesStepCompletionCandidate = {
  confirmedBuilderSteps?: Partial<PlanBuilderConfirmedSteps>;
  repRanges: unknown;
};

export type VolumeStepCompletionCandidate = TrainingVolumeConfigurationCandidate & {
  confirmedBuilderSteps?: Partial<PlanBuilderConfirmedSteps>;
};

export type ExercisesStepCompletionCandidate = {
  confirmedBuilderSteps?: Partial<PlanBuilderConfirmedSteps>;
};
