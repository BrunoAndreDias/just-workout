import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "./cn";

const buttonVariants = cva(
  "inline-flex min-h-[var(--jw-button-height-md)] items-center justify-center gap-2 rounded-md px-[var(--jw-button-padding-x-md)] py-2 text-[var(--jw-body-size)] font-semibold leading-none transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    defaultVariants: {
      size: "default",
      variant: "primary",
    },
    variants: {
      size: {
        default: "h-[var(--jw-button-height-md)]",
        icon: "h-[var(--jw-button-height-md)] w-[var(--jw-button-height-md)] p-0",
        sm: "h-[var(--jw-button-height-sm)] px-[var(--jw-button-padding-x-sm)] text-xs",
        step: "h-[var(--jw-button-height-md)] min-h-[var(--jw-button-height-md)] min-w-[min(100%,12rem)]",
      },
      variant: {
        builderPrimary:
          "bg-accent text-on-accent shadow-[0_8px_14px_color-mix(in_srgb,var(--accent)_12%,transparent)] hover:bg-accent-dark focus-visible:outline-accent",
        ghost: "text-ink-2 hover:bg-track focus-visible:outline-accent",
        outline:
          "border border-input-border bg-surface text-ink hover:bg-surface focus-visible:outline-accent",
        primary: "bg-ink text-field shadow-sm hover:bg-ink-2 focus-visible:outline-accent",
        secondary:
          "bg-accent text-on-accent shadow-sm hover:bg-accent-dark focus-visible:outline-accent",
      },
    },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({ asChild, className, size, variant, ...props }: ButtonProps) {
  const Component = asChild ? Slot : "button";

  return <Component className={cn(buttonVariants({ className, size, variant }))} {...props} />;
}
