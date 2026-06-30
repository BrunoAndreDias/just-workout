import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import type { CompoundCapableMovementPatternId } from "../../exercise-catalog";
import type { ExerciseFoundationCompoundOption } from "../../exercise-foundation-read-model";
import { ExerciseFoundationOptionPicker } from "./exercise-foundation-option-picker";

type RankedMainCompoundPreferencesPickerProps = {
  closeLabel: string;
  filterLegend: string;
  footer: string;
  helperText: string;
  id: string;
  inputName: string;
  listLegend: string;
  mainCompoundOptions: ReadonlyArray<ExerciseFoundationCompoundOption>;
  movementPattern: CompoundCapableMovementPatternId;
  onChange: (exerciseIds: ReadonlyArray<string>) => Promise<void>;
  onClose: () => void;
  preferenceExerciseIds: ReadonlyArray<string>;
  rankLabel: (rank: number) => string;
  rankedSectionLabel: string;
  searchLabel: string;
  searchPlaceholder: string;
  selectedEmptyMessage: string;
  selectedTitle: string;
  title: string;
};

export function RankedMainCompoundPreferencesPicker({
  closeLabel,
  filterLegend,
  footer,
  helperText,
  id,
  inputName,
  listLegend,
  mainCompoundOptions,
  movementPattern,
  onChange,
  onClose,
  preferenceExerciseIds,
  rankLabel,
  rankedSectionLabel,
  searchLabel,
  searchPlaceholder,
  selectedEmptyMessage,
  selectedTitle,
  title,
}: RankedMainCompoundPreferencesPickerProps) {
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
      closeLabel={closeLabel}
      emptyMessage="No exercises match the current search and filters."
      filterLegend={filterLegend}
      footer={footer}
      helperText={helperText}
      id={id}
      inputName={inputName}
      inputType="checkbox"
      isOptionSelected={(exercise) => preferenceExerciseIds.includes(exercise.id)}
      listSemantics={{
        kind: "fieldset",
        legend: listLegend,
      }}
      movementPattern={movementPattern}
      onClose={onClose}
      onOptionChange={(exercise, isSelected) => {
        void handleOptionChange(exercise, isSelected);
      }}
      options={mainCompoundOptions}
      searchLabel={searchLabel}
      searchPlaceholder={searchPlaceholder}
      selectedOptionsContent={
        <section aria-label={rankedSectionLabel}>
          <h4 className="main-compound-drawer__selected-title">{selectedTitle}</h4>
          {selectedOptions.length === 0 ? (
            <p className="main-compound-drawer__selected-empty">{selectedEmptyMessage}</p>
          ) : (
            <ol className="main-compound-drawer__selected-list">
              {selectedOptions.map((option, index) => {
                const isFirst = index === 0;
                const isLast = index === selectedOptions.length - 1;

                return (
                  <li className="main-compound-drawer__selected-item" key={option.id}>
                    <div className="main-compound-drawer__selected-copy">
                      <span className="main-compound-drawer__selected-rank">
                        {rankLabel(index + 1)}
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
      title={title}
    />
  );
}
