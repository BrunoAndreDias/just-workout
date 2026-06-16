import type { CompoundCapableMovementPatternId } from "../../exercise-catalog";
import { formatMovementPatternLabel } from "../../weekly-movement-coverage";

export function getAccessoryFilterLabel<TFilterId extends string>(
  filters: ReadonlyArray<{ id: TFilterId; label: string }>,
  filterId: TFilterId,
): string {
  return filters.find((filter) => filter.id === filterId)?.label ?? filterId;
}

export function toTitleCase(value: string): string {
  return value
    .split(" ")
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

export function getBlockedGenerateActionLabel(
  movementPattern: CompoundCapableMovementPatternId | null,
): string {
  if (movementPattern === null) {
    return "Choose required main compounds";
  }

  return `Choose ${formatMovementPatternLabel(movementPattern).toLowerCase()} exercise`;
}
