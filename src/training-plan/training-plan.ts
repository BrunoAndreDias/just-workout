import type { ExerciseSelectionPreferences } from "../plan-builder/exercise-selection-preferences";
import { getAvoidedExerciseIds } from "../plan-builder/exercise-selection-preferences";
import type { IsolationExercisePreferenceBucket } from "../plan-builder/isolation-exercise-preferences";
import { deriveMainCompoundRotationPools } from "../plan-builder/main-compound-rotation-pool";
import type { PlanBlueprint } from "../plan-builder/plan-blueprint";
import type { TrainingSplitId } from "../plan-builder/training-split";
import { formatMovementPatternLabel } from "../plan-builder/weekly-movement-coverage";
import type {
  ExerciseCatalogMuscleGroupId,
  MainCompoundRotationPool,
  MovementPatternId,
  WeeklyRepTarget,
} from "../training-taxonomy";
import {
  getExerciseCatalogExercise,
  getWeeklyMovementCoverage,
  isCompoundCapableMovementPattern,
  type MainCompoundSelection,
} from "../training-taxonomy";
import { hasBodyweightLoadExercise } from "./bodyweight-load";
import type { TrainingBlock } from "./training-block";
import { createTrainingPlanTemplatesForBlueprint } from "./training-plan-template-generation";
import {
  applyTrainingPrescriptionsToWorkoutTemplates,
  type TrainingPrescription,
  type WorkoutExerciseRole,
} from "./training-prescription";
import type { TrainingWeekBodyweightUpdate } from "./training-week-bodyweight";
import { getWeeklyRepTargetDriftNotices } from "./weekly-rep-target-drift";

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

export type WorkoutTemplatePurpose = "custom-focus" | "strength";

export type WorkoutTemplate = {
  id: string;
  label: string;
  /** Classifies how this Workout Template should be used inside a Training Plan. */
  purpose: WorkoutTemplatePurpose;
  supersetGroups: ReadonlyArray<SupersetGroup>;
};

export type TrainingPlanDraftWarning =
  | {
      kind: "custom_focus_reduces_strength_coverage";
      message: string;
      templateIds: ReadonlyArray<string>;
    }
  | {
      kind: "missing_baseline_bodyweight";
      message: string;
    }
  | {
      kind: "weekly_rep_target_drift";
      message: string;
      muscleGroup: string;
      prescribedTopEndReps: number;
      shortfallReps: number;
      targetReps: number;
    };

export type TrainingPlanDraftValidation = {
  blockers: ReadonlyArray<string>;
  warnings: ReadonlyArray<TrainingPlanDraftWarning>;
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

/** Editable Training Plan fields that can be drafted before lifecycle fields are created. */
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

/** Pending Training Plan content held by Plan Builder until the user accepts it as an Active Plan. */
export type TrainingPlanDraft = {
  content: TrainingPlanContent;
  /** True when current Plan Builder choices no longer match this generated draft content. */
  isStale?: boolean;
  validation: TrainingPlanDraftValidation;
};

export type TrainingPlanDraftSetupUpdate =
  | {
      baselineBodyweight: number | null;
      kind: "baseline_bodyweight";
    }
  | {
      kind: "starting_load_suggestions";
      startingLoadSuggestions: ReadonlyArray<TrainingPlanStartingLoadSuggestion>;
    };

type GenerateTrainingPlanOptions = {
  blueprint: PlanBlueprint;
  id: string;
  timestamp: string;
};

type CreateTrainingPlanFromDraftOptions = {
  draft: TrainingPlanDraft;
  id: string;
  sourceBlueprintId: string;
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

/** Promotes draft content into a persisted Active Training Plan identity. */
export function createTrainingPlanFromDraft({
  draft,
  id,
  sourceBlueprintId,
  timestamp,
}: CreateTrainingPlanFromDraftOptions): TrainingPlan {
  return {
    ...draft.content,
    active: true,
    generatedAt: timestamp,
    id,
    sourceBlueprintId,
    updatedAt: timestamp,
  };
}

/** Generates draft-ready Training Plan content without identity, active status, or timestamps. */
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
  const startingLoadSuggestions = createDefaultStartingLoadSuggestions({
    workoutTemplates: prescribedWorkoutTemplates,
  });

  return {
    exerciseSelectionPreferences: blueprint.exerciseSelectionPreferences,
    isolationExercisePreferences: blueprint.isolationExercisePreferences,
    mainCompoundRotationPools,
    repRangeStyle: repRanges,
    split: splitLabel,
    startingLoadSuggestions,
    trainingBlockWeeks: 6,
    trainingFrequencyDaysPerWeek: blueprint.trainingFrequencyDaysPerWeek,
    trainingGoal: blueprint.trainingGoal,
    weeklyRepTargets,
    workoutTemplates: prescribedWorkoutTemplates,
  };
}

function createDefaultStartingLoadSuggestions({
  workoutTemplates,
}: {
  workoutTemplates: ReadonlyArray<WorkoutTemplate>;
}): ReadonlyArray<TrainingPlanStartingLoadSuggestion> {
  const seenExerciseIds = new Set<string>();
  const suggestions: TrainingPlanStartingLoadSuggestion[] = [];

  for (const slot of workoutTemplates.flatMap((template) =>
    template.supersetGroups.flatMap((group) => group.slots),
  )) {
    if (seenExerciseIds.has(slot.exerciseId)) {
      continue;
    }

    seenExerciseIds.add(slot.exerciseId);
    suggestions.push({
      effectiveLoad: null,
      exerciseId: slot.exerciseId,
      exerciseName: slot.exerciseName,
      kind: "first_time",
      movementPattern: slot.movementPattern,
      previousLoad: null,
      reason: "first-time exercise, start empty",
      suggestedLoad: null,
      userEditedLoad: null,
    });
  }

  return suggestions;
}

export function validateTrainingPlanDraftContent({
  content,
}: {
  content: TrainingPlanContent;
}): TrainingPlanDraftValidation {
  const blockers: string[] = [];
  const avoidedExerciseIds = getAvoidedExerciseIds(content.exerciseSelectionPreferences);
  const customFocusTemplateIds = content.workoutTemplates
    .filter((template) => template.purpose === "custom-focus")
    .map((template) => template.id);
  const strengthTemplates = content.workoutTemplates.filter(
    (template) => template.purpose === "strength",
  );

  if (strengthTemplates.some((template) => template.supersetGroups.length === 0)) {
    blockers.push("Strength-focused Workout Templates must contain at least one Superset Group.");
  }

  if (
    strengthTemplates.some((template) =>
      template.supersetGroups.some((group) => group.slots.length === 0),
    )
  ) {
    blockers.push("Strength-focused Workout Templates cannot contain empty Superset Groups.");
  }

  if (
    content.workoutTemplates.some((template) =>
      template.supersetGroups.some((group) =>
        group.slots.some((slot) => getExerciseCatalogExercise(slot.exerciseId) === undefined),
      ),
    )
  ) {
    blockers.push("Training Plan Draft slots must use available catalog exercises.");
  }

  if (
    content.workoutTemplates.some((template) =>
      template.supersetGroups.some((group) =>
        group.slots.some((slot) => avoidedExerciseIds.has(slot.exerciseId)),
      ),
    )
  ) {
    blockers.push("Avoided exercises cannot remain in the Training Plan Draft.");
  }

  if (
    content.workoutTemplates.some((template) => {
      const seenExerciseIds = new Set<string>();

      for (const slot of template.supersetGroups.flatMap((group) => group.slots)) {
        if (seenExerciseIds.has(slot.exerciseId)) {
          return true;
        }

        seenExerciseIds.add(slot.exerciseId);
      }

      return false;
    })
  ) {
    blockers.push("Workout Templates cannot repeat the same exercise in more than one slot.");
  }

  if (hasInvalidTrainingPrescription(content)) {
    blockers.push(
      "Training Prescriptions must use positive integer set counts and rep targets, with the minimum less than or equal to the maximum.",
    );
  }

  const missingRequiredStrengthCoverage = getMissingRequiredStrengthCoverage(content);

  if (customFocusTemplateIds.length === 0 && missingRequiredStrengthCoverage.length > 0) {
    blockers.push(getMissingRequiredStrengthCoverageMessage(missingRequiredStrengthCoverage));
  }

  const warnings: TrainingPlanDraftWarning[] = [];

  if (customFocusTemplateIds.length > 0) {
    warnings.push({
      kind: "custom_focus_reduces_strength_coverage",
      message:
        "Custom-focus templates intentionally reduce strength coverage. You can still accept this Training Plan Draft.",
      templateIds: customFocusTemplateIds,
    });
  }

  if (
    content.baselineBodyweight == null &&
    hasBodyweightLoadExercise(getTrainingPlanDraftExercises(content))
  ) {
    warnings.push({
      kind: "missing_baseline_bodyweight",
      message:
        "Missing Baseline Bodyweight: bodyweight exercise volume will stay partial until you set it here or later on the Training surface.",
    });
  }

  for (const notice of getWeeklyRepTargetDriftNotices(content)) {
    warnings.push({
      kind: "weekly_rep_target_drift",
      message: `${notice.muscleGroup} is ${notice.shortfallReps} reps below your Weekly Rep Target.`,
      muscleGroup: notice.muscleGroup,
      prescribedTopEndReps: notice.prescribedTopEndReps,
      shortfallReps: notice.shortfallReps,
      targetReps: notice.targetReps,
    });
  }

  return {
    blockers,
    warnings,
  };
}

function hasInvalidTrainingPrescription(content: TrainingPlanContent): boolean {
  return content.workoutTemplates.some((template) =>
    template.supersetGroups.some((group) =>
      group.slots.some(
        (slot) =>
          slot.trainingPrescription !== undefined &&
          isInvalidTrainingPrescription(slot.trainingPrescription),
      ),
    ),
  );
}

function getMissingRequiredStrengthCoverage(
  content: TrainingPlanContent,
): ReadonlyArray<MainCompoundSelection["movementPattern"]> {
  const coverage = getWeeklyMovementCoverage({
    mainCompoundSelections: getDraftMainCompoundSelections(content),
    split: getTrainingSplitIdForDraftContent(content),
    trainingFrequencyDaysPerWeek: content.trainingFrequencyDaysPerWeek,
  });

  return coverage.missingRequiredPatterns;
}

function getDraftMainCompoundSelections(
  content: TrainingPlanContent,
): ReadonlyArray<MainCompoundSelection> {
  const selections: MainCompoundSelection[] = [];

  for (const template of content.workoutTemplates) {
    for (const group of template.supersetGroups) {
      for (const slot of group.slots) {
        if (slot.role !== "main_compound") {
          continue;
        }

        if (!isCompoundCapableMovementPattern(slot.movementPattern)) {
          continue;
        }

        selections.push({
          exerciseId: slot.exerciseId,
          movementPattern: slot.movementPattern,
        });
      }
    }
  }

  return selections;
}

const draftTrainingSplitAliases = [
  {
    labels: ["Alternating Full Body A/B"],
    split: "alternating-full-body-a-b",
  },
  {
    labels: ["2-Day Full Body"],
    split: "full-body-2-day",
  },
  {
    labels: ["3-Day Full Body"],
    split: "full-body-3-day",
  },
  {
    labels: ["Rotating Push/Pull/Legs"],
    split: "rotating-push-pull-legs",
  },
  {
    labels: ["4-Day Upper/Lower", "Upper/Lower 4-Day"],
    split: "upper-lower-4-day",
  },
  {
    labels: ["Upper/Lower + Full Body", "Upper/Lower + Full Body 3-Day"],
    split: "upper-lower-full-body",
  },
] as const satisfies ReadonlyArray<{
  labels: ReadonlyArray<string>;
  split: TrainingSplitId;
}>;

function getTrainingSplitIdForDraftContent(content: TrainingPlanContent): TrainingSplitId {
  const normalizedLabel = content.split.trim().toLowerCase();

  for (const { labels, split } of draftTrainingSplitAliases) {
    if (labels.some((label) => label.toLowerCase() === normalizedLabel)) {
      return split;
    }
  }

  throw new Error(`Unknown Training Split label "${content.split}" in Training Plan Draft.`);
}

function getMissingRequiredStrengthCoverageMessage(
  missingRequiredPatterns: ReadonlyArray<MainCompoundSelection["movementPattern"]>,
): string {
  if (missingRequiredPatterns.length === 1) {
    const [missingRequiredPattern] = missingRequiredPatterns;

    if (!missingRequiredPattern) {
      return "Strength-focused Workout Templates are missing required Movement Pattern coverage.";
    }

    return `Strength-focused Workout Templates are missing required Movement Pattern coverage for ${formatMovementPatternLabel(
      missingRequiredPattern,
    )}.`;
  }

  return `Strength-focused Workout Templates are missing ${missingRequiredPatterns.length} required Movement Patterns.`;
}

function getTrainingPlanDraftExercises(content: TrainingPlanContent) {
  return content.workoutTemplates.flatMap((template) =>
    template.supersetGroups.flatMap((group) => group.slots),
  );
}

function isInvalidTrainingPrescription(trainingPrescription: TrainingPrescription): boolean {
  return (
    !Number.isInteger(trainingPrescription.setCount) ||
    !Number.isInteger(trainingPrescription.repRange.min) ||
    !Number.isInteger(trainingPrescription.repRange.max) ||
    trainingPrescription.setCount <= 0 ||
    trainingPrescription.repRange.min <= 0 ||
    trainingPrescription.repRange.max <= 0 ||
    trainingPrescription.repRange.min > trainingPrescription.repRange.max
  );
}
