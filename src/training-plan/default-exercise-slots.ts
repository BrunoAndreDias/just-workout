import {
  type ExerciseCatalogExercise,
  type ExerciseCatalogMuscleGroupId,
  getExerciseCatalogExercise,
  type MovementPatternId,
} from "../training-taxonomy";
import type { TrainingPlanSlot } from "./training-plan";

export type DefaultExerciseSlotKey =
  | "abs_1"
  | "abs_2"
  | "hip_hamstring_dominant"
  | "hip_hamstring_secondary"
  | "horizontal_push"
  | "lower_isolation"
  | "lower_isolation_2"
  | "quad_dominant"
  | "quad_secondary"
  | "upper_isolation_1"
  | "upper_isolation_2"
  | "upper_pull_1"
  | "upper_pull_2"
  | "vertical_push";

type DefaultExerciseSlot = Pick<ExerciseCatalogExercise, "id" | "name"> & {
  movementPattern: MovementPatternId;
  slotLabel: string;
  targetMuscles: ReadonlyArray<ExerciseCatalogMuscleGroupId>;
};

export function createDefaultExerciseSlot(
  slotKey: DefaultExerciseSlotKey,
  role: TrainingPlanSlot["role"],
): TrainingPlanSlot {
  const defaultExercise = defaultExerciseBySlot[slotKey];

  return {
    exerciseId: defaultExercise.id,
    exerciseName: defaultExercise.name,
    kind: "exercise",
    movementPattern: defaultExercise.movementPattern,
    role,
    slotLabel: defaultExercise.slotLabel,
    targetMuscles: defaultExercise.targetMuscles,
  };
}

export function getFallbackMovementPattern(
  slotLabel: string,
  movementPattern?: MovementPatternId,
): MovementPatternId {
  if (movementPattern) {
    return movementPattern;
  }

  return fallbackMovementPatternBySlotLabel[slotLabel] ?? "horizontal_pull";
}

const defaultExerciseBySlot = {
  abs_1: createDefaultExercise("cable-crunches", "Cable Crunches", "Abs"),
  abs_2: createDefaultExercise("hanging-leg-raises", "Hanging Leg Raises", "Abs"),
  hip_hamstring_dominant: createDefaultExercise(
    "barbell-romanian-deadlifts",
    "Barbell Romanian Deadlifts",
    "Hip/hamstring dominant",
  ),
  hip_hamstring_secondary: createDefaultExercise(
    "leg-curls",
    "Leg Curls",
    "Hip/hamstring secondary",
  ),
  horizontal_push: createDefaultExercise(
    "flat-barbell-bench-press",
    "Flat Barbell Bench Press",
    "Horizontal push",
  ),
  lower_isolation: createDefaultExercise("leg-extensions", "Leg Extensions", "Lower isolation"),
  lower_isolation_2: createDefaultExercise(
    "standing-calf-raises",
    "Standing Calf Raises",
    "Lower isolation",
  ),
  quad_dominant: createDefaultExercise("barbell-squats", "Barbell Squats", "Quad dominant"),
  quad_secondary: createDefaultExercise("leg-press", "Leg Press", "Quad secondary"),
  upper_isolation_1: createDefaultExercise(
    "standing-barbell-curls",
    "Standing Barbell Curls",
    "Biceps",
  ),
  upper_isolation_2: createDefaultExercise("cable-press-downs", "Cable Press-Downs", "Triceps"),
  upper_pull_1: createDefaultExercise("pull-ups", "Pull-Ups", "Vertical pull"),
  upper_pull_2: createDefaultExercise(
    "bent-over-barbell-rows",
    "Bent Over Barbell Rows",
    "Horizontal pull",
  ),
  vertical_push: createDefaultExercise(
    "standing-overhead-barbell-press",
    "Standing Overhead Barbell Press",
    "Vertical push",
  ),
} as const satisfies Record<DefaultExerciseSlotKey, DefaultExerciseSlot>;

function createDefaultExercise(
  exerciseId: string,
  fallbackName: string,
  slotLabel: string,
): DefaultExerciseSlot {
  const exercise = getExerciseCatalogExercise(exerciseId);

  return {
    id: exercise?.id ?? exerciseId,
    movementPattern: getFallbackMovementPattern(slotLabel, exercise?.movementPattern),
    name: exercise?.name ?? fallbackName,
    slotLabel,
    targetMuscles: exercise?.primaryMuscleGroups ?? [],
  };
}

const fallbackMovementPatternBySlotLabel: Record<string, MovementPatternId> = {
  Abs: "core",
  Biceps: "elbow_flexion",
  "Hip/hamstring dominant": "hip_hamstring_dominant",
  "Hip/hamstring secondary": "hip_hamstring_dominant",
  "Horizontal push": "horizontal_push",
  "Lower isolation": "calves_accessories",
  "Quad dominant": "quad_dominant",
  "Quad secondary": "quad_dominant",
  Triceps: "elbow_extension",
  "Vertical pull": "vertical_pull",
  "Vertical push": "vertical_push",
};
