import type * as React from "react";
import { cn } from "./cn";

type PageHeaderProps = React.HTMLAttributes<HTMLElement> & {
  description: React.ReactNode;
  descriptionClassName?: string;
  title: React.ReactNode;
  titleClassName?: string;
};

type PageMainProps = React.HTMLAttributes<HTMLDivElement>;

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

export function PageHeader({
  className,
  description,
  descriptionClassName,
  title,
  titleClassName,
  ...props
}: PageHeaderProps) {
  return (
    <header className={cn("jw-page-header grid max-w-[72ch] gap-2", className)} {...props}>
      <PageTitle className={titleClassName}>{title}</PageTitle>
      <PageLead className={descriptionClassName}>{description}</PageLead>
    </header>
  );
}

export function PageMain({ className, ...props }: PageMainProps) {
  return <div className={cn("jw-page-main mt-[var(--jw-content-gap)]", className)} {...props} />;
}

export function PageTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1
      className={cn(
        "jw-page-title jw-heading-font font-bold tracking-[var(--jw-heading-tracking)]",
        className,
      )}
      {...props}
    />
  );
}

export function PageLead({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("jw-page-lead max-w-[72ch] font-medium", className)} {...props} />;
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
