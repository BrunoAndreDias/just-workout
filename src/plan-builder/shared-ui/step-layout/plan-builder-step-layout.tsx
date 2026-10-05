import { ArrowLeft, ArrowRight, Check, ChevronDown } from "lucide-react";
import { type ReactNode, useId, useState } from "react";
import { cn } from "../../../design-system/cn";
import "./plan-builder-step-layout.css";

export function PlanBuilderStepLayout({
  children,
  className,
  description,
  footer,
  title,
  titleId,
}: {
  children: ReactNode;
  className?: string;
  description: ReactNode;
  footer?: ReactNode;
  title: string;
  titleId?: string;
}) {
  const generatedTitleId = useId();
  const headingId = titleId ?? generatedTitleId;

  return (
    <section aria-labelledby={headingId} className={cn("pb-step", className)}>
      <PlanBuilderStepHeader description={description} title={title} titleId={headingId} />
      <div className="pb-step__body">{children}</div>
      {footer}
    </section>
  );
}

export function PlanBuilderStepHeader({
  aside,
  description,
  title,
  titleId,
}: {
  aside?: ReactNode;
  description: ReactNode;
  title: string;
  titleId?: string;
}) {
  return (
    <header className="pb-step__header">
      <div className="pb-step__header-copy">
        <h2 className="pb-step__title" id={titleId}>
          {title}
        </h2>
        <p className="pb-step__description">{description}</p>
      </div>
      {aside ? <div className="pb-step__header-aside">{aside}</div> : null}
    </header>
  );
}

export function PlanBuilderStepSection({
  action,
  children,
  className,
  collapsedSummary,
  defaultOpen = true,
  description,
  isCollapsible = false,
  title,
  titleId,
}: {
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  collapsedSummary?: string;
  defaultOpen?: boolean;
  description?: ReactNode;
  isCollapsible?: boolean;
  title: string;
  titleId?: string;
}) {
  const generatedTitleId = useId();
  const contentId = useId();
  const headingId = titleId ?? generatedTitleId;
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const isContentVisible = !isCollapsible || isOpen;

  return (
    <section
      aria-labelledby={headingId}
      className={cn("pb-step-section", className)}
      data-collapsed={isContentVisible ? undefined : "true"}
    >
      <div className="pb-step-section__header">
        <div className="pb-step-section__header-copy">
          <h3 className="pb-step-section__title" id={headingId}>
            {title}
          </h3>
          {description ? <p className="pb-step-section__description">{description}</p> : null}
        </div>
        {isCollapsible ? (
          <button
            aria-controls={contentId}
            aria-expanded={isOpen}
            aria-label={`${isOpen ? "Hide" : "Customize"} ${title}`}
            className="pb-step-section__toggle"
            onClick={() => setIsOpen((current) => !current)}
            type="button"
          >
            <span>{isOpen ? "Hide" : "Customize"}</span>
            <ChevronDown aria-hidden="true" size={16} strokeWidth={2.4} />
          </button>
        ) : (
          action
        )}
      </div>
      {isContentVisible ? (
        <div className="pb-step-section__content" id={contentId}>
          {children}
        </div>
      ) : collapsedSummary ? (
        <p className="pb-step-section__collapsed-summary" id={contentId}>
          <Check aria-hidden="true" size={15} strokeWidth={2.6} />
          {collapsedSummary}
        </p>
      ) : null}
    </section>
  );
}

export type PlanBuilderStepFooterLink = {
  label: string;
  onClick: () => void;
};

export function PlanBuilderStepFooter({
  back,
  isContinueDisabled = false,
  next,
  status,
}: {
  back: PlanBuilderStepFooterLink;
  isContinueDisabled?: boolean;
  next: PlanBuilderStepFooterLink;
  status?: string;
}) {
  return (
    <footer className="pb-step-footer">
      <div className="pb-step-footer__inner">
        <button className="pb-step-footer__back" onClick={back.onClick} type="button">
          <ArrowLeft aria-hidden="true" size={16} strokeWidth={2.4} />
          {back.label}
        </button>
        {status ? (
          <p className="pb-step-footer__status">
            <Check aria-hidden="true" size={14} strokeWidth={2.8} />
            {status}
          </p>
        ) : null}
        <button
          className="pb-step-footer__next"
          disabled={isContinueDisabled}
          onClick={next.onClick}
          type="button"
        >
          {next.label}
          <ArrowRight aria-hidden="true" size={17} strokeWidth={2.4} />
        </button>
      </div>
    </footer>
  );
}
