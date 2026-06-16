import { Check, Dumbbell, X } from "lucide-react";
import { Button } from "../../../design-system/button";
import { cn } from "../../../design-system/cn";
import type { ExerciseFoundationAccessoryExercise } from "../../exercise-foundation-read-model";

export function IsolationExercisesDrawer({
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
