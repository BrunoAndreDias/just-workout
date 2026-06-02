import type * as React from "react";
import { cn } from "./cn";
import "./step-screen.css";

type StepPanelProps = React.HTMLAttributes<HTMLElement> & {
  as?: "div" | "section";
};

type StepNoticeProps = React.HTMLAttributes<HTMLDivElement> & {
  icon?: React.ReactNode;
  title: string;
  titleDisplay?: "screen-reader-only" | "visible";
};

export function StepPanel({ as = "section", className, ...props }: StepPanelProps) {
  const Component = as;

  return (
    <Component
      className={cn("step-panel rounded-lg border border-stone-900/10 bg-white/78 p-6", className)}
      {...props}
    />
  );
}

export function StepActions({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "step-actions flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
      {...props}
    />
  );
}

export function StepNotice({
  children,
  className,
  icon,
  title,
  titleDisplay = "screen-reader-only",
  ...props
}: StepNoticeProps) {
  const hasVisibleTitle = titleDisplay === "visible";

  return (
    <div
      className={cn(
        "step-notice flex gap-4 rounded-lg border border-[#f0cfad] bg-[#fff8f1] px-5 py-[14px] text-[#8a4a18]",
        hasVisibleTitle ? "items-start" : "items-center",
        className,
      )}
      {...props}
    >
      {icon ? (
        <span className="step-notice__icon flex h-8 w-8 shrink-0 items-center justify-center text-[#db7a1d]">
          {icon}
        </span>
      ) : null}
      <div className="min-w-0">
        {hasVisibleTitle ? (
          <h4 className="step-notice__title text-sm font-bold uppercase tracking-wide text-[#9a612c]">
            {title}
          </h4>
        ) : (
          <p className="sr-only">{title}</p>
        )}
        <p
          className={cn(
            "step-notice__body text-base font-medium leading-7",
            hasVisibleTitle ? "mt-1" : null,
          )}
        >
          {children}
        </p>
      </div>
    </div>
  );
}
