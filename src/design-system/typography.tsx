import type * as React from "react";
import { cn } from "./cn";

export function PageKicker({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-sm font-black uppercase tracking-wide text-[#00636a]", className)}
      {...props}
    />
  );
}

export function PageTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1 className={cn("text-4xl font-black leading-tight text-[#120f0d]", className)} {...props} />
  );
}

export function PageLead({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-base font-medium leading-7 text-[#31505d]", className)} {...props} />
  );
}

export function SectionTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("font-black text-stone-950", className)} {...props} />;
}

export function SectionDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-[#244256]", className)} {...props} />;
}
