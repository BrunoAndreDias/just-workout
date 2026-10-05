import { ArrowLeft, Check, ChevronRight, Wand2 } from "lucide-react";
import { cn } from "../../design-system/cn";
import type { PlanBuilderStep } from "../builder-state/plan-builder-config";
import type { PlanBlueprint, PlanBlueprintSummary } from "../plan-blueprint";
import type {
  PlanBuilderWorkflow,
  PlanBuilderWorkflowSectionStatus,
} from "../plan-builder-workflow";
import { getPlanBuilderChoiceValue } from "./plan-builder-choice-values";
import "./one-page-overview.css";

export const planBuilderOnePageSections = [
  {
    id: "frequency",
    compactTitle: "Schedule",
    title: "Training schedule",
    subtitle: "How many days you train, and how they're split",
  },
  {
    id: "rep-ranges",
    compactTitle: "Rep ranges",
    title: "Rep ranges",
    subtitle: "How many reps you do in each set",
  },
  {
    id: "volume",
    compactTitle: "Volume",
    title: "Volume",
    subtitle: "How much work each muscle gets per week",
  },
  {
    id: "exercises",
    compactTitle: "Exercises",
    title: "Exercises",
    subtitle: "Rank the lifts you like, or keep our picks",
  },
  {
    id: "generate",
    compactTitle: "Generate",
    title: "Generate",
    subtitle: "Review your choices and create your Training Plan",
  },
] as const satisfies ReadonlyArray<{
  id: PlanBuilderStep;
  compactTitle: string;
  subtitle: string;
  title: string;
}>;

const planBuilderOnePageChoiceSteps = planBuilderOnePageSections
  .map((section) => section.id)
  .filter((step) => step !== "generate");

export function getPlanBuilderOnePageProgress(workflow: PlanBuilderWorkflow) {
  const steps = planBuilderOnePageChoiceSteps.map((step) => ({
    id: step,
    isComplete: workflow.sectionStatuses[step]?.isComplete === true,
  }));

  return {
    completedCount: steps.filter((step) => step.isComplete).length,
    steps,
    totalCount: steps.length,
  };
}

export function PlanBuilderOnePageOverviewHeader({
  progress,
}: {
  progress: ReturnType<typeof getPlanBuilderOnePageProgress>;
}) {
  return (
    <div className="plan-builder-one-page__section-nav-header">
      <div className="plan-builder-one-page__section-nav-intro">
        <h2 className="plan-builder-one-page__section-nav-title">Build your Training Plan</h2>
        <p className="plan-builder-one-page__section-nav-copy">
          Make four choices in any order, then generate. Anything you skip uses a Recommended
          Default.
        </p>
      </div>
      <div className="plan-builder-one-page__progress">
        <p className="plan-builder-one-page__progress-label">
          <strong>{progress.completedCount}</strong> of {progress.totalCount} set
        </p>
        <span aria-hidden="true" className="plan-builder-one-page__progress-track">
          {progress.steps.map((step) => (
            <span
              className="plan-builder-one-page__progress-segment"
              data-filled={step.isComplete ? "true" : undefined}
              key={step.id}
            />
          ))}
        </span>
      </div>
    </div>
  );
}

/** Compact step list that lives in the app top bar while a step is open (laptop and up). */
export function PlanBuilderTopbarStepper({
  activeStep,
  onOpenStep,
  onOverview,
  workflow,
}: {
  activeStep: PlanBuilderStep;
  onOpenStep: (step: PlanBuilderStep) => void;
  onOverview: () => void;
  workflow: PlanBuilderWorkflow;
}) {
  return (
    <nav aria-label="Plan Builder steps" className="pb-topbar-steps">
      <button className="pb-topbar-steps__overview" onClick={onOverview} type="button">
        <ArrowLeft aria-hidden="true" size={15} strokeWidth={2.4} />
        <span>Overview</span>
      </button>
      <ol className="pb-topbar-steps__list">
        {planBuilderOnePageSections.map((section, index) => {
          const isCurrent = section.id === activeStep;
          const isComplete = workflow.sectionStatuses[section.id]?.isComplete === true;

          return (
            <li key={section.id}>
              <button
                aria-current={isCurrent ? "step" : undefined}
                className="pb-topbar-steps__step"
                data-complete={isComplete ? "true" : undefined}
                onClick={() => {
                  if (!isCurrent) {
                    onOpenStep(section.id);
                  }
                }}
                type="button"
              >
                <span aria-hidden="true" className="pb-topbar-steps__marker">
                  {isComplete ? <Check size={11} strokeWidth={3.4} /> : index + 1}
                </span>
                {section.compactTitle}
                {isComplete ? <span className="sr-only"> (set)</span> : null}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function PlanBuilderOnePageOverviewButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="plan-builder-one-page__overview-button" onClick={onClick} type="button">
      <ArrowLeft aria-hidden="true" size={16} strokeWidth={2.4} />
      <span>Overview</span>
    </button>
  );
}

export function PlanBuilderOnePageSectionCard({
  blueprint,
  isActive,
  isExpanded,
  onSelect,
  position,
  section,
  summary,
  status,
}: {
  blueprint: PlanBlueprint | undefined;
  isActive: boolean;
  isExpanded: boolean;
  onSelect: () => void;
  position: number;
  section: (typeof planBuilderOnePageSections)[number];
  summary: PlanBlueprintSummary | null;
  status: PlanBuilderWorkflowSectionStatus;
}) {
  const isGenerate = section.id === "generate";
  const value = isGenerate
    ? null
    : getPlanBuilderChoiceValue({
        blueprint,
        isConfigured: status.isComplete,
        sectionId: section.id,
        summary,
      });
  const subtitle = isGenerate && summary ? getGenerateSubtitle(summary, status) : section.subtitle;

  return (
    <li
      className={cn(
        "plan-builder-one-page__section-card",
        isGenerate ? "plan-builder-one-page__section-card--generate" : null,
        isActive ? "plan-builder-one-page__section-card--active" : null,
      )}
      data-status={status.tone}
    >
      <button
        aria-expanded={isExpanded}
        aria-pressed={isExpanded}
        className="plan-builder-one-page__section-button"
        onClick={onSelect}
        type="button"
      >
        <span className="plan-builder-one-page__section-icon" data-status={status.tone}>
          {status.tone === "complete" ? (
            <Check aria-hidden="true" size={15} strokeWidth={3} />
          ) : isGenerate ? (
            <Wand2 aria-hidden="true" size={16} strokeWidth={2.2} />
          ) : (
            <span aria-hidden="true">{position}</span>
          )}
        </span>
        <span className="plan-builder-one-page__section-copy">
          <span className="plan-builder-one-page__section-title">
            <span className="plan-builder-one-page__section-title-full">{section.title}</span>
            <span aria-hidden="true" className="plan-builder-one-page__section-title-compact">
              {section.compactTitle}
            </span>
          </span>
          <span className="plan-builder-one-page__section-subtitle">{subtitle}</span>
        </span>
        {value ? (
          <span
            className="plan-builder-one-page__section-details"
            data-empty={status.isComplete ? undefined : "true"}
          >
            {value}
          </span>
        ) : null}
        <span className="plan-builder-one-page__status-pill" data-status={status.tone}>
          <span className="sr-only">{getStatusDescription(status)}. </span>
          {getSectionActionLabel(section.id, status)}
          <ChevronRight aria-hidden="true" size={15} strokeWidth={2.4} />
        </span>
      </button>
    </li>
  );
}

export function getPlanBuilderOnePageStepTitle(step: PlanBuilderStep): string {
  return planBuilderOnePageSections.find((section) => section.id === step)?.title ?? "Builder";
}

function getStatusDescription(status: PlanBuilderWorkflowSectionStatus): string {
  switch (status.tone) {
    case "complete":
      return "Set";
    case "next":
      return "Up next";
    case "current":
      return "Open";
    case "ready":
      return status.label === "Loading" ? "Loading" : "Not set yet";
  }
}

function getSectionActionLabel(
  sectionId: PlanBuilderStep,
  status: PlanBuilderWorkflowSectionStatus,
): string {
  if (sectionId === "generate") {
    return "Review";
  }

  if (status.tone === "complete") {
    return "Edit";
  }

  return status.tone === "next" ? "Start" : "Choose";
}

function getGenerateSubtitle(
  summary: PlanBlueprintSummary,
  status: PlanBuilderWorkflowSectionStatus,
): string {
  if (summary.nextStep === "Generate" || status.tone === "next") {
    return "All set. Review your choices and create your Training Plan";
  }

  return "Ready any time. Unset choices use Recommended Defaults";
}
