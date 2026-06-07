import { useNavigate } from "@tanstack/react-router";
import { Info } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { cn } from "../../design-system/cn";
import { StepNotice } from "../../design-system/step-screen";
import { Stepper } from "../../design-system/stepper";
import { PageTitle } from "../../design-system/typography";
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
  intro: ReactNode;
  summary: PlanBlueprintSummary | null;
};

export type PlanBuilderStepStatusCardProps = {
  body: string;
  className?: string;
  title: string;
  titleDisplay?: PlanBuilderStepStatusCardTitleDisplay;
};

type PlanBuilderStepStatusCardTitleDisplay = "screen-reader-only" | "visible";
export function PlanBuilderPage({ children, currentStep, intro, summary }: PlanBuilderPageProps) {
  const navigate = useNavigate();
  const currentStepIndex = getPlanBuilderStepDetails(currentStep).index;
  const prototypeVariant = usePlanBuilderPrototypeVariant();
  const shouldShowPlanBuilderRail = usePlanBuilderLargeScreenLayout();
  const shouldShowWideDesktopBlueprintSummary = usePlanBuilderWideDesktopLayout();
  const shouldShowExerciseBlueprintSummary =
    currentStep === "exercises" && shouldShowPlanBuilderRail;
  const pageTitle = getPlanBuilderPageTitle(currentStep);
  const navigateToPlanBuilderStep = (step: PlanBuilderStep) => {
    void navigate({ to: getPlanBuilderPathByStep(step) });
  };

  if (currentStep === "frequency" && prototypeVariant) {
    return (
      <PlanBuilderPrototypePage
        currentStepIndex={currentStepIndex}
        intro={intro}
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
        <header className="plan-builder-header">
          <PageTitle className="plan-builder-title">{pageTitle}</PageTitle>
          {intro}
          {shouldShowWideDesktopBlueprintSummary || shouldShowExerciseBlueprintSummary ? (
            <PlanBlueprintProgressSummary
              currentStep={currentStep}
              onStepSelect={navigateToPlanBuilderStep}
              summary={summary}
            />
          ) : !shouldShowPlanBuilderRail ? (
            <PlanBlueprintHeaderBar summary={summary} />
          ) : null}
        </header>

        {!shouldShowPlanBuilderRail ? (
          <div className="plan-builder-stepper">
            <Stepper
              currentIndex={currentStepIndex}
              density="compact"
              items={planBuilderSteps}
              label="Plan Builder"
              onItemSelect={(item) => {
                void navigate({ to: getPlanBuilderPathByStep(item.id) });
              }}
            />
          </div>
        ) : null}

        <div className="plan-builder-step-content">{children}</div>
      </section>
    </section>
  );
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
