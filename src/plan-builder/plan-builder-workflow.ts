import type { PlanBuilderStep } from "./builder-state/plan-builder-config";
import {
  defaultRepRangeStyleId,
  getValidRepRangeStyleId,
  hasConfiguredExercises,
  hasConfiguredTrainingVolume,
  type PlanBlueprint,
  type PlanBlueprintDefaultResolution,
  type RepRangeStyleId,
  resolvePlanBlueprintRecommendedDefaults,
} from "./plan-blueprint";
import { getRecommendedTrainingSplitId, isTrainingSplitCompatible } from "./training-split";
import { isTrainingVolumeConfiguration, type TrainingVolumeConfiguration } from "./training-volume";

export type PlanBuilderWorkflowSectionStatus = {
  isComplete: boolean;
  label: string;
  tone: "complete" | "current" | "next" | "ready";
};

export type PlanBuilderWorkflow = {
  defaultEntryActions: {
    shouldInitializeTrainingVolume: boolean;
    shouldSelectDefaultRepRangeStyle: boolean;
  };
  exerciseSetup: {
    configuredBlueprint: PlanBlueprint | null;
    isReady: boolean;
    requiresTrainingSchedule: boolean;
    requiresVolume: boolean;
  };
  generation: {
    defaultResolution: PlanBlueprintDefaultResolution | null;
  };
  nextStep: PlanBuilderStep | null;
  savedRepRangeStyleId: RepRangeStyleId | null;
  sectionStatuses: Record<PlanBuilderStep, PlanBuilderWorkflowSectionStatus>;
  selectedRepRangeStyleId: RepRangeStyleId;
  trainingVolumeConfiguration: TrainingVolumeConfiguration | null;
  visibleTrainingSplitId: NonNullable<PlanBlueprint["split"]>;
};

const planBuilderWorkflowStepOrder = [
  "frequency",
  "rep-ranges",
  "volume",
  "exercises",
  "generate",
] as const satisfies ReadonlyArray<PlanBuilderStep>;

export function getPlanBuilderWorkflow({
  activeStep = null,
  blueprint,
}: {
  activeStep?: PlanBuilderStep | null;
  blueprint: PlanBlueprint | undefined;
}): PlanBuilderWorkflow {
  const nextStep = getNextPlanBuilderStep(blueprint);
  const savedRepRangeStyleId = blueprint ? getValidRepRangeStyleId(blueprint.repRanges) : null;
  const selectedRepRangeStyleId = savedRepRangeStyleId ?? defaultRepRangeStyleId;
  const trainingVolumeConfiguration =
    blueprint && isTrainingVolumeConfiguration(blueprint) ? blueprint : null;
  const configuredBlueprint = blueprint ?? null;
  const visibleTrainingSplitId = blueprint
    ? getVisibleTrainingSplitId(blueprint)
    : "full-body-3-day";
  const defaultResolution = blueprint ? resolvePlanBlueprintRecommendedDefaults(blueprint) : null;

  return {
    defaultEntryActions: {
      shouldInitializeTrainingVolume:
        activeStep === "volume" && trainingVolumeConfiguration === null,
      shouldSelectDefaultRepRangeStyle:
        activeStep === "rep-ranges" && savedRepRangeStyleId === null,
    },
    exerciseSetup: {
      configuredBlueprint,
      isReady: configuredBlueprint !== null,
      requiresTrainingSchedule: false,
      requiresVolume: false,
    },
    generation: {
      defaultResolution,
    },
    nextStep,
    savedRepRangeStyleId,
    sectionStatuses: getSectionStatuses({
      activeStep,
      blueprint,
      nextStep,
    }),
    selectedRepRangeStyleId,
    trainingVolumeConfiguration,
    visibleTrainingSplitId,
  };
}

function getSectionStatuses({
  activeStep,
  blueprint,
  nextStep,
}: {
  activeStep: PlanBuilderStep | null;
  blueprint: PlanBlueprint | undefined;
  nextStep: PlanBuilderStep | null;
}): PlanBuilderWorkflow["sectionStatuses"] {
  return Object.fromEntries(
    planBuilderWorkflowStepOrder.map((step) => [
      step,
      getSectionStatus({
        activeStep,
        blueprint,
        nextStep,
        sectionId: step,
      }),
    ]),
  ) as PlanBuilderWorkflow["sectionStatuses"];
}

function getNextPlanBuilderStep(blueprint: PlanBlueprint | undefined): PlanBuilderStep | null {
  if (!blueprint) {
    return null;
  }

  return planBuilderWorkflowStepOrder.find((step) => !isSectionComplete(step, blueprint)) ?? null;
}

function getSectionStatus({
  activeStep,
  blueprint,
  nextStep,
  sectionId,
}: {
  activeStep: PlanBuilderStep | null;
  blueprint: PlanBlueprint | undefined;
  nextStep: PlanBuilderStep | null;
  sectionId: PlanBuilderStep;
}): PlanBuilderWorkflowSectionStatus {
  if (!blueprint) {
    return { isComplete: false, label: "Loading", tone: "ready" };
  }

  const isComplete = isSectionComplete(sectionId, blueprint);

  if (isComplete) {
    return { isComplete, label: "Done", tone: "complete" };
  }

  if (sectionId === activeStep) {
    return { isComplete, label: "Open", tone: "current" };
  }

  if (sectionId === nextStep) {
    return { isComplete, label: "Next", tone: "next" };
  }

  return { isComplete, label: "Ready", tone: "ready" };
}

function isSectionComplete(sectionId: PlanBuilderStep, blueprint: PlanBlueprint): boolean {
  switch (sectionId) {
    case "frequency":
      return hasCompatibleSelectedTrainingSplit(blueprint);
    case "rep-ranges":
      return getValidRepRangeStyleId(blueprint.repRanges) !== null;
    case "volume":
      return hasConfiguredTrainingVolume(blueprint);
    case "exercises":
      return hasConfiguredExercises(blueprint);
    case "generate":
      return false;
  }

  return false;
}

function hasCompatibleSelectedTrainingSplit(
  blueprint: PlanBlueprint,
): blueprint is PlanBlueprint & { split: NonNullable<PlanBlueprint["split"]> } {
  return isTrainingSplitCompatible(blueprint.split, blueprint.trainingFrequencyDaysPerWeek);
}

function getVisibleTrainingSplitId(blueprint: PlanBlueprint): NonNullable<PlanBlueprint["split"]> {
  if (hasCompatibleSelectedTrainingSplit(blueprint)) {
    return blueprint.split;
  }

  return getRecommendedTrainingSplitId(blueprint.trainingFrequencyDaysPerWeek);
}
