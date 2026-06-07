import { Link } from "@tanstack/react-router";
import {
  AlarmClock,
  ArrowLeft,
  ArrowRight,
  ChartNoAxesColumnIncreasing,
  Dumbbell,
  Scale,
  Shield,
  Target,
} from "lucide-react";
import { useState } from "react";
import { Button } from "../../design-system/button";
import { cn } from "../../design-system/cn";
import { StepActions, StepPanel } from "../../design-system/step-screen";
import {
  type AutomaticExerciseSelectionRule,
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
import { planBuilderPaths } from "../plan-builder-paths";
import "./exercise-selection-preferences-step.css";

const automaticRuleIcons = {
  adaptive_rest_timing: AlarmClock,
  compound_priority: Dumbbell,
  hard_avoid_exclusions: Shield,
  movement_pattern_balance: Scale,
  targeted_isolation_support: Target,
  weekly_volume_alignment: ChartNoAxesColumnIncreasing,
} as const satisfies Record<AutomaticExerciseSelectionRule["id"], typeof Dumbbell>;

type ExerciseSelectionPreferencesStepProps = {
  exerciseSelectionPreferences: ExerciseSelectionPreferences;
  onContinueToGenerate: (
    exerciseSelectionPreferences: ExerciseSelectionPreferences,
  ) => Promise<void>;
  onExerciseSelectionPreferencesChange: (
    exerciseSelectionPreferences: ExerciseSelectionPreferences,
  ) => Promise<void>;
  rulesAppliedAutomatically: ReadonlyArray<AutomaticExerciseSelectionRule>;
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

export function ExerciseSelectionPreferencesStep({
  exerciseSelectionPreferences,
  onContinueToGenerate,
  onExerciseSelectionPreferencesChange,
  rulesAppliedAutomatically,
}: ExerciseSelectionPreferencesStepProps) {
  const [pendingInputs, setPendingInputs] = useState<ExerciseSelectionPendingInputs>({
    ...emptyExerciseSelectionPendingInputs,
  });
  const [validationErrors, setValidationErrors] =
    useState<ExerciseSelectionPreferenceValidationErrors>({});

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

  async function handleContinueToGenerateClick() {
    const commitResult = commitPendingExerciseSelectionPreferences({
      createId: () => crypto.randomUUID(),
      exerciseSelectionPreferences,
      pendingInputs,
    });

    if (hasExerciseSelectionPreferenceValidationErrors(commitResult.validationErrors)) {
      setValidationErrors(commitResult.validationErrors);
      return;
    }

    setPendingInputs({
      ...emptyExerciseSelectionPendingInputs,
    });
    setValidationErrors({});

    await onContinueToGenerate(commitResult.exerciseSelectionPreferences);
  }

  return (
    <div className="exercise-selection-layout">
      <div className="exercise-selection-main">
        <StepPanel
          aria-labelledby="exercise-selection-preferences-title"
          className="exercise-selection-primary"
        >
          <div className="sr-only">
            <h3
              className="text-2xl font-black leading-tight text-stone-950"
              id="exercise-selection-preferences-title"
            >
              Choose exercise preferences
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
              Add exercises you want the Training Plan to favor or avoid. The strategy, equipment,
              and coverage checks stay visible as guardrails while preferences remain the main task.
            </p>
          </div>

          <div className="exercise-selection-preference-grid mt-6 grid gap-4 lg:grid-cols-2">
            <ExerciseSelectionPreferencesEditor
              description="Optional soft preferences. Just Workout will prioritize them when they fit your Plan Blueprint, movement balance, and Weekly Rep Targets."
              emptyState="No Preferred Exercises added yet."
              controlId="preferred-exercises-input"
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
              description="Optional hard exclusions. Add painful, unavailable, or unsuitable exercises here so Just Workout excludes them from later Training Plan generation."
              emptyState="No Avoided Exercises added yet."
              controlId="avoided-exercises-input"
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

          <StepActions className="exercise-selection-actions">
            <Button asChild size="step" variant="outline">
              <Link to={planBuilderPaths.volume}>
                <ArrowLeft aria-hidden="true" size={20} strokeWidth={1.9} />
                Back to Volume
              </Link>
            </Button>
            <Button
              onClick={() => {
                void handleContinueToGenerateClick();
              }}
              size="step"
              type="button"
              variant="builderPrimary"
            >
              Continue to Generate
              <ArrowRight aria-hidden="true" size={20} strokeWidth={1.9} />
            </Button>
          </StepActions>
        </StepPanel>

        <ExerciseSelectionAutomaticRulesPanel
          rulesAppliedAutomatically={rulesAppliedAutomatically}
        />
      </div>
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
    <section className="exercise-selection-editor rounded-lg border border-stone-900/10 bg-white/80 p-5">
      <div>
        <h4 className="text-lg font-black text-stone-950">{inputLabel}</h4>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">{description}</p>
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
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-900/10 bg-[#f9f6ef] px-4 py-3"
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
          <li className="rounded-lg border border-dashed border-stone-900/12 bg-[#fcfaf6] px-4 py-3 text-sm font-medium text-stone-600">
            {emptyState}
          </li>
        )}
      </ul>
    </section>
  );
}

function ExerciseSelectionAutomaticRulesPanel({
  rulesAppliedAutomatically,
}: {
  rulesAppliedAutomatically: ReadonlyArray<AutomaticExerciseSelectionRule>;
}) {
  return (
    <StepPanel aria-labelledby="automatic-rules-title" className="exercise-selection-rules-panel">
      <div className="exercise-selection-rules-panel__header">
        <h3 id="automatic-rules-title">Rules applied automatically</h3>
        <p>Just Workout applies these during Training Plan generation.</p>
      </div>

      <ul aria-label="Automatic exercise selection rules" className="exercise-selection-rules-list">
        {rulesAppliedAutomatically.map((rule, index) => {
          const RuleIcon = automaticRuleIcons[rule.id];

          return (
            <li
              className="exercise-selection-rules-list__item"
              data-rule-index={index}
              key={rule.id}
            >
              <span className="exercise-selection-rules-list__icon" aria-hidden="true">
                <RuleIcon size={28} strokeWidth={2.2} />
              </span>
              <div>
                <p className="exercise-selection-rules-list__title">{rule.label}</p>
                <p className="exercise-selection-rules-list__description">{rule.description}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </StepPanel>
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
