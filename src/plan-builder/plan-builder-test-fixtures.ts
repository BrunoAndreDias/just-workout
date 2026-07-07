import type { TrainingPlanSlot } from "../training-plan/training-plan";
import type { MainCompoundSelection } from "./weekly-movement-coverage";

export const completeMainCompoundSelections = [
  {
    exerciseId: "flat-barbell-bench-press",
    movementPattern: "horizontal_push",
  },
  {
    exerciseId: "bent-over-barbell-rows",
    movementPattern: "horizontal_pull",
  },
  {
    exerciseId: "standing-overhead-barbell-press",
    movementPattern: "vertical_push",
  },
  {
    exerciseId: "pull-ups",
    movementPattern: "vertical_pull",
  },
  {
    exerciseId: "barbell-squats",
    movementPattern: "quad_dominant",
  },
  {
    exerciseId: "barbell-romanian-deadlifts",
    movementPattern: "hip_hamstring_dominant",
  },
] as const satisfies ReadonlyArray<MainCompoundSelection>;

const strengthCoverageDraftSlotSpecs = [
  {
    exerciseId: "bent-over-barbell-rows",
    exerciseName: "Bent-Over Barbell Rows",
    movementPattern: "horizontal_pull",
    targetMuscles: ["back"],
  },
  {
    exerciseId: "seated-overhead-barbell-press",
    exerciseName: "Seated Overhead Barbell Press",
    movementPattern: "vertical_push",
    targetMuscles: ["shoulders"],
  },
  {
    exerciseId: "lat-pull-downs",
    exerciseName: "Lat Pull-Downs",
    movementPattern: "vertical_pull",
    targetMuscles: ["back"],
  },
  {
    exerciseId: "dumbbell-squats",
    exerciseName: "Dumbbell Squats",
    movementPattern: "quad_dominant",
    targetMuscles: ["quadriceps"],
  },
  {
    exerciseId: "dumbbell-romanian-deadlifts",
    exerciseName: "Dumbbell Romanian Deadlifts",
    movementPattern: "hip_hamstring_dominant",
    targetMuscles: ["hamstrings"],
  },
] as const satisfies ReadonlyArray<
  Pick<TrainingPlanSlot, "exerciseId" | "exerciseName" | "movementPattern" | "targetMuscles">
>;

type StrengthCoverageDraftSlotPattern =
  (typeof strengthCoverageDraftSlotSpecs)[number]["movementPattern"];

export function createStrengthCoverageDraftSlots({
  movementPatterns = strengthCoverageDraftSlotSpecs.map((slot) => slot.movementPattern),
  startSlotNumber = 2,
}: {
  movementPatterns?: ReadonlyArray<StrengthCoverageDraftSlotPattern>;
  startSlotNumber?: number;
} = {}): ReadonlyArray<TrainingPlanSlot> {
  return movementPatterns.map((movementPattern, index) => {
    const slot = strengthCoverageDraftSlotSpecs.find(
      (candidate) => candidate.movementPattern === movementPattern,
    );

    if (!slot) {
      throw new Error(`Expected strength coverage slot fixture for "${movementPattern}".`);
    }

    return {
      ...slot,
      kind: "exercise",
      role: "main_compound",
      slotLabel: `A${startSlotNumber + index}`,
    };
  });
}
