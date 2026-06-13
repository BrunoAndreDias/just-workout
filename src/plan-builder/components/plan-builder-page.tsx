import { useNavigate } from "@tanstack/react-router";
import { Info } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { cn } from "../../design-system/cn";
import { StepNotice } from "../../design-system/step-screen";
import { Stepper, type StepperItem } from "../../design-system/stepper";
import { PageHeader, PageLead, PageMain } from "../../design-system/typography";
import type { PlanBlueprintSummary } from "../plan-blueprint";
import { planBuilderPaths } from "../plan-builder-paths";
import { PlanBlueprintHeaderBar, PlanBlueprintProgressSummary } from "./plan-blueprint-summary";
import {
  type PlanBuilderStep,
  planBuilderLargeScreenQuery,
  planBuilderSteps,
} from "./plan-builder-config";
import { PlanBuilderPrototypePage, usePlanBuilderPrototypeVariant } from "./plan-builder-prototype";
import "./plan-builder-page.css";

type PlanBuilderPageProps = {
  children: ReactNode;
  currentStep: PlanBuilderStep;
  description: ReactNode;
  summary: PlanBlueprintSummary | null;
};

export type PlanBuilderStepStatusCardProps = {
  body: string;
  className?: string;
  title: string;
  titleDisplay?: PlanBuilderStepStatusCardTitleDisplay;
};

type PlanBuilderStepStatusCardTitleDisplay = "screen-reader-only" | "visible";
export function PlanBuilderPage({
  children,
  currentStep,
  description,
  summary,
}: PlanBuilderPageProps) {
  const navigate = useNavigate();
  const currentStepIndex = getPlanBuilderStepDetails(currentStep).index;
  const prototypeVariant = usePlanBuilderPrototypeVariant();
  const shouldShowPlanBuilderRail = usePlanBuilderLargeScreenLayout();
  const shouldShowWideDesktopBlueprintSummary = usePlanBuilderWideDesktopLayout();
  const shouldShowExerciseBlueprintSummary =
    currentStep === "exercises" && shouldShowPlanBuilderRail;
  const pageTitle = getPlanBuilderPageTitle(currentStep);
  const stepperItems = getPlanBuilderStepperItems(summary, currentStep);
  const [stepperNotice, setStepperNotice] = useState<{
    message: string;
    step: PlanBuilderStep;
  } | null>(null);
  const navigateToPlanBuilderStep = (step: PlanBuilderStep) => {
    void navigate({ to: getPlanBuilderPathByStep(step) });
  };
  const visibleStepperNotice = stepperNotice?.step === currentStep ? stepperNotice.message : null;

  if (currentStep === "frequency" && prototypeVariant) {
    return (
      <PlanBuilderPrototypePage
        currentStepIndex={currentStepIndex}
        intro={<PageLead>{description}</PageLead>}
        summary={summary}
        variant={prototypeVariant}
      >
        {children}
      </PlanBuilderPrototypePage>
    );
  }

  return (
    <section
      className={cn(
        "plan-builder-page",
        `plan-builder-page--${currentStep}`,
        currentStep === "frequency" ? "plan-builder-page--frequency" : null,
      )}
    >
      <section aria-label="Plan Builder workspace" className="plan-builder-workspace-card">
        <PageHeader description={description} title={pageTitle} />
        <PageMain>
          {shouldShowWideDesktopBlueprintSummary || shouldShowExerciseBlueprintSummary ? (
            <PlanBlueprintProgressSummary
              currentStep={currentStep}
              onStepSelect={navigateToPlanBuilderStep}
              summary={summary}
            />
          ) : !shouldShowPlanBuilderRail ? (
            <PlanBlueprintHeaderBar summary={summary} />
          ) : null}

          {!shouldShowPlanBuilderRail ? (
            <div className="plan-builder-stepper">
              <Stepper
                currentIndex={currentStepIndex}
                density="compact"
                items={stepperItems}
                label="Plan Builder"
                onItemSelect={(item) => {
                  setStepperNotice(null);
                  void navigate({ to: getPlanBuilderPathByStep(item.id) });
                }}
                onLockedItemSelect={(item) => {
                  setStepperNotice(
                    item.disabledReason
                      ? {
                          message: item.disabledReason,
                          step: currentStep,
                        }
                      : null,
                  );
                }}
              />
              {visibleStepperNotice ? (
                <p aria-live="polite" className="plan-builder-stepper-notice">
                  {visibleStepperNotice}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="plan-builder-step-content">{children}</div>
        </PageMain>
      </section>
    </section>
  );
}

function getPlanBuilderStepperItems(
  summary: PlanBlueprintSummary | null,
  currentStep: PlanBuilderStep,
): ReadonlyArray<StepperItem> {
  const furthestAvailableIndex = summary
    ? getFurthestAvailablePlanBuilderStepIndex(summary)
    : getPlanBuilderStepDetails(currentStep).index;

  return planBuilderSteps.map((step, index) => {
    const isCurrent = step.id === currentStep;
    const disabledReason =
      !isCurrent && index > furthestAvailableIndex
        ? getPlanBuilderLockedStepReason(step.id)
        : undefined;

    return {
      ...step,
      disabledReason,
    };
  });
}

function getFurthestAvailablePlanBuilderStepIndex(summary: PlanBlueprintSummary): number {
  switch (summary.nextStep) {
    case "Rep ranges":
      return 1;
    case "Volume":
      return 2;
    case "Exercises":
      return 3;
    case "Generate":
      return 4;
  }

  return 0;
}

function getPlanBuilderLockedStepReason(step: PlanBuilderStep): string {
  switch (step) {
    case "rep-ranges":
      return "Confirm Training schedule to unlock Rep ranges.";
    case "volume":
      return "Choose a Rep Range Style to unlock Volume.";
    case "exercises":
      return "Set training volume to unlock Exercises.";
    case "generate":
      return "Choose exercises to unlock Generate.";
    case "frequency":
      return "Start with Training schedule.";
  }

  return "Complete the earlier Plan Builder steps first.";
}

function getPlanBuilderPathByStep(step: string) {
  switch (step) {
    case "exercises":
      return planBuilderPaths.exercises;
    case "frequency":
      return planBuilderPaths.frequency;
    case "rep-ranges":
      return planBuilderPaths.repRanges;
    case "generate":
      return planBuilderPaths.generate;
    case "volume":
      return planBuilderPaths.volume;
  }

  throw new Error(`Unknown Plan Builder step "${step}".`);
}

function getPlanBuilderPageTitle(currentStep: PlanBuilderStep): string {
  switch (currentStep) {
    case "frequency":
      return "Training schedule";
    case "rep-ranges":
      return "Rep ranges";
    case "volume":
      return "Set your training volume";
    case "exercises":
      return "Exercise foundation";
    case "generate":
      return "Generate your training plan";
  }

  return "Build your workout plan";
}
function usePlanBuilderLargeScreenLayout() {
  return usePlanBuilderMediaQuery(planBuilderLargeScreenQuery);
}

function usePlanBuilderWideDesktopLayout() {
  return usePlanBuilderMediaQuery("(min-width: 2200px) and (min-height: 900px)");
}

function usePlanBuilderMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }

    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia(query);
    const handleChange = () => setMatches(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [query]);

  return matches;
}
function getPlanBuilderStepDetails(currentStep: PlanBuilderStep) {
  const index = planBuilderSteps.findIndex((step) => step.id === currentStep);
  const step = planBuilderSteps[index];

  return {
    index,
    number: index + 1,
    title: step?.label ?? "Current step",
  };
}
export function PlanBuilderStepStatusCard({
  body,
  className,
  title,
  titleDisplay = "screen-reader-only",
}: PlanBuilderStepStatusCardProps) {
  return (
    <StepNotice
      className={cn("plan-builder-step-status", className)}
      icon={<Info aria-hidden="true" size={24} strokeWidth={1.7} />}
      title={title}
      titleDisplay={titleDisplay}
    >
      {body}
    </StepNotice>
  );
}
