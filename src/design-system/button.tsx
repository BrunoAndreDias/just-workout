import { Slot } from "@radix-ui/react-slot";
import type * as React from "react";
import { cn } from "./cn";

const PLANO_CLASS = {
  builderPrimary: "primary",
  ghost: "quiet-btn",
  outline: "secondary",
  primary: "primary",
  secondary: "secondary",
} as const;

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  size?: "default" | "icon";
  variant?: keyof typeof PLANO_CLASS;
};

export function Button({
  asChild,
  className,
  size = "default",
  variant = "primary",
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : "button";
  const planoClass = size === "icon" ? "icon-btn" : PLANO_CLASS[variant];

  return (
    <Component
      className={cn("inline-flex items-center justify-center gap-2", planoClass, className)}
      {...props}
    />
  );
}
