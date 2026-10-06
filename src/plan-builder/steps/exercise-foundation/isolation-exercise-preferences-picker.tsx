import { Check, Dumbbell, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../../../design-system/button";
import { cn } from "../../../design-system/cn";
import type { ExerciseCatalogMuscleGroupId } from "../../exercise-catalog";
import type { IsolationExercisePreferenceOption } from "../../isolation-exercise-preference-read-model";
import { toTitleCase } from "./exercise-foundation-formatting";
import {
  RankedPreferenceSelectedList,
  useRankedPreferenceSelection,
} from "./ranked-preference-picker-shared";

type IsolationExercisePreferencesPickerProps = {
  id: string;
  isolationOptions: ReadonlyArray<IsolationExercisePreferenceOption>;
  onChange: (exerciseIds: ReadonlyArray<string>) => Promise<void>;
  onClose: () => void;
  preferenceExerciseIds: ReadonlyArray<string>;
  primaryMuscleGroup: ExerciseCatalogMuscleGroupId;
  primaryMuscleGroupLabel: string;
};

export function IsolationExercisePreferencesPicker({
  id,
  isolationOptions,
  onChange,
  onClose,
  preferenceExerciseIds,
  primaryMuscleGroup,
  primaryMuscleGroupLabel,
}: IsolationExercisePreferencesPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const formattedMuscleGroupTitle = toTitleCase(primaryMuscleGroupLabel);
  const { handleMovePreference, handleOptionToggle, handleRemovePreference, selectedOptions } =
    useRankedPreferenceSelection({
      onChange,
      options: isolationOptions,
      preferenceExerciseIds,
    });
  const filteredOptions = useMemo(() => {
    const normalizedSearchQuery = searchQuery.trim().toLowerCase();
    const normalizedSearchExerciseId = normalizedSearchQuery.replace(/\s+/g, "-");

    return isolationOptions.filter(
      (exercise) =>
        normalizedSearchQuery.length === 0 ||
        exercise.name.toLowerCase().includes(normalizedSearchQuery) ||
        exercise.id.includes(normalizedSearchExerciseId),
    );
  }, [isolationOptions, searchQuery]);
  const titleId = `${id}-title`;

  return (
    <div className="panel-layer">
      <button
        aria-label="Close isolation exercise preferences picker"
        className="scrim"
        onClick={onClose}
        type="button"
      />
      <section aria-labelledby={titleId} aria-modal="true" className="panel" id={id} role="dialog">
        <div className="panel-top">
          <div className="panel-title-row">
            <h3 className="panel-title" id={titleId}>
              {`Rank your ${formattedMuscleGroupTitle} preferences`}
            </h3>
            <Button
              aria-label="Close isolation exercise preferences picker"
              className="panel-close"
              onClick={onClose}
              size="icon"
              type="button"
            >
              <X aria-hidden="true" size={18} strokeWidth={2} />
            </Button>
          </div>
          <p className="panel-note">
            Choose as many isolation exercises as you want, then move them up or down to set the
            ranking.
          </p>
          <label className="field-input main-compound-drawer__search">
            <Search aria-hidden="true" size={18} strokeWidth={2} />
            <span className="sr-only">{`Search ${primaryMuscleGroupLabel} exercises`}</span>
            <input
              onChange={(event) => setSearchQuery(event.currentTarget.value)}
              placeholder={`Search ${primaryMuscleGroupLabel.toLowerCase()} exercises...`}
              type="search"
              value={searchQuery}
            />
          </label>
        </div>

        <div className="panel-body">
          <div className="main-compound-drawer__selected-options">
            <RankedPreferenceSelectedList
              ariaLabel={`${primaryMuscleGroupLabel} ranked preferences`}
              emptyMessage="No preferences ranked yet."
              onMovePreference={(exerciseId, direction) => {
                void handleMovePreference(exerciseId, direction);
              }}
              onRemovePreference={(exerciseId) => {
                void handleRemovePreference(exerciseId);
              }}
              options={selectedOptions}
              title={`Ranked ${formattedMuscleGroupTitle} preferences`}
            />
          </div>

          <fieldset className="main-compound-drawer__options main-compound-drawer__options-fieldset">
            <legend className="sr-only">{`${primaryMuscleGroupLabel} isolation exercise options`}</legend>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((exercise) => {
                const isSelected = preferenceExerciseIds.includes(exercise.id);

                return (
                  <label
                    className={cn("main-compound-drawer__option", isSelected && "is-selected")}
                    key={exercise.id}
                  >
                    <input
                      checked={isSelected}
                      name={`isolation-preferences-${primaryMuscleGroup}`}
                      onChange={() => {
                        void handleOptionToggle(exercise, isSelected);
                      }}
                      type="checkbox"
                    />
                    <span aria-hidden="true" className="main-compound-drawer__option-icon">
                      <Dumbbell size={16} strokeWidth={2} />
                    </span>
                    <span className="main-compound-drawer__option-copy">
                      <span className="main-compound-drawer__option-name">{exercise.name}</span>
                      <span className="main-compound-drawer__option-meta">{exercise.metadata}</span>
                    </span>
                    <span className="main-compound-drawer__option-state" aria-hidden="true">
                      {isSelected ? <Check size={16} strokeWidth={2.4} /> : null}
                    </span>
                  </label>
                );
              })
            ) : (
              <p className="main-compound-drawer__empty">
                No isolation exercises match the current search.
              </p>
            )}
          </fieldset>
        </div>

        <div className="panel-foot">
          <p className="panel-note">
            Ranked preferences stay optional. Empty buckets remain valid and Recommended Defaults
            can still fill any gaps later.
          </p>
        </div>
      </section>
    </div>
  );
}
