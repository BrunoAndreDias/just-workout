import {
  ArrowDownUp,
  ArrowLeftRight,
  ArrowUpDown,
  Dumbbell,
  type LucideIcon,
  Weight,
} from "lucide-react";
import type { CompoundCapableMovementPatternId } from "../../exercise-catalog";

export function FoundationPatternIcon({
  movementPattern,
}: {
  movementPattern: CompoundCapableMovementPatternId;
}) {
  const Icon = getFoundationPatternIcon(movementPattern);

  return <Icon aria-hidden="true" size={18} strokeWidth={2} />;
}

function getFoundationPatternIcon(movementPattern: CompoundCapableMovementPatternId): LucideIcon {
  switch (movementPattern) {
    case "horizontal_push":
      return ArrowLeftRight;
    case "horizontal_pull":
      return ArrowLeftRight;
    case "vertical_pull":
      return ArrowDownUp;
    case "vertical_push":
      return ArrowUpDown;
    case "quad_dominant":
      return Weight;
    case "hip_hamstring_dominant":
      return Dumbbell;
  }
}

export function getFoundationIconClassName(
  movementPattern: CompoundCapableMovementPatternId,
): string {
  switch (movementPattern) {
    case "horizontal_push":
    case "vertical_push":
      return "bg-[#ffe9e7] text-[#b93725]";
    case "horizontal_pull":
    case "vertical_pull":
      return "bg-[#e8f5f4] text-[#00666e]";
    case "quad_dominant":
    case "hip_hamstring_dominant":
      return "bg-[#ecefff] text-[#355bd6]";
  }
}
