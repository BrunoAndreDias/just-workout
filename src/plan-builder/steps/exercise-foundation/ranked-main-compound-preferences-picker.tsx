import type { CompoundCapableMovementPatternId } from "../../exercise-catalog";
import type { ExerciseFoundationCompoundOption } from "../../exercise-foundation-read-model";
import { ExerciseFoundationOptionPicker } from "./exercise-foundation-option-picker";
import {
  RankedPreferenceSelectedList,
  useRankedPreferenceSelection,
} from "./ranked-preference-picker-shared";

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
  const { handleMovePreference, handleOptionToggle, handleRemovePreference, selectedOptions } =
    useRankedPreferenceSelection({
      onChange,
      options: mainCompoundOptions,
      preferenceExerciseIds,
    });

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
        void handleOptionToggle(exercise, isSelected);
      }}
      options={mainCompoundOptions}
      searchLabel={searchLabel}
      searchPlaceholder={searchPlaceholder}
      selectedOptionsContent={
        <RankedPreferenceSelectedList
          ariaLabel={rankedSectionLabel}
          emptyMessage={selectedEmptyMessage}
          onMovePreference={(exerciseId, direction) => {
            void handleMovePreference(exerciseId, direction);
          }}
          onRemovePreference={(exerciseId) => {
            void handleRemovePreference(exerciseId);
          }}
          options={selectedOptions}
          rankLabel={rankLabel}
          title={selectedTitle}
        />
      }
      showSearchAndFilters={false}
      title={title}
    />
  );
}
