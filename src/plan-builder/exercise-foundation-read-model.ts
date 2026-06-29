import {
  type CompoundCapableMovementPatternId,
  type ExerciseCatalogExercise,
  getExerciseCatalogExercise,
} from "./exercise-catalog";
import {
  getMainCompoundMovementPatternHelperText,
  getMainCompoundOptionList,
} from "./main-compound-option-presentation";
import { recommendMainCompoundSelection } from "./main-compound-recommendation";
import type { MainCompoundRotationPool } from "./main-compound-rotation-pool";
import type { PlanBlueprint } from "./plan-blueprint";
import type { TrainingSplitId } from "./training-split";
import type { OptionalVolumeMuscleGroupId, WeeklyRepTarget } from "./training-volume";
import {
  formatMovementPatternLabel,
  getWeeklyMovementCoverage,
  type MainCompoundSelection,
  normalizeMainCompoundSelections,
  type WeeklyMovementCoverage,
} from "./weekly-movement-coverage";

export type ExerciseFoundationReadyBlueprint = PlanBlueprint & { split: TrainingSplitId };

export type ExerciseFoundationRowStatus = "missing" | "recommended" | "required" | "suggested";

export type MainCompoundPickerFilterId =
  | "all"
  | "barbell"
  | "beginner_friendly"
  | "bodyweight"
  | "dumbbells"
  | "joint_friendly"
  | "machine";

export type ExerciseFoundationCompoundOption = ExerciseCatalogExercise & {
  filterIds: ReadonlyArray<MainCompoundPickerFilterId>;
  filterTags: ReadonlyArray<string>;
  metadata: string;
  role: "compound";
};

export type ExerciseFoundationAccessoryExercise = {
  beginnerFriendly: boolean;
  equipment: AccessoryEquipmentFilterId;
  group: "optional" | "recommended";
  id: string;
  muscleGroup: AccessoryMuscleGroupFilterId;
  name: string;
  optionalVolumeMuscleGroup?: OptionalVolumeMuscleGroupId;
  rationale?: string;
};

export type ExerciseFoundationRotationPoolReadModel = {
  availableOptionCount: number;
  isSuggested: boolean;
  options: ReadonlyArray<ExerciseFoundationCompoundOption>;
  selectedExerciseCount: number;
  selectedExerciseIds: ReadonlyArray<string>;
  status: string;
  startingExerciseId: string;
};

export type ExerciseFoundationRowReadModel = {
  accessibleLabel: string;
  bucket: string;
  confirmedSelection: MainCompoundSelection | undefined;
  helperText: string;
  isCovered: boolean;
  isMissing: boolean;
  mainCompoundOptions: ReadonlyArray<ExerciseFoundationCompoundOption>;
  metadata: string;
  movementPattern: CompoundCapableMovementPatternId;
  movementPatternLabel: string;
  requirement: "recommended" | "required";
  rotationPool: ExerciseFoundationRotationPoolReadModel | null;
  shownExercise: { exerciseId: string; exerciseName: string } | null;
  status: ExerciseFoundationRowStatus;
  statusAccessibleLabel: string;
  statusLabel: string;
  suggestedExerciseId: string | undefined;
};

export type ExerciseFoundationReadModel = {
  accessoryExerciseIds: ReadonlyArray<string>;
  accessoryExercises: ReadonlyArray<ExerciseFoundationAccessoryExercise>;
  canContinueToGenerate: boolean;
  canShowOptionalAccessoriesSummary: boolean;
  coverage: WeeklyMovementCoverage;
  guidance: string | null;
  hasConfirmedSelections: boolean;
  nextRequiredPattern: CompoundCapableMovementPatternId | null;
  normalizedSelections: ReadonlyArray<MainCompoundSelection>;
  optionalAccessoryCount: number;
  recommendedAccessoryCount: number;
  rows: ReadonlyArray<ExerciseFoundationRowReadModel>;
  selectedMainCompoundExerciseIds: ReadonlySet<string>;
  summary: string;
};

type AccessoryMuscleGroupFilterId =
  | "arms"
  | "calves"
  | "core"
  | "grip"
  | "hamstrings"
  | "hips"
  | "shoulders";

type AccessoryEquipmentFilterId = "bodyweight" | "cable" | "dumbbells" | "loaded" | "machine";

const accessoryExercises: ReadonlyArray<ExerciseFoundationAccessoryExercise> = [
  {
    beginnerFriendly: true,
    equipment: "machine",
    group: "recommended",
    id: "leg-curl",
    muscleGroup: "hamstrings",
    name: "Leg curl",
    rationale: "hamstring work",
  },
  {
    beginnerFriendly: true,
    equipment: "dumbbells",
    group: "recommended",
    id: "lateral-raise",
    muscleGroup: "shoulders",
    name: "Lateral raise",
    rationale: "side delt work",
  },
  {
    beginnerFriendly: true,
    equipment: "bodyweight",
    group: "recommended",
    id: "decline-crunch",
    muscleGroup: "core",
    name: "Decline crunch",
    optionalVolumeMuscleGroup: "abs",
    rationale: "core frequency",
  },
  {
    beginnerFriendly: true,
    equipment: "dumbbells",
    group: "optional",
    id: "biceps-curl",
    muscleGroup: "arms",
    name: "Biceps curl",
  },
  {
    beginnerFriendly: true,
    equipment: "cable",
    group: "optional",
    id: "triceps-extension",
    muscleGroup: "arms",
    name: "Triceps extension",
  },
  {
    beginnerFriendly: false,
    equipment: "loaded",
    group: "optional",
    id: "farmer-walks",
    muscleGroup: "grip",
    name: "Farmer walks",
    rationale: "grip & core",
  },
  {
    beginnerFriendly: true,
    equipment: "machine",
    group: "optional",
    id: "calf-raise",
    muscleGroup: "calves",
    name: "Calf raise",
    optionalVolumeMuscleGroup: "calves",
  },
  {
    beginnerFriendly: true,
    equipment: "machine",
    group: "optional",
    id: "hip-abduction",
    muscleGroup: "hips",
    name: "Hip abduction",
  },
];

export function getExerciseFoundationReadModel({
  blueprint,
  weeklyRepTargets,
}: {
  blueprint: ExerciseFoundationReadyBlueprint;
  weeklyRepTargets: ReadonlyArray<WeeklyRepTarget>;
}): ExerciseFoundationReadModel {
  const normalizedSelections = normalizeMainCompoundSelections(blueprint.mainCompoundSelections);
  const hasConfirmedSelections = normalizedSelections.length > 0;
  const selectedMainCompoundExerciseIds = new Set(
    normalizedSelections.map((selection) => selection.exerciseId),
  );
  const confirmedSelectionByPattern = new Map(
    normalizedSelections.map((selection) => [selection.movementPattern, selection]),
  );
  const rotationPoolByPattern = new Map(
    blueprint.mainCompoundRotationPools.map((pool) => [pool.movementPattern, pool]),
  );
  const coverage = getWeeklyMovementCoverage({
    mainCompoundSelections: normalizedSelections,
    split: blueprint.split,
    trainingFrequencyDaysPerWeek: blueprint.trainingFrequencyDaysPerWeek,
  });
  const rows = coverage.rows.map((row) => {
    const confirmedSelection = confirmedSelectionByPattern.get(row.movementPattern);
    const suggestedExerciseId = getSuggestedFoundationExerciseId({
      exerciseSelectionPreferences: blueprint.exerciseSelectionPreferences,
      movementPattern: row.movementPattern,
      requirement: row.requirement,
    });
    const status = getFoundationRowStatus({
      confirmedSelection,
      hasConfirmedSelections,
      requirement: row.requirement,
      suggestedExerciseId,
    });
    const shownExercise = getFoundationRowExercise({
      confirmedSelection,
      suggestedExerciseId,
    });
    const mainCompoundOptions = getMainCompoundOptions({
      currentExerciseId: confirmedSelection?.exerciseId,
      movementPattern: row.movementPattern,
      suggestedExerciseId,
    });

    return {
      accessibleLabel: getFoundationRowAccessibleLabel({
        bucket: row.bucket,
        exerciseName: shownExercise?.exerciseName,
        movementPattern: row.movementPattern,
        status,
      }),
      bucket: row.bucket,
      confirmedSelection,
      helperText: getMainCompoundMovementPatternHelperText(row.movementPattern),
      isCovered: row.isCovered,
      isMissing: status === "missing",
      mainCompoundOptions,
      metadata: getFoundationRowMetadata({
        optionCount: mainCompoundOptions.length,
        shownExerciseId: shownExercise?.exerciseId,
        status,
      }),
      movementPattern: row.movementPattern,
      movementPatternLabel: formatMovementPatternLabel(row.movementPattern),
      requirement: row.requirement,
      rotationPool:
        confirmedSelection === undefined
          ? null
          : getRotationPoolReadModel({
              currentRotationPool: rotationPoolByPattern.get(row.movementPattern),
              movementPattern: row.movementPattern,
              selectedMainCompoundExerciseIds,
              startingExerciseId: confirmedSelection.exerciseId,
            }),
      shownExercise,
      status,
      statusAccessibleLabel: getFoundationStatusAccessibleLabel(status),
      statusLabel: getFoundationStatusLabel(status),
      suggestedExerciseId,
    } satisfies ExerciseFoundationRowReadModel;
  });
  const suggestedRequiredPatternCount = rows.filter(
    (row) => row.requirement === "required" && row.suggestedExerciseId !== undefined,
  ).length;
  const accessoryReadModel = getAccessoryReadModel(weeklyRepTargets);

  return {
    accessoryExerciseIds: accessoryReadModel.exercises.map((exercise) => exercise.id),
    accessoryExercises: accessoryReadModel.exercises,
    canContinueToGenerate: coverage.canConfirmExercises,
    canShowOptionalAccessoriesSummary: hasConfirmedSelections && coverage.canConfirmExercises,
    coverage,
    guidance: getRecommendedGuidance(rows),
    hasConfirmedSelections,
    nextRequiredPattern: getNextMissingRequiredPattern(rows),
    normalizedSelections,
    optionalAccessoryCount: accessoryReadModel.optionalCount,
    recommendedAccessoryCount: accessoryReadModel.recommendedCount,
    rows,
    selectedMainCompoundExerciseIds,
    summary: hasConfirmedSelections
      ? getConfirmedCoverageSummary(coverage)
      : getSuggestedFoundationSummary({
          requiredPatternCount: coverage.requiredPatternCount,
          suggestedRequiredPatternCount,
        }),
  };
}

function getSuggestedFoundationExerciseId({
  exerciseSelectionPreferences,
  movementPattern,
  requirement,
}: {
  exerciseSelectionPreferences: ExerciseFoundationReadyBlueprint["exerciseSelectionPreferences"];
  movementPattern: CompoundCapableMovementPatternId;
  requirement: "recommended" | "required";
}): string | undefined {
  if (requirement === "recommended") {
    return undefined;
  }

  return (
    recommendMainCompoundSelection({
      exerciseSelectionPreferences,
      movementPattern,
    })?.exerciseId ?? undefined
  );
}

function getMainCompoundOptions({
  currentExerciseId,
  movementPattern,
  suggestedExerciseId,
}: {
  currentExerciseId: string | undefined;
  movementPattern: CompoundCapableMovementPatternId;
  suggestedExerciseId: string | undefined;
}): ReadonlyArray<ExerciseFoundationCompoundOption> {
  return getMainCompoundOptionList({
    getMetadata: (exercise) =>
      getPickerOptionMetadata({
        currentExerciseId,
        exerciseId: exercise.id,
        suggestedExerciseId,
      }),
    movementPattern,
  });
}

function getRotationPoolReadModel({
  currentRotationPool,
  movementPattern,
  selectedMainCompoundExerciseIds,
  startingExerciseId,
}: {
  currentRotationPool: MainCompoundRotationPool | undefined;
  movementPattern: CompoundCapableMovementPatternId;
  selectedMainCompoundExerciseIds: ReadonlySet<string>;
  startingExerciseId: string;
}): ExerciseFoundationRotationPoolReadModel {
  const options = getRotationPoolOptions({
    excludedExerciseIds: selectedMainCompoundExerciseIds,
    movementPattern,
    startingExerciseId,
  });
  const selectedExerciseIds =
    currentRotationPool?.exerciseIds ?? options.slice(0, 3).map((exercise) => exercise.id);
  const selectedExerciseIdSet = new Set(selectedExerciseIds);
  const selectedExerciseCount = options.filter((exercise) =>
    selectedExerciseIdSet.has(exercise.id),
  ).length;

  return {
    availableOptionCount: options.length,
    isSuggested: currentRotationPool === undefined,
    options,
    selectedExerciseCount,
    selectedExerciseIds,
    status: getRotationPoolSummaryStatus({
      isSuggested: currentRotationPool === undefined,
      selectedExerciseCount,
    }),
    startingExerciseId,
  };
}

function getRotationPoolOptions({
  excludedExerciseIds,
  movementPattern,
  startingExerciseId,
}: {
  excludedExerciseIds: ReadonlySet<string>;
  movementPattern: CompoundCapableMovementPatternId;
  startingExerciseId: string;
}): ReadonlyArray<ExerciseFoundationCompoundOption> {
  const startingExercise = getExerciseCatalogExercise(startingExerciseId);

  if (!startingExercise) {
    return [];
  }

  const startingPrimaryMuscleGroups = new Set(startingExercise.primaryMuscleGroups);

  return getMainCompoundOptions({
    currentExerciseId: undefined,
    movementPattern,
    suggestedExerciseId: undefined,
  })
    .filter((exercise) => {
      if (exercise.id === startingExerciseId || excludedExerciseIds.has(exercise.id)) {
        return false;
      }

      return exercise.primaryMuscleGroups.some((muscleGroup) =>
        startingPrimaryMuscleGroups.has(muscleGroup),
      );
    })
    .map((exercise) => ({
      ...exercise,
      metadata: "Same movement pattern and primary muscle group",
    }));
}

function getAccessoryReadModel(weeklyRepTargets: ReadonlyArray<WeeklyRepTarget>): {
  exercises: ReadonlyArray<ExerciseFoundationAccessoryExercise>;
  optionalCount: number;
  recommendedCount: number;
} {
  const enabledOptionalVolumeMuscleGroups = getEnabledOptionalVolumeMuscleGroups(weeklyRepTargets);
  const exercises = accessoryExercises.filter(
    (exercise) =>
      exercise.optionalVolumeMuscleGroup === undefined ||
      enabledOptionalVolumeMuscleGroups.has(exercise.optionalVolumeMuscleGroup),
  );

  return {
    exercises,
    optionalCount: exercises.filter((exercise) => exercise.group === "optional").length,
    recommendedCount: exercises.filter((exercise) => exercise.group === "recommended").length,
  };
}

function getEnabledOptionalVolumeMuscleGroups(
  weeklyRepTargets: ReadonlyArray<WeeklyRepTarget>,
): ReadonlySet<OptionalVolumeMuscleGroupId> {
  return new Set(
    weeklyRepTargets
      .filter(
        (
          weeklyRepTarget,
        ): weeklyRepTarget is WeeklyRepTarget & {
          muscleGroup: OptionalVolumeMuscleGroupId;
        } =>
          weeklyRepTarget.isEnabled &&
          (weeklyRepTarget.muscleGroup === "abs" || weeklyRepTarget.muscleGroup === "calves"),
      )
      .map((weeklyRepTarget) => weeklyRepTarget.muscleGroup),
  );
}

function getFoundationRowStatus({
  confirmedSelection,
  hasConfirmedSelections,
  requirement,
  suggestedExerciseId,
}: {
  confirmedSelection: MainCompoundSelection | undefined;
  hasConfirmedSelections: boolean;
  requirement: "recommended" | "required";
  suggestedExerciseId: string | undefined;
}): ExerciseFoundationRowStatus {
  if (confirmedSelection !== undefined) {
    return requirement === "required" ? "required" : "recommended";
  }

  if (hasConfirmedSelections && requirement === "required") {
    return "missing";
  }

  if (suggestedExerciseId !== undefined) {
    return "suggested";
  }

  return requirement === "required" ? "missing" : "recommended";
}

function getFoundationRowExercise({
  confirmedSelection,
  suggestedExerciseId,
}: {
  confirmedSelection: MainCompoundSelection | undefined;
  suggestedExerciseId: string | undefined;
}): { exerciseId: string; exerciseName: string } | null {
  if (confirmedSelection !== undefined) {
    return {
      exerciseId: confirmedSelection.exerciseId,
      exerciseName: getExerciseNameOrMissingCopy(
        confirmedSelection.exerciseId,
        confirmedSelection.movementPattern,
      ),
    };
  }

  if (suggestedExerciseId !== undefined) {
    const exercise = getExerciseCatalogExercise(suggestedExerciseId);

    return exercise
      ? {
          exerciseId: suggestedExerciseId,
          exerciseName: exercise.name,
        }
      : null;
  }

  return null;
}

function getExerciseNameOrMissingCopy(
  exerciseId: string,
  movementPattern: CompoundCapableMovementPatternId,
): string {
  return getExerciseCatalogExercise(exerciseId)?.name ?? getMissingFoundationCopy(movementPattern);
}

function getFoundationStatusLabel(status: ExerciseFoundationRowStatus): string {
  switch (status) {
    case "required":
      return "Required";
    case "missing":
      return "Missing";
    case "recommended":
      return "Recommended";
    case "suggested":
      return "Suggested";
  }
}

function getFoundationStatusAccessibleLabel(status: ExerciseFoundationRowStatus): string {
  switch (status) {
    case "required":
      return "Required movement pattern selected";
    case "missing":
      return "Required movement pattern missing";
    case "recommended":
      return "Recommended movement pattern not selected";
    case "suggested":
      return "Suggested exercise preview, not confirmed";
  }
}

function getFoundationRowAccessibleLabel({
  bucket,
  exerciseName,
  movementPattern,
  status,
}: {
  bucket: string;
  exerciseName: string | undefined;
  movementPattern: CompoundCapableMovementPatternId;
  status: ExerciseFoundationRowStatus;
}): string {
  const description =
    exerciseName ?? `${bucket} coverage missing: ${formatMovementPatternLabel(movementPattern)}.`;

  return `${formatMovementPatternLabel(movementPattern)}. ${getFoundationStatusAccessibleLabel(
    status,
  )}. ${description}`;
}

function getMissingFoundationCopy(_movementPattern: CompoundCapableMovementPatternId): string {
  return "No exercise selected yet.";
}

function getFoundationRowMetadata({
  optionCount,
  shownExerciseId,
  status,
}: {
  optionCount: number;
  shownExerciseId: string | undefined;
  status: ExerciseFoundationRowStatus;
}): string {
  const alternativeCount = shownExerciseId ? Math.max(optionCount - 1, 0) : optionCount;
  const prefix = status === "suggested" ? "Suggested" : "Main";
  const optionLabel = alternativeCount === 1 ? "option" : "options";

  return `${prefix} · ${alternativeCount} ${optionLabel}`;
}

function getPickerOptionMetadata({
  currentExerciseId,
  exerciseId,
  suggestedExerciseId,
}: {
  currentExerciseId: string | undefined;
  exerciseId: string;
  suggestedExerciseId: string | undefined;
}): string {
  if (currentExerciseId === exerciseId) {
    return "Current selection";
  }

  if (suggestedExerciseId === exerciseId) {
    return "Suggested, not confirmed";
  }

  return "Available main compound";
}

function getRotationPoolSummaryStatus({
  isSuggested,
  selectedExerciseCount,
}: {
  isSuggested: boolean;
  selectedExerciseCount: number;
}): string {
  if (selectedExerciseCount === 0) {
    return "No swaps";
  }

  const state = isSuggested ? "suggested" : "selected";

  return `${selectedExerciseCount} ${state}`;
}

function getSuggestedFoundationSummary({
  requiredPatternCount,
  suggestedRequiredPatternCount,
}: {
  requiredPatternCount: number;
  suggestedRequiredPatternCount: number;
}): string {
  if (suggestedRequiredPatternCount === requiredPatternCount) {
    return `${requiredPatternCount} suggested main compounds`;
  }

  return `${suggestedRequiredPatternCount} of ${requiredPatternCount} suggested main compounds`;
}

function getConfirmedCoverageSummary({
  coveredRequiredPatternCount,
  requiredPatternCount,
}: {
  coveredRequiredPatternCount: number;
  requiredPatternCount: number;
}): string {
  const missingRequiredCount = requiredPatternCount - coveredRequiredPatternCount;

  if (missingRequiredCount === 0) {
    return `${coveredRequiredPatternCount} of ${requiredPatternCount} main compounds selected`;
  }

  return `${coveredRequiredPatternCount} of ${requiredPatternCount} main compounds selected, ${missingRequiredCount} missing`;
}

function getNextMissingRequiredPattern(
  rows: ReadonlyArray<{
    isCovered: boolean;
    isMissing: boolean;
    movementPattern: CompoundCapableMovementPatternId;
    requirement: "recommended" | "required";
  }>,
): CompoundCapableMovementPatternId | null {
  return (
    rows.find((row) => row.requirement === "required" && !row.isCovered)?.movementPattern ?? null
  );
}

function getRecommendedGuidance(
  rows: ReadonlyArray<{
    isCovered: boolean;
    isMissing: boolean;
    movementPattern: CompoundCapableMovementPatternId;
    requirement: "recommended" | "required";
  }>,
): string | null {
  const nextMissingRequiredPattern = getNextMissingRequiredPattern(rows);

  if (nextMissingRequiredPattern !== null) {
    return getMissingRequiredGuidance(nextMissingRequiredPattern);
  }

  const missingRecommendedVerticalPush = rows.find(
    (row) =>
      row.movementPattern === "vertical_push" &&
      row.requirement === "recommended" &&
      !row.isCovered,
  );

  return missingRecommendedVerticalPush ? "Add Vertical push." : null;
}

function getMissingRequiredGuidance(
  movementPattern: CompoundCapableMovementPatternId,
): string | null {
  switch (movementPattern) {
    case "horizontal_push":
      return "Choose horizontal push next.";
    case "horizontal_pull":
      return "Choose horizontal pull next.";
    case "vertical_pull":
      return "Choose vertical pull next.";
    case "quad_dominant":
      return "Choose quad-dominant lift next.";
    case "hip_hamstring_dominant":
      return "Choose hip / hamstring lift next.";
    case "vertical_push":
      return "Choose vertical push next.";
  }
}
