import type * as React from "react";
import { cn } from "./cn";

type PageHeaderProps = React.HTMLAttributes<HTMLElement> & {
  description: React.ReactNode;
  descriptionClassName?: string;
  title: React.ReactNode;
  titleClassName?: string;
};

type PageMainProps = React.HTMLAttributes<HTMLDivElement>;

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

function PageTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h1 className={cn("jw-page-title jw-heading-font", className)} {...props} />;
}

function PageLead({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("jw-page-lead max-w-[72ch] font-medium", className)} {...props} />;
}
