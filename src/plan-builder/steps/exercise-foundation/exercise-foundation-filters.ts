import type { MainCompoundPickerFilterId } from "../../exercise-foundation-read-model";

type MainCompoundPickerFilter = {
  id: MainCompoundPickerFilterId;
  label: string;
};

export const mainCompoundPickerFilters = [
  { id: "all", label: "Equipment" },
  { id: "barbell", label: "Barbell" },
  { id: "dumbbells", label: "Dumbbells" },
  { id: "machine", label: "Machine" },
  { id: "bodyweight", label: "Bodyweight" },
  { id: "beginner_friendly", label: "Beginner-friendly" },
  { id: "joint_friendly", label: "Joint-friendly" },
] as const satisfies ReadonlyArray<MainCompoundPickerFilter>;

export const accessoryMuscleGroupFilters = [
  { id: "all", label: "Muscle group" },
  { id: "hamstrings", label: "Hamstrings" },
  { id: "shoulders", label: "Shoulders" },
  { id: "core", label: "Core" },
  { id: "arms", label: "Arms" },
  { id: "grip", label: "Grip" },
  { id: "calves", label: "Calves" },
  { id: "hips", label: "Hips" },
] as const;
