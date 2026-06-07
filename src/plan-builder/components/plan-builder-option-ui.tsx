import type { ReactNode } from "react";
import { cn } from "../../design-system/cn";
import "./plan-builder-option-ui.css";

type SelectableOptionState = "selected" | "unselected";
type RepRangeStyleStatusBadgeTone = "recommended" | "selected";

const selectableOptionCardBaseClassName =
  "min-w-0 border-y border-transparent px-0 py-3 text-left transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-stone-950";

const selectableOptionMutedTextStyles = {
  selected: "text-stone-300",
  unselected: "text-stone-600",
} as const satisfies Record<SelectableOptionState, string>;

const repRangeStyleOptionCardStyles = {
  selected: "border-[#007780] bg-transparent text-stone-950",
  unselected: "border-stone-900/10 bg-transparent text-stone-950 hover:border-stone-900/18",
} as const satisfies Record<SelectableOptionState, string>;
export const repRangeStyleDescriptionStyles = {
  selected: "text-[#31505d]",
  unselected: selectableOptionMutedTextStyles.unselected,
} as const satisfies Record<SelectableOptionState, string>;

const repRangeStyleStatusBadgeStyles = {
  recommended: "bg-[#fff3ea] text-[#b93725]",
  selected: "bg-[#006f78] text-white",
} as const satisfies Record<RepRangeStyleStatusBadgeTone, string>;

export const repRangeStyleDetailStyles = {
  selected: {
    targetLabelClassName: "text-[#5c6d73]",
    targetValueClassName: "text-stone-950",
  },
  unselected: {
    targetLabelClassName: "text-stone-500",
    targetValueClassName: "text-stone-900",
  },
} as const satisfies Record<
  SelectableOptionState,
  {
    targetLabelClassName: string;
    targetValueClassName: string;
  }
>;
type RepRangeStyleStatusBadgeProps = {
  children: ReactNode;
  tone: RepRangeStyleStatusBadgeTone;
};
export function getSelectableOptionState(isSelected: boolean): SelectableOptionState {
  return isSelected ? "selected" : "unselected";
}

export function getRepRangeStyleOptionCardClassName(state: SelectableOptionState): string {
  return cn(selectableOptionCardBaseClassName, repRangeStyleOptionCardStyles[state]);
}

export function RepRangeStyleStatusBadge({ children, tone }: RepRangeStyleStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex min-h-[var(--jw-chip-height)] items-center gap-1.5 rounded-full px-[var(--jw-chip-padding-x)] py-1 text-[var(--jw-meta-size)] font-bold uppercase leading-[var(--jw-meta-line-height)] tracking-[0.04em]",
        repRangeStyleStatusBadgeStyles[tone],
      )}
    >
      {children}
    </span>
  );
}
