import { getExerciseCatalogExercise, type MainCompoundSelection } from "../training-taxonomy";
import {
  createDefaultExerciseSlot,
  type DefaultExerciseSlotKey,
  getFallbackMovementPattern,
} from "./default-exercise-slots";
import type { TrainingPlanSlot } from "./training-plan";

export function createSelectionSlot(
  selection: MainCompoundSelection | null,
  defaultSlotKey: DefaultExerciseSlotKey,
  role: TrainingPlanSlot["role"],
): TrainingPlanSlot {
  return selection
    ? createSelectedExerciseSlot(selection, role)
    : createDefaultExerciseSlot(defaultSlotKey, role);
}

export function createNamedExerciseSlot({
  exerciseId,
  exerciseName,
  role,
  slotLabel,
}: {
  exerciseId: string;
  exerciseName: string;
  role: TrainingPlanSlot["role"];
  slotLabel: string;
}): TrainingPlanSlot {
  const exercise = getExerciseCatalogExercise(exerciseId);

  return {
    exerciseId: exercise?.id ?? exerciseId,
    exerciseName,
    kind: "exercise",
    movementPattern: getFallbackMovementPattern(slotLabel, exercise?.movementPattern),
    role,
    slotLabel,
    targetMuscles: exercise?.primaryMuscleGroups ?? [],
  };
}

function createSelectedExerciseSlot(
  selection: MainCompoundSelection,
  role: TrainingPlanSlot["role"],
): TrainingPlanSlot {
  const exercise = getExerciseCatalogExercise(selection.exerciseId);

  return {
    exerciseId: selection.exerciseId,
    exerciseName: exercise?.name ?? selection.exerciseId,
    kind: "exercise",
    movementPattern: exercise?.movementPattern ?? selection.movementPattern,
    role,
    slotLabel: formatMovementSlotLabel(selection.movementPattern),
    targetMuscles: exercise?.primaryMuscleGroups ?? [],
  };
}

function formatMovementSlotLabel(
  movementPattern: MainCompoundSelection["movementPattern"],
): string {
  switch (movementPattern) {
    case "hip_hamstring_dominant":
      return "Hip/hamstring dominant";
    case "horizontal_pull":
      return "Horizontal pull";
    case "horizontal_push":
      return "Horizontal push";
    case "quad_dominant":
      return "Quad dominant";
    case "vertical_pull":
      return "Vertical pull";
    case "vertical_push":
      return "Vertical push";
  }
}
