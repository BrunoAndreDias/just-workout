import type { CompoundCapableMovementPatternId } from "../../exercise-catalog";
import type { ExerciseFoundationCompoundOption } from "../../exercise-foundation-read-model";
import { toTitleCase } from "./exercise-foundation-formatting";
import { RankedMainCompoundPreferencesPicker } from "./ranked-main-compound-preferences-picker";

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

  return (
    <RankedMainCompoundPreferencesPicker
      closeLabel="Close main compound preferences picker"
      filterLegend="Main compound preference filters"
      footer="Ranked preferences are saved in order. Empty buckets stay valid and Recommended Defaults can still fill gaps later."
      helperText="Choose as many compounds as you want, then move them up or down to set the ranking."
      id={id}
      inputName={`main-compound-preferences-${movementPattern}`}
      listLegend={`${movementPatternLabel} main compound preference options`}
      mainCompoundOptions={mainCompoundOptions}
      movementPattern={movementPattern}
      onChange={onChange}
      onClose={onClose}
      preferenceExerciseIds={preferenceExerciseIds}
      rankLabel={(rank) => `Preference #${rank}`}
      rankedSectionLabel={`${movementPatternLabel} ranked preferences`}
      searchLabel={`Search ${movementPatternLabel} exercises`}
      searchPlaceholder={`Search ${searchMovementPatternLabel} exercises...`}
      selectedEmptyMessage="No preferences ranked yet."
      selectedTitle={`Ranked ${formattedMovementPatternTitle} preferences`}
      title={`Rank your ${formattedMovementPatternTitle} preferences`}
    />
  );
}
