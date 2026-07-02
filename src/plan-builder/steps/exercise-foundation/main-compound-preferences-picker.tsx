import type { ExerciseFoundationCompoundOption } from "../../exercise-foundation-read-model";
import { toTitleCase } from "./exercise-foundation-formatting";
import { RankedMainCompoundPreferencesPicker } from "./ranked-main-compound-preferences-picker";

type MainCompoundPreferencesPickerProps = {
  id: string;
  mainCompoundOptions: ReadonlyArray<ExerciseFoundationCompoundOption>;
  movementPatternLabel: string;
  onChange: (exerciseIds: ReadonlyArray<string>) => Promise<void>;
  onClose: () => void;
  preferenceExerciseIds: ReadonlyArray<string>;
};

export function MainCompoundPreferencesPicker({
  id,
  mainCompoundOptions,
  movementPatternLabel,
  onChange,
  onClose,
  preferenceExerciseIds,
}: MainCompoundPreferencesPickerProps) {
  const formattedMovementPatternTitle = toTitleCase(movementPatternLabel);

  return (
    <RankedMainCompoundPreferencesPicker
      closeLabel="Close main compound preferences picker"
      helperText="Drag exercises to change priority."
      id={id}
      mainCompoundOptions={mainCompoundOptions}
      onChange={onChange}
      onClose={onClose}
      preferenceExerciseIds={preferenceExerciseIds}
      saveLabel="Save ranking"
      title={`Rank ${formattedMovementPatternTitle} preferences`}
    />
  );
}
