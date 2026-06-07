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
