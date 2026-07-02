import type { ExerciseFoundationCompoundOption } from "../../exercise-foundation-read-model";
import { toTitleCase } from "./exercise-foundation-formatting";
import { RankedMainCompoundPreferencesPicker } from "./ranked-main-compound-preferences-picker";

type MainCompoundRotationPreferencesPickerProps = {
  id: string;
  mainCompoundOptions: ReadonlyArray<ExerciseFoundationCompoundOption>;
  movementPatternLabel: string;
  onChange: (exerciseIds: ReadonlyArray<string>) => Promise<void>;
  onClose: () => void;
  preferenceExerciseIds: ReadonlyArray<string>;
};

export function MainCompoundRotationPreferencesPicker({
  id,
  mainCompoundOptions,
  movementPatternLabel,
  onChange,
  onClose,
  preferenceExerciseIds,
}: MainCompoundRotationPreferencesPickerProps) {
  const formattedMovementPatternTitle = toTitleCase(movementPatternLabel);

  return (
    <RankedMainCompoundPreferencesPicker
      closeLabel="Close main compound rotation preferences picker"
      helperText="Drag exercises to change priority."
      id={id}
      mainCompoundOptions={mainCompoundOptions}
      onChange={onChange}
      onClose={onClose}
      preferenceExerciseIds={preferenceExerciseIds}
      saveLabel="Save ranking"
      title={`Rank ${formattedMovementPatternTitle} rotation preferences`}
    />
  );
}
