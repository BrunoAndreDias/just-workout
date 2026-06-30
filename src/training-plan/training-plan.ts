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

export type TrainingPlanSlot = {
  exerciseId: string;
  exerciseName: string;
  kind: "exercise";
  movementPattern: MovementPatternId;
  role: "main_compound" | "secondary_compound" | "isolation" | "abs";
  slotLabel: string;
  targetMuscles: ReadonlyArray<ExerciseCatalogMuscleGroupId>;
};

export type TrainingPlanStartingLoadSuggestion = {
  effectiveLoad: number;
  exerciseId: string;
  exerciseName: string;
  movementPattern: MovementPatternId;
  previousLoad: number | null;
  reason: string;
  suggestedLoad: number;
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
  supersetGroups: ReadonlyArray<SupersetGroup>;
};

export type TrainingPlan = {
  active: boolean;
  generatedAt: string;
  id: string;
  mainCompoundRotationPools: ReadonlyArray<MainCompoundRotationPool>;
  repRangeStyle: NonNullable<PlanBlueprint["repRanges"]>;
  sourceBlueprintId: string;
  split: string;
  startingLoadSuggestions?: ReadonlyArray<TrainingPlanStartingLoadSuggestion>;
  trainingBlock?: TrainingBlock;
  trainingBlockWeeks: number;
  trainingFrequencyDaysPerWeek: PlanBlueprint["trainingFrequencyDaysPerWeek"];
  trainingGoal: PlanBlueprint["trainingGoal"];
  updatedAt: string;
  weeklyRepTargets: ReadonlyArray<WeeklyRepTarget>;
  workoutTemplates: ReadonlyArray<WorkoutTemplate>;
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

  return {
    active: true,
    generatedAt: timestamp,
    id,
    mainCompoundRotationPools,
    repRangeStyle: repRanges,
    sourceBlueprintId: blueprint.id,
    split: splitLabel,
    trainingBlockWeeks: 6,
    trainingFrequencyDaysPerWeek: blueprint.trainingFrequencyDaysPerWeek,
    trainingGoal: blueprint.trainingGoal,
    updatedAt: timestamp,
    weeklyRepTargets,
    workoutTemplates,
  };
}
