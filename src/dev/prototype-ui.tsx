import type { ReactNode } from "react";

type PrototypeActionButtonProps = {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  variant: "outline" | "primary" | "secondary";
};

export function createPrototypeActionButton(classNamePrefix: string) {
  return function PrototypeActionButton({
    icon,
    label,
    onClick,
    variant,
  }: PrototypeActionButtonProps) {
    return (
      <button
        className={`${classNamePrefix}__button ${classNamePrefix}__button--${variant}`}
        onClick={onClick}
        type="button"
      >
        {icon}
        <span>{label}</span>
      </button>
    );
  };
}

export function setPrototypeUrlVariantSearchParam(variant: string): void {
  if (typeof window === "undefined") {
    return;
  }

  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set("variant", variant);
  window.history.replaceState(window.history.state, "", nextUrl);
}
