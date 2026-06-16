import {
  ArrowDownUp,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpDown,
  Check,
  CircleCheck,
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
import type { CompoundCapableMovementPatternId } from "../exercise-catalog";
import type {
  ExerciseFoundationAccessoryExercise,
  ExerciseFoundationCompoundOption,
  ExerciseFoundationReadModel,
  ExerciseFoundationRotationPoolReadModel,
  ExerciseFoundationRowStatus,
  MainCompoundPickerFilterId,
} from "../exercise-foundation-read-model";
import {
  formatMovementPatternLabel,
  type MainCompoundSelection,
} from "../weekly-movement-coverage";
import "./exercise-foundation-step.css";
import "./main-compound-drawer.css";
import "./isolation-exercises-summary.css";
import "./rotation-pool-inline-preview.css";
import "./exercise-foundation-page-overrides.css";
import "./exercise-foundation-responsive.css";

type ExerciseFoundationStepProps = {
  onBackToVolume: () => void;
  onContinueToGenerate: () => Promise<void>;
  onMainCompoundSelectionChange: (
    selection: Pick<MainCompoundSelection, "exerciseId" | "movementPattern">,
  ) => Promise<void>;
  onRotationPoolChange: (rotationPool: {
    exerciseIds: ReadonlyArray<string>;
    movementPattern: CompoundCapableMovementPatternId;
  }) => Promise<void>;
  readModel: ExerciseFoundationReadModel;
};

type MainCompoundPickerFilter = {
  id: MainCompoundPickerFilterId;
  label: string;
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

export function ExerciseFoundationStep({
  onBackToVolume,
  onContinueToGenerate,
  onMainCompoundSelectionChange,
  onRotationPoolChange,
  readModel,
}: ExerciseFoundationStepProps) {
  const [activePickerPattern, setActivePickerPattern] =
    useState<CompoundCapableMovementPatternId | null>(null);
  const [activeRotationPoolPattern, setActiveRotationPoolPattern] =
    useState<CompoundCapableMovementPatternId | null>(null);
  const [isAccessoryDrawerOpen, setIsAccessoryDrawerOpen] = useState(false);
  const [selectedAccessoryIds, setSelectedAccessoryIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const selectedAccessories = readModel.accessoryExercises.filter((exercise) =>
    selectedAccessoryIds.has(exercise.id),
  );
  const selectedAccessoryCount = selectedAccessories.length;
  const activePickerRow =
    activePickerPattern === null
      ? undefined
      : readModel.rows.find((row) => row.movementPattern === activePickerPattern);
  const activeRotationPoolRow =
    activeRotationPoolPattern === null
      ? undefined
      : readModel.rows.find((row) => row.movementPattern === activeRotationPoolPattern);

  useEffect(() => {
    const availableAccessoryExerciseIds = new Set(readModel.accessoryExerciseIds);

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
  }, [readModel.accessoryExerciseIds]);

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
            <section aria-label="Exercise foundation status" className="exercise-foundation-status">
              <span aria-hidden="true" className="exercise-foundation-status__icon">
                <Check size={22} strokeWidth={2.4} />
              </span>
              <div>
                <h3 className="sr-only" id="exercise-foundation-title">
                  Exercise foundation overview
                </h3>
                <p className="exercise-foundation-status__title">{readModel.summary}</p>
                {readModel.guidance ? (
                  <p className="exercise-foundation-status__body">{readModel.guidance}</p>
                ) : null}
              </div>
            </section>

            <div className="exercise-foundation-tabbar">
              <span className="exercise-foundation-tabbar__active">Main compounds</span>
              <span
                className={cn(
                  "exercise-foundation-tabbar__locked",
                  readModel.canContinueToGenerate
                    ? "exercise-foundation-tabbar__locked--ready"
                    : null,
                )}
              >
                {readModel.canContinueToGenerate ? (
                  <CircleCheck aria-hidden="true" size={15} strokeWidth={2.2} />
                ) : (
                  <Lock aria-hidden="true" size={15} strokeWidth={2} />
                )}
                {readModel.canContinueToGenerate
                  ? "Swaps ready"
                  : "Swaps unlock after required picks"}
              </span>
            </div>

            <section aria-label="Main compound selections" className="exercise-foundation-card">
              <ul aria-label="Exercise foundation rows" className="exercise-foundation-list">
                {readModel.rows.map((row) => {
                  const isPickerOpen = activePickerPattern === row.movementPattern;

                  return (
                    <li
                      aria-label={row.accessibleLabel}
                      className={cn(
                        "exercise-foundation-row",
                        row.isMissing ? "exercise-foundation-row--missing" : null,
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
                              <h4>{row.movementPatternLabel}</h4>
                              <span>{row.bucket}</span>
                            </div>
                            <p className="exercise-foundation-row__helper">{row.helperText}</p>
                          </div>
                        </div>

                        <div className="exercise-foundation-row__selection">
                          <p>{row.shownExercise?.exerciseName ?? "No exercise selected yet."}</p>
                          <span>{row.metadata}</span>
                        </div>

                        <div className="exercise-foundation-row__actions">
                          <span
                            aria-label={row.statusAccessibleLabel}
                            className={cn(
                              "exercise-foundation-row__status",
                              getFoundationStatusClassName(row.status),
                            )}
                            role="status"
                          >
                            {row.statusLabel}
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
                            {row.confirmedSelection ? "Change" : "Choose"}
                          </Button>
                        </div>
                      </div>

                      {row.rotationPool ? (
                        <InlineRotationPoolEditor
                          movementPattern={row.movementPattern}
                          onEdit={() => {
                            setActivePickerPattern(null);
                            setActiveRotationPoolPattern(row.movementPattern);
                          }}
                          rotationPool={row.rotationPool}
                        />
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>
        </div>

        <div>
          {activePickerRow ? (
            <MainCompoundPicker
              currentExerciseId={activePickerRow.confirmedSelection?.exerciseId}
              id={`main-compound-picker-${activePickerRow.movementPattern}`}
              mainCompoundOptions={activePickerRow.mainCompoundOptions}
              movementPattern={activePickerRow.movementPattern}
              movementPatternLabel={activePickerRow.movementPatternLabel}
              onClose={() => setActivePickerPattern(null)}
              onSelect={handleMainCompoundSelect}
            />
          ) : null}

          {activeRotationPoolPattern && activeRotationPoolRow?.rotationPool ? (
            <RotationPoolPicker
              id={`rotation-pool-picker-${activeRotationPoolPattern}`}
              movementPattern={activeRotationPoolPattern}
              movementPatternLabel={activeRotationPoolRow.movementPatternLabel}
              onChange={(exerciseIds) =>
                handleRotationPoolChange(activeRotationPoolPattern, exerciseIds)
              }
              onClose={() => setActiveRotationPoolPattern(null)}
              rotationPool={activeRotationPoolRow.rotationPool}
            />
          ) : null}

          {readModel.canShowOptionalAccessoriesSummary ? (
            <IsolationExercisesSummary
              isDrawerOpen={isAccessoryDrawerOpen}
              onConfigure={() => {
                setActivePickerPattern(null);
                setActiveRotationPoolPattern(null);
                setIsAccessoryDrawerOpen(true);
              }}
              onRemove={(accessoryId) => handleAccessorySelectionChange(accessoryId, false)}
              optionalAccessoryCount={readModel.optionalAccessoryCount}
              recommendedAccessoryCount={readModel.recommendedAccessoryCount}
              selectedAccessories={selectedAccessories}
              selectedExerciseCount={selectedAccessoryCount}
            />
          ) : (
            <IsolationExercisesUnavailableSummary />
          )}

          <StepActions>
            <Button onClick={onBackToVolume} size="step" type="button" variant="outline">
              <ArrowLeft aria-hidden="true" size={20} strokeWidth={1.9} />
              Back to Volume
            </Button>
            <Button
              disabled={!readModel.canContinueToGenerate}
              onClick={() => {
                void onContinueToGenerate();
              }}
              size="step"
              type="button"
              variant="builderPrimary"
            >
              {readModel.canContinueToGenerate
                ? "Continue to Generate"
                : getBlockedGenerateActionLabel(readModel.nextRequiredPattern)}
              <ArrowRight aria-hidden="true" size={20} strokeWidth={1.9} />
            </Button>
          </StepActions>
        </div>
      </StepPanel>

      {isAccessoryDrawerOpen ? (
        <IsolationExercisesDrawer
          accessoryExercises={readModel.accessoryExercises}
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
  onEdit,
  rotationPool,
}: {
  movementPattern: CompoundCapableMovementPatternId;
  onEdit: () => void;
  rotationPool: ExerciseFoundationRotationPoolReadModel;
}) {
  const movementPatternLabel = formatMovementPatternLabel(movementPattern);

  return (
    <section
      aria-label={`${movementPatternLabel} rotation pool summary`}
      className="rotation-pool-inline-preview"
    >
      <div className="rotation-pool-inline-preview__header">
        <span className="rotation-pool-inline-preview__label">Rotation pool</span>
        <span className="rotation-pool-inline-preview__status">{rotationPool.status}</span>
      </div>
      <div className="rotation-pool-inline-preview__actions">
        <Button
          aria-label={`Edit ${movementPatternLabel} rotation pool`}
          disabled={rotationPool.availableOptionCount === 0}
          onClick={onEdit}
          size="sm"
          type="button"
          variant="outline"
        >
          <Plus aria-hidden="true" size={16} strokeWidth={2} />
          Swaps
        </Button>
      </div>
    </section>
  );
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
  selectedAccessories: ReadonlyArray<ExerciseFoundationAccessoryExercise>;
  selectedExerciseCount: number;
}) {
  return (
    <section aria-label="Isolation exercises summary" className="exercise-accessories-summary">
      <div className="exercise-accessories-summary__header">
        <div className="min-w-0">
          <h3 className="text-sm font-black text-stone-950">Isolation exercises</h3>
          <p className="mt-1 text-sm text-stone-600">Optional direct muscle work.</p>
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
        Isolation exercises unlock after main compounds.
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
  accessoryExercises: ReadonlyArray<ExerciseFoundationAccessoryExercise>;
  onClose: () => void;
  onSelectionChange: (accessoryId: string, isSelected: boolean) => void;
  selectedAccessoryIds: ReadonlySet<string>;
}) {
  const titleId = "optional-accessories-drawer-title";

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

        <fieldset className="main-compound-drawer__options optional-accessories-drawer__options">
          <legend className="sr-only">Isolation exercises</legend>
          <AccessoryExerciseList
            exercises={accessoryExercises}
            onSelectionChange={onSelectionChange}
            selectedAccessoryIds={selectedAccessoryIds}
          />
        </fieldset>
      </section>
    </div>
  );
}

function AccessoryExerciseList({
  exercises,
  onSelectionChange,
  selectedAccessoryIds,
}: {
  exercises: ReadonlyArray<ExerciseFoundationAccessoryExercise>;
  onSelectionChange: (accessoryId: string, isSelected: boolean) => void;
  selectedAccessoryIds: ReadonlySet<string>;
}) {
  if (exercises.length === 0) {
    return null;
  }

  return (
    <div className="optional-accessories-drawer__list">
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
              <Dumbbell size={16} strokeWidth={2} />
            </span>
            <span className="main-compound-drawer__option-copy">
              <span className="main-compound-drawer__option-name">{exercise.name}</span>
              <span className="main-compound-drawer__option-meta">
                {exercise.rationale ?? "Direct isolation option"}
              </span>
            </span>
            <span className="main-compound-drawer__option-state" aria-hidden="true">
              {isSelected ? <Check size={16} strokeWidth={2.4} /> : null}
            </span>
          </label>
        );
      })}
    </div>
  );
}

function MainCompoundPicker({
  currentExerciseId,
  id,
  mainCompoundOptions,
  movementPattern,
  movementPatternLabel,
  onClose,
  onSelect,
}: {
  currentExerciseId: string | undefined;
  id: string;
  mainCompoundOptions: ReadonlyArray<ExerciseFoundationCompoundOption>;
  movementPattern: CompoundCapableMovementPatternId;
  movementPatternLabel: string;
  onClose: () => void;
  onSelect: (
    exerciseId: string,
    movementPattern: CompoundCapableMovementPatternId,
  ) => Promise<void>;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilterId, setActiveFilterId] = useState<MainCompoundPickerFilterId>("all");
  const titleId = `${id}-title`;
  const searchMovementPatternLabel = movementPatternLabel.toLowerCase();
  const formattedMovementPatternTitle = toTitleCase(movementPatternLabel);
  const filteredOptions = useMemo(
    () =>
      mainCompoundOptions.filter((exercise) => {
        const normalizedSearchQuery = searchQuery.trim().toLowerCase();
        const matchesSearch =
          normalizedSearchQuery.length === 0 ||
          exercise.name.toLowerCase().includes(normalizedSearchQuery) ||
          exercise.id.includes(normalizedSearchQuery.replace(/\s+/g, "-"));
        const matchesFilter =
          activeFilterId === "all" || exercise.filterIds.includes(activeFilterId);

        return matchesSearch && matchesFilter;
      }),
    [activeFilterId, mainCompoundOptions, searchQuery],
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
                    <span className="main-compound-drawer__option-meta">{exercise.metadata}</span>
                  </span>
                  <span className="main-compound-drawer__option-tags" aria-hidden="true">
                    {exercise.filterTags.map((tag) => (
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
  id,
  movementPattern,
  movementPatternLabel,
  onChange,
  onClose,
  rotationPool,
}: {
  id: string;
  movementPattern: CompoundCapableMovementPatternId;
  movementPatternLabel: string;
  onChange: (exerciseIds: ReadonlyArray<string>) => Promise<void>;
  onClose: () => void;
  rotationPool: ExerciseFoundationRotationPoolReadModel;
}) {
  const selectedExerciseIds = rotationPool.selectedExerciseIds;
  const selectedExerciseIdSet = new Set(selectedExerciseIds);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilterId, setActiveFilterId] = useState<MainCompoundPickerFilterId>("all");
  const titleId = `${id}-title`;
  const searchMovementPatternLabel = movementPatternLabel.toLowerCase();
  const formattedMovementPatternTitle = toTitleCase(movementPatternLabel);
  const filteredOptions = useMemo(
    () =>
      rotationPool.options.filter((exercise) => {
        const normalizedSearchQuery = searchQuery.trim().toLowerCase();
        const matchesSearch =
          normalizedSearchQuery.length === 0 ||
          exercise.name.toLowerCase().includes(normalizedSearchQuery) ||
          exercise.id.includes(normalizedSearchQuery.replace(/\s+/g, "-"));
        const matchesFilter =
          activeFilterId === "all" || exercise.filterIds.includes(activeFilterId);

        return matchesSearch && matchesFilter;
      }),
    [activeFilterId, rotationPool.options, searchQuery],
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
            Choose future Training Block alternatives. Main compounds are excluded.
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
                    <span className="main-compound-drawer__option-meta">{exercise.metadata}</span>
                  </span>
                  <span className="main-compound-drawer__option-tags" aria-hidden="true">
                    {exercise.filterTags.map((tag) => (
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
          <p>Pool exercises stay separate from main compounds.</p>
        </div>
      </section>
    </div>
  );
}

function getFoundationStatusClassName(status: ExerciseFoundationRowStatus): string {
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

function getBlockedGenerateActionLabel(
  movementPattern: CompoundCapableMovementPatternId | null,
): string {
  if (movementPattern === null) {
    return "Choose required main compounds";
  }

  return `Choose ${formatMovementPatternLabel(movementPattern).toLowerCase()} exercise`;
}
