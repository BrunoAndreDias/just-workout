import { Check, Search, X } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { Button } from "../../../design-system/button";
import { cn } from "../../../design-system/cn";
import type { CompoundCapableMovementPatternId } from "../../exercise-catalog";
import type {
  ExerciseFoundationCompoundOption,
  MainCompoundPickerFilterId,
} from "../../exercise-foundation-read-model";
import { mainCompoundPickerFilters } from "./exercise-foundation-filters";
import { FoundationPatternIcon, getFoundationIconClassName } from "./foundation-pattern-icon";

type ExerciseFoundationOptionListSemantics =
  | {
      ariaLabel: string;
      kind: "radiogroup";
    }
  | {
      kind: "fieldset";
      legend: string;
    };

export type ExerciseFoundationOptionPickerProps = {
  closeLabel: string;
  emptyMessage: string;
  filterLegend: string;
  footer: ReactNode;
  helperText: string;
  id: string;
  inputName: string;
  inputType: "checkbox" | "radio";
  isOptionSelected: (option: ExerciseFoundationCompoundOption) => boolean;
  listSemantics: ExerciseFoundationOptionListSemantics;
  movementPattern: CompoundCapableMovementPatternId;
  onClose: () => void;
  onOptionChange: (option: ExerciseFoundationCompoundOption, isSelected: boolean) => void;
  options: ReadonlyArray<ExerciseFoundationCompoundOption>;
  searchLabel: string;
  searchPlaceholder: string;
  selectedOptionsContent?: ReactNode;
  title: string;
};

export function ExerciseFoundationOptionPicker({
  closeLabel,
  emptyMessage,
  filterLegend,
  footer,
  helperText,
  id,
  inputName,
  inputType,
  isOptionSelected,
  listSemantics,
  movementPattern,
  onClose,
  onOptionChange,
  options,
  searchLabel,
  searchPlaceholder,
  selectedOptionsContent,
  title,
}: ExerciseFoundationOptionPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilterId, setActiveFilterId] = useState<MainCompoundPickerFilterId>("all");
  const titleId = `${id}-title`;
  const filteredOptions = useMemo(
    () =>
      filterExerciseFoundationOptions({
        activeFilterId,
        options,
        searchQuery,
      }),
    [activeFilterId, options, searchQuery],
  );

  const optionRows =
    filteredOptions.length > 0 ? (
      filteredOptions.map((exercise) => {
        const isSelected = isOptionSelected(exercise);

        return (
          <label
            className={cn("main-compound-drawer__option", isSelected && "is-selected")}
            key={exercise.id}
          >
            <input
              checked={isSelected}
              name={inputName}
              onChange={() => onOptionChange(exercise, isSelected)}
              type={inputType}
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
      <p className="main-compound-drawer__empty">{emptyMessage}</p>
    );

  return (
    <div className="main-compound-drawer-shell">
      <button
        aria-label={closeLabel}
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
              {title}
            </h3>
            <Button
              aria-label={closeLabel}
              onClick={onClose}
              size="sm"
              type="button"
              variant="ghost"
            >
              <X aria-hidden="true" size={18} strokeWidth={2} />
            </Button>
          </div>
          <p className="main-compound-drawer__helper">{helperText}</p>
        </div>

        <div className="main-compound-drawer__controls">
          <label className="main-compound-drawer__search">
            <Search aria-hidden="true" size={18} strokeWidth={2} />
            <span className="sr-only">{searchLabel}</span>
            <input
              onChange={(event) => setSearchQuery(event.currentTarget.value)}
              placeholder={searchPlaceholder}
              type="search"
              value={searchQuery}
            />
          </label>
          <fieldset className="main-compound-drawer__filters">
            <legend className="sr-only">{filterLegend}</legend>
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

        {selectedOptionsContent ? (
          <div className="main-compound-drawer__selected-options">{selectedOptionsContent}</div>
        ) : null}

        {listSemantics.kind === "radiogroup" ? (
          <div
            aria-label={listSemantics.ariaLabel}
            className="main-compound-drawer__options"
            role="radiogroup"
          >
            {optionRows}
          </div>
        ) : (
          <fieldset className="main-compound-drawer__options main-compound-drawer__options-fieldset">
            <legend className="sr-only">{listSemantics.legend}</legend>
            {optionRows}
          </fieldset>
        )}

        <div className="main-compound-drawer__footer">
          <p>{footer}</p>
        </div>
      </section>
    </div>
  );
}

export function filterExerciseFoundationOptions({
  activeFilterId,
  options,
  searchQuery,
}: {
  activeFilterId: MainCompoundPickerFilterId;
  options: ReadonlyArray<ExerciseFoundationCompoundOption>;
  searchQuery: string;
}): ReadonlyArray<ExerciseFoundationCompoundOption> {
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const normalizedSearchExerciseId = normalizedSearchQuery.replace(/\s+/g, "-");

  return options.filter((exercise) => {
    const matchesSearch =
      normalizedSearchQuery.length === 0 ||
      exercise.name.toLowerCase().includes(normalizedSearchQuery) ||
      exercise.id.includes(normalizedSearchExerciseId);
    const matchesFilter = activeFilterId === "all" || exercise.filterIds.includes(activeFilterId);

    return matchesSearch && matchesFilter;
  });
}
