import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import type { CompoundCapableMovementPatternId } from "../../exercise-catalog";
import type { ExerciseFoundationCompoundOption } from "../../exercise-foundation-read-model";
import { toTitleCase } from "./exercise-foundation-formatting";
import { ExerciseFoundationOptionPicker } from "./exercise-foundation-option-picker";

type MainCompoundPreferencesPickerProps = {
  id: string;
  mainCompoundOptions: ReadonlyArray<ExerciseFoundationCompoundOption>;
  movementPattern: CompoundCapableMovementPatternId;
  movementPatternLabel: string;
  onChange: (exerciseIds: ReadonlyArray<string>) => Promise<void>;
  onClose: () => void;
  preferenceExerciseIds: ReadonlyArray<string>;
};

export function MainCompoundPreferencesPicker({
  id,
  mainCompoundOptions,
  movementPattern,
  movementPatternLabel,
  onChange,
  onClose,
  preferenceExerciseIds,
}: MainCompoundPreferencesPickerProps) {
  const searchMovementPatternLabel = movementPatternLabel.toLowerCase();
  const formattedMovementPatternTitle = toTitleCase(movementPatternLabel);
  const selectedOptions = preferenceExerciseIds.flatMap((exerciseId) => {
    const option = mainCompoundOptions.find((candidate) => candidate.id === exerciseId);

    return option ? [option] : [];
  });

  async function handleOptionChange(option: ExerciseFoundationCompoundOption, isSelected: boolean) {
    if (isSelected) {
      await onChange(preferenceExerciseIds.filter((exerciseId) => exerciseId !== option.id));
      return;
    }

    await onChange([...preferenceExerciseIds, option.id]);
  }

  async function handleMovePreference(exerciseId: string, direction: "up" | "down"): Promise<void> {
    const currentIndex = preferenceExerciseIds.indexOf(exerciseId);

    if (currentIndex === -1) {
      return;
    }

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= preferenceExerciseIds.length) {
      return;
    }

    const nextExerciseIds = [...preferenceExerciseIds];
    const [movedExerciseId] = nextExerciseIds.splice(currentIndex, 1);

    if (!movedExerciseId) {
      return;
    }

    nextExerciseIds.splice(targetIndex, 0, movedExerciseId);
    await onChange(nextExerciseIds);
  }

  async function handleRemovePreference(exerciseId: string): Promise<void> {
    await onChange(preferenceExerciseIds.filter((candidateId) => candidateId !== exerciseId));
  }

  return (
    <ExerciseFoundationOptionPicker
      closeLabel="Close main compound preferences picker"
      emptyMessage="No exercises match the current search and filters."
      filterLegend="Main compound preference filters"
      footer="Ranked preferences are saved in order. Empty buckets stay valid and Recommended Defaults can still fill gaps later."
      helperText="Choose as many compounds as you want, then move them up or down to set the ranking."
      id={id}
      inputName={`main-compound-preferences-${movementPattern}`}
      inputType="checkbox"
      isOptionSelected={(exercise) => preferenceExerciseIds.includes(exercise.id)}
      listSemantics={{
        legend: `${movementPatternLabel} main compound preference options`,
        kind: "fieldset",
      }}
      movementPattern={movementPattern}
      onClose={onClose}
      onOptionChange={(exercise, isSelected) => {
        void handleOptionChange(exercise, isSelected);
      }}
      options={mainCompoundOptions}
      searchLabel={`Search ${movementPatternLabel} exercises`}
      searchPlaceholder={`Search ${searchMovementPatternLabel} exercises...`}
      selectedOptionsContent={
        <section aria-label={`${movementPatternLabel} ranked preferences`}>
          <h4 className="main-compound-drawer__selected-title">
            Ranked {formattedMovementPatternTitle} preferences
          </h4>
          {selectedOptions.length === 0 ? (
            <p className="main-compound-drawer__selected-empty">No preferences ranked yet.</p>
          ) : (
            <ol className="main-compound-drawer__selected-list">
              {selectedOptions.map((option, index) => {
                const isFirst = index === 0;
                const isLast = index === selectedOptions.length - 1;

                return (
                  <li className="main-compound-drawer__selected-item" key={option.id}>
                    <div className="main-compound-drawer__selected-copy">
                      <span className="main-compound-drawer__selected-rank">
                        Preference #{index + 1}
                      </span>
                      <span className="main-compound-drawer__selected-name">{option.name}</span>
                    </div>
                    <div className="main-compound-drawer__selected-actions">
                      <button
                        aria-label={`Move ${option.name} up`}
                        disabled={isFirst}
                        onClick={() => {
                          void handleMovePreference(option.id, "up");
                        }}
                        type="button"
                      >
                        <ArrowUp aria-hidden="true" size={14} strokeWidth={2.4} />
                      </button>
                      <button
                        aria-label={`Move ${option.name} down`}
                        disabled={isLast}
                        onClick={() => {
                          void handleMovePreference(option.id, "down");
                        }}
                        type="button"
                      >
                        <ArrowDown aria-hidden="true" size={14} strokeWidth={2.4} />
                      </button>
                      <button
                        aria-label={`Remove ${option.name}`}
                        onClick={() => {
                          void handleRemovePreference(option.id);
                        }}
                        type="button"
                      >
                        <Trash2 aria-hidden="true" size={14} strokeWidth={2.4} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      }
      title={`Rank your ${formattedMovementPatternTitle} preferences`}
    />
  );
}
