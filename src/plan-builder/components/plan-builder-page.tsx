import { Info } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { cn } from "../../design-system/cn";
import { RailPanel } from "../../design-system/rail-panel";
import { StepNotice } from "../../design-system/step-screen";
import { Stepper } from "../../design-system/stepper";
import { PageKicker, PageTitle } from "../../design-system/typography";
import type { PlanBlueprintSummary } from "../plan-blueprint";
import {
  PlanBlueprintHeaderBar,
  PlanBlueprintRailCard,
  PlanBuilderNextStepCard,
} from "./plan-blueprint-summary";
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
  const currentStepIndex = getPlanBuilderStepDetails(currentStep).index;
  const prototypeVariant = usePlanBuilderPrototypeVariant();
  const shouldShowPlanBuilderRail = usePlanBuilderLargeScreenLayout();
  const pageTitle = getPlanBuilderPageTitle(currentStep);

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
      <section
        aria-label="Plan Builder workspace"
        className="plan-builder-workspace-card min-w-0 p-6 sm:p-8 lg:min-h-screen lg:px-8 lg:pb-3 lg:pt-11 xl:px-[3.125rem]"
      >
        <header className="space-y-2">
          <PageKicker className="plan-builder-eyebrow">Workout Plan Builder</PageKicker>
          <PageTitle className="plan-builder-title sm:text-[2.5rem]">{pageTitle}</PageTitle>
          {intro}
          <PlanBlueprintHeaderBar summary={summary} />
        </header>

        <div className="plan-builder-stepper mt-7">
          <Stepper currentIndex={currentStepIndex} items={planBuilderSteps} label="Plan Builder" />
        </div>

        <div className="plan-builder-step-content mt-9">{children}</div>
      </section>

      {shouldShowPlanBuilderRail ? (
        <RailPanel aria-label="Plan blueprint summary" className="plan-builder-right-rail">
          <PlanBlueprintRailCard summary={summary} />
          <PlanBuilderNextStepCard currentStep={currentStep} />
        </RailPanel>
      ) : null}
    </section>
  );
}

function getPlanBuilderPageTitle(currentStep: PlanBuilderStep): string {
  switch (currentStep) {
    case "frequency":
      return "Build your workout plan";
    case "split":
      return "Choose your training split";
    case "rep-ranges":
      return "Build your workout plan";
    case "volume":
      return "Set your training volume";
    case "exercises":
      return "Choose your exercises";
    case "review":
      return "Review your plan blueprint";
  }

  return "Build your workout plan";
}
export function usePlanBuilderLargeScreenLayout() {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }

    return window.matchMedia(planBuilderLargeScreenQuery).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia(planBuilderLargeScreenQuery);
    const handleChange = () => setMatches(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

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
