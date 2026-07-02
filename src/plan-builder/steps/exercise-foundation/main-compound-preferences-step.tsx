import { Activity, ChevronDown, CirclePlus, Dumbbell } from "lucide-react";
import {
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { StepPanel } from "../../../design-system/step-screen";
import type {
  CompoundCapableMovementPatternId,
  ExerciseCatalogMuscleGroupId,
  MovementPatternId,
} from "../../exercise-catalog";
import type {
  IsolationExercisePreferenceReadModel,
  IsolationExercisePreferenceRowReadModel,
} from "../../isolation-exercise-preference-read-model";
import type {
  MainCompoundPreferenceReadModel,
  MainCompoundPreferenceRowReadModel,
} from "../../main-compound-preference-read-model";
import type { MainCompoundRotationPreferenceReadModel } from "../../main-compound-rotation-preference-read-model";
import { FoundationPatternIcon, getFoundationIconClassName } from "./foundation-pattern-icon";
import { IsolationExercisePreferencesPicker } from "./isolation-exercise-preferences-picker";
import { MainCompoundPickerToggleButton } from "./main-compound-picker-toggle-button";
import { MainCompoundPreferencesPicker } from "./main-compound-preferences-picker";
import { MainCompoundRotationPreferencesPicker } from "./main-compound-rotation-preferences-picker";
import "./main-compound-drawer.css";
import "./exercise-foundation-step.css";
import "./exercise-foundation-page-overrides.css";
import "./exercise-foundation-responsive.css";

type MainCompoundPreferencesStepProps = {
  isolationReadModel: IsolationExercisePreferenceReadModel;
  mainCompoundReadModel: MainCompoundPreferenceReadModel;
  mainCompoundRotationReadModel: MainCompoundRotationPreferenceReadModel;
  onIsolationExercisePreferencesChange: (preferences: {
    exerciseIds: ReadonlyArray<string>;
    primaryMuscleGroup: ExerciseCatalogMuscleGroupId;
  }) => Promise<void>;
  onMainCompoundPreferencesChange: (preferences: {
    exerciseIds: ReadonlyArray<string>;
    movementPattern: CompoundCapableMovementPatternId;
  }) => Promise<void>;
  onMainCompoundRotationPreferencesChange: (preferences: {
    exerciseIds: ReadonlyArray<string>;
    movementPattern: CompoundCapableMovementPatternId;
  }) => Promise<void>;
};

type SelectableExercise = {
  id: string;
  metadata?: string;
  movementPattern?: MovementPatternId;
  name: string;
};

const defaultMainExerciseByPattern: Partial<Record<CompoundCapableMovementPatternId, string>> = {
  hip_hamstring_dominant: "barbell-romanian-deadlifts",
  horizontal_pull: "chest-supported-barbell-rows",
  horizontal_push: "flat-barbell-bench-press",
  quad_dominant: "barbell-squats",
  vertical_pull: "pull-ups",
  vertical_push: "standing-overhead-barbell-press",
};

const defaultRotationExerciseByPattern: Partial<Record<CompoundCapableMovementPatternId, string>> =
  {
    hip_hamstring_dominant: "dumbbell-romanian-deadlifts",
    horizontal_pull: "chest-supported-machine-rows",
    horizontal_push: "flat-dumbbell-bench-press",
    quad_dominant: "barbell-front-squats",
    vertical_pull: "wide-grip-lat-pulldown",
    vertical_push: "seated-overhead-dumbbell-press",
  };

const defaultIsolationExerciseByMuscleGroup: Partial<Record<ExerciseCatalogMuscleGroupId, string>> =
  {
    abs: "hanging-leg-raises",
    biceps: "standing-barbell-curls",
    calves: "standing-calf-raises",
    shoulders: "cable-lateral-raises",
    triceps: "cable-press-downs",
  };

const visibleIsolationMuscleGroups = ["biceps", "triceps", "shoulders", "calves", "abs"] as const;

const visibleMainMovementPatternOrder = [
  "horizontal_push",
  "horizontal_pull",
  "vertical_pull",
  "quad_dominant",
  "hip_hamstring_dominant",
  "vertical_push",
] as const satisfies ReadonlyArray<CompoundCapableMovementPatternId>;

export function MainCompoundPreferencesStep({
  isolationReadModel,
  mainCompoundReadModel,
  mainCompoundRotationReadModel,
  onIsolationExercisePreferencesChange,
  onMainCompoundPreferencesChange,
  onMainCompoundRotationPreferencesChange,
}: MainCompoundPreferencesStepProps) {
  const [activePicker, setActivePicker] = useState<{
    kind: "main" | "rotation";
    movementPattern: CompoundCapableMovementPatternId;
  } | null>(null);
  const [activeIsolationPickerMuscleGroup, setActiveIsolationPickerMuscleGroup] =
    useState<ExerciseCatalogMuscleGroupId | null>(null);
  const activeMainCompoundPickerRow =
    activePicker?.kind === "main"
      ? mainCompoundReadModel.rows.find(
          (row) => row.movementPattern === activePicker.movementPattern,
        )
      : undefined;
  const activeRotationPickerRow =
    activePicker?.kind === "rotation"
      ? mainCompoundRotationReadModel.rows.find(
          (row) => row.movementPattern === activePicker.movementPattern,
        )
      : undefined;
  const activeIsolationPickerRow =
    activeIsolationPickerMuscleGroup === null
      ? undefined
      : isolationReadModel.rows.find(
          (row) => row.primaryMuscleGroup === activeIsolationPickerMuscleGroup,
        );

  async function addMainExercise(row: MainCompoundPreferenceRowReadModel, exerciseId: string) {
    if (row.preferences.some((preference) => preference.exerciseId === exerciseId)) {
      return;
    }

    await onMainCompoundPreferencesChange({
      exerciseIds: appendExercise(row.preferences, exerciseId),
      movementPattern: row.movementPattern,
    });
  }

  async function addRotationExercise(row: MainCompoundPreferenceRowReadModel, exerciseId: string) {
    if (row.preferences.some((preference) => preference.exerciseId === exerciseId)) {
      return;
    }

    await onMainCompoundRotationPreferencesChange({
      exerciseIds: appendExercise(row.preferences, exerciseId),
      movementPattern: row.movementPattern,
    });
  }

  async function addIsolationExercise(
    row: IsolationExercisePreferenceRowReadModel,
    exerciseId: string,
  ) {
    await onIsolationExercisePreferencesChange({
      exerciseIds: appendExercise(row.preferences, exerciseId),
      primaryMuscleGroup: row.primaryMuscleGroup,
    });
  }

  return (
    <div className="exercise-foundation-shell">
      <StepPanel aria-label="Exercise selection" className="exercise-foundation-panel">
        <div className="exercise-foundation-workspace">
          <ExercisePoolSection
            body="Choose your primary lifts across key movement patterns."
            heading="Main Compounds"
            headingId="main-compound-preference-buckets-title"
            number="1"
            summary="Recommended 5-6"
          >
            <ul className="exercise-selection-main-grid">
              {visibleMainMovementPatternOrder.flatMap((movementPattern) => {
                const row = mainCompoundReadModel.rows.find(
                  (candidate) => candidate.movementPattern === movementPattern,
                );

                if (!row) {
                  return [];
                }

                return (
                  <MovementPatternBucket
                    key={row.movementPattern}
                    onAddExercise={(exerciseId) => {
                      void addMainExercise(row, exerciseId);
                    }}
                    onToggleRanker={() =>
                      setActivePicker({ kind: "main", movementPattern: row.movementPattern })
                    }
                    row={row}
                  />
                );
              })}
            </ul>
          </ExercisePoolSection>

          <ExercisePoolSection
            body="Add alternative exercises to rotate in and keep progress moving."
            heading="Rotation (Backup Exercises)"
            headingId="main-compound-rotation-preference-buckets-title"
            number="2"
            summary="Recommended 2-4 per pattern"
          >
            <ul className="exercise-selection-rotation-grid">
              {visibleMainMovementPatternOrder.flatMap((movementPattern) => {
                const row = mainCompoundRotationReadModel.rows.find(
                  (candidate) => candidate.movementPattern === movementPattern,
                );

                if (!row) {
                  return [];
                }

                return (
                  <RotationMovementPatternBucket
                    key={row.movementPattern}
                    onAddExercise={(exerciseId) => {
                      void addRotationExercise(row, exerciseId);
                    }}
                    onToggleRanker={() =>
                      setActivePicker({ kind: "rotation", movementPattern: row.movementPattern })
                    }
                    row={row}
                  />
                );
              })}
            </ul>
          </ExercisePoolSection>

          <ExercisePoolSection
            body="Add accessory work to round out your program."
            heading="Isolation (Optional Accessories)"
            headingId="isolation-exercise-preference-buckets-title"
            number="3"
            summary="Recommended 3-8 total"
          >
            <ul className="exercise-selection-isolation-grid">
              {visibleIsolationMuscleGroups.flatMap((muscleGroup) => {
                const row = isolationReadModel.rows.find(
                  (candidate) => candidate.primaryMuscleGroup === muscleGroup,
                );

                if (!row) {
                  return [];
                }

                return (
                  <IsolationGroup
                    key={row.primaryMuscleGroup}
                    onAddExercise={(exerciseId) => {
                      void addIsolationExercise(row, exerciseId);
                    }}
                    onToggleRanker={() =>
                      setActiveIsolationPickerMuscleGroup(row.primaryMuscleGroup)
                    }
                    row={row}
                  />
                );
              })}
            </ul>
          </ExercisePoolSection>
        </div>

        <ExerciseSelectionCompatibilityControls
          onRotationPickerOpen={(movementPattern) =>
            setActivePicker({ kind: "rotation", movementPattern })
          }
          rotationRows={mainCompoundRotationReadModel.rows}
        />
      </StepPanel>

      {activeMainCompoundPickerRow ? (
        <MainCompoundPreferencesPicker
          id={`main-compound-preferences-picker-${activeMainCompoundPickerRow.movementPattern}`}
          mainCompoundOptions={activeMainCompoundPickerRow.mainCompoundOptions}
          movementPatternLabel={activeMainCompoundPickerRow.movementPatternLabel}
          onChange={(exerciseIds) =>
            onMainCompoundPreferencesChange({
              exerciseIds,
              movementPattern: activeMainCompoundPickerRow.movementPattern,
            })
          }
          onClose={() => setActivePicker(null)}
          preferenceExerciseIds={activeMainCompoundPickerRow.preferences.map(
            (preference) => preference.exerciseId,
          )}
        />
      ) : null}

      {activeRotationPickerRow ? (
        <MainCompoundRotationPreferencesPicker
          id={`main-compound-rotation-preferences-picker-${activeRotationPickerRow.movementPattern}`}
          mainCompoundOptions={activeRotationPickerRow.mainCompoundOptions}
          movementPatternLabel={activeRotationPickerRow.movementPatternLabel}
          onChange={(exerciseIds) =>
            onMainCompoundRotationPreferencesChange({
              exerciseIds,
              movementPattern: activeRotationPickerRow.movementPattern,
            })
          }
          onClose={() => setActivePicker(null)}
          preferenceExerciseIds={activeRotationPickerRow.preferences.map(
            (preference) => preference.exerciseId,
          )}
        />
      ) : null}

      {activeIsolationPickerRow ? (
        <IsolationExercisePreferencesPicker
          id={`isolation-exercise-preferences-picker-${activeIsolationPickerRow.primaryMuscleGroup}`}
          isolationOptions={activeIsolationPickerRow.isolationOptions}
          onChange={(exerciseIds) =>
            onIsolationExercisePreferencesChange({
              exerciseIds,
              primaryMuscleGroup: activeIsolationPickerRow.primaryMuscleGroup,
            })
          }
          onClose={() => setActiveIsolationPickerMuscleGroup(null)}
          preferenceExerciseIds={activeIsolationPickerRow.preferences.map(
            (preference) => preference.exerciseId,
          )}
          primaryMuscleGroup={activeIsolationPickerRow.primaryMuscleGroup}
          primaryMuscleGroupLabel={activeIsolationPickerRow.primaryMuscleGroupLabel}
        />
      ) : null}
    </div>
  );
}

function ExerciseSelectionCompatibilityControls({
  onRotationPickerOpen,
  rotationRows,
}: {
  onRotationPickerOpen: (movementPattern: CompoundCapableMovementPatternId) => void;
  rotationRows: ReadonlyArray<MainCompoundPreferenceRowReadModel>;
}) {
  return (
    <div className="sr-only">
      <section aria-labelledby="compat-main-compound-rotation-preference-buckets-heading">
        <h3 id="compat-main-compound-rotation-preference-buckets-heading">
          Main compound rotation preference buckets
        </h3>
        <ul>
          {rotationRows.map((row) => (
            <li key={row.movementPattern}>
              <span>{row.movementPatternLabel}</span>
              <button onClick={() => onRotationPickerOpen(row.movementPattern)} type="button">
                Rank rotation preferences
              </button>
              <PreferenceSummary preferences={row.preferences} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function ExercisePoolSection({
  body,
  children,
  heading,
  headingId,
  number,
  summary,
}: {
  body: string;
  children: ReactNode;
  heading: string;
  headingId: string;
  number: string;
  summary: string;
}) {
  return (
    <section
      aria-labelledby={`${headingId}-heading`}
      className="exercise-pool-section"
      id={headingId}
    >
      <header className="exercise-pool-section__header">
        <span aria-hidden="true" className="exercise-pool-section__number">
          {number}
        </span>
        <div>
          <div className="exercise-pool-section__title-row">
            <h3 id={`${headingId}-heading`}>{heading}</h3>
            <span>{summary}</span>
          </div>
          <p>{body}</p>
        </div>
      </header>

      {children}
    </section>
  );
}

function MovementPatternBucket({
  onAddExercise,
  onToggleRanker,
  row,
}: {
  onAddExercise: (exerciseId: string) => void;
  onToggleRanker: () => void;
  row: MainCompoundPreferenceRowReadModel;
}) {
  const defaultExerciseId = defaultMainExerciseByPattern[row.movementPattern];
  const selectedExerciseIds = useMemo(
    () => row.preferences.map((preference) => preference.exerciseId),
    [row.preferences],
  );
  const selectedExerciseIdSet = useMemo(() => new Set(selectedExerciseIds), [selectedExerciseIds]);
  const [draftExerciseId, setDraftExerciseId] = useState(() =>
    getInitialDraftExerciseId({
      defaultExerciseId,
      options: row.mainCompoundOptions,
      selectedExerciseIds: selectedExerciseIdSet,
    }),
  );
  const canAddExercise = draftExerciseId ? !selectedExerciseIdSet.has(draftExerciseId) : false;

  useEffect(() => {
    setDraftExerciseId((currentExerciseId) => {
      if (currentExerciseId && !selectedExerciseIdSet.has(currentExerciseId)) {
        return currentExerciseId;
      }

      return getNextAvailableExerciseId({
        options: row.mainCompoundOptions,
        previousExerciseId: currentExerciseId ?? defaultExerciseId,
        selectedExerciseIds: selectedExerciseIdSet,
      });
    });
  }, [defaultExerciseId, row.mainCompoundOptions, selectedExerciseIdSet]);

  function handleAddExercise() {
    if (!draftExerciseId) {
      return;
    }

    onAddExercise(draftExerciseId);
    setDraftExerciseId(
      getNextAvailableExerciseId({
        options: row.mainCompoundOptions,
        previousExerciseId: draftExerciseId,
        selectedExerciseIds: new Set([...selectedExerciseIdSet, draftExerciseId]),
      }),
    );
  }

  return (
    <li
      aria-label={`${row.movementPatternLabel} main compound`}
      className="movement-pattern-bucket"
    >
      <div className="movement-pattern-bucket__heading">
        <span
          aria-hidden="true"
          className={`movement-pattern-bucket__icon ${getFoundationIconClassName(row.movementPattern)}`}
        >
          <FoundationPatternIcon movementPattern={row.movementPattern} />
        </span>
        <div>
          <h4>{row.movementPatternLabel}</h4>
          <p>{row.preferences.length > 0 ? row.metadata : "1 selected"}</p>
        </div>
      </div>

      <div className="exercise-selection-picker-row">
        <ExerciseDropdown
          ariaLabel={`Choose ${row.movementPatternLabel} exercise`}
          isAttachedToAddButton
          onChange={setDraftExerciseId}
          options={row.mainCompoundOptions}
          selectedExerciseId={draftExerciseId}
          selectedExerciseIds={selectedExerciseIds}
        />
        <button
          aria-label={`Add another ${row.movementPatternLabel} exercise`}
          className="exercise-selection-add-button"
          disabled={!canAddExercise}
          onClick={handleAddExercise}
          title="Add exercise"
          type="button"
        >
          <CirclePlus aria-hidden="true" size={15} strokeWidth={2.2} />
        </button>
      </div>

      <MainCompoundPickerToggleButton
        className="exercise-rank-preferences-button"
        isOpen={false}
        label="Rank preferences"
        onToggle={onToggleRanker}
        pickerId={`main-compound-preferences-picker-${row.movementPattern}`}
      />
      <PreferenceSummary preferences={row.preferences} />
    </li>
  );
}

function RotationMovementPatternBucket({
  onAddExercise,
  onToggleRanker,
  row,
}: {
  onAddExercise: (exerciseId: string) => void;
  onToggleRanker: () => void;
  row: MainCompoundPreferenceRowReadModel;
}) {
  const defaultExerciseId = defaultRotationExerciseByPattern[row.movementPattern];
  const selectedExerciseIds = useMemo(
    () => row.preferences.map((preference) => preference.exerciseId),
    [row.preferences],
  );
  const selectedExerciseIdSet = useMemo(() => new Set(selectedExerciseIds), [selectedExerciseIds]);
  const [draftExerciseId, setDraftExerciseId] = useState(() =>
    getInitialDraftExerciseId({
      defaultExerciseId,
      options: row.mainCompoundOptions,
      selectedExerciseIds: selectedExerciseIdSet,
    }),
  );
  const canAddExercise = draftExerciseId ? !selectedExerciseIdSet.has(draftExerciseId) : false;

  useEffect(() => {
    setDraftExerciseId((currentExerciseId) => {
      if (currentExerciseId && !selectedExerciseIdSet.has(currentExerciseId)) {
        return currentExerciseId;
      }

      return getNextAvailableExerciseId({
        options: row.mainCompoundOptions,
        previousExerciseId: currentExerciseId ?? defaultExerciseId,
        selectedExerciseIds: selectedExerciseIdSet,
      });
    });
  }, [defaultExerciseId, row.mainCompoundOptions, selectedExerciseIdSet]);

  function handleAddExercise() {
    if (!draftExerciseId) {
      return;
    }

    onAddExercise(draftExerciseId);
    setDraftExerciseId(
      getNextAvailableExerciseId({
        options: row.mainCompoundOptions,
        previousExerciseId: draftExerciseId,
        selectedExerciseIds: new Set([...selectedExerciseIdSet, draftExerciseId]),
      }),
    );
  }

  return (
    <li
      aria-label={`${row.movementPatternLabel} rotation backups`}
      className="movement-pattern-bucket movement-pattern-bucket--rotation"
    >
      <div className="movement-pattern-bucket__heading">
        <span
          aria-hidden="true"
          className={`movement-pattern-bucket__icon ${getFoundationIconClassName(row.movementPattern)}`}
        >
          <FoundationPatternIcon movementPattern={row.movementPattern} />
        </span>
        <div>
          <h4>{row.movementPatternLabel}</h4>
          <p>{row.preferences.length > 0 ? row.metadata : "Add 2-4 backups"}</p>
        </div>
      </div>

      <div className="exercise-selection-picker-row">
        <ExerciseDropdown
          ariaLabel={`Choose ${row.movementPatternLabel} rotation exercise`}
          isAttachedToAddButton
          onChange={setDraftExerciseId}
          options={row.mainCompoundOptions}
          selectedExerciseId={draftExerciseId}
          selectedExerciseIds={selectedExerciseIds}
        />
        <button
          aria-label={`Add another ${row.movementPatternLabel} rotation exercise`}
          className="exercise-selection-add-button"
          disabled={!canAddExercise}
          onClick={handleAddExercise}
          title="Add exercise"
          type="button"
        >
          <CirclePlus aria-hidden="true" size={15} strokeWidth={2.2} />
        </button>
      </div>

      <MainCompoundPickerToggleButton
        accessibleLabel="Rank rotation preferences"
        className="exercise-rank-preferences-button"
        isOpen={false}
        label="Rank rotation"
        onToggle={onToggleRanker}
        pickerId={`main-compound-rotation-preferences-picker-${row.movementPattern}`}
      />
      <PreferenceSummary preferences={row.preferences} />
    </li>
  );
}

function ExerciseDropdown({
  ariaLabel,
  isAttachedToAddButton = false,
  onChange,
  options,
  selectedExerciseId,
  selectedExerciseIds,
}: {
  ariaLabel: string;
  isAttachedToAddButton?: boolean;
  onChange: (exerciseId: string) => void;
  options: ReadonlyArray<SelectableExercise>;
  selectedExerciseId: string | undefined;
  selectedExerciseIds: ReadonlyArray<string>;
}) {
  const selectedExercise = options.find((exercise) => exercise.id === selectedExerciseId);
  const selectedExerciseIdSet = new Set(selectedExerciseIds);
  const availableOptions = options.filter((exercise) => !selectedExerciseIdSet.has(exercise.id));
  const buttonId = useId();
  const listboxId = useId();
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeOptionIndex, setActiveOptionIndex] = useState(() =>
    Math.max(
      0,
      availableOptions.findIndex((exercise) => exercise.id === selectedExerciseId),
    ),
  );
  const [menuStyle, setMenuStyle] = useState<{
    left: number;
    maxHeight: number;
    top: number;
    width: number;
  } | null>(null);
  const activeOption = availableOptions[activeOptionIndex];

  const updateMenuPosition = useCallback(() => {
    const button = buttonRef.current;

    if (!button) {
      return;
    }

    const rect = button.getBoundingClientRect();
    const viewportPadding = 12;
    const desiredWidth = Math.max(
      rect.width,
      Math.min(320, window.innerWidth - viewportPadding * 2),
    );
    const width = Math.min(desiredWidth, window.innerWidth - viewportPadding * 2);
    const left = Math.min(
      Math.max(viewportPadding, rect.left),
      Math.max(viewportPadding, window.innerWidth - width - viewportPadding),
    );
    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
    const spaceAbove = rect.top - viewportPadding;
    const shouldOpenAbove = spaceBelow < 176 && spaceAbove > spaceBelow;
    const availableHeight = shouldOpenAbove ? spaceAbove : spaceBelow;
    const maxHeight = Math.max(152, Math.min(288, availableHeight - 6));
    const top = shouldOpenAbove
      ? Math.max(viewportPadding, rect.top - maxHeight - 6)
      : rect.bottom + 6;

    setMenuStyle({ left, maxHeight, top, width });
  }, []);

  useEffect(() => {
    setActiveOptionIndex(
      Math.max(
        0,
        availableOptions.findIndex((exercise) => exercise.id === selectedExerciseId),
      ),
    );
  }, [availableOptions, selectedExerciseId]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [isOpen, updateMenuPosition]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        rootRef.current &&
        !rootRef.current.contains(event.target) &&
        !menuRef.current?.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  function chooseExercise(exerciseId: string) {
    onChange(exerciseId);
    setIsOpen(false);
    window.requestAnimationFrame(() => buttonRef.current?.focus());
  }

  function handleButtonKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();

      if (!isOpen) {
        setIsOpen(true);
        return;
      }

      const nextIndex =
        event.key === "ArrowDown"
          ? Math.min(activeOptionIndex + 1, availableOptions.length - 1)
          : Math.max(activeOptionIndex - 1, 0);

      setActiveOptionIndex(nextIndex);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();

      if (isOpen && activeOption) {
        chooseExercise(activeOption.id);
        return;
      }

      setIsOpen((current) => !current);
      return;
    }

    if (event.key === "Escape") {
      setIsOpen(false);
    }
  }

  return (
    <div
      className={`exercise-dropdown${selectedExercise ? " exercise-dropdown--has-selection" : ""}${
        isAttachedToAddButton ? " exercise-dropdown--attached" : ""
      }`}
      ref={rootRef}
    >
      <span className="sr-only">{ariaLabel}</span>
      <button
        aria-activedescendant={
          isOpen && activeOption ? `${listboxId}-option-${activeOption.id}` : undefined
        }
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className="exercise-dropdown__button"
        id={buttonId}
        onClick={() => setIsOpen((current) => !current)}
        onKeyDown={handleButtonKeyDown}
        ref={buttonRef}
        role="combobox"
        type="button"
      >
        <span className="exercise-dropdown__selected-value">
          {selectedExercise ? formatExerciseName(selectedExercise.name) : "Choose exercise"}
        </span>
        <ChevronDown aria-hidden="true" size={15} strokeWidth={2.2} />
      </button>
      {isOpen
        ? createPortal(
            <div
              aria-labelledby={buttonId}
              className="exercise-dropdown__menu"
              id={listboxId}
              ref={menuRef}
              role="listbox"
              style={
                menuStyle
                  ? {
                      left: `${menuStyle.left}px`,
                      maxHeight: `${menuStyle.maxHeight}px`,
                      top: `${menuStyle.top}px`,
                      width: `${menuStyle.width}px`,
                    }
                  : undefined
              }
            >
              {availableOptions.map((exercise, index) => (
                <button
                  aria-selected={exercise.id === selectedExerciseId}
                  className="exercise-dropdown__option"
                  data-exercise-id={exercise.id}
                  id={`${listboxId}-option-${exercise.id}`}
                  key={exercise.id}
                  onClick={() => chooseExercise(exercise.id)}
                  onMouseEnter={() => setActiveOptionIndex(index)}
                  role="option"
                  type="button"
                >
                  {formatExerciseName(exercise.name)}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function IsolationGroup({
  onAddExercise,
  onToggleRanker,
  row,
}: {
  onAddExercise: (exerciseId: string) => void;
  onToggleRanker: () => void;
  row: IsolationExercisePreferenceRowReadModel;
}) {
  const defaultExerciseId = defaultIsolationExerciseByMuscleGroup[row.primaryMuscleGroup];
  const selectedExerciseIds = useMemo(
    () => row.preferences.map((preference) => preference.exerciseId),
    [row.preferences],
  );
  const selectedExerciseIdSet = useMemo(() => new Set(selectedExerciseIds), [selectedExerciseIds]);
  const [draftExerciseId, setDraftExerciseId] = useState(() =>
    getInitialDraftExerciseId({
      defaultExerciseId,
      options: row.isolationOptions,
      selectedExerciseIds: selectedExerciseIdSet,
    }),
  );
  const [isDraftManuallySelected, setIsDraftManuallySelected] = useState(false);
  const canAddExercise = draftExerciseId ? !selectedExerciseIdSet.has(draftExerciseId) : false;

  useEffect(() => {
    setDraftExerciseId((currentExerciseId) => {
      const topPreferenceExerciseId = row.preferences[0]?.exerciseId;

      if (!isDraftManuallySelected && topPreferenceExerciseId) {
        return topPreferenceExerciseId;
      }

      if (currentExerciseId && !selectedExerciseIdSet.has(currentExerciseId)) {
        return currentExerciseId;
      }

      return getNextAvailableExerciseId({
        options: row.isolationOptions,
        previousExerciseId: currentExerciseId ?? defaultExerciseId,
        selectedExerciseIds: selectedExerciseIdSet,
      });
    });
  }, [
    defaultExerciseId,
    isDraftManuallySelected,
    row.isolationOptions,
    row.preferences,
    selectedExerciseIdSet,
  ]);

  function handleAddExercise() {
    if (!draftExerciseId) {
      return;
    }

    onAddExercise(draftExerciseId);
    setIsDraftManuallySelected(true);
    setDraftExerciseId(
      getNextAvailableExerciseId({
        options: row.isolationOptions,
        previousExerciseId: draftExerciseId,
        selectedExerciseIds: new Set([...selectedExerciseIdSet, draftExerciseId]),
      }),
    );
  }

  return (
    <li
      aria-label={`${row.primaryMuscleGroupLabel} isolation exercises`}
      className="movement-pattern-bucket movement-pattern-bucket--isolation isolation-group"
    >
      <div className="isolation-group__heading">
        <span aria-hidden="true" className="isolation-group__icon">
          {getIsolationIcon(row.primaryMuscleGroup)}
        </span>
        <div>
          <h4>{formatIsolationGroupLabel(row.primaryMuscleGroupLabel)}</h4>
          <p>{row.preferences.length > 0 ? row.metadata : "Add accessories"}</p>
        </div>
      </div>

      <div className="exercise-selection-picker-row">
        <ExerciseDropdown
          ariaLabel={`Choose ${row.primaryMuscleGroupLabel} isolation exercise`}
          isAttachedToAddButton
          onChange={(exerciseId) => {
            setIsDraftManuallySelected(true);
            setDraftExerciseId(exerciseId);
          }}
          options={row.isolationOptions}
          selectedExerciseId={draftExerciseId}
          selectedExerciseIds={selectedExerciseIds}
        />
        <button
          aria-label={`Add another ${row.primaryMuscleGroupLabel} isolation exercise`}
          className="exercise-selection-add-button"
          disabled={!canAddExercise}
          onClick={handleAddExercise}
          title="Add exercise"
          type="button"
        >
          <CirclePlus aria-hidden="true" size={15} strokeWidth={2.2} />
        </button>
      </div>

      <MainCompoundPickerToggleButton
        className="exercise-rank-preferences-button"
        isOpen={false}
        label="Rank preferences"
        onToggle={() => {
          setIsDraftManuallySelected(false);
          onToggleRanker();
        }}
        pickerId={`isolation-exercise-preferences-picker-${row.primaryMuscleGroup}`}
      />
      <PreferenceSummary preferences={row.preferences} />
    </li>
  );
}

function PreferenceSummary({
  preferences,
}: {
  preferences: ReadonlyArray<{ exerciseId: string; exerciseName: string }>;
}) {
  if (preferences.length === 0) {
    return null;
  }

  return (
    <div className="sr-only">
      <ol>
        {preferences.map((preference, index) => (
          <li key={preference.exerciseId}>
            {index + 1}. {preference.exerciseName}
          </li>
        ))}
      </ol>
    </div>
  );
}

function getInitialDraftExerciseId({
  defaultExerciseId,
  options,
  selectedExerciseIds,
}: {
  defaultExerciseId: string | undefined;
  options: ReadonlyArray<SelectableExercise>;
  selectedExerciseIds: ReadonlySet<string>;
}) {
  if (
    defaultExerciseId &&
    !selectedExerciseIds.has(defaultExerciseId) &&
    options.some((exercise) => exercise.id === defaultExerciseId)
  ) {
    return defaultExerciseId;
  }

  return getNextAvailableExerciseId({ options, selectedExerciseIds });
}

function getNextAvailableExerciseId({
  options,
  previousExerciseId,
  selectedExerciseIds,
}: {
  options: ReadonlyArray<SelectableExercise>;
  previousExerciseId?: string;
  selectedExerciseIds: ReadonlySet<string>;
}) {
  const availableOptions = options.filter((exercise) => !selectedExerciseIds.has(exercise.id));

  if (availableOptions.length === 0) {
    return undefined;
  }

  const previousIndex = previousExerciseId
    ? options.findIndex((exercise) => exercise.id === previousExerciseId)
    : -1;

  if (previousIndex === -1) {
    return availableOptions[0]?.id;
  }

  return (
    options.slice(previousIndex + 1).find((exercise) => !selectedExerciseIds.has(exercise.id))
      ?.id ?? availableOptions[0]?.id
  );
}

function appendExercise(
  preferences: ReadonlyArray<{ exerciseId: string }>,
  exerciseId: string,
): ReadonlyArray<string> {
  return [...preferences.map((preference) => preference.exerciseId), exerciseId].filter(
    (candidate, index, exerciseIds) => exerciseIds.indexOf(candidate) === index,
  );
}

function getIsolationIcon(primaryMuscleGroup: ExerciseCatalogMuscleGroupId) {
  if (primaryMuscleGroup === "abs") {
    return <Activity size={17} strokeWidth={1.8} />;
  }

  return <Dumbbell size={17} strokeWidth={1.8} />;
}

function formatExerciseName(name: string) {
  return name
    .replace(/^Flat /, "")
    .replace(/Barbell Romanian Deadlifts/, "Romanian Deadlift")
    .replace(/Barbell Squats/, "Back Squat")
    .replace(/Standing Overhead Barbell Press/, "Overhead Press")
    .replace(/Pull-Ups/, "Pull-Up (Neutral Grip)")
    .replace(/Chest Supported/g, "Chest-Supported")
    .replace(/Press-Downs/, "Pushdown")
    .replace(/Raises/g, "Raise")
    .replace(/Crunches/g, "Crunch");
}

function formatIsolationGroupLabel(label: string) {
  return label === "Abs" ? "Core" : label;
}
