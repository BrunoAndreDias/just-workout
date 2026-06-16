import { Check, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../../../design-system/button";
import { cn } from "../../../design-system/cn";
import type { CompoundCapableMovementPatternId } from "../../exercise-catalog";
import type {
  ExerciseFoundationCompoundOption,
  MainCompoundPickerFilterId,
} from "../../exercise-foundation-read-model";
import { mainCompoundPickerFilters } from "./exercise-foundation-filters";
import { toTitleCase } from "./exercise-foundation-formatting";
import { FoundationPatternIcon, getFoundationIconClassName } from "./foundation-pattern-icon";

export function MainCompoundPicker({
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
