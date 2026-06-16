import { Plus, X } from "lucide-react";
import { Button } from "../../../design-system/button";
import type { ExerciseFoundationAccessoryExercise } from "../../exercise-foundation-read-model";
import { accessoryMuscleGroupFilters } from "./exercise-foundation-filters";
import { getAccessoryFilterLabel } from "./exercise-foundation-formatting";

export function IsolationExercisesSummary({
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

export function IsolationExercisesUnavailableSummary() {
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
