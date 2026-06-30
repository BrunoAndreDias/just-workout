import type { CompoundCapableMovementPatternId } from "../../exercise-catalog";
import type { ExerciseFoundationCompoundOption } from "../../exercise-foundation-read-model";
import { toTitleCase } from "./exercise-foundation-formatting";
import { RankedMainCompoundPreferencesPicker } from "./ranked-main-compound-preferences-picker";

type MainCompoundRotationPreferencesPickerProps = {
  id: string;
  mainCompoundOptions: ReadonlyArray<ExerciseFoundationCompoundOption>;
  movementPattern: CompoundCapableMovementPatternId;
  movementPatternLabel: string;
  onChange: (exerciseIds: ReadonlyArray<string>) => Promise<void>;
  onClose: () => void;
  preferenceExerciseIds: ReadonlyArray<string>;
};

export function MainCompoundRotationPreferencesPicker({
  id,
  mainCompoundOptions,
  movementPattern,
  movementPatternLabel,
  onChange,
  onClose,
  preferenceExerciseIds,
}: MainCompoundRotationPreferencesPickerProps) {
  const searchMovementPatternLabel = movementPatternLabel.toLowerCase();
  const formattedMovementPatternTitle = toTitleCase(movementPatternLabel);

  return (
    <RankedMainCompoundPreferencesPicker
      closeLabel="Close main compound rotation preferences picker"
      filterLegend="Main compound rotation preference filters"
      footer="Rotation preferences attach to the movement pattern bucket, not to a final main compound. Empty buckets stay valid."
      helperText="Choose future rotation alternatives you want available, then move them up or down to set the ranking."
      id={id}
      inputName={`main-compound-rotation-preferences-${movementPattern}`}
      listLegend={`${movementPatternLabel} main compound rotation preference options`}
      mainCompoundOptions={mainCompoundOptions}
      movementPattern={movementPattern}
      onChange={onChange}
      onClose={onClose}
      preferenceExerciseIds={preferenceExerciseIds}
      rankLabel={(rank) => `Rotation preference #${rank}`}
      rankedSectionLabel={`${movementPatternLabel} ranked rotation preferences`}
      searchLabel={`Search ${movementPatternLabel} rotation exercises`}
      searchPlaceholder={`Search ${searchMovementPatternLabel} rotation exercises...`}
      selectedEmptyMessage="No rotation preferences ranked yet."
      selectedTitle={`Ranked ${formattedMovementPatternTitle} rotation preferences`}
      title={`Rank your ${formattedMovementPatternTitle} rotation preferences`}
    />
  );
}
