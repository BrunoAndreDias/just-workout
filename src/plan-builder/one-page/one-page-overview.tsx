import {
  Check,
  Circle,
  CircleCheck,
  Dumbbell,
  Layers3,
  SlidersHorizontal,
  Wand2,
} from "lucide-react";
import { cn } from "../../design-system/cn";
import type { PlanBuilderStep } from "../builder-state/plan-builder-config";
import {
  hasConfiguredExercises,
  type PlanBlueprint,
  type PlanBlueprintSummary,
} from "../plan-blueprint";
import type { PlanBuilderWorkflowSectionStatus } from "../plan-builder-workflow";
import "./one-page-overview.css";

export const planBuilderOnePageSections = [
  {
    id: "frequency",
    title: "Training schedule",
    subtitle: "Frequency and split",
    icon: CircleCheck,
  },
  {
    id: "rep-ranges",
    title: "Rep ranges",
    subtitle: "Intensity target",
    icon: SlidersHorizontal,
  },
  {
    id: "volume",
    title: "Volume",
    subtitle: "Sets and weekly load",
    icon: Layers3,
  },
  {
    id: "exercises",
    title: "Exercises",
    subtitle: "Ranked main compounds",
    icon: Dumbbell,
  },
  {
    id: "generate",
    title: "Generate",
    subtitle: "Review before creation",
    icon: Wand2,
  },
] as const satisfies ReadonlyArray<{
  id: PlanBuilderStep;
  icon: typeof CircleCheck;
  subtitle: string;
  title: string;
}>;

export function PlanBuilderOnePageSectionCard({
  blueprint,
  isActive,
  isExpanded,
  onSelect,
  section,
  summary,
  status,
}: {
  blueprint: PlanBlueprint | undefined;
  isActive: boolean;
  isExpanded: boolean;
  onSelect: () => void;
  section: (typeof planBuilderOnePageSections)[number];
  summary: PlanBlueprintSummary | null;
  status: PlanBuilderWorkflowSectionStatus;
}) {
  const Icon = section.icon;

  return (
    <li
      className={cn(
        "plan-builder-one-page__section-card",
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
            <Check aria-hidden="true" size={16} strokeWidth={3} />
          ) : (
            <Icon aria-hidden="true" size={17} strokeWidth={2.2} />
          )}
        </span>
        <span className="plan-builder-one-page__section-copy">
          <span className="plan-builder-one-page__section-title">{section.title}</span>
          <span className="plan-builder-one-page__section-subtitle">{section.subtitle}</span>
        </span>
        <span className="plan-builder-one-page__status-pill" data-status={status.tone}>
          {status.label}
        </span>

        <span className="plan-builder-one-page__section-details">
          {getSectionDetails(section.id, blueprint, summary).map((detail) => (
            <span className="plan-builder-one-page__section-detail" key={detail.id}>
              <Circle aria-hidden="true" size={7} strokeWidth={3} />
              <span>{formatOverviewDetail(detail.label)}</span>
            </span>
          ))}
        </span>
      </button>
    </li>
  );
}

export function getPlanBuilderOnePageStepTitle(step: PlanBuilderStep): string {
  return planBuilderOnePageSections.find((section) => section.id === step)?.title ?? "Builder";
}

function formatOverviewDetail(detail: string): string {
  switch (detail) {
    case "Loading Plan Blueprint":
      return "Loading plan blueprint";
    case "Choose a Training Split":
      return "Choose training split";
    case "Choose Rep ranges":
      return "Choose rep ranges";
    case "Choose a compatible split to see this detail.":
      return "Choose a compatible split first";
    case "Weekly Rep Targets":
      return "Weekly rep targets";
    case "Create Training Plan":
      return "Create training plan";
    default:
      return detail.replace(/\.$/, "");
  }
}

function getSectionDetails(
  sectionId: PlanBuilderStep,
  blueprint: PlanBlueprint | undefined,
  summary: PlanBlueprintSummary | null,
): ReadonlyArray<{ id: string; label: string }> {
  if (!blueprint || !summary) {
    return getLoadingSectionDetails(sectionId);
  }

  switch (sectionId) {
    case "frequency":
      return getFrequencySectionDetails(summary);
    case "rep-ranges":
      return getRepRangeSectionDetails(summary);
    case "volume":
      return getVolumeSectionDetails(summary);
    case "exercises":
      return getExercisesSectionDetails(blueprint);
    case "generate":
      return getGenerateSectionDetails(summary);
  }

  return [];
}

function getLoadingSectionDetails(sectionId: PlanBuilderStep) {
  return [
    { id: `${sectionId}-loading`, label: "Loading Plan Blueprint" },
    { id: `${sectionId}-defaults`, label: "Default choices available" },
    { id: `${sectionId}-saved`, label: "Progress saved locally" },
  ] as const;
}

function getFrequencySectionDetails(summary: PlanBlueprintSummary) {
  return [
    { id: "frequency-days", label: summary.trainingFrequency },
    { id: "frequency-split", label: summary.split },
    { id: "frequency-recovery", label: summary.recovery },
  ] as const;
}

function getRepRangeSectionDetails(summary: PlanBlueprintSummary) {
  return [
    { id: "rep-ranges-selection", label: summary.repRanges },
    { id: "rep-ranges-bias", label: "Main and secondary lift bias" },
    { id: "rep-ranges-accessories", label: "Accessory defaults" },
  ] as const;
}

function getVolumeSectionDetails(summary: PlanBlueprintSummary) {
  return [
    { id: "volume-preset", label: summary.volumePreset },
    { id: "volume-targets", label: "Weekly Rep Targets" },
    { id: "volume-optional", label: "Optional target groups" },
  ] as const;
}

function getExercisesSectionDetails(blueprint: PlanBlueprint) {
  const rankedBucketCount = blueprint.mainCompoundPreferences.length;
  const rankedPreferenceCount = blueprint.mainCompoundPreferences.reduce(
    (preferenceCount, preference) => preferenceCount + preference.exerciseIds.length,
    0,
  );

  return [
    {
      id: "exercises-ranked-buckets",
      label: `${rankedBucketCount} movement buckets ranked`,
    },
    {
      id: "exercises-ranked-preferences",
      label: `${rankedPreferenceCount} main compound preferences`,
    },
    {
      id: "exercises-status",
      label: hasConfiguredExercises(blueprint) ? "Preferences saved" : "Open to rank preferences",
    },
  ] as const;
}

function getGenerateSectionDetails(summary: PlanBlueprintSummary) {
  return [
    { id: "generate-review", label: "Review blueprint" },
    { id: "generate-status", label: summary.generationStatus },
    {
      id: "generate-action",
      label:
        summary.nextStep === "Generate"
          ? "Create Training Plan"
          : "Defaults or choices still needed",
    },
  ] as const;
}
