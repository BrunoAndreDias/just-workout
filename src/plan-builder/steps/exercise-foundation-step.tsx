import { Link } from "@tanstack/react-router";
import {
  ArrowDownUp,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpDown,
  Check,
  CircleCheck,
  CircleX,
  Dumbbell,
  Lock,
  type LucideIcon,
  Plus,
  Search,
  Weight,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../../design-system/button";
import { cn } from "../../design-system/cn";
import { StepActions, StepPanel } from "../../design-system/step-screen";
import {
  type CompoundCapableMovementPatternId,
  type ExerciseCatalogExercise,
  getExerciseCatalogExercise,
  getExerciseCatalogExercisesByMovementPattern,
  isMainCompoundEligible,
} from "../exercise-catalog";
import type { MainCompoundRotationPool } from "../main-compound-rotation-pool";
import type { TrainingFrequencyDaysPerWeek } from "../plan-blueprint-types";
import { planBuilderPaths } from "../plan-builder-paths";
import type { TrainingSplitId } from "../training-split";
import type { OptionalVolumeMuscleGroupId, WeeklyRepTarget } from "../training-volume";
import {
  formatMovementPatternLabel,
  getWeeklyMovementCoverage,
  type MainCompoundSelection,
  normalizeMainCompoundSelections,
  type WeeklyMovementCoverageRow,
} from "../weekly-movement-coverage";
import "./exercise-foundation-step.css";

type ExerciseFoundationStepProps = {
  mainCompoundSelections: ReadonlyArray<MainCompoundSelection>;
  mainCompoundRotationPools: ReadonlyArray<MainCompoundRotationPool>;
  onContinueToGenerate: () => Promise<void>;
  onMainCompoundSelectionChange: (
    selection: Pick<MainCompoundSelection, "exerciseId" | "movementPattern">,
  ) => Promise<void>;
  onRotationPoolChange: (
    rotationPool: Pick<MainCompoundRotationPool, "exerciseIds" | "movementPattern">,
  ) => Promise<void>;
  split: TrainingSplitId;
  trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek;
  weeklyRepTargets: ReadonlyArray<WeeklyRepTarget>;
};

type FoundationRowStatus = "missing" | "recommended" | "required" | "suggested";

type SuggestedFoundationByPattern = Partial<Record<CompoundCapableMovementPatternId, string>>;

type MainCompoundPickerFilterId =
  | "all"
  | "barbell"
  | "beginner_friendly"
  | "bodyweight"
  | "dumbbells"
  | "joint_friendly"
  | "machine";

type MainCompoundPickerFilter = {
  id: MainCompoundPickerFilterId;
  label: string;
};

type AccessoryMuscleGroupFilterId =
  | "all"
  | "arms"
  | "calves"
  | "core"
  | "grip"
  | "hamstrings"
  | "hips"
  | "shoulders";

type AccessoryEquipmentFilterId =
  | "all"
  | "bodyweight"
  | "cable"
  | "dumbbells"
  | "loaded"
  | "machine";

type AccessoryBeginnerFilterId = "all" | "beginner_friendly";

type AccessoryExercise = {
  beginnerFriendly: boolean;
  equipment: AccessoryEquipmentFilterId;
  group: "optional" | "recommended";
  id: string;
  muscleGroup: AccessoryMuscleGroupFilterId;
  name: string;
  optionalVolumeMuscleGroup?: OptionalVolumeMuscleGroupId;
  rationale?: string;
};

const mainCompoundPickerFilters = [
  { id: "all", label: "Equipment" },
  { id: "barbell", label: "Barbell" },
  { id: "dumbbells", label: "Dumbbells" },
  { id: "machine", label: "Machine" },
  { id: "bodyweight", label: "Bodyweight" },
  { id: "beginner_friendly", label: "Beginner-friendly" },
  { id: "joint_friendly", label: "Joint-friendly" },
] as const satisfies ReadonlyArray<MainCompoundPickerFilter>;

const fullBodySuggestedFoundation: SuggestedFoundationByPattern = {
  hip_hamstring_dominant: "barbell-or-dumbbell-romanian-deadlifts",
  horizontal_pull: "bent-over-barbell-or-dumbbell-rows",
  horizontal_push: "flat-barbell-or-dumbbell-bench-press",
  quad_dominant: "barbell-or-dumbbell-squats",
  vertical_pull: "pull-ups",
};

const allPatternSuggestedFoundation: SuggestedFoundationByPattern = {
  ...fullBodySuggestedFoundation,
  vertical_push: "standing-overhead-barbell-or-dumbbell-press",
};

const suggestedFoundationBySplit = {
  "alternating-full-body-a-b": fullBodySuggestedFoundation,
  "full-body-2-day": fullBodySuggestedFoundation,
  "full-body-3-day": fullBodySuggestedFoundation,
  "rotating-push-pull-legs": allPatternSuggestedFoundation,
  "upper-lower-4-day": allPatternSuggestedFoundation,
  "upper-lower-full-body": allPatternSuggestedFoundation,
} as const satisfies Record<TrainingSplitId, SuggestedFoundationByPattern>;

const accessoryExercises: ReadonlyArray<AccessoryExercise> = [
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

const accessoryMuscleGroupFilters = [
  { id: "all", label: "Muscle group" },
  { id: "hamstrings", label: "Hamstrings" },
  { id: "shoulders", label: "Shoulders" },
  { id: "core", label: "Core" },
  { id: "arms", label: "Arms" },
  { id: "grip", label: "Grip" },
  { id: "calves", label: "Calves" },
  { id: "hips", label: "Hips" },
] as const;

const accessoryEquipmentFilters = [
  { id: "all", label: "Equipment" },
  { id: "dumbbells", label: "Dumbbells" },
  { id: "machine", label: "Machine" },
  { id: "bodyweight", label: "Bodyweight" },
  { id: "cable", label: "Cable" },
  { id: "loaded", label: "Loaded" },
] as const;

const accessoryBeginnerFilters = [
  { id: "all", label: "Any level" },
  { id: "beginner_friendly", label: "Beginner-friendly" },
] as const;

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

function getAvailableAccessoryExercises(
  weeklyRepTargets: ReadonlyArray<WeeklyRepTarget>,
): ReadonlyArray<AccessoryExercise> {
  const enabledOptionalVolumeMuscleGroups = getEnabledOptionalVolumeMuscleGroups(weeklyRepTargets);

  return accessoryExercises.filter(
    (exercise) =>
      exercise.optionalVolumeMuscleGroup === undefined ||
      enabledOptionalVolumeMuscleGroups.has(exercise.optionalVolumeMuscleGroup),
  );
}

function getAvailableAccessoryMuscleGroupFilters(
  exercises: ReadonlyArray<AccessoryExercise>,
): ReadonlyArray<{ id: AccessoryMuscleGroupFilterId; label: string }> {
  const availableMuscleGroupIds = new Set(exercises.map((exercise) => exercise.muscleGroup));

  return accessoryMuscleGroupFilters.filter(
    (filter) => filter.id === "all" || availableMuscleGroupIds.has(filter.id),
  );
}

export function ExerciseFoundationStep({
  mainCompoundSelections,
  mainCompoundRotationPools,
  onContinueToGenerate,
  onMainCompoundSelectionChange,
  onRotationPoolChange,
  split,
  trainingFrequencyDaysPerWeek,
  weeklyRepTargets,
}: ExerciseFoundationStepProps) {
  const [activePickerPattern, setActivePickerPattern] =
    useState<CompoundCapableMovementPatternId | null>(null);
  const [activeRotationPoolPattern, setActiveRotationPoolPattern] =
    useState<CompoundCapableMovementPatternId | null>(null);
  const [isAccessoryDrawerOpen, setIsAccessoryDrawerOpen] = useState(false);
  const [selectedAccessoryIds, setSelectedAccessoryIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const normalizedSelections = normalizeMainCompoundSelections(mainCompoundSelections);
  const hasConfirmedSelections = normalizedSelections.length > 0;
  const suggestedFoundation = suggestedFoundationBySplit[split];
  const coverage = getWeeklyMovementCoverage({
    mainCompoundSelections: normalizedSelections,
    split,
    trainingFrequencyDaysPerWeek,
  });
  const canContinueToGenerate = coverage.canConfirmExercises;
  const confirmedSelectionByPattern = new Map(
    normalizedSelections.map((selection) => [selection.movementPattern, selection]),
  );
  const selectedMainCompoundExerciseIds = new Set(
    normalizedSelections.map((selection) => selection.exerciseId),
  );
  const rotationPoolByPattern = new Map(
    mainCompoundRotationPools.map((pool) => [pool.movementPattern, pool]),
  );
  const recommendedGuidance = getRecommendedGuidance(coverage.rows);
  const nextRequiredPattern = getNextMissingRequiredPattern(coverage.rows);
  const canShowOptionalAccessoriesSummary = hasConfirmedSelections && coverage.canConfirmExercises;
  const availableAccessoryExercises = useMemo(
    () => getAvailableAccessoryExercises(weeklyRepTargets),
    [weeklyRepTargets],
  );
  const selectedAccessories = availableAccessoryExercises.filter((exercise) =>
    selectedAccessoryIds.has(exercise.id),
  );
  const selectedAccessoryCount = selectedAccessories.length;
  const recommendedAccessoryCount = availableAccessoryExercises.filter(
    (exercise) => exercise.group === "recommended",
  ).length;
  const optionalAccessoryCount = availableAccessoryExercises.filter(
    (exercise) => exercise.group === "optional",
  ).length;
  const suggestedRequiredPatternCount = coverage.rows.filter(
    (row) =>
      row.requirement === "required" && suggestedFoundation[row.movementPattern] !== undefined,
  ).length;
  const activePickerRow =
    activePickerPattern === null
      ? undefined
      : coverage.rows.find((row) => row.movementPattern === activePickerPattern);
  const activePickerConfirmedSelection =
    activePickerPattern === null ? undefined : confirmedSelectionByPattern.get(activePickerPattern);
  const activePickerSuggestedExerciseId =
    activePickerPattern === null ? undefined : suggestedFoundation[activePickerPattern];
  const activeRotationPoolSelection =
    activeRotationPoolPattern === null
      ? undefined
      : confirmedSelectionByPattern.get(activeRotationPoolPattern);
  const activeRotationPool =
    activeRotationPoolPattern === null
      ? undefined
      : rotationPoolByPattern.get(activeRotationPoolPattern);

  useEffect(() => {
    const availableAccessoryExerciseIds = new Set(
      availableAccessoryExercises.map((exercise) => exercise.id),
    );

    setSelectedAccessoryIds((currentAccessoryIds) => {
      const nextAccessoryIds = new Set(
        [...currentAccessoryIds].filter((accessoryId) =>
          availableAccessoryExerciseIds.has(accessoryId),
        ),
      );

      return nextAccessoryIds.size === currentAccessoryIds.size
        ? currentAccessoryIds
        : nextAccessoryIds;
    });
  }, [availableAccessoryExercises]);

  useEffect(() => {
    if (
      activePickerPattern === null &&
      activeRotationPoolPattern === null &&
      !isAccessoryDrawerOpen
    ) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActivePickerPattern(null);
        setActiveRotationPoolPattern(null);
        setIsAccessoryDrawerOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activePickerPattern, activeRotationPoolPattern, isAccessoryDrawerOpen]);

  async function handleMainCompoundSelect(
    exerciseId: string,
    movementPattern: CompoundCapableMovementPatternId,
  ) {
    await onMainCompoundSelectionChange({
      exerciseId,
      movementPattern,
    });
    setActivePickerPattern(null);
  }

  async function handleRotationPoolChange(
    movementPattern: CompoundCapableMovementPatternId,
    exerciseIds: ReadonlyArray<string>,
  ) {
    await onRotationPoolChange({
      exerciseIds,
      movementPattern,
    });
  }

  function handleAccessorySelectionChange(accessoryId: string, isSelected: boolean) {
    setSelectedAccessoryIds((currentAccessoryIds) => {
      const nextAccessoryIds = new Set(currentAccessoryIds);

      if (isSelected) {
        nextAccessoryIds.add(accessoryId);
      } else {
        nextAccessoryIds.delete(accessoryId);
      }

      return nextAccessoryIds;
    });
  }

  return (
    <div className="grid gap-6">
      <StepPanel aria-labelledby="exercise-foundation-title" className="exercise-foundation-panel">
        <div className="exercise-foundation-workspace">
          <div className="exercise-foundation-main">
            <div
              data-impeccable-variants="147b195f"
              data-impeccable-variant-count="3"
              style={{ display: "contents" }}
            >
              {/* impeccable-variants-start 147b195f */}
              {/* Original */}
              <div data-impeccable-variant="original">
                <section
                  aria-label="Exercise foundation status"
                  className="exercise-foundation-status"
                >
                  <span aria-hidden="true" className="exercise-foundation-status__icon">
                    <Check size={22} strokeWidth={2.4} />
                  </span>
                  <div>
                    <h3 className="sr-only" id="exercise-foundation-title">
                      Exercise foundation overview
                    </h3>
                    <p className="exercise-foundation-status__title">
                      {hasConfirmedSelections
                        ? getConfirmedCoverageSummary(coverage)
                        : getSuggestedFoundationSummary({
                            requiredPatternCount: coverage.requiredPatternCount,
                            suggestedRequiredPatternCount,
                          })}
                    </p>
                    {recommendedGuidance ? (
                      <p className="exercise-foundation-status__body">{recommendedGuidance}</p>
                    ) : null}
                  </div>
                </section>
              </div>
              {/* Variants: insert below this line */}
              {/* impeccable-variants-end 147b195f */}
            </div>

            <div className="exercise-foundation-tabbar">
              <span className="exercise-foundation-tabbar__active">Main compounds</span>
              <span
                className={cn(
                  "exercise-foundation-tabbar__locked",
                  canContinueToGenerate ? "exercise-foundation-tabbar__locked--ready" : null,
                )}
              >
                {canContinueToGenerate ? (
                  <CircleCheck aria-hidden="true" size={15} strokeWidth={2.2} />
                ) : (
                  <Lock aria-hidden="true" size={15} strokeWidth={2} />
                )}
                {canContinueToGenerate
                  ? "Rotation pools are ready. Edit them as future Training Block swaps."
                  : "Complete main compounds to unlock rotation pools."}
              </span>
            </div>

            <section aria-label="Main compound selections" className="exercise-foundation-card">
              <ul aria-label="Exercise foundation rows" className="exercise-foundation-list">
                {coverage.rows.map((row) => {
                  const confirmedSelection = confirmedSelectionByPattern.get(row.movementPattern);
                  const suggestedExerciseId = suggestedFoundation[row.movementPattern];
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
                  const helperText = getFoundationRowHelperText(row.movementPattern);
                  const optionPreview = getMainCompoundOptions(row.movementPattern);
                  const metadata = getFoundationRowMetadata({
                    optionCount: optionPreview.length,
                    shownExerciseId: shownExercise?.exerciseId,
                    status,
                  });
                  const isPickerOpen = activePickerPattern === row.movementPattern;

                  return (
                    <li
                      aria-label={getFoundationRowAccessibleLabel({
                        exerciseName: shownExercise?.exerciseName,
                        row,
                        status,
                      })}
                      className={cn(
                        "exercise-foundation-row",
                        status === "missing" ? "exercise-foundation-row--missing" : null,
                      )}
                      key={row.movementPattern}
                    >
                      <div className="exercise-foundation-row__grid">
                        <div className="exercise-foundation-row__pattern">
                          <span
                            aria-hidden="true"
                            className={cn(
                              "exercise-foundation-row__icon",
                              getFoundationIconClassName(row.movementPattern),
                            )}
                          >
                            <FoundationPatternIcon movementPattern={row.movementPattern} />
                          </span>
                          <div className="min-w-0">
                            <div className="exercise-foundation-row__heading">
                              <h4>{formatMovementPatternLabel(row.movementPattern)}</h4>
                              <span>{row.bucket}</span>
                            </div>
                            <p className="exercise-foundation-row__helper">{helperText}</p>
                          </div>
                        </div>

                        <div className="exercise-foundation-row__selection">
                          <p>
                            {shownExercise?.exerciseName ??
                              getMissingFoundationCopy(row.movementPattern)}
                          </p>
                          <span>{metadata}</span>
                        </div>

                        <div className="exercise-foundation-row__actions">
                          <span
                            aria-label={getFoundationStatusAccessibleLabel(status)}
                            className={cn(
                              "exercise-foundation-row__status",
                              getFoundationStatusClassName(status),
                            )}
                            role="status"
                          >
                            {getFoundationStatusLabel(status)}
                          </span>
                          <Button
                            aria-expanded={isPickerOpen}
                            aria-controls={
                              isPickerOpen
                                ? `main-compound-picker-${row.movementPattern}`
                                : undefined
                            }
                            onClick={() =>
                              setActivePickerPattern((currentPattern) =>
                                currentPattern === row.movementPattern ? null : row.movementPattern,
                              )
                            }
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            {confirmedSelection ? "Change" : "Choose"}
                          </Button>
                        </div>
                      </div>

                      {confirmedSelection ? (
                        <InlineRotationPoolEditor
                          movementPattern={row.movementPattern}
                          onChange={(exerciseIds) =>
                            handleRotationPoolChange(row.movementPattern, exerciseIds)
                          }
                          onEdit={() => {
                            setActivePickerPattern(null);
                            setActiveRotationPoolPattern(row.movementPattern);
                          }}
                          rotationPoolExerciseIds={
                            rotationPoolByPattern.get(row.movementPattern)?.exerciseIds
                          }
                          selectedMainCompoundExerciseIds={selectedMainCompoundExerciseIds}
                          startingExerciseId={confirmedSelection.exerciseId}
                        />
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>

            {!canContinueToGenerate ? <LockedRotationPoolSummary /> : null}
          </div>

          <ExerciseCoverageSummary
            coverage={coverage}
            hasConfirmedSelections={hasConfirmedSelections}
            isRotationPoolUnlocked={canContinueToGenerate}
            suggestedFoundation={suggestedFoundation}
          />
        </div>

        <div>
          {activePickerRow ? (
            <MainCompoundPicker
              currentExerciseId={activePickerConfirmedSelection?.exerciseId}
              id={`main-compound-picker-${activePickerRow.movementPattern}`}
              movementPattern={activePickerRow.movementPattern}
              onClose={() => setActivePickerPattern(null)}
              onSelect={handleMainCompoundSelect}
              suggestedExerciseId={activePickerSuggestedExerciseId}
            />
          ) : null}

          {activeRotationPoolPattern && activeRotationPoolSelection ? (
            <RotationPoolPicker
              currentExerciseIds={activeRotationPool?.exerciseIds}
              excludedExerciseIds={selectedMainCompoundExerciseIds}
              id={`rotation-pool-picker-${activeRotationPoolPattern}`}
              movementPattern={activeRotationPoolPattern}
              onChange={(exerciseIds) =>
                handleRotationPoolChange(activeRotationPoolPattern, exerciseIds)
              }
              onClose={() => setActiveRotationPoolPattern(null)}
              startingExerciseId={activeRotationPoolSelection.exerciseId}
            />
          ) : null}

          {canShowOptionalAccessoriesSummary ? (
            <IsolationExercisesSummary
              isDrawerOpen={isAccessoryDrawerOpen}
              onConfigure={() => {
                setActivePickerPattern(null);
                setActiveRotationPoolPattern(null);
                setIsAccessoryDrawerOpen(true);
              }}
              onRemove={(accessoryId) => handleAccessorySelectionChange(accessoryId, false)}
              optionalAccessoryCount={optionalAccessoryCount}
              recommendedAccessoryCount={recommendedAccessoryCount}
              selectedAccessories={selectedAccessories}
              selectedExerciseCount={selectedAccessoryCount}
            />
          ) : (
            <IsolationExercisesUnavailableSummary />
          )}

          <StepActions>
            <Button asChild size="step" variant="outline">
              <Link to={planBuilderPaths.volume}>
                <ArrowLeft aria-hidden="true" size={20} strokeWidth={1.9} />
                Back to Volume
              </Link>
            </Button>
            <Button
              disabled={!canContinueToGenerate}
              onClick={() => {
                void onContinueToGenerate();
              }}
              size="step"
              type="button"
              variant="builderPrimary"
            >
              {canContinueToGenerate
                ? "Continue to Generate"
                : getBlockedGenerateActionLabel(nextRequiredPattern)}
              <ArrowRight aria-hidden="true" size={20} strokeWidth={1.9} />
            </Button>
          </StepActions>
        </div>
      </StepPanel>

      {isAccessoryDrawerOpen ? (
        <IsolationExercisesDrawer
          accessoryExercises={availableAccessoryExercises}
          onClose={() => setIsAccessoryDrawerOpen(false)}
          onSelectionChange={handleAccessorySelectionChange}
          selectedAccessoryIds={selectedAccessoryIds}
        />
      ) : null}
    </div>
  );
}

function InlineRotationPoolEditor({
  movementPattern,
  onChange,
  onEdit,
  rotationPoolExerciseIds,
  selectedMainCompoundExerciseIds,
  startingExerciseId,
}: {
  movementPattern: CompoundCapableMovementPatternId;
  onChange: (exerciseIds: ReadonlyArray<string>) => Promise<void>;
  onEdit: () => void;
  rotationPoolExerciseIds: ReadonlyArray<string> | undefined;
  selectedMainCompoundExerciseIds: ReadonlySet<string>;
  startingExerciseId: string;
}) {
  const defaultRotationPool = getRotationPoolOptions({
    excludedExerciseIds: selectedMainCompoundExerciseIds,
    movementPattern,
    startingExerciseId,
  })
    .slice(0, 3)
    .map((exercise) => exercise.id);
  const selectedExerciseIds = rotationPoolExerciseIds ?? defaultRotationPool;
  const selectedExerciseIdSet = new Set(selectedExerciseIds);
  const rotationPool = getRotationPoolOptions({
    excludedExerciseIds: selectedMainCompoundExerciseIds,
    movementPattern,
    startingExerciseId,
  }).filter((exercise) => selectedExerciseIdSet.has(exercise.id));
  const movementPatternLabel = formatMovementPatternLabel(movementPattern);
  const availableOptionCount = getRotationPoolOptions({
    excludedExerciseIds: selectedMainCompoundExerciseIds,
    movementPattern,
    startingExerciseId,
  }).length;

  return (
    <div className="rotation-pool-inline-preview">
      <div className="rotation-pool-inline-preview__header">
        <span className="rotation-pool-inline-preview__label">Rotation pool</span>
        <span className="rotation-pool-inline-preview__status">{rotationPool.length} selected</span>
      </div>
      {rotationPool.length > 0 ? (
        <ul
          aria-label={`${movementPatternLabel} rotation pool compound exercises`}
          className="rotation-pool-chip-list"
        >
          {rotationPool.map((exercise) => (
            <li className="rotation-pool-chip" key={exercise.id}>
              <span>{exercise.name}</span>
              <button
                aria-label={`Remove ${exercise.name} from ${movementPatternLabel} rotation pool`}
                className="rotation-pool-chip__remove"
                onClick={() => {
                  void onChange(
                    selectedExerciseIds.filter((exerciseId) => exerciseId !== exercise.id),
                  );
                }}
                type="button"
              >
                <X aria-hidden="true" size={14} strokeWidth={2.2} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rotation-pool-inline-preview__empty">No rotation exercises selected yet.</p>
      )}
      <p className="rotation-pool-inline-preview__note">
        After a 6-week Training Block, these can replace the main compound for the same movement and
        muscles.
      </p>
      <div className="rotation-pool-inline-preview__actions">
        <Button
          disabled={availableOptionCount === 0}
          onClick={onEdit}
          size="sm"
          type="button"
          variant="outline"
        >
          <Plus aria-hidden="true" size={16} strokeWidth={2} />
          {rotationPool.length > 0 ? "Edit pool" : "Add exercises"}
        </Button>
      </div>
    </div>
  );
}

function ExerciseCoverageSummary({
  coverage,
  hasConfirmedSelections,
  isRotationPoolUnlocked,
  suggestedFoundation,
}: {
  coverage: ReturnType<typeof getWeeklyMovementCoverage>;
  hasConfirmedSelections: boolean;
  isRotationPoolUnlocked: boolean;
  suggestedFoundation: SuggestedFoundationByPattern;
}) {
  const requiredRows = coverage.rows.filter((row) => row.requirement === "required");
  const recommendedRows = coverage.rows.filter((row) => row.requirement === "recommended");
  const requiredCoveredCount = requiredRows.filter((row) => row.isCovered).length;
  const recommendedCoveredCount = recommendedRows.filter(
    (row) => row.isCovered || (!hasConfirmedSelections && suggestedFoundation[row.movementPattern]),
  );

  return (
    <aside aria-label="Coverage summary" className="exercise-coverage-summary">
      <h3>Coverage summary</h3>
      <ExerciseCoverageSummaryGroup
        rows={requiredRows}
        selectedCount={requiredCoveredCount}
        suggestedFoundation={suggestedFoundation}
        title={`Required (${requiredRows.length})`}
      />
      {recommendedRows.length > 0 ? (
        <ExerciseCoverageSummaryGroup
          rows={recommendedRows}
          selectedCount={recommendedCoveredCount.length}
          suggestedFoundation={suggestedFoundation}
          title={`Recommended (${recommendedRows.length})`}
        />
      ) : null}
      <p className="exercise-coverage-summary__note">
        {isRotationPoolUnlocked
          ? "Rotation pools are available for each selected compound and can be proposed after the next Training Block."
          : "Complete the missing required pattern to unlock rotation pools and finish this step."}
      </p>
    </aside>
  );
}

function ExerciseCoverageSummaryGroup({
  rows,
  selectedCount,
  suggestedFoundation,
  title,
}: {
  rows: ReadonlyArray<WeeklyMovementCoverageRow>;
  selectedCount: number;
  suggestedFoundation: SuggestedFoundationByPattern;
  title: string;
}) {
  return (
    <section className="exercise-coverage-summary__group">
      <p className="exercise-coverage-summary__group-title">{title}</p>
      <ul className="exercise-coverage-summary__list">
        {rows.map((row) => {
          const isSuggested =
            !row.isCovered && suggestedFoundation[row.movementPattern] !== undefined;
          const isCovered = row.isCovered || isSuggested;

          return (
            <li className="exercise-coverage-summary__row" key={row.movementPattern}>
              <span
                aria-hidden="true"
                className={cn(
                  "exercise-coverage-summary__state",
                  isCovered
                    ? "exercise-coverage-summary__state--covered"
                    : "exercise-coverage-summary__state--missing",
                )}
              >
                {isCovered ? (
                  <CircleCheck size={15} strokeWidth={2.4} />
                ) : (
                  <CircleX size={15} strokeWidth={2.4} />
                )}
              </span>
              <span>
                <span className="exercise-coverage-summary__label">
                  {formatMovementPatternLabel(row.movementPattern)}
                </span>
                <span
                  className={cn(
                    "exercise-coverage-summary__meta",
                    !isCovered ? "exercise-coverage-summary__meta--missing" : null,
                  )}
                >
                  {isCovered ? "Selected" : "Missing"}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
      <p className="sr-only">
        {selectedCount} of {rows.length} patterns selected in {title}.
      </p>
    </section>
  );
}

function LockedRotationPoolSummary() {
  return (
    <section aria-label="Rotation pools locked" className="exercise-rotation-locked">
      <span aria-hidden="true" className="exercise-rotation-locked__icon">
        <Lock size={21} strokeWidth={2.2} />
      </span>
      <div>
        <h3>Next: Rotation pools</h3>
        <p>
          Unlock after all required main compounds are selected. Rotation pools let you save future
          replacements for each movement pattern.
        </p>
      </div>
    </section>
  );
}

function getRotationPoolOptions({
  excludedExerciseIds,
  movementPattern,
  startingExerciseId,
}: {
  excludedExerciseIds: ReadonlySet<string>;
  movementPattern: CompoundCapableMovementPatternId;
  startingExerciseId: string;
}): ReadonlyArray<ExerciseCatalogExercise & { role: "compound" }> {
  const startingExercise = getExerciseCatalogExercise(startingExerciseId);

  if (!startingExercise) {
    return [];
  }

  const startingPrimaryMuscleGroups = new Set(startingExercise.primaryMuscleGroups);

  return getMainCompoundOptions(movementPattern).filter((exercise) => {
    if (exercise.id === startingExerciseId || excludedExerciseIds.has(exercise.id)) {
      return false;
    }

    return exercise.primaryMuscleGroups.some((muscleGroup) =>
      startingPrimaryMuscleGroups.has(muscleGroup),
    );
  });
}

function IsolationExercisesSummary({
  isDrawerOpen,
  onConfigure,
  onRemove,
  optionalAccessoryCount,
  recommendedAccessoryCount,
  selectedAccessories,
  selectedExerciseCount,
}: {
  isDrawerOpen: boolean;
  onConfigure: () => void;
  onRemove: (accessoryId: string) => void;
  optionalAccessoryCount: number;
  recommendedAccessoryCount: number;
  selectedAccessories: ReadonlyArray<AccessoryExercise>;
  selectedExerciseCount: number;
}) {
  return (
    <section aria-label="Isolation exercises summary" className="exercise-accessories-summary">
      <div className="exercise-accessories-summary__header">
        <div className="min-w-0">
          <h3 className="text-sm font-black text-stone-950">Isolation exercises</h3>
          <p className="mt-1 text-sm text-stone-600">
            Add targeted isolation work if you want more direct muscle coverage.
          </p>
          <p className="mt-2 text-sm font-semibold text-stone-700">
            {selectedExerciseCount > 0
              ? `${selectedExerciseCount} selected · ${recommendedAccessoryCount} recommended · ${optionalAccessoryCount} more available`
              : `${recommendedAccessoryCount} recommended · ${optionalAccessoryCount} more available`}
          </p>
        </div>
        <Button
          aria-controls={isDrawerOpen ? "optional-accessories-drawer" : undefined}
          aria-expanded={isDrawerOpen}
          onClick={onConfigure}
          size="sm"
          type="button"
          variant="outline"
        >
          <Plus aria-hidden="true" size={16} strokeWidth={2} />
          {selectedExerciseCount > 0 ? "Edit isolation exercises" : "Add isolation exercises"}
        </Button>
      </div>
      {selectedAccessories.length > 0 ? (
        <ul aria-label="Selected isolation exercises" className="exercise-accessories-selected">
          {selectedAccessories.map((exercise) => (
            <li className="exercise-accessories-selected__item" key={exercise.id}>
              <span className="exercise-accessories-selected__name">{exercise.name}</span>
              <span className="exercise-accessories-selected__meta">
                {getAccessoryFilterLabel(accessoryMuscleGroupFilters, exercise.muscleGroup)}
              </span>
              <button
                aria-label={`Remove ${exercise.name} from isolation exercises`}
                className="exercise-accessories-selected__remove"
                onClick={() => onRemove(exercise.id)}
                type="button"
              >
                <X aria-hidden="true" size={14} strokeWidth={2.2} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="exercise-accessories-summary__empty">No isolation exercises selected yet.</p>
      )}
    </section>
  );
}

function IsolationExercisesUnavailableSummary() {
  return (
    <section
      aria-label="Isolation exercises availability"
      className="exercise-accessories-summary exercise-accessories-summary--muted"
    >
      <p className="text-sm font-semibold text-stone-600">
        Isolation exercises · available after main compounds are confirmed
      </p>
    </section>
  );
}

function IsolationExercisesDrawer({
  accessoryExercises,
  onClose,
  onSelectionChange,
  selectedAccessoryIds,
}: {
  accessoryExercises: ReadonlyArray<AccessoryExercise>;
  onClose: () => void;
  onSelectionChange: (accessoryId: string, isSelected: boolean) => void;
  selectedAccessoryIds: ReadonlySet<string>;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMuscleGroupFilterId, setActiveMuscleGroupFilterId] =
    useState<AccessoryMuscleGroupFilterId>("all");
  const [activeEquipmentFilterId, setActiveEquipmentFilterId] =
    useState<AccessoryEquipmentFilterId>("all");
  const [activeBeginnerFilterId, setActiveBeginnerFilterId] =
    useState<AccessoryBeginnerFilterId>("all");
  const titleId = "optional-accessories-drawer-title";
  const availableMuscleGroupFilters = useMemo(
    () => getAvailableAccessoryMuscleGroupFilters(accessoryExercises),
    [accessoryExercises],
  );

  useEffect(() => {
    if (availableMuscleGroupFilters.some((filter) => filter.id === activeMuscleGroupFilterId)) {
      return;
    }

    setActiveMuscleGroupFilterId("all");
  }, [activeMuscleGroupFilterId, availableMuscleGroupFilters]);

  const filteredAccessories = useMemo(
    () =>
      accessoryExercises.filter((exercise) => {
        const normalizedSearchQuery = searchQuery.trim().toLowerCase();
        const matchesSearch =
          normalizedSearchQuery.length === 0 ||
          exercise.name.toLowerCase().includes(normalizedSearchQuery) ||
          exercise.id.includes(normalizedSearchQuery.replace(/\s+/g, "-")) ||
          (exercise.rationale?.toLowerCase().includes(normalizedSearchQuery) ?? false);
        const matchesMuscleGroup =
          activeMuscleGroupFilterId === "all" || exercise.muscleGroup === activeMuscleGroupFilterId;
        const matchesEquipment =
          activeEquipmentFilterId === "all" || exercise.equipment === activeEquipmentFilterId;
        const matchesBeginner = activeBeginnerFilterId === "all" || exercise.beginnerFriendly;

        return matchesSearch && matchesMuscleGroup && matchesEquipment && matchesBeginner;
      }),
    [
      accessoryExercises,
      activeBeginnerFilterId,
      activeEquipmentFilterId,
      activeMuscleGroupFilterId,
      searchQuery,
    ],
  );
  const recommendedAccessories = filteredAccessories.filter(
    (exercise) => exercise.group === "recommended",
  );
  const optionalAccessories = filteredAccessories.filter(
    (exercise) => exercise.group === "optional",
  );

  return (
    <div className="main-compound-drawer-shell">
      <button
        aria-label="Close isolation exercises"
        className="main-compound-drawer-backdrop"
        onClick={onClose}
        type="button"
      />
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className="main-compound-drawer"
        id="optional-accessories-drawer"
        role="dialog"
      >
        <div className="main-compound-drawer__header">
          <div className="main-compound-drawer__title-row">
            <h3 className="main-compound-drawer__title" id={titleId}>
              Configure isolation exercises
            </h3>
            <Button
              aria-label="Close isolation exercises"
              onClick={onClose}
              size="sm"
              type="button"
              variant="ghost"
            >
              <X aria-hidden="true" size={18} strokeWidth={2} />
            </Button>
          </div>
          <p className="main-compound-drawer__helper">
            Isolation exercises can add direct work, but they do not count toward required main
            compound coverage.
          </p>
        </div>

        <div className="main-compound-drawer__controls">
          <label className="main-compound-drawer__search">
            <Search aria-hidden="true" size={18} strokeWidth={2} />
            <span className="sr-only">Search isolation exercises</span>
            <input
              onChange={(event) => setSearchQuery(event.currentTarget.value)}
              placeholder="Search isolation exercises..."
              type="search"
              value={searchQuery}
            />
          </label>
          <div className="optional-accessories-drawer__filter-stack">
            <AccessoryFilterGroup
              activeFilterId={activeMuscleGroupFilterId}
              filters={availableMuscleGroupFilters}
              legend="Muscle group"
              onFilterChange={setActiveMuscleGroupFilterId}
            />
            <AccessoryFilterGroup
              activeFilterId={activeEquipmentFilterId}
              filters={accessoryEquipmentFilters}
              legend="Equipment"
              onFilterChange={setActiveEquipmentFilterId}
            />
            <AccessoryFilterGroup
              activeFilterId={activeBeginnerFilterId}
              filters={accessoryBeginnerFilters}
              legend="Beginner-friendly"
              onFilterChange={setActiveBeginnerFilterId}
            />
          </div>
        </div>

        <div className="main-compound-drawer__options optional-accessories-drawer__options">
          <AccessoryExerciseGroup
            exercises={recommendedAccessories}
            groupLabel="Recommended"
            onSelectionChange={onSelectionChange}
            selectedAccessoryIds={selectedAccessoryIds}
          />
          <AccessoryExerciseGroup
            exercises={optionalAccessories}
            groupLabel="Additional"
            onSelectionChange={onSelectionChange}
            selectedAccessoryIds={selectedAccessoryIds}
          />
          {filteredAccessories.length === 0 ? (
            <p className="main-compound-drawer__empty">
              No isolation exercises match the current search and filters.
            </p>
          ) : null}
        </div>

        <div className="main-compound-drawer__footer">
          <p>
            Isolation exercises are non-blocking. Continue to Generate only depends on required main
            compound coverage.
          </p>
        </div>
      </section>
    </div>
  );
}

function AccessoryFilterGroup<TFilterId extends string>({
  activeFilterId,
  filters,
  legend,
  onFilterChange,
}: {
  activeFilterId: TFilterId;
  filters: ReadonlyArray<{ id: TFilterId; label: string }>;
  legend: string;
  onFilterChange: (filterId: TFilterId) => void;
}) {
  return (
    <fieldset className="main-compound-drawer__filters">
      <legend className="optional-accessories-drawer__filter-legend">{legend}</legend>
      {filters.map((filter) => {
        const isActive = activeFilterId === filter.id;

        return (
          <button
            aria-pressed={isActive}
            className={cn("main-compound-drawer__filter", isActive && "is-active")}
            key={filter.id}
            onClick={() => onFilterChange(filter.id)}
            type="button"
          >
            {filter.label}
          </button>
        );
      })}
    </fieldset>
  );
}

function AccessoryExerciseGroup({
  exercises,
  groupLabel,
  onSelectionChange,
  selectedAccessoryIds,
}: {
  exercises: ReadonlyArray<AccessoryExercise>;
  groupLabel: "Additional" | "Recommended";
  onSelectionChange: (accessoryId: string, isSelected: boolean) => void;
  selectedAccessoryIds: ReadonlySet<string>;
}) {
  if (exercises.length === 0) {
    return null;
  }

  return (
    <section
      aria-label={`${groupLabel} isolation exercises`}
      className="optional-accessories-drawer__group"
    >
      <h4 className="optional-accessories-drawer__group-title">{groupLabel}</h4>
      <div className="optional-accessories-drawer__group-options">
        {exercises.map((exercise) => {
          const isSelected = selectedAccessoryIds.has(exercise.id);

          return (
            <label
              className={cn(
                "main-compound-drawer__option optional-accessories-drawer__option",
                isSelected && "is-selected",
              )}
              key={exercise.id}
            >
              <input
                checked={isSelected}
                name={`optional-accessory-${exercise.id}`}
                onChange={(event) => onSelectionChange(exercise.id, event.currentTarget.checked)}
                type="checkbox"
              />
              <span
                aria-hidden="true"
                className="main-compound-drawer__option-icon optional-accessories-drawer__option-icon"
              >
                <Dumbbell size={18} strokeWidth={2} />
              </span>
              <span className="main-compound-drawer__option-copy">
                <span className="main-compound-drawer__option-name">{exercise.name}</span>
                <span className="main-compound-drawer__option-meta">
                  {exercise.rationale ?? "Direct isolation option"}
                </span>
              </span>
              <span className="main-compound-drawer__option-tags" aria-hidden="true">
                <span className="main-compound-drawer__tag">
                  {getAccessoryFilterLabel(accessoryMuscleGroupFilters, exercise.muscleGroup)}
                </span>
                <span className="main-compound-drawer__tag">
                  {getAccessoryFilterLabel(accessoryEquipmentFilters, exercise.equipment)}
                </span>
              </span>
              <span className="main-compound-drawer__option-state" aria-hidden="true">
                {isSelected ? (
                  <Check size={16} strokeWidth={2.4} />
                ) : (
                  <Plus size={14} strokeWidth={2.2} />
                )}
              </span>
              <span className="optional-accessories-drawer__option-action" aria-hidden="true">
                {isSelected ? "Added" : "Add"}
              </span>
            </label>
          );
        })}
      </div>
    </section>
  );
}

function MainCompoundPicker({
  currentExerciseId,
  id,
  movementPattern,
  onClose,
  onSelect,
  suggestedExerciseId,
}: {
  currentExerciseId: string | undefined;
  id: string;
  movementPattern: CompoundCapableMovementPatternId;
  onClose: () => void;
  onSelect: (
    exerciseId: string,
    movementPattern: CompoundCapableMovementPatternId,
  ) => Promise<void>;
  suggestedExerciseId: string | undefined;
}) {
  const options = getMainCompoundOptions(movementPattern);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilterId, setActiveFilterId] = useState<MainCompoundPickerFilterId>("all");
  const titleId = `${id}-title`;
  const movementPatternLabel = formatMovementPatternLabel(movementPattern);
  const searchMovementPatternLabel = movementPatternLabel.toLowerCase();
  const formattedMovementPatternTitle = toTitleCase(movementPatternLabel);
  const filteredOptions = useMemo(
    () =>
      options.filter((exercise) => {
        const normalizedSearchQuery = searchQuery.trim().toLowerCase();
        const matchesSearch =
          normalizedSearchQuery.length === 0 ||
          exercise.name.toLowerCase().includes(normalizedSearchQuery) ||
          exercise.id.includes(normalizedSearchQuery.replace(/\s+/g, "-"));
        const matchesFilter =
          activeFilterId === "all" || getPickerOptionFilterIds(exercise).includes(activeFilterId);

        return matchesSearch && matchesFilter;
      }),
    [activeFilterId, options, searchQuery],
  );

  return (
    <div className="main-compound-drawer-shell">
      <button
        aria-label="Close main compound picker"
        className="main-compound-drawer-backdrop"
        onClick={onClose}
        type="button"
      />
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className="main-compound-drawer"
        id={id}
        role="dialog"
      >
        <div className="main-compound-drawer__header">
          <div className="main-compound-drawer__title-row">
            <h3 className="main-compound-drawer__title" id={titleId}>
              Choose your main {formattedMovementPatternTitle}
            </h3>
            <Button
              aria-label="Close main compound picker"
              onClick={onClose}
              size="sm"
              type="button"
              variant="ghost"
            >
              <X aria-hidden="true" size={18} strokeWidth={2} />
            </Button>
          </div>
          <p className="main-compound-drawer__helper">
            Pick one compound that will count toward this movement pattern.
          </p>
        </div>

        <div className="main-compound-drawer__controls">
          <label className="main-compound-drawer__search">
            <Search aria-hidden="true" size={18} strokeWidth={2} />
            <span className="sr-only">Search {movementPatternLabel} exercises</span>
            <input
              onChange={(event) => setSearchQuery(event.currentTarget.value)}
              placeholder={`Search ${searchMovementPatternLabel} exercises...`}
              type="search"
              value={searchQuery}
            />
          </label>
          <fieldset className="main-compound-drawer__filters">
            <legend className="sr-only">Main compound filters</legend>
            {mainCompoundPickerFilters.map((filter) => {
              const isActive = activeFilterId === filter.id;

              return (
                <button
                  aria-pressed={isActive}
                  className={cn("main-compound-drawer__filter", isActive && "is-active")}
                  key={filter.id}
                  onClick={() => setActiveFilterId(filter.id)}
                  type="button"
                >
                  {filter.label}
                </button>
              );
            })}
          </fieldset>
        </div>

        <div
          aria-label={`${movementPatternLabel} main compound options`}
          className="main-compound-drawer__options"
          role="radiogroup"
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((exercise) => {
              const isCurrentSelection = currentExerciseId === exercise.id;
              const filterTags = getPickerOptionFilterTags(exercise);

              return (
                <label
                  className={cn(
                    "main-compound-drawer__option",
                    isCurrentSelection && "is-selected",
                  )}
                  key={exercise.id}
                >
                  <input
                    checked={isCurrentSelection}
                    name={`main-compound-${movementPattern}`}
                    onChange={() => {
                      void onSelect(exercise.id, movementPattern);
                    }}
                    type="radio"
                  />
                  <span
                    aria-hidden="true"
                    className={cn(
                      "main-compound-drawer__option-icon",
                      getFoundationIconClassName(movementPattern),
                    )}
                  >
                    <FoundationPatternIcon movementPattern={movementPattern} />
                  </span>
                  <span className="main-compound-drawer__option-copy">
                    <span className="main-compound-drawer__option-name">{exercise.name}</span>
                    <span className="main-compound-drawer__option-meta">
                      {getPickerOptionMetadata({
                        currentExerciseId,
                        exerciseId: exercise.id,
                        suggestedExerciseId,
                      })}
                    </span>
                  </span>
                  <span className="main-compound-drawer__option-tags" aria-hidden="true">
                    {filterTags.map((tag) => (
                      <span className="main-compound-drawer__tag" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </span>
                  <span className="main-compound-drawer__option-state" aria-hidden="true">
                    {isCurrentSelection ? <Check size={16} strokeWidth={2.4} /> : null}
                  </span>
                </label>
              );
            })
          ) : (
            <p className="main-compound-drawer__empty">
              No exercises match the current search and filters.
            </p>
          )}
        </div>

        <div className="main-compound-drawer__footer">
          <p>
            This updates the main compound selection only. Exercises remain unconfirmed until the
            required foundation is complete.
          </p>
        </div>
      </section>
    </div>
  );
}

function RotationPoolPicker({
  currentExerciseIds,
  excludedExerciseIds,
  id,
  movementPattern,
  onChange,
  onClose,
  startingExerciseId,
}: {
  currentExerciseIds: ReadonlyArray<string> | undefined;
  excludedExerciseIds: ReadonlySet<string>;
  id: string;
  movementPattern: CompoundCapableMovementPatternId;
  onChange: (exerciseIds: ReadonlyArray<string>) => Promise<void>;
  onClose: () => void;
  startingExerciseId: string;
}) {
  const options = getRotationPoolOptions({
    excludedExerciseIds,
    movementPattern,
    startingExerciseId,
  });
  const defaultExerciseIds = options.slice(0, 3).map((exercise) => exercise.id);
  const selectedExerciseIds = currentExerciseIds ?? defaultExerciseIds;
  const selectedExerciseIdSet = new Set(selectedExerciseIds);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilterId, setActiveFilterId] = useState<MainCompoundPickerFilterId>("all");
  const titleId = `${id}-title`;
  const movementPatternLabel = formatMovementPatternLabel(movementPattern);
  const searchMovementPatternLabel = movementPatternLabel.toLowerCase();
  const formattedMovementPatternTitle = toTitleCase(movementPatternLabel);
  const filteredOptions = useMemo(
    () =>
      options.filter((exercise) => {
        const normalizedSearchQuery = searchQuery.trim().toLowerCase();
        const matchesSearch =
          normalizedSearchQuery.length === 0 ||
          exercise.name.toLowerCase().includes(normalizedSearchQuery) ||
          exercise.id.includes(normalizedSearchQuery.replace(/\s+/g, "-"));
        const matchesFilter =
          activeFilterId === "all" || getPickerOptionFilterIds(exercise).includes(activeFilterId);

        return matchesSearch && matchesFilter;
      }),
    [activeFilterId, options, searchQuery],
  );

  function getNextExerciseIds(exerciseId: string, isSelected: boolean) {
    if (isSelected) {
      return selectedExerciseIds.filter((selectedExerciseId) => selectedExerciseId !== exerciseId);
    }

    return [...selectedExerciseIds, exerciseId];
  }

  return (
    <div className="main-compound-drawer-shell">
      <button
        aria-label="Close rotation pool picker"
        className="main-compound-drawer-backdrop"
        onClick={onClose}
        type="button"
      />
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className="main-compound-drawer"
        id={id}
        role="dialog"
      >
        <div className="main-compound-drawer__header">
          <div className="main-compound-drawer__title-row">
            <h3 className="main-compound-drawer__title" id={titleId}>
              Edit {formattedMovementPatternTitle} rotation pool
            </h3>
            <Button
              aria-label="Close rotation pool picker"
              onClick={onClose}
              size="sm"
              type="button"
              variant="ghost"
            >
              <X aria-hidden="true" size={18} strokeWidth={2} />
            </Button>
          </div>
          <p className="main-compound-drawer__helper">
            Choose alternative compounds for the next Training Block. Main compound exercises are
            excluded from this list.
          </p>
        </div>

        <div className="main-compound-drawer__controls">
          <label className="main-compound-drawer__search">
            <Search aria-hidden="true" size={18} strokeWidth={2} />
            <span className="sr-only">Search {movementPatternLabel} rotation pool exercises</span>
            <input
              onChange={(event) => setSearchQuery(event.currentTarget.value)}
              placeholder={`Search ${searchMovementPatternLabel} alternatives...`}
              type="search"
              value={searchQuery}
            />
          </label>
          <fieldset className="main-compound-drawer__filters">
            <legend className="sr-only">Rotation pool filters</legend>
            {mainCompoundPickerFilters.map((filter) => {
              const isActive = activeFilterId === filter.id;

              return (
                <button
                  aria-pressed={isActive}
                  className={cn("main-compound-drawer__filter", isActive && "is-active")}
                  key={filter.id}
                  onClick={() => setActiveFilterId(filter.id)}
                  type="button"
                >
                  {filter.label}
                </button>
              );
            })}
          </fieldset>
        </div>

        <fieldset className="main-compound-drawer__options main-compound-drawer__options-fieldset">
          <legend className="sr-only">{movementPatternLabel} rotation pool compound options</legend>
          {filteredOptions.length > 0 ? (
            filteredOptions.map((exercise) => {
              const isSelected = selectedExerciseIdSet.has(exercise.id);
              const filterTags = getPickerOptionFilterTags(exercise);

              return (
                <label
                  className={cn("main-compound-drawer__option", isSelected && "is-selected")}
                  key={exercise.id}
                >
                  <input
                    checked={isSelected}
                    name={`rotation-pool-${movementPattern}`}
                    onChange={() => {
                      void onChange(getNextExerciseIds(exercise.id, isSelected));
                    }}
                    type="checkbox"
                  />
                  <span
                    aria-hidden="true"
                    className={cn(
                      "main-compound-drawer__option-icon",
                      getFoundationIconClassName(movementPattern),
                    )}
                  >
                    <FoundationPatternIcon movementPattern={movementPattern} />
                  </span>
                  <span className="main-compound-drawer__option-copy">
                    <span className="main-compound-drawer__option-name">{exercise.name}</span>
                    <span className="main-compound-drawer__option-meta">
                      Same movement pattern and primary muscle group
                    </span>
                  </span>
                  <span className="main-compound-drawer__option-tags" aria-hidden="true">
                    {filterTags.map((tag) => (
                      <span className="main-compound-drawer__tag" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </span>
                  <span className="main-compound-drawer__option-state" aria-hidden="true">
                    {isSelected ? <Check size={16} strokeWidth={2.4} /> : null}
                  </span>
                </label>
              );
            })
          ) : (
            <p className="main-compound-drawer__empty">
              No eligible alternatives match the current search and filters.
            </p>
          )}
        </fieldset>

        <div className="main-compound-drawer__footer">
          <p>
            Selected pool exercises stay separate from the main compounds and can be proposed for a
            later Training Block rotation.
          </p>
        </div>
      </section>
    </div>
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
}): FoundationRowStatus {
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

function getFoundationStatusClassName(status: FoundationRowStatus): string {
  switch (status) {
    case "required":
      return "bg-emerald-100 text-emerald-900";
    case "missing":
      return "bg-amber-100 text-amber-900";
    case "recommended":
      return "bg-stone-200 text-stone-800";
    case "suggested":
      return "bg-sky-100 text-sky-900";
  }
}

function getFoundationStatusLabel(status: FoundationRowStatus): string {
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

function getFoundationStatusAccessibleLabel(status: FoundationRowStatus): string {
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
  exerciseName,
  row,
  status,
}: {
  exerciseName: string | undefined;
  row: WeeklyMovementCoverageRow;
  status: FoundationRowStatus;
}): string {
  const description =
    exerciseName ??
    getMissingMovementPatternCopy({ bucket: row.bucket, movementPattern: row.movementPattern });

  return `${formatMovementPatternLabel(row.movementPattern)}. ${getFoundationStatusAccessibleLabel(
    status,
  )}. ${description}`;
}

function getMissingFoundationCopy(movementPattern: CompoundCapableMovementPatternId): string {
  return movementPattern === "vertical_push"
    ? "No exercise selected yet."
    : "No exercise selected yet.";
}

function getFoundationRowHelperText(movementPattern: CompoundCapableMovementPatternId): string {
  switch (movementPattern) {
    case "horizontal_push":
      return "Pressing work for chest, shoulders, and triceps.";
    case "horizontal_pull":
      return "Rowing work for mid-back and upper-back balance.";
    case "vertical_pull":
      return "Pull-down or pull-up work for lats and upper back.";
    case "vertical_push":
      return "Overhead pressing work for push balance.";
    case "quad_dominant":
      return "Squat or press pattern for knee-dominant leg work.";
    case "hip_hamstring_dominant":
      return "Hinge pattern for hamstrings, glutes, and posterior chain.";
  }
}

function FoundationPatternIcon({
  movementPattern,
}: {
  movementPattern: CompoundCapableMovementPatternId;
}) {
  const Icon = getFoundationPatternIcon(movementPattern);

  return <Icon aria-hidden="true" size={18} strokeWidth={2} />;
}

function getFoundationPatternIcon(movementPattern: CompoundCapableMovementPatternId): LucideIcon {
  switch (movementPattern) {
    case "horizontal_push":
      return ArrowLeftRight;
    case "horizontal_pull":
      return ArrowLeftRight;
    case "vertical_pull":
      return ArrowDownUp;
    case "vertical_push":
      return ArrowUpDown;
    case "quad_dominant":
      return Weight;
    case "hip_hamstring_dominant":
      return Dumbbell;
  }
}

function getFoundationIconClassName(movementPattern: CompoundCapableMovementPatternId): string {
  switch (movementPattern) {
    case "horizontal_push":
    case "vertical_push":
      return "bg-[#ffe9e7] text-[#b93725]";
    case "horizontal_pull":
    case "vertical_pull":
      return "bg-[#e8f5f4] text-[#00666e]";
    case "quad_dominant":
    case "hip_hamstring_dominant":
      return "bg-[#ecefff] text-[#355bd6]";
  }
}

function getFoundationRowMetadata({
  optionCount,
  shownExerciseId,
  status,
}: {
  optionCount: number;
  shownExerciseId: string | undefined;
  status: FoundationRowStatus;
}): string {
  const alternativeCount = shownExerciseId ? Math.max(optionCount - 1, 0) : optionCount;
  const prefix = status === "suggested" ? "Suggested, unconfirmed" : "Main compound";

  return `${prefix} · ${Math.min(alternativeCount, 2)} alternatives · ${Math.max(
    alternativeCount - 2,
    0,
  )} more options`;
}

function getMainCompoundOptions(
  movementPattern: CompoundCapableMovementPatternId,
): ReadonlyArray<ExerciseCatalogExercise & { role: "compound" }> {
  return getExerciseCatalogExercisesByMovementPattern(movementPattern).filter((exercise) =>
    isMainCompoundEligible(exercise),
  );
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

function getPickerOptionFilterIds(
  exercise: ExerciseCatalogExercise,
): ReadonlyArray<MainCompoundPickerFilterId> {
  const normalizedName = exercise.name.toLowerCase();
  const normalizedId = exercise.id.toLowerCase();
  const filterIds = new Set<MainCompoundPickerFilterId>();

  if (/\bbarbell\b/.test(normalizedName) || normalizedId.includes("barbell")) {
    filterIds.add("barbell");
  }

  if (/\bdumbbell\b/.test(normalizedName) || normalizedId.includes("dumbbell")) {
    filterIds.add("dumbbells");
  }

  if (normalizedName.includes("machine") || normalizedId.includes("machine")) {
    filterIds.add("machine");
  }

  if (
    normalizedId.includes("pull-up") ||
    normalizedId.includes("push-up") ||
    normalizedId.includes("chin-up") ||
    normalizedId.includes("inverted-rows") ||
    normalizedId.includes("dips")
  ) {
    filterIds.add("bodyweight");
  }

  if (
    normalizedId.includes("machine") ||
    normalizedId.includes("assisted") ||
    normalizedId.includes("leg-press") ||
    normalizedId.includes("lat-pull") ||
    normalizedId.includes("pulldown") ||
    normalizedId.includes("cable")
  ) {
    filterIds.add("beginner_friendly");
  }

  if (
    normalizedId.includes("machine") ||
    normalizedId.includes("neutral") ||
    normalizedId.includes("assisted") ||
    normalizedId.includes("chest-supported") ||
    normalizedId.includes("seated")
  ) {
    filterIds.add("joint_friendly");
  }

  return Array.from(filterIds);
}

function getPickerOptionFilterTags(exercise: ExerciseCatalogExercise): ReadonlyArray<string> {
  const filterIds = getPickerOptionFilterIds(exercise);
  const tags = mainCompoundPickerFilters
    .filter((filter) => filter.id !== "all" && filterIds.includes(filter.id))
    .map((filter) => filter.label);

  return tags.length > 0 ? tags.slice(0, 2) : ["Compound"];
}

function getAccessoryFilterLabel<TFilterId extends string>(
  filters: ReadonlyArray<{ id: TFilterId; label: string }>,
  filterId: TFilterId,
): string {
  return filters.find((filter) => filter.id === filterId)?.label ?? filterId;
}

function toTitleCase(value: string): string {
  return value
    .split(" ")
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

function getSuggestedFoundationSummary({
  requiredPatternCount,
  suggestedRequiredPatternCount,
}: {
  requiredPatternCount: number;
  suggestedRequiredPatternCount: number;
}): string {
  return `Suggested starting point: would cover ${suggestedRequiredPatternCount} of ${requiredPatternCount} required patterns`;
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
    return `Main compound coverage: ${coveredRequiredPatternCount} of ${requiredPatternCount} required patterns covered.`;
  }

  return `Main compound coverage: ${coveredRequiredPatternCount} of ${requiredPatternCount} required patterns covered · ${missingRequiredCount} required still missing.`;
}

function getNextMissingRequiredPattern(
  rows: ReadonlyArray<{
    isCovered: boolean;
    movementPattern: CompoundCapableMovementPatternId;
    requirement: "recommended" | "required";
  }>,
): CompoundCapableMovementPatternId | null {
  return (
    rows.find((row) => row.requirement === "required" && !row.isCovered)?.movementPattern ?? null
  );
}

function getBlockedGenerateActionLabel(
  movementPattern: CompoundCapableMovementPatternId | null,
): string {
  if (movementPattern === null) {
    return "Choose required main compounds";
  }

  return `Choose ${formatMovementPatternLabel(movementPattern).toLowerCase()} exercise`;
}

function getMissingMovementPatternCopy({
  bucket,
  movementPattern,
}: {
  bucket: string;
  movementPattern: CompoundCapableMovementPatternId;
}): string {
  return `${bucket} coverage missing: ${formatMovementPatternLabel(movementPattern)}.`;
}

function getRecommendedGuidance(
  rows: ReadonlyArray<{
    isCovered: boolean;
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

  return missingRecommendedVerticalPush ? "Recommended push balance: add Vertical push." : null;
}

function getMissingRequiredGuidance(
  movementPattern: CompoundCapableMovementPatternId,
): string | null {
  switch (movementPattern) {
    case "horizontal_push":
      return "Next action: choose a horizontal push, such as Bench Press or Chest Press.";
    case "horizontal_pull":
      return "Next action: choose a horizontal pull, such as Barbell Row or Seated Row.";
    case "vertical_pull":
      return "Next action: choose a vertical pull, such as Pull-Up, Chin-Up, or Lat Pulldown.";
    case "quad_dominant":
      return "Next action: choose a quad-dominant lift, such as Back Squat or Leg Press.";
    case "hip_hamstring_dominant":
      return "Next action: choose a hip / hamstring lift, such as Romanian Deadlift or Hip Thrust.";
    case "vertical_push":
      return "Next action: choose a vertical push, such as Overhead Press or Shoulder Press.";
  }
}
