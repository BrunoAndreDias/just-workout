import { useEffect, useRef, useState } from "react";
import { cn } from "../design-system/cn";
import { PageHeader, PageMain } from "../design-system/typography";
import type { PlanBuilderStep } from "./components/plan-builder-config";
import { usePlanBuilderBlueprint } from "./components/plan-builder-mutations";
import {
  getNextPlanBuilderStep,
  getPlanBuilderOnePageStepTitle,
  PlanBuilderOnePageSectionCard,
  planBuilderOnePageSections,
} from "./plan-builder-one-page-overview";
import { PlanBuilderOnePageStepContent } from "./plan-builder-one-page-step";
import "./components/plan-builder-page.css";
import "./components/plan-builder-page-responsive.css";
import "./components/plan-builder-page-compact-responsive.css";
import "./components/plan-builder-page-large-viewport.css";
import "./components/plan-builder-frequency-page.css";
import "./components/plan-builder-exercises-page.css";
import "./plan-builder-one-page-route.css";

export function PlanBuilderOnePageRoute() {
  const { blueprint, summary } = usePlanBuilderBlueprint();
  const [activeStep, setActiveStep] = useState<PlanBuilderStep | null>(null);
  const [closingStep, setClosingStep] = useState<PlanBuilderStep | null>(null);
  const [isRestoringOverview, setIsRestoringOverview] = useState(false);
  const closeAnimationTimeoutRef = useRef<number | null>(null);
  const overviewRestoreTimeoutRef = useRef<number | null>(null);
  const visibleStep = activeStep ?? closingStep;
  const isClosingSelectedStep = activeStep === null && closingStep !== null;
  const isSectionGridCompact = activeStep !== null || closingStep !== null;
  const nextStep = getNextPlanBuilderStep(blueprint);

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
        <PageHeader
          description="Open any builder section from one focused workspace."
          title="Plan Builder"
        />

        <PageMain>
          <ul
            className={cn(
              "plan-builder-one-page__section-grid",
              isSectionGridCompact ? "plan-builder-one-page__section-grid--compact" : null,
              isRestoringOverview
                ? "plan-builder-one-page__section-grid--restoring-overview"
                : null,
            )}
          >
            {planBuilderOnePageSections.map((section) => (
              <PlanBuilderOnePageSectionCard
                blueprint={blueprint}
                isActive={activeStep === section.id || closingStep === section.id}
                isExpanded={activeStep === section.id}
                key={section.id}
                nextStep={nextStep}
                onSelect={() => selectPlanBuilderSection(section.id)}
                section={section}
                summary={summary}
              />
            ))}
          </ul>

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
                  setActiveStep={openPlanBuilderSection}
                  summary={summary}
                />
              </div>
            </section>
          ) : null}
        </PageMain>
      </div>
    </section>
  );
}
