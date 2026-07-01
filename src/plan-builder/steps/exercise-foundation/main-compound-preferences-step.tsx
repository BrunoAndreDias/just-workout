import {
  Activity,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  CirclePlus,
  Dumbbell,
  Info,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { Button } from "../../../design-system/button";
import { StepActions, StepPanel } from "../../../design-system/step-screen";
import type {
  CompoundCapableMovementPatternId,
  ExerciseCatalogMuscleGroupId,
  MovementPatternId,
} from "../../exercise-catalog";
import type {
  IsolationExercisePreferenceOption,
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
  onBackToVolume: () => void;
  onContinueToGenerate: () => Promise<void>;
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
  onBackToVolume,
  onContinueToGenerate,
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

  async function updateMainSelection(row: MainCompoundPreferenceRowReadModel, exerciseId: string) {
    await onMainCompoundPreferencesChange({
      exerciseIds: moveExerciseToFront(row.preferences, exerciseId),
      movementPattern: row.movementPattern,
    });
  }

  async function addMainExercise(row: MainCompoundPreferenceRowReadModel) {
    const exerciseId = getNextExerciseId(row.mainCompoundOptions, row.preferences);

    if (!exerciseId) {
      return;
    }

    await onMainCompoundPreferencesChange({
      exerciseIds: appendExercise(row.preferences, exerciseId),
      movementPattern: row.movementPattern,
    });
  }

  async function updateRotationSelection(
    row: MainCompoundPreferenceRowReadModel,
    exerciseId: string,
  ) {
    await onMainCompoundRotationPreferencesChange({
      exerciseIds: moveExerciseToFront(row.preferences, exerciseId),
      movementPattern: row.movementPattern,
    });
  }

  async function addRotationExercise(row: MainCompoundPreferenceRowReadModel) {
    const exerciseId = getNextExerciseId(row.mainCompoundOptions, row.preferences);

    if (!exerciseId) {
      return;
    }

    await onMainCompoundRotationPreferencesChange({
      exerciseIds: appendExercise(row.preferences, exerciseId),
      movementPattern: row.movementPattern,
    });
  }

  async function updateIsolationSelection(
    row: IsolationExercisePreferenceRowReadModel,
    exerciseId: string,
  ) {
    await onIsolationExercisePreferencesChange({
      exerciseIds: moveExerciseToFront(row.preferences, exerciseId),
      primaryMuscleGroup: row.primaryMuscleGroup,
    });
  }

  async function addIsolationExercise(row: IsolationExercisePreferenceRowReadModel) {
    const exerciseId = getNextExerciseId(row.isolationOptions, row.preferences);

    if (!exerciseId) {
      return;
    }

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
            note="Aim for 5-6 main lifts. These form the foundation of your training."
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
                    onAddExercise={() => {
                      void addMainExercise(row);
                    }}
                    onSelectionChange={(exerciseId) => {
                      void updateMainSelection(row, exerciseId);
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
                    onAddExercise={() => {
                      void addRotationExercise(row);
                    }}
                    onSelectionChange={(exerciseId) => {
                      void updateRotationSelection(row, exerciseId);
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
            note="Choose 3-8 isolation exercises depending on your goals and available time."
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
                    onAddExercise={() => {
                      void addIsolationExercise(row);
                    }}
                    onSelectionChange={(exerciseId) => {
                      void updateIsolationSelection(row, exerciseId);
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

        <StepActions className="exercise-selection-actions">
          <Button onClick={onBackToVolume} size="step" type="button" variant="outline">
            <ArrowLeft aria-hidden="true" size={20} strokeWidth={1.9} />
            Back to Volume
          </Button>
          <Button
            onClick={() => {
              void onContinueToGenerate();
            }}
            size="step"
            type="button"
            variant="builderPrimary"
          >
            Continue to Generate
            <ArrowRight aria-hidden="true" size={20} strokeWidth={1.9} />
          </Button>
        </StepActions>

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
          movementPattern={activeMainCompoundPickerRow.movementPattern}
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
          movementPattern={activeRotationPickerRow.movementPattern}
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
  note,
  number,
  summary,
}: {
  body: string;
  children: ReactNode;
  heading: string;
  headingId: string;
  note?: string;
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

      {note ? (
        <p className="exercise-pool-section__note">
          <Info aria-hidden="true" size={14} strokeWidth={2} />
          {note}
        </p>
      ) : null}
    </section>
  );
}

function MovementPatternBucket({
  onAddExercise,
  onSelectionChange,
  onToggleRanker,
  row,
}: {
  onAddExercise: () => void;
  onSelectionChange: (exerciseId: string) => void;
  onToggleRanker: () => void;
  row: MainCompoundPreferenceRowReadModel;
}) {
  const selectedExercise = getSelectedExercise({
    defaultExerciseId: defaultMainExerciseByPattern[row.movementPattern],
    options: row.mainCompoundOptions,
    preferences: row.preferences,
  });

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

      <ExerciseDropdown
        ariaLabel={`Choose ${row.movementPatternLabel} exercise`}
        onChange={onSelectionChange}
        options={row.mainCompoundOptions}
        selectedExerciseId={selectedExercise?.id}
        selectedExerciseIds={row.preferences.map((preference) => preference.exerciseId)}
      />

      <button className="exercise-selection-secondary-button" onClick={onAddExercise} type="button">
        + Add exercise
      </button>
      <MainCompoundPickerToggleButton
        accessibleLabel={`Rank ${row.movementPatternLabel} preferences`}
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
  onSelectionChange,
  onToggleRanker,
  row,
}: {
  onAddExercise: () => void;
  onSelectionChange: (exerciseId: string) => void;
  onToggleRanker: () => void;
  row: MainCompoundPreferenceRowReadModel;
}) {
  const selectedExercise = getSelectedExercise({
    defaultExerciseId: defaultRotationExerciseByPattern[row.movementPattern],
    options: row.mainCompoundOptions,
    preferences: row.preferences,
  });

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

      <ExerciseDropdown
        ariaLabel={`Choose ${row.movementPatternLabel} rotation exercise`}
        onChange={onSelectionChange}
        options={row.mainCompoundOptions}
        selectedExerciseId={selectedExercise?.id}
        selectedExerciseIds={row.preferences.map((preference) => preference.exerciseId)}
      />

      <button className="exercise-selection-secondary-button" onClick={onAddExercise} type="button">
        + Add exercise
      </button>
      <MainCompoundPickerToggleButton
        accessibleLabel={`Rank ${row.movementPatternLabel} rotation preferences`}
        isOpen={false}
        label="Rank rotation preferences"
        onToggle={onToggleRanker}
        pickerId={`main-compound-rotation-preferences-picker-${row.movementPattern}`}
      />
      <PreferenceSummary preferences={row.preferences} />
    </li>
  );
}

function ExerciseDropdown({
  ariaLabel,
  onChange,
  options,
  selectedExerciseId,
  selectedExerciseIds,
}: {
  ariaLabel: string;
  onChange: (exerciseId: string) => void;
  options: ReadonlyArray<SelectableExercise>;
  selectedExerciseId: string | undefined;
  selectedExerciseIds: ReadonlyArray<string>;
}) {
  const selectedExercise = options.find((exercise) => exercise.id === selectedExerciseId);
  const selectedExerciseIdSet = new Set(selectedExerciseIds);
  const availableOptions = options.filter((exercise) => !selectedExerciseIdSet.has(exercise.id));

  return (
    <label
      className={`exercise-dropdown${selectedExercise ? " exercise-dropdown--has-selection" : ""}`}
    >
      <span className="sr-only">{ariaLabel}</span>
      <select
        aria-label={ariaLabel}
        onChange={(event) => onChange(event.target.value)}
        value={selectedExerciseId ?? ""}
      >
        {selectedExerciseId ? null : <option value="">Choose exercise</option>}
        {selectedExercise ? (
          <option
            aria-label={formatExerciseName(selectedExercise.name)}
            hidden
            value={selectedExercise.id}
          />
        ) : null}
        {availableOptions.map((exercise) => (
          <option key={exercise.id} value={exercise.id}>
            {formatExerciseName(exercise.name)}
          </option>
        ))}
      </select>
      {selectedExercise ? (
        <span aria-hidden="true" className="exercise-dropdown__selected-value">
          {formatExerciseName(selectedExercise.name)}
        </span>
      ) : null}
      <ChevronDown aria-hidden="true" size={15} strokeWidth={2.2} />
    </label>
  );
}

function IsolationGroup({
  onAddExercise,
  onSelectionChange,
  onToggleRanker,
  row,
}: {
  onAddExercise: () => void;
  onSelectionChange: (exerciseId: string) => void;
  onToggleRanker: () => void;
  row: IsolationExercisePreferenceRowReadModel;
}) {
  const selectedExercise = getSelectedExercise({
    defaultExerciseId: defaultIsolationExerciseByMuscleGroup[row.primaryMuscleGroup],
    options: row.isolationOptions,
    preferences: row.preferences,
  });
  const secondaryOptions = getSecondaryIsolationOptions(row, selectedExercise?.id);

  return (
    <li
      aria-label={`${row.primaryMuscleGroupLabel} isolation exercises`}
      className="isolation-group"
    >
      <div className="isolation-group__heading">
        <span aria-hidden="true" className="isolation-group__icon">
          {getIsolationIcon(row.primaryMuscleGroup)}
        </span>
        <div>
          <h4>{formatIsolationGroupLabel(row.primaryMuscleGroupLabel)}</h4>
          <p>{row.preferences.length > 0 ? row.metadata : "1 selected"}</p>
        </div>
      </div>

      <ExerciseDropdown
        ariaLabel={`Choose ${row.primaryMuscleGroupLabel} isolation exercise`}
        onChange={onSelectionChange}
        options={row.isolationOptions}
        selectedExerciseId={selectedExercise?.id}
        selectedExerciseIds={row.preferences.map((preference) => preference.exerciseId)}
      />

      <div className="isolation-group__add-list">
        {secondaryOptions.map((exercise) => (
          <button
            className="isolation-group__add-row"
            key={exercise.id}
            onClick={onAddExercise}
            type="button"
          >
            <span>{formatExerciseName(exercise.name)}</span>
            <CirclePlus aria-hidden="true" size={15} strokeWidth={2} />
          </button>
        ))}
      </div>
      <button className="sr-only" onClick={onToggleRanker} type="button">
        Rank preferences
      </button>
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

function getSelectedExercise({
  defaultExerciseId,
  options,
  preferences,
}: {
  defaultExerciseId: string | undefined;
  options: ReadonlyArray<SelectableExercise>;
  preferences: ReadonlyArray<{ exerciseId: string; exerciseName: string }>;
}) {
  const selectedExerciseId = preferences[0]?.exerciseId ?? defaultExerciseId;

  return (
    options.find((exercise) => exercise.id === selectedExerciseId) ??
    options.find((exercise) => exercise.id === preferences[0]?.exerciseId) ??
    options[0]
  );
}

function getNextExerciseId(
  options: ReadonlyArray<SelectableExercise>,
  preferences: ReadonlyArray<{ exerciseId: string }>,
) {
  const selectedExerciseIds = new Set(preferences.map((preference) => preference.exerciseId));

  return options.find((exercise) => !selectedExerciseIds.has(exercise.id))?.id;
}

function appendExercise(
  preferences: ReadonlyArray<{ exerciseId: string }>,
  exerciseId: string,
): ReadonlyArray<string> {
  return [...preferences.map((preference) => preference.exerciseId), exerciseId].filter(
    (candidate, index, exerciseIds) => exerciseIds.indexOf(candidate) === index,
  );
}

function moveExerciseToFront(
  preferences: ReadonlyArray<{ exerciseId: string }>,
  exerciseId: string,
): ReadonlyArray<string> {
  return [
    exerciseId,
    ...preferences
      .map((preference) => preference.exerciseId)
      .filter((candidate) => candidate !== exerciseId),
  ];
}

function getSecondaryIsolationOptions(
  row: IsolationExercisePreferenceRowReadModel,
  selectedExerciseId: string | undefined,
): ReadonlyArray<IsolationExercisePreferenceOption> {
  const selectedExerciseIds = new Set([
    selectedExerciseId,
    ...row.preferences.map((preference) => preference.exerciseId),
  ]);

  return row.isolationOptions
    .filter((exercise) => !selectedExerciseIds.has(exercise.id))
    .slice(0, 2);
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
