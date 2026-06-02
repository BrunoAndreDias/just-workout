import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "../../design-system/button";
import { cn } from "../../design-system/cn";
import { StepActions, StepPanel } from "../../design-system/step-screen";
import {
  PlanBuilderStepStatusCard,
  type PlanBuilderStepStatusCardProps,
} from "../components/plan-builder-page";
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
  getEquipmentPreset,
  getExerciseSelectionStrategy,
  hasExerciseSelectionPreferenceValidationErrors,
  type MovementPatternCoverageGroup,
  removeExerciseSelectionPreferenceItem,
} from "../exercise-selection-preferences";
import { planBuilderPaths } from "../plan-builder-paths";
import { MovementPatternCoverageSection } from "./movement-pattern-coverage";
import "./exercise-selection-preferences-step.css";

const exerciseSelectionHighlights = [
  {
    body: "Main work favors productive compound lifts when they fit the Plan Blueprint.",
    title: "Compound-first bias",
  },
  {
    body: "Isolation work can still support Weekly Rep Targets when more direct work is needed.",
    title: "Targeted support",
  },
  {
    body: "Painful, unavailable, or unsuitable exercises stay out of later Training Plan choices.",
    title: "Safety boundary",
  },
] as const satisfies ReadonlyArray<ExerciseSelectionHighlightProps>;

const exerciseSelectionStatusCards = [
  {
    body: "This is still your Plan Blueprint. Just Workout waits until Review before the later Training Plan is created.",
    title: "Plan status",
  },
  {
    body: "Step 5 saves Exercise Selection Preferences only. Day-by-day workouts and final exercise choices do not appear here.",
    title: "Step scope",
  },
  {
    body: "Preferred Exercises stay soft preferences, while Avoided Exercises remain hard exclusions. Review will surface an Exercise Selection Conflict if a later replacement is unsafe.",
    title: "Preference rules",
  },
] as const satisfies ReadonlyArray<Pick<PlanBuilderStepStatusCardProps, "body" | "title">>;

type ExerciseSelectionPreferencesStepProps = {
  exerciseSelectionPreferences: ExerciseSelectionPreferences;
  movementPatternCoverage: ReadonlyArray<MovementPatternCoverageGroup>;
  onContinueToReview: (exerciseSelectionPreferences: ExerciseSelectionPreferences) => Promise<void>;
  onExerciseSelectionPreferencesChange: (
    exerciseSelectionPreferences: ExerciseSelectionPreferences,
  ) => Promise<void>;
  rulesAppliedAutomatically: ReadonlyArray<AutomaticExerciseSelectionRule>;
};

type ExerciseSelectionHighlightProps = {
  body: string;
  title: string;
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
  movementPatternCoverage,
  onContinueToReview,
  onExerciseSelectionPreferencesChange,
  rulesAppliedAutomatically,
}: ExerciseSelectionPreferencesStepProps) {
  const selectedStrategy = getExerciseSelectionStrategy(exerciseSelectionPreferences.strategy);
  const selectedEquipmentPreset = getEquipmentPreset(exerciseSelectionPreferences.equipmentPreset);
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
    const commitResult = commitPendingExerciseSelectionPreferences({
      createId: () => crypto.randomUUID(),
      exerciseSelectionPreferences,
      pendingInputs: {
        ...emptyExerciseSelectionPendingInputs,
        [inputId]: pendingInputs[inputId],
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

  async function handleContinueToReviewClick() {
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

    await onContinueToReview(commitResult.exerciseSelectionPreferences);
  }

  return (
    <div className="exercise-selection-layout grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
      <div className="exercise-selection-main min-w-0 space-y-5">
        <StepPanel
          aria-labelledby="exercise-selection-preferences-title"
          className="exercise-selection-primary"
        >
          <div>
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

          <div className="exercise-selection-conflict-note mt-5 rounded-lg border border-[#d9c8a7] bg-[#f9f6ef] p-4">
            <h4 className="text-base font-black text-stone-950">Before you continue</h4>
            <p className="mt-2 text-sm leading-6 text-stone-700">
              Avoided Exercises are hard exclusions. If generation later cannot find a safe viable
              replacement, Review will surface an Exercise Selection Conflict for you to resolve
              instead of silently keeping the avoided exercise.
            </p>
          </div>

          <StepActions className="exercise-selection-actions mt-6">
            <Button asChild variant="outline">
              <Link to={planBuilderPaths.volume}>Back to Volume</Link>
            </Button>
            <Button
              onClick={() => {
                void handleContinueToReviewClick();
              }}
              type="button"
            >
              Continue to Review
            </Button>
          </StepActions>
        </StepPanel>

        <div className="exercise-selection-context-grid grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <StepPanel
            aria-labelledby="exercise-selection-strategy-title"
            className="exercise-selection-summary-panel"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3
                  className="text-xl font-black leading-tight text-stone-950"
                  id="exercise-selection-strategy-title"
                >
                  Exercise selection strategy
                </h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
                  Step 5 keeps the Plan Blueprint focused on strategy and equipment before the later
                  Training Plan is created.
                </p>
              </div>
              {selectedStrategy.isRecommended ? (
                <span className="rounded-full bg-[#b93725] px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-wide text-white">
                  Recommended default
                </span>
              ) : null}
            </div>

            <div className="mt-4 rounded-lg bg-stone-950 p-4 text-stone-50">
              <h4 className="text-lg font-black">{selectedStrategy.title}</h4>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-200">
                {selectedStrategy.description}
              </p>
            </div>

            <ul className="mt-4 grid gap-3">
              {exerciseSelectionHighlights.map((highlight) => (
                <ExerciseSelectionHighlight key={highlight.title} {...highlight} />
              ))}
            </ul>
          </StepPanel>

          <StepPanel
            aria-labelledby="equipment-preset-title"
            className="exercise-selection-summary-panel"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3
                  className="text-xl font-black leading-tight text-stone-950"
                  id="equipment-preset-title"
                >
                  Equipment preset
                </h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
                  Full gym is the current preset. It defines the equipment pool used later during
                  Training Plan generation.
                </p>
              </div>
              <span className="rounded-full bg-[#006f78] px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-wide text-white">
                Current preset
              </span>
            </div>

            <div className="mt-4 rounded-lg border border-stone-900/10 bg-[#f9f6ef] p-4">
              <h4 className="text-lg font-black text-stone-950">{selectedEquipmentPreset.title}</h4>
              <ul aria-label="Included equipment" className="mt-3 flex flex-wrap gap-2">
                {selectedEquipmentPreset.includedEquipment.map((equipment) => (
                  <li key={equipment.id}>
                    <span className="inline-flex items-center rounded-full border border-stone-900/10 bg-white px-3 py-1 text-sm font-bold text-stone-950">
                      {equipment.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </StepPanel>
        </div>

        <MovementPatternCoverageSection coverageGroups={movementPatternCoverage} />
      </div>

      <aside className="exercise-selection-support grid gap-3 sm:grid-cols-2 xl:sticky xl:top-4 xl:grid-cols-1">
        <ExerciseSelectionAutomaticRulesPanel
          rulesAppliedAutomatically={rulesAppliedAutomatically}
        />
        {exerciseSelectionStatusCards.map((statusCard) => (
          <PlanBuilderStepStatusCard
            body={statusCard.body}
            key={statusCard.title}
            title={statusCard.title}
            titleDisplay="visible"
          />
        ))}
      </aside>
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
      <h3 className="text-lg font-black text-stone-950" id="automatic-rules-title">
        Rules applied automatically
      </h3>
      <p className="mt-2 text-sm leading-6 text-stone-600">
        Just Workout applies these during Training Plan generation. Step 5 does not add manual rest
        controls or detailed prescriptions.
      </p>

      <ul aria-label="Automatic exercise selection rules" className="mt-4 grid gap-2.5">
        {rulesAppliedAutomatically.map((rule) => (
          <li className="rounded-lg bg-[#fcfaf6] px-4 py-3" key={rule.id}>
            <p className="text-sm font-bold text-stone-950">{rule.label}</p>
            <p className="mt-1 text-sm leading-6 text-stone-600">{rule.description}</p>
          </li>
        ))}
      </ul>
    </StepPanel>
  );
}

function ExerciseSelectionHighlight({ body, title }: ExerciseSelectionHighlightProps) {
  return (
    <li className="rounded-lg bg-[#f9f6ef] px-4 py-3">
      <h5 className="text-sm font-black text-stone-950">{title}</h5>
      <p className="mt-1 text-sm leading-6 text-stone-600">{body}</p>
    </li>
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
