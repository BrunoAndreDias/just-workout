import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "./cn";

const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    defaultVariants: {
      size: "default",
      variant: "primary",
    },
    variants: {
      size: {
        default: "h-11",
        icon: "h-11 w-11 p-0",
        sm: "h-9 px-3",
      },
      variant: {
        ghost: "text-stone-800 hover:bg-stone-900/8 focus-visible:outline-stone-900",
        outline:
          "border border-stone-900/15 bg-white/50 text-stone-900 hover:bg-white focus-visible:outline-stone-900",
        primary:
          "bg-stone-950 text-stone-50 shadow-sm hover:bg-stone-800 focus-visible:outline-stone-950",
        secondary:
          "bg-[#d6462f] text-white shadow-sm hover:bg-[#b93725] focus-visible:outline-[#d6462f]",
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
