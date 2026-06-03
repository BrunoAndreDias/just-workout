import type * as React from "react";
import { cn } from "./cn";

export function PageKicker({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "jw-body-font text-[var(--jw-meta-size)] font-bold uppercase leading-[var(--jw-meta-line-height)] tracking-[0.04em] text-[#00636a]",
        className,
      )}
      {...props}
    />
  );
}

export function PageTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1
      className={cn(
        "jw-heading-font text-[var(--jw-page-title-size)] font-bold leading-[var(--jw-page-title-line-height)] tracking-[var(--jw-heading-tracking)] text-[#120f0d]",
        className,
      )}
      {...props}
    />
  );
}

export function PageLead({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "max-w-[72ch] text-[var(--jw-page-lead-size)] font-medium leading-[var(--jw-page-lead-line-height)] text-[#31505d]",
        className,
      )}
      {...props}
    />
  );
}

export function SectionTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "jw-heading-font text-[var(--jw-section-title-size)] font-bold leading-[var(--jw-section-title-line-height)] tracking-[var(--jw-heading-tracking)] text-stone-950",
        className,
      )}
      {...props}
    />
  );
}

export function SectionDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "max-w-[72ch] text-[var(--jw-body-size)] leading-[var(--jw-body-line-height)] text-[#244256]",
        className,
      )}
      {...props}
    />
  );
}
