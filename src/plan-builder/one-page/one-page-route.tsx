import { useEffect, useRef, useState } from "react";
import { cn } from "../../design-system/cn";
import { PageMain } from "../../design-system/typography";
import type { PlanBuilderStep } from "../builder-state/plan-builder-config";
import { usePlanBuilderBlueprint } from "../builder-state/plan-builder-mutations";
import { getPlanBuilderWorkflow } from "../plan-builder-workflow";
import {
  getPlanBuilderOnePageStepTitle,
  PlanBuilderOnePageSectionCard,
  planBuilderOnePageSections,
} from "./one-page-overview";
import { PlanBuilderOnePageStepContent } from "./one-page-step";
import "./page-shell/plan-builder-page.css";
import "./page-shell/plan-builder-page-responsive.css";
import "./page-shell/plan-builder-page-compact-responsive.css";
import "./page-shell/plan-builder-page-large-viewport.css";
import "./page-shell/plan-builder-frequency-page.css";
import "./page-shell/plan-builder-exercises-page.css";
import "./one-page-route.css";

export function PlanBuilderOnePageRoute() {
  const { blueprint, summary } = usePlanBuilderBlueprint();
  const [activeStep, setActiveStep] = useState<PlanBuilderStep | null>(
    getInitialPlanBuilderActiveStep,
  );
  const [closingStep, setClosingStep] = useState<PlanBuilderStep | null>(null);
  const [isRestoringOverview, setIsRestoringOverview] = useState(false);
  const closeAnimationTimeoutRef = useRef<number | null>(null);
  const overviewRestoreTimeoutRef = useRef<number | null>(null);
  const sectionGridRef = useRef<HTMLUListElement | null>(null);
  const visibleStep = activeStep ?? closingStep;
  const isClosingSelectedStep = activeStep === null && closingStep !== null;
  const isSectionGridCompact = activeStep !== null || closingStep !== null;
  const workflow = getPlanBuilderWorkflow({ activeStep: visibleStep, blueprint });

  useEffect(() => {
    resetPlanBuilderViewportScroll();
  }, []);

  useEffect(() => {
    return () => {
      if (closeAnimationTimeoutRef.current !== null) {
        window.clearTimeout(closeAnimationTimeoutRef.current);
      }

      if (overviewRestoreTimeoutRef.current !== null) {
        window.clearTimeout(overviewRestoreTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isSectionGridCompact || !visibleStep) {
      return;
    }

    const animationFrameId = window.requestAnimationFrame(() => {
      const activeSection = sectionGridRef.current?.querySelector(
        ".plan-builder-one-page__section-card--active",
      );

      if (
        !(activeSection instanceof HTMLElement) ||
        typeof activeSection.scrollIntoView !== "function"
      ) {
        return;
      }

      const prefersReducedMotion =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      activeSection.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "nearest",
        inline: "center",
      });
    });

    return () => window.cancelAnimationFrame(animationFrameId);
  }, [isSectionGridCompact, visibleStep]);

  function clearOverviewTransitionTimers() {
    if (closeAnimationTimeoutRef.current !== null) {
      window.clearTimeout(closeAnimationTimeoutRef.current);
      closeAnimationTimeoutRef.current = null;
    }

    if (overviewRestoreTimeoutRef.current !== null) {
      window.clearTimeout(overviewRestoreTimeoutRef.current);
      overviewRestoreTimeoutRef.current = null;
    }
  }

  function openPlanBuilderSection(step: PlanBuilderStep) {
    clearOverviewTransitionTimers();
    resetPlanBuilderViewportScroll();
    setIsRestoringOverview(false);
    setClosingStep(null);
    setActiveStep(step);
  }

  function selectPlanBuilderSection(step: PlanBuilderStep) {
    clearOverviewTransitionTimers();

    if (activeStep === step) {
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (prefersReducedMotion) {
        setIsRestoringOverview(false);
        setClosingStep(null);
        setActiveStep(null);
        return;
      }

      setIsRestoringOverview(false);
      setClosingStep(step);
      setActiveStep(null);
      closeAnimationTimeoutRef.current = window.setTimeout(() => {
        setClosingStep((currentStep) => (currentStep === step ? null : currentStep));
        setIsRestoringOverview(true);
        closeAnimationTimeoutRef.current = null;
        overviewRestoreTimeoutRef.current = window.setTimeout(() => {
          setIsRestoringOverview(false);
          overviewRestoreTimeoutRef.current = null;
        }, 280);
      }, 320);
      return;
    }

    openPlanBuilderSection(step);
  }

  return (
    <section className="plan-builder-one-page">
      <div className="plan-builder-one-page__surface">
        <h1 className="sr-only">Plan Builder</h1>

        <PageMain className="plan-builder-one-page__main">
          <nav
            aria-label="Plan Blueprint sections"
            className={cn(
              "plan-builder-one-page__section-nav",
              isSectionGridCompact ? "plan-builder-one-page__section-nav--compact" : null,
            )}
          >
            <div className="plan-builder-one-page__section-nav-header">
              <p className="plan-builder-one-page__section-nav-title">Plan Blueprint sections</p>
              <p className="plan-builder-one-page__section-nav-copy">
                Choose a section, progress saves as you go.
              </p>
            </div>

            <ul
              className={cn(
                "plan-builder-one-page__section-grid",
                isSectionGridCompact ? "plan-builder-one-page__section-grid--compact" : null,
                isRestoringOverview
                  ? "plan-builder-one-page__section-grid--restoring-overview"
                  : null,
              )}
              ref={sectionGridRef}
            >
              {planBuilderOnePageSections.map((section) => {
                const status = workflow.sectionStatuses[section.id];

                if (!status) {
                  return null;
                }

                return (
                  <PlanBuilderOnePageSectionCard
                    blueprint={blueprint}
                    isActive={activeStep === section.id || closingStep === section.id}
                    isExpanded={activeStep === section.id}
                    key={section.id}
                    onSelect={() => selectPlanBuilderSection(section.id)}
                    section={section}
                    status={status}
                    summary={summary}
                  />
                );
              })}
            </ul>
          </nav>

          {visibleStep ? (
            <section
              aria-label={getPlanBuilderOnePageStepTitle(visibleStep)}
              className={cn(
                "plan-builder-one-page__active-panel",
                isClosingSelectedStep ? "plan-builder-one-page__active-panel--closing" : null,
              )}
              key={visibleStep}
            >
              <div
                className={cn(
                  "plan-builder-page",
                  "plan-builder-one-page__step",
                  `plan-builder-page--${visibleStep}`,
                )}
              >
                <PlanBuilderOnePageStepContent
                  activeStep={visibleStep}
                  blueprint={blueprint}
                  summary={summary}
                  workflow={workflow}
                />
              </div>
            </section>
          ) : null}
        </PageMain>
      </div>
    </section>
  );
}

function resetPlanBuilderViewportScroll() {
  window.scrollTo({ left: 0, top: 0, behavior: "auto" });
}

function getInitialPlanBuilderActiveStep(): PlanBuilderStep | null {
  if (
    import.meta.env.DEV &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("prototype") === "training-plan-draft"
  ) {
    return "generate";
  }

  return null;
}
