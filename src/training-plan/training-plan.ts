import type { ExerciseSelectionPreferences } from "../plan-builder/exercise-selection-preferences";
import type { IsolationExercisePreferenceBucket } from "../plan-builder/isolation-exercise-preferences";
import { deriveMainCompoundRotationPools } from "../plan-builder/main-compound-rotation-pool";
import type { PlanBlueprint } from "../plan-builder/plan-blueprint";
import type {
  ExerciseCatalogMuscleGroupId,
  MainCompoundRotationPool,
  MovementPatternId,
  WeeklyRepTarget,
} from "../training-taxonomy";
import type { TrainingBlock } from "./training-block";
import { createTrainingPlanTemplatesForBlueprint } from "./training-plan-template-generation";
import {
  applyTrainingPrescriptionsToWorkoutTemplates,
  type TrainingPrescription,
  type WorkoutExerciseRole,
} from "./training-prescription";
import type { TrainingWeekBodyweightUpdate } from "./training-week-bodyweight";

export type TrainingPlanSlot = {
  exerciseId: string;
  exerciseName: string;
  kind: "exercise";
  movementPattern: MovementPatternId;
  role: WorkoutExerciseRole;
  slotLabel: string;
  targetMuscles: ReadonlyArray<ExerciseCatalogMuscleGroupId>;
  trainingPrescription?: TrainingPrescription;
};

export type TrainingPlanStartingLoadSuggestion = {
  effectiveLoad: number | null;
  exerciseId: string;
  exerciseName: string;
  /** Identifies whether the starting load came from exact exercise history or needs manual entry. */
  kind: "exact_previous_exercise" | "first_time";
  movementPattern: MovementPatternId;
  previousLoad: number | null;
  reason: string;
  suggestedLoad: number | null;
  userEditedLoad: number | null;
};

export type SupersetGroup = {
  id: string;
  slots: ReadonlyArray<TrainingPlanSlot>;
  title: string;
  type: "superset" | "isolation" | "abs";
};

export type WorkoutTemplate = {
  id: string;
  label: string;
  purpose?: "strength";
  supersetGroups: ReadonlyArray<SupersetGroup>;
};

/** Snapshot of the previous block state kept until undo is consumed or expires. */
export type UndoableTrainingBlockTransition = {
  /** Timestamp when the next Training Block was accepted. */
  acceptedAt: string;
  /** Plan fields restored if the user undoes the accepted Training Block. */
  previousState: {
    generatedAt: string;
    startingLoadSuggestions: ReadonlyArray<TrainingPlanStartingLoadSuggestion>;
    trainingBlock: TrainingBlock;
    workoutTemplates: ReadonlyArray<WorkoutTemplate>;
  };
};

export type TrainingPlan = {
  active: boolean;
  baselineBodyweight?: number | null;
  exerciseSelectionPreferences?: ExerciseSelectionPreferences;
  generatedAt: string;
  id: string;
  isolationExercisePreferences?: ReadonlyArray<IsolationExercisePreferenceBucket>;
  mainCompoundRotationPools: ReadonlyArray<MainCompoundRotationPool>;
  repRangeStyle: NonNullable<PlanBlueprint["repRanges"]>;
  sourceBlueprintId: string;
  split: string;
  startingLoadSuggestions?: ReadonlyArray<TrainingPlanStartingLoadSuggestion>;
  trainingBlock?: TrainingBlock;
  trainingBlockWeeks: number;
  trainingFrequencyDaysPerWeek: PlanBlueprint["trainingFrequencyDaysPerWeek"];
  trainingGoal: PlanBlueprint["trainingGoal"];
  undoableTrainingBlockTransition?: UndoableTrainingBlockTransition | null;
  updatedAt: string;
  weeklyBodyweightUpdates?: ReadonlyArray<TrainingWeekBodyweightUpdate>;
  weeklyRepTargets: ReadonlyArray<WeeklyRepTarget>;
  workoutTemplates: ReadonlyArray<WorkoutTemplate>;
};

export type TrainingPlanContent = Pick<
  TrainingPlan,
  | "exerciseSelectionPreferences"
  | "isolationExercisePreferences"
  | "mainCompoundRotationPools"
  | "repRangeStyle"
  | "split"
  | "trainingBlockWeeks"
  | "trainingFrequencyDaysPerWeek"
  | "trainingGoal"
  | "weeklyRepTargets"
  | "workoutTemplates"
> &
  Partial<Pick<TrainingPlan, "baselineBodyweight" | "startingLoadSuggestions" | "trainingBlock">>;

export type TrainingPlanDraft = {
  content: TrainingPlanContent;
};

type GenerateTrainingPlanOptions = {
  blueprint: PlanBlueprint;
  id: string;
  timestamp: string;
};

export function generateTrainingPlanFromBlueprint({
  blueprint,
  id,
  timestamp,
}: GenerateTrainingPlanOptions): TrainingPlan {
  const content = generateTrainingPlanContentFromBlueprint({ blueprint });

  return {
    ...content,
    active: true,
    generatedAt: timestamp,
    id,
    sourceBlueprintId: blueprint.id,
    updatedAt: timestamp,
  };
}

export function generateTrainingPlanContentFromBlueprint({
  blueprint,
}: {
  blueprint: PlanBlueprint;
}): TrainingPlanContent {
  const { repRanges, split, weeklyRepTargets } = blueprint;

  if (!split) {
    throw new Error("Cannot generate a Training Plan without a Training Split.");
  }

  if (!repRanges) {
    throw new Error("Cannot generate a Training Plan without a Rep Range Style.");
  }

  if (!weeklyRepTargets) {
    throw new Error("Cannot generate a Training Plan without Training Volume.");
  }

  const { splitLabel, workoutTemplates } = createTrainingPlanTemplatesForBlueprint({ blueprint });
  const mainCompoundRotationPools = deriveMainCompoundRotationPools({
    exerciseSelectionPreferences: blueprint.exerciseSelectionPreferences,
    mainCompoundSelections: blueprint.mainCompoundSelections,
    rotationPools: blueprint.mainCompoundRotationPools,
    rotationPreferences: blueprint.mainCompoundRotationPreferences,
  });
  const prescribedWorkoutTemplates = applyTrainingPrescriptionsToWorkoutTemplates({
    repRangeStyle: repRanges,
    workoutTemplates,
  });

  return {
    exerciseSelectionPreferences: blueprint.exerciseSelectionPreferences,
    isolationExercisePreferences: blueprint.isolationExercisePreferences,
    mainCompoundRotationPools,
    repRangeStyle: repRanges,
    split: splitLabel,
    trainingBlockWeeks: 6,
    trainingFrequencyDaysPerWeek: blueprint.trainingFrequencyDaysPerWeek,
    trainingGoal: blueprint.trainingGoal,
    weeklyRepTargets,
    workoutTemplates: prescribedWorkoutTemplates,
  };
}
