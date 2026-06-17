import type { CompoundCapableMovementPatternId } from "../../exercise-catalog";
import type { ExerciseFoundationCompoundOption } from "../../exercise-foundation-read-model";
import { toTitleCase } from "./exercise-foundation-formatting";
import { ExerciseFoundationOptionPicker } from "./exercise-foundation-option-picker";

export function MainCompoundPicker({
  currentExerciseId,
  id,
  mainCompoundOptions,
  movementPattern,
  movementPatternLabel,
  onClose,
  onSelect,
}: {
  currentExerciseId: string | undefined;
  id: string;
  mainCompoundOptions: ReadonlyArray<ExerciseFoundationCompoundOption>;
  movementPattern: CompoundCapableMovementPatternId;
  movementPatternLabel: string;
  onClose: () => void;
  onSelect: (
    exerciseId: string,
    movementPattern: CompoundCapableMovementPatternId,
  ) => Promise<void>;
}) {
  const searchMovementPatternLabel = movementPatternLabel.toLowerCase();
  const formattedMovementPatternTitle = toTitleCase(movementPatternLabel);

  return (
    <ExerciseFoundationOptionPicker
      closeLabel="Close main compound picker"
      emptyMessage="No exercises match the current search and filters."
      filterLegend="Main compound filters"
      footer="This updates the main compound selection only. Exercises remain unconfirmed until the required foundation is complete."
      helperText="Pick one compound that will count toward this movement pattern."
      id={id}
      inputName={`main-compound-${movementPattern}`}
      inputType="radio"
      isOptionSelected={(exercise) => currentExerciseId === exercise.id}
      listSemantics={{
        ariaLabel: `${movementPatternLabel} main compound options`,
        kind: "radiogroup",
      }}
      movementPattern={movementPattern}
      onClose={onClose}
      onOptionChange={(exercise) => {
        void onSelect(exercise.id, movementPattern);
      }}
      options={mainCompoundOptions}
      searchLabel={`Search ${movementPatternLabel} exercises`}
      searchPlaceholder={`Search ${searchMovementPatternLabel} exercises...`}
      title={`Choose your main ${formattedMovementPatternTitle}`}
    />
  );
}
