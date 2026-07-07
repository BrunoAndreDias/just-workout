import type {
  TrainingPlanDraft,
  WorkoutTemplate,
  WorkoutTemplatePurpose,
} from "../training-plan/training-plan";
import type { ExerciseSelectionPreferences } from "./exercise-selection-preferences";
import type { IsolationExercisePreferenceBucket } from "./isolation-exercise-preferences";
import type { MainCompoundPreferenceBucket } from "./main-compound-preferences";
import type { MainCompoundRotationPool } from "./main-compound-rotation-pool";
import type { MainCompoundRotationPreferenceBucket } from "./main-compound-rotation-preferences";
import type { TrainingSplitId, TrainingSplitSummary } from "./training-split";
import type {
  OptionalVolumeMuscleGroupId,
  TrainingVolumeConfiguration,
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

export const userSelectedEquipmentPresetSource = "user_selected";
export type EquipmentPresetSource = typeof userSelectedEquipmentPresetSource;

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
  mainCompoundPreferences: ReadonlyArray<MainCompoundPreferenceBucket>;
  mainCompoundRotationPreferences: ReadonlyArray<MainCompoundRotationPreferenceBucket>;
  isolationExercisePreferences: ReadonlyArray<IsolationExercisePreferenceBucket>;
  mainCompoundSelections: ReadonlyArray<MainCompoundSelection>;
  mainCompoundRotationPools: ReadonlyArray<MainCompoundRotationPool>;
  exerciseSelectionPreferences: ExerciseSelectionPreferences;
  equipmentPresetSource: EquipmentPresetSource | null;
  confirmedBuilderSteps: PlanBuilderConfirmedSteps;
  /** Draft Training Plan content saved while the Generate step is editable, or null before one exists. */
  trainingPlanDraft: TrainingPlanDraft | null;
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

export type UpdateMainCompoundRotationPreferencesOptions = {
  blueprint: PlanBlueprint;
  exerciseIds: ReadonlyArray<string>;
  movementPattern: MainCompoundSelection["movementPattern"];
  timestamp: string;
};

export type UpdateMainCompoundPreferencesOptions = {
  blueprint: PlanBlueprint;
  exerciseIds: ReadonlyArray<string>;
  movementPattern: MainCompoundSelection["movementPattern"];
  timestamp: string;
};

export type UpdateIsolationExercisePreferencesOptions = {
  blueprint: PlanBlueprint;
  exerciseIds: ReadonlyArray<string>;
  primaryMuscleGroup: IsolationExercisePreferenceBucket["primaryMuscleGroup"];
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

export type RenameTrainingPlanDraftWorkoutTemplateOptions = {
  blueprint: PlanBlueprint;
  label: string;
  templateId: string;
  timestamp: string;
};

export type ReorderTrainingPlanDraftWorkoutTemplateOptions = {
  blueprint: PlanBlueprint;
  targetIndex: number;
  templateId: string;
  timestamp: string;
};

export type UpdateTrainingPlanDraftWorkoutTemplatePurposeOptions = {
  blueprint: PlanBlueprint;
  purpose: WorkoutTemplatePurpose;
  templateId: string;
  timestamp: string;
};

export type ReplaceTrainingPlanDraftWorkoutTemplateWithCustomFocusOptions = {
  blueprint: PlanBlueprint;
  templateId: string;
  timestamp: string;
};

export type AddTrainingPlanDraftSupersetGroupOptions = {
  blueprint: PlanBlueprint;
  groupId: string;
  targetIndex: number;
  templateId: string;
  timestamp: string;
};

export type RenameTrainingPlanDraftSupersetGroupOptions = {
  blueprint: PlanBlueprint;
  groupId: string;
  templateId: string;
  timestamp: string;
  title: string;
};

export type DeleteTrainingPlanDraftSupersetGroupOptions = {
  blueprint: PlanBlueprint;
  groupId: string;
  templateId: string;
  timestamp: string;
};

export type ReorderTrainingPlanDraftSupersetGroupOptions = {
  blueprint: PlanBlueprint;
  groupId: string;
  targetIndex: number;
  templateId: string;
  timestamp: string;
};

export type MoveTrainingPlanDraftSlotToSupersetGroupOptions = {
  blueprint: PlanBlueprint;
  sourceGroupId: string;
  slotIndex: number;
  targetGroupId: string;
  targetSlotIndex: number;
  templateId: string;
  timestamp: string;
};

export type ReplaceTrainingPlanDraftSlotExerciseOptions = {
  blueprint: PlanBlueprint;
  exerciseId: string;
  groupId: string;
  slotIndex: number;
  templateId: string;
  timestamp: string;
};

export type AddTrainingPlanDraftSlotOptions = {
  blueprint: PlanBlueprint;
  groupId: string;
  templateId: string;
  timestamp: string;
};

export type DeleteTrainingPlanDraftSlotOptions = {
  blueprint: PlanBlueprint;
  groupId: string;
  slotIndex: number;
  templateId: string;
  timestamp: string;
};

export type ReorderTrainingPlanDraftSlotOptions = {
  blueprint: PlanBlueprint;
  groupId: string;
  slotIndex: number;
  targetSlotIndex: number;
  templateId: string;
  timestamp: string;
};

export type UpdateTrainingPlanDraftSlotTrainingPrescriptionOptions = {
  blueprint: PlanBlueprint;
  groupId: string;
  repTargetMax: number;
  repTargetMin: number;
  setCount: number;
  slotIndex: number;
  templateId: string;
  timestamp: string;
};

export type UpdateTrainingPlanDraftOptions = {
  blueprint: PlanBlueprint;
  timestamp: string;
  workoutTemplates: ReadonlyArray<WorkoutTemplate> | undefined;
};

export type PlanBlueprintTransition =
  | {
      type: "selectTrainingFrequency";
      timestamp: string;
      trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek;
    }
  | {
      split: TrainingSplitId;
      timestamp: string;
      type: "selectTrainingSplit";
    }
  | {
      repRangeStyle: RepRangeStyleId;
      timestamp: string;
      type: "selectRepRangeStyle";
    }
  | {
      timestamp: string;
      type: "initializeTrainingVolume";
    }
  | {
      timestamp: string;
      type: "selectTrainingVolumePreset";
      volumePreset: VolumePresetId;
    }
  | {
      isEnabled: boolean;
      muscleGroup: OptionalVolumeMuscleGroupId;
      timestamp: string;
      type: "setOptionalVolumeTargetEnabled";
    }
  | {
      exerciseSelectionPreferences: ExerciseSelectionPreferences;
      timestamp: string;
      type: "updateExerciseSelectionPreferences";
    }
  | {
      exerciseId: string;
      movementPattern: MainCompoundSelection["movementPattern"];
      timestamp: string;
      type: "selectMainCompound";
    }
  | {
      exerciseIds: ReadonlyArray<string>;
      movementPattern: MainCompoundSelection["movementPattern"];
      timestamp: string;
      type: "updateMainCompoundRotationPool";
    }
  | {
      exerciseIds: ReadonlyArray<string>;
      movementPattern: MainCompoundSelection["movementPattern"];
      timestamp: string;
      type: "updateMainCompoundRotationPreferences";
    }
  | {
      exerciseIds: ReadonlyArray<string>;
      movementPattern: MainCompoundSelection["movementPattern"];
      timestamp: string;
      type: "updateMainCompoundPreferences";
    }
  | {
      exerciseIds: ReadonlyArray<string>;
      primaryMuscleGroup: IsolationExercisePreferenceBucket["primaryMuscleGroup"];
      timestamp: string;
      type: "updateIsolationExercisePreferences";
    }
  | {
      timestamp: string;
      trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek;
      type: "confirmTrainingFrequency";
    }
  | {
      split: TrainingSplitId;
      timestamp: string;
      type: "confirmTrainingSplit";
    }
  | {
      repRangeStyle: RepRangeStyleId;
      timestamp: string;
      type: "confirmRepRangeStyle";
    }
  | {
      timestamp: string;
      trainingVolumeConfiguration?: TrainingVolumeConfiguration;
      type: "confirmTrainingVolume";
    }
  | {
      exerciseSelectionPreferences?: ExerciseSelectionPreferences;
      timestamp: string;
      type: "confirmExerciseSelectionPreferences";
    };

export type ApplyPlanBlueprintTransitionOptions = {
  blueprint: PlanBlueprint;
  transition: PlanBlueprintTransition;
};

export type StoredPlanBlueprint = Omit<
  PlanBlueprint,
  | "confirmedBuilderSteps"
  | "exerciseSelectionPreferences"
  | "equipmentPresetSource"
  | "isolationExercisePreferences"
  | "mainCompoundPreferences"
  | "mainCompoundRotationPreferences"
  | "mainCompoundSelections"
  | "mainCompoundRotationPools"
  | "trainingPlanDraft"
  | "volumePreset"
  | "volumePresetSource"
  | "weeklyRepTargets"
> & {
  confirmedBuilderSteps?: Partial<PlanBuilderConfirmedSteps>;
  exerciseSelectionPreferences?: unknown;
  equipmentPresetSource?: unknown;
  isolationExercisePreferences?: unknown;
  mainCompoundPreferences?: unknown;
  mainCompoundRotationPreferences?: unknown;
  mainCompoundSelections?: unknown;
  mainCompoundRotationPools?: unknown;
  trainingPlanDraft?: unknown;
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
