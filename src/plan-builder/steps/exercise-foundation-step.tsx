import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Button } from "../../design-system/button";
import { cn } from "../../design-system/cn";
import { StepActions, StepPanel } from "../../design-system/step-screen";
import {
  type CompoundCapableMovementPatternId,
  getExerciseCatalogExercise,
} from "../exercise-catalog";
import {
  commitPendingExerciseSelectionPreferences,
  type ExerciseSelectionPendingInputId,
  type ExerciseSelectionPendingInputs,
  type ExerciseSelectionPreferenceItem,
  type ExerciseSelectionPreferenceListId,
  type ExerciseSelectionPreferences,
  type ExerciseSelectionPreferenceValidationErrors,
  emptyExerciseSelectionPendingInputs,
  hasExerciseSelectionPreferenceValidationErrors,
  removeExerciseSelectionPreferenceItem,
} from "../exercise-selection-preferences";
import type { TrainingFrequencyDaysPerWeek } from "../plan-blueprint-types";
import { planBuilderPaths } from "../plan-builder-paths";
import type { TrainingSplitId } from "../training-split";
import {
  formatMovementPatternLabel,
  getWeeklyMovementCoverage,
  type MainCompoundSelection,
  normalizeMainCompoundSelections,
} from "../weekly-movement-coverage";

type ExerciseFoundationStepProps = {
  exerciseSelectionPreferences: ExerciseSelectionPreferences;
  mainCompoundSelections: ReadonlyArray<MainCompoundSelection>;
  onExerciseSelectionPreferencesChange: (
    exerciseSelectionPreferences: ExerciseSelectionPreferences,
  ) => Promise<void>;
  split: TrainingSplitId;
  trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek;
};

type ExerciseSelectionPreferencesEditorProps = {
  controlId: string;
  description: string;
  emptyState: string;
  inputLabel: string;
  itemAriaLabel: string;
  items: ReadonlyArray<ExerciseSelectionPreferenceItem>;
  listId: ExerciseSelectionPreferenceListId;
  onAdd: (listId: ExerciseSelectionPreferenceListId) => Promise<void>;
  onInputChange: (listId: ExerciseSelectionPreferenceListId, value: string) => void;
  onRemove: (
    listId: ExerciseSelectionPreferenceListId,
    itemId: ExerciseSelectionPreferenceItem["id"],
  ) => Promise<void>;
  pendingValue: string;
  validationError?: string;
};

type FoundationRowStatus = "confirmed" | "missing_required" | "recommended" | "suggested";

type SuggestedFoundationByPattern = Partial<Record<CompoundCapableMovementPatternId, string>>;

const fullBodySuggestedFoundation: SuggestedFoundationByPattern = {
  hip_hamstring_dominant: "barbell-or-dumbbell-romanian-deadlifts",
  horizontal_pull: "bent-over-barbell-or-dumbbell-rows",
  horizontal_push: "flat-barbell-or-dumbbell-bench-press",
  quad_dominant: "barbell-or-dumbbell-squats",
};

const allPatternSuggestedFoundation: SuggestedFoundationByPattern = {
  ...fullBodySuggestedFoundation,
  vertical_pull: "pull-ups",
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

export function ExerciseFoundationStep({
  exerciseSelectionPreferences,
  mainCompoundSelections,
  onExerciseSelectionPreferencesChange,
  split,
  trainingFrequencyDaysPerWeek,
}: ExerciseFoundationStepProps) {
  const [pendingInputs, setPendingInputs] = useState<ExerciseSelectionPendingInputs>({
    ...emptyExerciseSelectionPendingInputs,
  });
  const [validationErrors, setValidationErrors] =
    useState<ExerciseSelectionPreferenceValidationErrors>({});
  const coverage = getWeeklyMovementCoverage({
    mainCompoundSelections,
    split,
    trainingFrequencyDaysPerWeek,
  });
  const normalizedSelections = normalizeMainCompoundSelections(mainCompoundSelections);
  const suggestedFoundation = suggestedFoundationBySplit[split];
  const suggestedRequiredPatternCount = coverage.rows.filter(
    (row) =>
      row.requirement === "required" && suggestedFoundation[row.movementPattern] !== undefined,
  ).length;
  const missingSuggestedRequiredCount =
    coverage.requiredPatternCount - suggestedRequiredPatternCount;

  function handleInputChange(listId: ExerciseSelectionPreferenceListId, value: string) {
    const inputId = getExerciseSelectionPendingInputId(listId);

    setPendingInputs((currentPendingInputs) => ({
      ...currentPendingInputs,
      [inputId]: value,
    }));
    setValidationErrors((currentValidationErrors) =>
      clearExerciseSelectionValidationError(currentValidationErrors, inputId),
    );
  }

  async function handleAdd(listId: ExerciseSelectionPreferenceListId) {
    const inputId = getExerciseSelectionPendingInputId(listId);
    await addExerciseSelectionPreference(listId, pendingInputs[inputId]);
  }

  async function addExerciseSelectionPreference(
    listId: ExerciseSelectionPreferenceListId,
    exerciseName: string,
  ) {
    const inputId = getExerciseSelectionPendingInputId(listId);
    const commitResult = commitPendingExerciseSelectionPreferences({
      createId: () => crypto.randomUUID(),
      exerciseSelectionPreferences,
      pendingInputs: {
        ...emptyExerciseSelectionPendingInputs,
        [inputId]: exerciseName,
      },
    });

    if (hasExerciseSelectionPreferenceValidationErrors(commitResult.validationErrors)) {
      setValidationErrors((currentValidationErrors) => ({
        ...currentValidationErrors,
        ...commitResult.validationErrors,
      }));
      return;
    }

    setValidationErrors((currentValidationErrors) =>
      clearExerciseSelectionValidationError(currentValidationErrors, inputId),
    );
    setPendingInputs((currentPendingInputs) => ({
      ...currentPendingInputs,
      [inputId]: "",
    }));

    await onExerciseSelectionPreferencesChange(commitResult.exerciseSelectionPreferences);
  }

  async function handleRemove(
    listId: ExerciseSelectionPreferenceListId,
    itemId: ExerciseSelectionPreferenceItem["id"],
  ) {
    setValidationErrors({});

    await onExerciseSelectionPreferencesChange(
      removeExerciseSelectionPreferenceItem({
        exerciseSelectionPreferences,
        itemId,
        listId,
      }),
    );
  }

  return (
    <div className="grid gap-6">
      <StepPanel aria-labelledby="exercise-foundation-title">
        <div className="space-y-4">
          <div>
            <h3 className="sr-only" id="exercise-foundation-title">
              Exercise foundation overview
            </h3>
            <p className="text-sm font-semibold text-stone-700">
              {getSuggestedFoundationSummary({
                missingSuggestedRequiredCount,
                requiredPatternCount: coverage.requiredPatternCount,
                suggestedRequiredPatternCount,
              })}
            </p>
            {coverage.coverageRuleFamily === "full_body" ? (
              <p className="mt-2 text-sm text-stone-600">
                Recommended push balance: add Vertical push.
              </p>
            ) : null}
          </div>

          <ul aria-label="Exercise foundation rows" className="grid gap-3">
            {coverage.rows.map((row) => {
              const confirmedSelection = normalizedSelections.find(
                (selection) => selection.movementPattern === row.movementPattern,
              );
              const suggestedExerciseId = suggestedFoundation[row.movementPattern];
              const status = getFoundationRowStatus({
                confirmedSelection,
                requirement: row.requirement,
                suggestedExerciseId,
              });
              const exerciseName = getFoundationExerciseName({
                confirmedSelection,
                suggestedExerciseId,
              });

              return (
                <li
                  className="rounded-2xl border border-stone-900/10 bg-white/90 px-4 py-4 shadow-sm"
                  key={row.movementPattern}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                        {row.bucket}
                      </p>
                      <h4 className="text-base font-black text-stone-950">
                        {formatMovementPatternLabel(row.movementPattern)}
                      </h4>
                      <p className="text-sm text-stone-600">
                        {exerciseName ?? getMissingFoundationCopy(row.requirement)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.16em]",
                        getFoundationStatusClassName(status),
                      )}
                    >
                      {getFoundationStatusLabel(status)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>

          <StepActions>
            <Button asChild size="step" variant="outline">
              <Link to={planBuilderPaths.volume}>
                <ArrowLeft aria-hidden="true" size={20} strokeWidth={1.9} />
                Back to Volume
              </Link>
            </Button>
            <Button disabled size="step" type="button" variant="builderPrimary">
              Confirm main compounds to continue.
            </Button>
          </StepActions>
        </div>
      </StepPanel>

      <details className="rounded-2xl border border-stone-900/10 bg-stone-50/80 shadow-sm">
        <summary className="cursor-pointer list-none px-5 py-4">
          <span className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-stone-500">
            Secondary section
          </span>
          <span className="mt-1 block text-sm font-black text-stone-950">
            Exercise preferences · optional
          </span>
          <span className="mt-1 block text-sm text-stone-600">
            Keep soft Preferred Exercise and Avoided Exercise inputs separate from Weekly Movement
            Coverage.
          </span>
        </summary>
        <div className="border-t border-stone-900/10 px-5 py-5">
          <p className="max-w-3xl text-sm leading-6 text-stone-600">
            Preferred Exercise and Avoided Exercise inputs stay editable here, but they do not count
            toward Weekly Movement Coverage.
          </p>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <ExerciseSelectionPreferencesEditor
              controlId="preferred-exercises-input"
              description="Optional soft preferences. Just Workout will prioritize them when they fit your Plan Blueprint, movement balance, and Weekly Rep Targets."
              emptyState="No Preferred Exercises added yet."
              inputLabel="Preferred Exercises"
              itemAriaLabel="Preferred Exercise entries"
              items={exerciseSelectionPreferences.preferredExercises}
              listId="preferredExercises"
              onAdd={handleAdd}
              onInputChange={handleInputChange}
              onRemove={handleRemove}
              pendingValue={pendingInputs.preferredExercise}
              validationError={validationErrors.preferredExercise}
            />
            <ExerciseSelectionPreferencesEditor
              controlId="avoided-exercises-input"
              description="Optional hard exclusions. Add painful, unavailable, or unsuitable exercises here so Just Workout excludes them from later Training Plan generation."
              emptyState="No Avoided Exercises added yet."
              inputLabel="Avoided Exercises"
              itemAriaLabel="Avoided Exercise entries"
              items={exerciseSelectionPreferences.avoidedExercises}
              listId="avoidedExercises"
              onAdd={handleAdd}
              onInputChange={handleInputChange}
              onRemove={handleRemove}
              pendingValue={pendingInputs.avoidedExercise}
              validationError={validationErrors.avoidedExercise}
            />
          </div>
        </div>
      </details>
    </div>
  );
}

function ExerciseSelectionPreferencesEditor({
  controlId,
  description,
  emptyState,
  inputLabel,
  itemAriaLabel,
  items,
  listId,
  onAdd,
  onInputChange,
  onRemove,
  pendingValue,
  validationError,
}: ExerciseSelectionPreferencesEditorProps) {
  const validationMessageId = `${controlId}-validation-message`;

  return (
    <section className="rounded-xl border border-stone-900/10 bg-[#fcfaf6] p-5">
      <div>
        <h4 className="text-lg font-black text-stone-950">{inputLabel}</h4>
        <p className="mt-2 text-sm leading-6 text-stone-600">{description}</p>
      </div>

      <form
        className="mt-5"
        onSubmit={(event) => {
          event.preventDefault();
          void onAdd(listId);
        }}
      >
        <label className="text-sm font-bold text-stone-900" htmlFor={controlId}>
          {inputLabel}
        </label>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <input
            aria-describedby={validationError ? validationMessageId : undefined}
            aria-invalid={validationError ? "true" : undefined}
            className={cn(
              "min-h-11 flex-1 rounded-md border bg-white px-3 py-2 text-sm text-stone-950 placeholder:text-stone-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
              validationError
                ? "border-[#d6462f] focus-visible:outline-[#d6462f]"
                : "border-stone-900/15 focus-visible:outline-stone-950",
            )}
            id={controlId}
            onChange={(event) => onInputChange(listId, event.currentTarget.value)}
            placeholder="Add an exercise name"
            type="text"
            value={pendingValue}
          />
          <Button size="sm" type="submit" variant="outline">
            Add
          </Button>
        </div>
        {validationError ? (
          <p className="mt-2 text-sm font-semibold text-[#b93725]" id={validationMessageId}>
            {validationError}
          </p>
        ) : null}
      </form>

      <ul aria-label={itemAriaLabel} className="mt-5 grid gap-2.5">
        {items.length > 0 ? (
          items.map((item) => (
            <li
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-900/10 bg-white px-4 py-3"
              key={item.id}
            >
              <span className="text-sm font-semibold text-stone-950">{item.rawText}</span>
              <Button
                onClick={() => {
                  void onRemove(listId, item.id);
                }}
                size="sm"
                type="button"
                variant="ghost"
              >
                Remove
              </Button>
            </li>
          ))
        ) : (
          <li className="rounded-lg border border-dashed border-stone-900/12 bg-white px-4 py-3 text-sm font-medium text-stone-600">
            {emptyState}
          </li>
        )}
      </ul>
    </section>
  );
}

function clearExerciseSelectionValidationError(
  validationErrors: ExerciseSelectionPreferenceValidationErrors,
  inputId: ExerciseSelectionPendingInputId,
): ExerciseSelectionPreferenceValidationErrors {
  if (!(inputId in validationErrors)) {
    return validationErrors;
  }

  const nextValidationErrors = { ...validationErrors };

  delete nextValidationErrors[inputId];

  return nextValidationErrors;
}

function getExerciseSelectionPendingInputId(
  listId: ExerciseSelectionPreferenceListId,
): ExerciseSelectionPendingInputId {
  return listId === "preferredExercises" ? "preferredExercise" : "avoidedExercise";
}

function getFoundationRowStatus({
  confirmedSelection,
  requirement,
  suggestedExerciseId,
}: {
  confirmedSelection: MainCompoundSelection | undefined;
  requirement: "recommended" | "required";
  suggestedExerciseId: string | undefined;
}): FoundationRowStatus {
  if (confirmedSelection !== undefined) {
    return "confirmed";
  }

  if (suggestedExerciseId !== undefined) {
    return "suggested";
  }

  return requirement === "required" ? "missing_required" : "recommended";
}

function getFoundationExerciseName({
  confirmedSelection,
  suggestedExerciseId,
}: {
  confirmedSelection: MainCompoundSelection | undefined;
  suggestedExerciseId: string | undefined;
}): string | null {
  if (confirmedSelection !== undefined) {
    return getExerciseCatalogExercise(confirmedSelection.exerciseId)?.name ?? null;
  }

  if (suggestedExerciseId !== undefined) {
    return getExerciseCatalogExercise(suggestedExerciseId)?.name ?? null;
  }

  return null;
}

function getFoundationStatusClassName(status: FoundationRowStatus): string {
  switch (status) {
    case "confirmed":
      return "bg-emerald-100 text-emerald-900";
    case "missing_required":
      return "bg-amber-100 text-amber-900";
    case "recommended":
      return "bg-stone-200 text-stone-800";
    case "suggested":
      return "bg-sky-100 text-sky-900";
  }
}

function getFoundationStatusLabel(status: FoundationRowStatus): string {
  switch (status) {
    case "confirmed":
      return "Confirmed";
    case "missing_required":
      return "Missing required";
    case "recommended":
      return "Recommended";
    case "suggested":
      return "Suggested";
  }
}

function getMissingFoundationCopy(requirement: "recommended" | "required"): string {
  return requirement === "required"
    ? "No suggested exercise yet. Required coverage is still missing."
    : "Helpful next iteration addition for push balance.";
}

function getSuggestedFoundationSummary({
  missingSuggestedRequiredCount,
  requiredPatternCount,
  suggestedRequiredPatternCount,
}: {
  missingSuggestedRequiredCount: number;
  requiredPatternCount: number;
  suggestedRequiredPatternCount: number;
}): string {
  if (missingSuggestedRequiredCount === 0) {
    return `Suggested starting point: would cover ${suggestedRequiredPatternCount} of ${requiredPatternCount} required patterns.`;
  }

  return `Suggested starting point: would cover ${suggestedRequiredPatternCount} of ${requiredPatternCount} required patterns · ${missingSuggestedRequiredCount} required still missing.`;
}
