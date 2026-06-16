import { Check, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../../../design-system/button";
import { cn } from "../../../design-system/cn";
import type { CompoundCapableMovementPatternId } from "../../exercise-catalog";
import type {
  ExerciseFoundationRotationPoolReadModel,
  MainCompoundPickerFilterId,
} from "../../exercise-foundation-read-model";
import { mainCompoundPickerFilters } from "./exercise-foundation-filters";
import { toTitleCase } from "./exercise-foundation-formatting";
import { FoundationPatternIcon, getFoundationIconClassName } from "./foundation-pattern-icon";

export function RotationPoolPicker({
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
