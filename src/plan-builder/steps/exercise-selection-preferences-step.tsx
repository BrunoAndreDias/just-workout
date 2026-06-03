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
  type ExerciseCatalogMuscleGroup,
  type ExerciseCatalogMuscleGroupId,
  type ExerciseSelectionPendingInputId,
  type ExerciseSelectionPendingInputs,
  type ExerciseSelectionPreferenceItem,
  type ExerciseSelectionPreferenceListId,
  type ExerciseSelectionPreferences,
  type ExerciseSelectionPreferenceValidationErrors,
  emptyExerciseSelectionPendingInputs,
  exerciseCatalogMuscleGroups,
  getEquipmentPreset,
  getExerciseSelectionStrategy,
  hasExerciseSelectionPreferenceValidationErrors,
  type MovementPatternCoverageGroup,
  removeExerciseSelectionPreferenceItem,
} from "../exercise-selection-preferences";
import { planBuilderPaths } from "../plan-builder-paths";
import { MovementPatternCoverageSection } from "./movement-pattern-coverage";
import "./exercise-selection-preferences-step.css";

const defaultSelectedCatalogMuscleGroupId = "chest" satisfies ExerciseCatalogMuscleGroupId;

const bodyMuscleHotspots = [
  {
    d: "M162 158 C176 146 204 146 218 158 C216 180 209 195 190 198 C171 195 164 180 162 158 Z",
    id: "chest",
    targets: [{ height: 64, left: 158, top: 146, width: 64 }],
    title: "Chest",
  },
  {
    d: "M424 152 C444 139 478 139 498 152 C505 183 503 215 493 244 C474 257 448 257 429 244 C419 215 417 183 424 152 Z",
    id: "back",
    targets: [{ height: 108, left: 422, top: 142, width: 82 }],
    title: "Back",
  },
  {
    d: "M132 149 C143 132 162 132 170 151 C164 164 154 171 140 169 C130 165 126 157 132 149 Z M210 151 C218 132 237 132 248 149 C254 157 250 165 240 169 C226 171 216 164 210 151 Z",
    id: "shoulders",
    targets: [{ height: 48, left: 126, top: 128, width: 128 }],
    title: "Shoulders",
  },
  {
    d: "M157 289 C170 299 183 301 190 294 L190 420 C176 427 159 417 154 396 Z M190 294 C197 301 210 299 223 289 L226 396 C221 417 204 427 190 420 Z",
    id: "quadriceps",
    targets: [{ height: 144, left: 150, top: 286, width: 80 }],
    title: "Quadriceps",
  },
  {
    d: "M428 292 C441 302 455 304 461 296 L461 421 C447 428 430 418 425 397 Z M461 296 C468 304 482 302 495 292 L498 397 C493 418 476 428 461 421 Z",
    id: "hamstrings",
    targets: [{ height: 144, left: 421, top: 286, width: 82 }],
    title: "Hamstrings",
  },
  {
    d: "M120 174 C135 175 144 188 141 207 L131 258 C117 263 106 255 106 240 Z M260 174 C245 175 236 188 239 207 L249 258 C263 263 274 255 274 240 Z",
    id: "biceps",
    targets: [
      { height: 96, label: "left", left: 102, top: 170, width: 45 },
      { height: 96, label: "right", left: 233, top: 170, width: 45 },
    ],
    title: "Biceps",
  },
  {
    d: "M392 174 C407 175 416 188 413 207 L403 258 C389 263 378 255 378 240 Z M530 174 C515 175 506 188 509 207 L519 258 C533 263 544 255 544 240 Z",
    id: "triceps",
    targets: [
      { height: 96, label: "left", left: 374, top: 170, width: 45 },
      { height: 96, label: "right", left: 505, top: 170, width: 45 },
    ],
    title: "Triceps",
  },
] as const satisfies ReadonlyArray<{
  d: string;
  id: ExerciseCatalogMuscleGroupId;
  targets: ReadonlyArray<{
    height: number;
    label?: "left" | "right";
    left: number;
    top: number;
    width: number;
  }>;
  title: string;
}>;

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
    await addExerciseSelectionPreference(listId, pendingInputs[inputId]);
  }

  async function handleAddCatalogExercise(
    listId: ExerciseSelectionPreferenceListId,
    exerciseName: string,
  ) {
    await addExerciseSelectionPreference(listId, exerciseName);
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

          <ExerciseCatalogPanel onAddExercise={handleAddCatalogExercise} />

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

function ExerciseCatalogPanel({
  onAddExercise,
}: {
  onAddExercise: (listId: ExerciseSelectionPreferenceListId, exerciseName: string) => Promise<void>;
}) {
  const [selectedMuscleGroupId, setSelectedMuscleGroupId] = useState<ExerciseCatalogMuscleGroupId>(
    defaultSelectedCatalogMuscleGroupId,
  );
  const selectedMuscleGroup = getExerciseCatalogMuscleGroup(selectedMuscleGroupId);

  return (
    <section
      aria-labelledby="exercise-catalog-title"
      className="exercise-selection-catalog mt-5 rounded-lg border border-stone-900/10 bg-white/80 p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-lg font-black text-stone-950" id="exercise-catalog-title">
            Body-part exercise finder
          </h4>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
            Choose a muscle region on the body map. Suggested exercises appear here without adding
            anything to your Plan Blueprint until you choose Prefer or Avoid.
          </p>
        </div>
        <span className="rounded-full bg-[#006f78] px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-wide text-white">
          65 exercises
        </span>
      </div>

      <div className="exercise-selection-body-picker mt-5 grid gap-5 lg:grid-cols-[minmax(18rem,0.9fr)_minmax(0,1.1fr)]">
        <fieldset className="exercise-selection-body-map">
          <legend className="sr-only">Choose a muscle group on the body map</legend>
          <svg
            aria-labelledby="exercise-body-map-title exercise-body-map-description"
            className="exercise-selection-body-map__figure"
            viewBox="0 0 620 500"
          >
            <title id="exercise-body-map-title">
              Clickable front and back body muscle selector
            </title>
            <desc id="exercise-body-map-description">
              Select chest, back, shoulders, quadriceps, hamstrings, biceps, or triceps to show
              exercise suggestions.
            </desc>
            <defs>
              <linearGradient id="exercise-body-surface" x1="0%" x2="100%" y1="0%" y2="100%">
                <stop offset="0%" stopColor="#f6eee3" />
                <stop offset="100%" stopColor="#eadcc9" />
              </linearGradient>
              <linearGradient id="exercise-body-muscle" x1="0%" x2="100%" y1="0%" y2="100%">
                <stop offset="0%" stopColor="#e75b43" />
                <stop offset="100%" stopColor="#b93725" />
              </linearGradient>
            </defs>

            <g className="exercise-selection-body-map__person">
              <circle cx="190" cy="72" r="30" />
              <path d="M144 131 C154 103 226 103 236 131 L223 269 C217 292 204 305 190 305 C176 305 163 292 157 269 Z" />
              <path d="M138 143 C113 176 103 220 108 271 C111 292 129 292 136 274 L148 202" />
              <path d="M242 143 C267 176 277 220 272 271 C269 292 251 292 244 274 L232 202" />
              <path d="M159 292 C172 304 181 309 190 304 L183 448 C167 455 150 444 147 423 Z" />
              <path d="M190 304 C199 309 208 304 221 292 L233 423 C230 444 213 455 197 448 Z" />
              <path d="M173 114 C179 128 201 128 207 114" />
            </g>

            <g className="exercise-selection-body-map__person">
              <circle cx="461" cy="72" r="30" />
              <path d="M415 131 C425 103 497 103 507 131 L494 269 C488 292 475 305 461 305 C447 305 434 292 428 269 Z" />
              <path d="M409 143 C384 176 374 220 379 271 C382 292 400 292 407 274 L419 202" />
              <path d="M513 143 C538 176 548 220 543 271 C540 292 522 292 515 274 L503 202" />
              <path d="M430 292 C443 304 452 309 461 304 L454 448 C438 455 421 444 418 423 Z" />
              <path d="M461 304 C470 309 479 304 492 292 L504 423 C501 444 484 455 468 448 Z" />
              <path d="M444 114 C450 128 472 128 478 114" />
            </g>

            {bodyMuscleHotspots.map((hotspot) => (
              <g className="exercise-selection-body-map__hotspot-control" key={hotspot.id}>
                <path
                  className="exercise-selection-body-map__hotspot"
                  data-selected={selectedMuscleGroupId === hotspot.id}
                  d={hotspot.d}
                />
              </g>
            ))}
          </svg>

          {bodyMuscleHotspots.flatMap((hotspot) =>
            hotspot.targets.map((target) => (
              <button
                aria-label={`Show ${
                  "label" in target ? `${target.label} ${hotspot.title}` : hotspot.title
                } exercise suggestions`}
                aria-pressed={selectedMuscleGroupId === hotspot.id}
                className="exercise-selection-body-map__target"
                key={`${hotspot.id}-${"label" in target ? target.label : "main"}`}
                onClick={() => setSelectedMuscleGroupId(hotspot.id)}
                style={{
                  height: `${(target.height / 500) * 100}%`,
                  left: `${(target.left / 620) * 100}%`,
                  top: `${(target.top / 500) * 100}%`,
                  width: `${(target.width / 620) * 100}%`,
                }}
                type="button"
              />
            )),
          )}
        </fieldset>

        <div className="exercise-selection-suggestions" aria-live="polite">
          <div className="exercise-selection-suggestions__header">
            <div>
              <h5 className="text-xl font-black leading-tight text-stone-950">
                {selectedMuscleGroup.title}
              </h5>
              <p className="mt-1 text-sm font-semibold text-stone-600">
                {selectedMuscleGroup.exercises.length} available suggestions
              </p>
            </div>
            <span className="exercise-selection-suggestions__marker" aria-hidden="true" />
          </div>

          <ul
            aria-label={`${selectedMuscleGroup.title} exercise suggestions`}
            className="exercise-selection-suggestions__list mt-4"
          >
            {selectedMuscleGroup.exercises.map((exerciseName) => (
              <li className="exercise-selection-suggestions__item" key={exerciseName}>
                <span className="text-sm font-semibold leading-5 text-stone-950">
                  {exerciseName}
                </span>
                <span className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => {
                      void onAddExercise("preferredExercises", exerciseName);
                    }}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Prefer
                  </Button>
                  <Button
                    onClick={() => {
                      void onAddExercise("avoidedExercises", exerciseName);
                    }}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    Avoid
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function getExerciseCatalogMuscleGroup(
  muscleGroupId: ExerciseCatalogMuscleGroupId,
): ExerciseCatalogMuscleGroup {
  const muscleGroup = exerciseCatalogMuscleGroups.find(({ id }) => id === muscleGroupId);

  if (!muscleGroup) {
    throw new Error(`Unknown Exercise Catalog Muscle Group "${muscleGroupId}".`);
  }

  return muscleGroup;
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
