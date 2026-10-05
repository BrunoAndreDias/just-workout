import { useEffect, useRef, useState } from "react";
import { AppShellTopbarContent } from "../../design-system/app-shell";
import { cn } from "../../design-system/cn";
import { PageMain } from "../../design-system/typography";
import type { PlanBuilderStep } from "../builder-state/plan-builder-config";
import { usePlanBuilderBlueprint } from "../builder-state/plan-builder-mutations";
import { getPlanBuilderWorkflow } from "../plan-builder-workflow";
import {
  getPlanBuilderOnePageProgress,
  getPlanBuilderOnePageStepTitle,
  PlanBuilderOnePageOverviewButton,
  PlanBuilderOnePageOverviewHeader,
  PlanBuilderOnePageSectionCard,
  PlanBuilderTopbarStepper,
  planBuilderOnePageSections,
} from "./one-page-overview";
import { PlanBuilderOnePageStepContent } from "./one-page-step";
import "./page-shell/plan-builder-page.css";
import "./one-page-route.css";

type PlanBuilderBlueprintState = ReturnType<typeof usePlanBuilderBlueprint>;
type PlanBuilderSectionTransitions = ReturnType<typeof usePlanBuilderSectionTransitions>;

export function PlanBuilderOnePageRoute() {
  const { blueprint, summary } = usePlanBuilderBlueprint();
  const transitions = usePlanBuilderSectionTransitions();
  const {
    activeStep,
    isClosingSelectedStep,
    isSectionGridCompact,
    openPlanBuilderSection,
    selectPlanBuilderSection,
    visibleStep,
  } = transitions;
  const workflow = getPlanBuilderWorkflow({ activeStep: visibleStep, blueprint });

  return (
    <section className="plan-builder-one-page">
      <div className="plan-builder-one-page__surface">
        <h1 className="sr-only">Plan Builder</h1>

        {activeStep ? (
          <AppShellTopbarContent>
            <PlanBuilderTopbarStepper
              activeStep={activeStep}
              onOpenStep={openPlanBuilderSection}
              onOverview={() => selectPlanBuilderSection(activeStep)}
              workflow={workflow}
            />
          </AppShellTopbarContent>
        ) : null}

        <PageMain className="plan-builder-one-page__main">
          <nav
            aria-label="Plan Blueprint sections"
            className={cn(
              "plan-builder-one-page__section-nav",
              isSectionGridCompact ? "plan-builder-one-page__section-nav--compact" : null,
            )}
          >
            <PlanBuilderOnePageOverviewHeader progress={getPlanBuilderOnePageProgress(workflow)} />

            {activeStep ? (
              <PlanBuilderOnePageOverviewButton
                onClick={() => selectPlanBuilderSection(activeStep)}
              />
            ) : null}

            <PlanBuilderOnePageSectionGrid
              blueprint={blueprint}
              summary={summary}
              transitions={transitions}
              workflow={workflow}
            />
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
                  navigation={{
                    onCloseStep: () => {
                      if (activeStep) {
                        selectPlanBuilderSection(activeStep);
                      }
                    },
                    onOpenStep: openPlanBuilderSection,
                  }}
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

function PlanBuilderOnePageSectionGrid({
  blueprint,
  summary,
  transitions,
  workflow,
}: {
  blueprint: PlanBuilderBlueprintState["blueprint"];
  summary: PlanBuilderBlueprintState["summary"];
  transitions: PlanBuilderSectionTransitions;
  workflow: ReturnType<typeof getPlanBuilderWorkflow>;
}) {
  const {
    activeStep,
    closingStep,
    isRestoringOverview,
    isSectionGridCompact,
    sectionGridRef,
    selectPlanBuilderSection,
  } = transitions;

  return (
    <ol
      className={cn(
        "plan-builder-one-page__section-grid",
        isSectionGridCompact ? "plan-builder-one-page__section-grid--compact" : null,
        isRestoringOverview ? "plan-builder-one-page__section-grid--restoring-overview" : null,
      )}
      ref={sectionGridRef}
    >
      {planBuilderOnePageSections.map((section, index) => {
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
            position={index + 1}
            section={section}
            status={status}
            summary={summary}
          />
        );
      })}
    </ol>
  );
}

function usePlanBuilderSectionTransitions() {
  const [activeStep, setActiveStep] = useState<PlanBuilderStep | null>(null);
  const [closingStep, setClosingStep] = useState<PlanBuilderStep | null>(null);
  const [isRestoringOverview, setIsRestoringOverview] = useState(false);
  const closeAnimationTimeoutRef = useRef<number | null>(null);
  const overviewRestoreTimeoutRef = useRef<number | null>(null);
  const sectionGridRef = useRef<HTMLOListElement | null>(null);
  const visibleStep = activeStep ?? closingStep;
  const isClosingSelectedStep = activeStep === null && closingStep !== null;
  const isSectionGridCompact = activeStep !== null || closingStep !== null;

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

      activeSection.scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
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
      if (prefersReducedMotion()) {
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

  return {
    activeStep,
    closingStep,
    isClosingSelectedStep,
    isRestoringOverview,
    isSectionGridCompact,
    openPlanBuilderSection,
    sectionGridRef,
    selectPlanBuilderSection,
    visibleStep,
  };
}

function prefersReducedMotion() {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
