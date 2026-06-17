import type { CompoundCapableMovementPatternId } from "../../exercise-catalog";
import type { ExerciseFoundationRotationPoolReadModel } from "../../exercise-foundation-read-model";
import { toTitleCase } from "./exercise-foundation-formatting";
import { ExerciseFoundationOptionPicker } from "./exercise-foundation-option-picker";

export function RotationPoolPicker({
  id,
  movementPattern,
  movementPatternLabel,
  onChange,
  onClose,
  rotationPool,
}: {
  id: string;
  movementPattern: CompoundCapableMovementPatternId;
  movementPatternLabel: string;
  onChange: (exerciseIds: ReadonlyArray<string>) => Promise<void>;
  onClose: () => void;
  rotationPool: ExerciseFoundationRotationPoolReadModel;
}) {
  const selectedExerciseIds = rotationPool.selectedExerciseIds;
  const selectedExerciseIdSet = new Set(selectedExerciseIds);
  const searchMovementPatternLabel = movementPatternLabel.toLowerCase();
  const formattedMovementPatternTitle = toTitleCase(movementPatternLabel);

  function getNextExerciseIds(exerciseId: string, isSelected: boolean) {
    if (isSelected) {
      return selectedExerciseIds.filter((selectedExerciseId) => selectedExerciseId !== exerciseId);
    }

    return [...selectedExerciseIds, exerciseId];
  }

  return (
    <ExerciseFoundationOptionPicker
      closeLabel="Close rotation pool picker"
      emptyMessage="No eligible alternatives match the current search and filters."
      filterLegend="Rotation pool filters"
      footer="Pool exercises stay separate from main compounds."
      helperText="Choose future Training Block alternatives. Main compounds are excluded."
      id={id}
      inputName={`rotation-pool-${movementPattern}`}
      inputType="checkbox"
      isOptionSelected={(exercise) => selectedExerciseIdSet.has(exercise.id)}
      listSemantics={{
        kind: "fieldset",
        legend: `${movementPatternLabel} rotation pool compound options`,
      }}
      movementPattern={movementPattern}
      onClose={onClose}
      onOptionChange={(exercise, isSelected) => {
        void onChange(getNextExerciseIds(exercise.id, isSelected));
      }}
      options={rotationPool.options}
      searchLabel={`Search ${movementPatternLabel} rotation pool exercises`}
      searchPlaceholder={`Search ${searchMovementPatternLabel} alternatives...`}
      title={`Edit ${formattedMovementPatternTitle} rotation pool`}
    />
  );
}
