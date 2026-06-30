import type { CompoundCapableMovementPatternId } from "../../exercise-catalog";
import type { ExerciseFoundationCompoundOption } from "../../exercise-foundation-read-model";
import { toTitleCase } from "./exercise-foundation-formatting";
import { ExerciseFoundationOptionPicker } from "./exercise-foundation-option-picker";
import {
  RankedPreferenceSelectedList,
  useRankedPreferenceSelection,
} from "./ranked-preference-picker-shared";

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
  const { handleMovePreference, handleOptionToggle, handleRemovePreference, selectedOptions } =
    useRankedPreferenceSelection({
      onChange,
      options: mainCompoundOptions,
      preferenceExerciseIds,
    });

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
        void handleOptionToggle(exercise, isSelected);
      }}
      options={mainCompoundOptions}
      searchLabel={`Search ${movementPatternLabel} exercises`}
      searchPlaceholder={`Search ${searchMovementPatternLabel} exercises...`}
      selectedOptionsContent={
        <RankedPreferenceSelectedList
          ariaLabel={`${movementPatternLabel} ranked preferences`}
          emptyMessage="No preferences ranked yet."
          onMovePreference={(exerciseId, direction) => {
            void handleMovePreference(exerciseId, direction);
          }}
          onRemovePreference={(exerciseId) => {
            void handleRemovePreference(exerciseId);
          }}
          options={selectedOptions}
          title={`Ranked ${formattedMovementPatternTitle} preferences`}
        />
      }
      title={`Rank your ${formattedMovementPatternTitle} preferences`}
    />
  );
}
