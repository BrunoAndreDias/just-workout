import type {
  ExerciseFoundationCompoundOption,
  MainCompoundPickerFilterId,
} from "../../exercise-foundation-read-model";

export function filterExerciseFoundationOptions({
  activeFilterId,
  options,
  searchQuery,
}: {
  activeFilterId: MainCompoundPickerFilterId;
  options: ReadonlyArray<ExerciseFoundationCompoundOption>;
  searchQuery: string;
}): ReadonlyArray<ExerciseFoundationCompoundOption> {
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const normalizedSearchExerciseId = normalizedSearchQuery.replace(/\s+/g, "-");

  return options.filter((exercise) => {
    const matchesSearch =
      normalizedSearchQuery.length === 0 ||
      exercise.name.toLowerCase().includes(normalizedSearchQuery) ||
      exercise.id.includes(normalizedSearchExerciseId);
    const matchesFilter = activeFilterId === "all" || exercise.filterIds.includes(activeFilterId);

    return matchesSearch && matchesFilter;
  });
}
