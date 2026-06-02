import type { ReactNode } from "react";
import { cn } from "../../design-system/cn";
import "./plan-builder-option-ui.css";

type SelectableOptionState = "selected" | "unselected";
type RepRangeStyleStatusBadgeTone = "recommended" | "selected";

const selectableOptionCardBaseClassName =
  "min-w-0 rounded-lg border p-4 text-left transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-stone-950";

const selectableOptionCardStyles = {
  selected: "border-stone-950 bg-stone-950 text-stone-50 shadow-sm",
  unselected: "border-stone-900/10 bg-white/85 text-stone-950 hover:bg-white",
} as const satisfies Record<SelectableOptionState, string>;

export const selectableOptionMutedTextStyles = {
  selected: "text-stone-300",
  unselected: "text-stone-600",
} as const satisfies Record<SelectableOptionState, string>;

const selectableOptionBadgeStyles = {
  selected: "bg-white/12 text-[#f4b860]",
  unselected: "bg-[#fff3ea] text-[#b93725]",
} as const satisfies Record<SelectableOptionState, string>;

const repRangeStyleOptionCardStyles = {
  selected: "border-[#0b8490] bg-[#f4fbfb] text-stone-950 shadow-[0_6px_8px_rgba(0,119,128,0.06)]",
  unselected:
    "border-stone-900/10 bg-white/90 text-stone-950 hover:border-stone-900/18 hover:bg-white",
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
    noteBodyClassName: "text-[#244256]",
    noteLabelClassName: "text-[#006f78]",
    notePanelClassName: "bg-transparent",
    targetCardClassName: "bg-white/72",
    targetLabelClassName: "text-[#5c6d73]",
    targetValueClassName: "text-stone-950",
  },
  unselected: {
    noteBodyClassName: "text-stone-600",
    noteLabelClassName: "text-stone-500",
    notePanelClassName: "bg-transparent",
    targetCardClassName: "bg-[#f4f0e8]",
    targetLabelClassName: "text-stone-500",
    targetValueClassName: "text-stone-900",
  },
} as const satisfies Record<
  SelectableOptionState,
  {
    noteBodyClassName: string;
    noteLabelClassName: string;
    notePanelClassName: string;
    targetCardClassName: string;
    targetLabelClassName: string;
    targetValueClassName: string;
  }
>;
type SelectionBadgeProps = {
  children: ReactNode;
  isSelected: boolean;
};

type RepRangeStyleStatusBadgeProps = {
  children: ReactNode;
  tone: RepRangeStyleStatusBadgeTone;
};
export function getSelectableOptionState(isSelected: boolean): SelectableOptionState {
  return isSelected ? "selected" : "unselected";
}

export function getSelectableOptionCardClassName(state: SelectableOptionState): string {
  return cn(selectableOptionCardBaseClassName, selectableOptionCardStyles[state]);
}

export function getRepRangeStyleOptionCardClassName(state: SelectableOptionState): string {
  return cn(selectableOptionCardBaseClassName, repRangeStyleOptionCardStyles[state]);
}

export function SelectionBadge({ children, isSelected }: SelectionBadgeProps) {
  const optionState = getSelectableOptionState(isSelected);

  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide",
        selectableOptionBadgeStyles[optionState],
      )}
    >
      {children}
    </span>
  );
}

export function RepRangeStyleStatusBadge({ children, tone }: RepRangeStyleStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide",
        repRangeStyleStatusBadgeStyles[tone],
      )}
    >
      {children}
    </span>
  );
}
