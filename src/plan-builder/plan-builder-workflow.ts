import type { PlanBuilderStep } from "./builder-state/plan-builder-config";
import {
  defaultRepRangeStyleId,
  type PlanBlueprint,
  type PlanBlueprintDefaultResolution,
  type RepRangeStyleId,
} from "./plan-blueprint";
import {
  getPlanBuilderChoiceLifecycle,
  type PlanBuilderChoiceLifecycle,
} from "./plan-builder-choice-lifecycle";
import type { TrainingVolumeConfiguration } from "./training-volume";

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
    staleBuilderOutput: PlanBuilderChoiceLifecycle["generation"]["staleBuilderOutput"] | null;
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
  if (!blueprint) {
    return getLoadingPlanBuilderWorkflow(activeStep);
  }

  const lifecycle = getPlanBuilderChoiceLifecycle({ activeStep, blueprint });

  return {
    defaultEntryActions: lifecycle.defaultEntryActions,
    exerciseSetup: lifecycle.exercisesStep,
    generation: {
      defaultResolution: lifecycle.generation.defaultResolution,
      staleBuilderOutput: lifecycle.generation.staleBuilderOutput,
    },
    nextStep: lifecycle.nextUnconfiguredStep,
    savedRepRangeStyleId: lifecycle.selectedDefaults.savedRepRangeStyleId,
    sectionStatuses: mapConfiguredSectionsToWorkflowStatuses(lifecycle.configuredSections),
    selectedRepRangeStyleId: lifecycle.selectedDefaults.selectedRepRangeStyleId,
    trainingVolumeConfiguration: lifecycle.selectedDefaults.trainingVolumeConfiguration,
    visibleTrainingSplitId: lifecycle.selectedDefaults.visibleTrainingSplitId,
  };
}

function getLoadingPlanBuilderWorkflow(activeStep: PlanBuilderStep | null): PlanBuilderWorkflow {
  return {
    defaultEntryActions: {
      shouldInitializeTrainingVolume: activeStep === "volume",
      shouldSelectDefaultRepRangeStyle: activeStep === "rep-ranges",
    },
    exerciseSetup: {
      configuredBlueprint: null,
      isReady: false,
      requiresTrainingSchedule: false,
      requiresVolume: false,
    },
    generation: {
      defaultResolution: null,
      staleBuilderOutput: null,
    },
    nextStep: null,
    savedRepRangeStyleId: null,
    sectionStatuses: Object.fromEntries(
      planBuilderWorkflowStepOrder.map((step) => [
        step,
        { isComplete: false, label: "Loading", tone: "ready" },
      ]),
    ) as PlanBuilderWorkflow["sectionStatuses"],
    selectedRepRangeStyleId: defaultRepRangeStyleId,
    trainingVolumeConfiguration: null,
    visibleTrainingSplitId: "full-body-3-day",
  };
}

function mapConfiguredSectionsToWorkflowStatuses(
  configuredSections: PlanBuilderChoiceLifecycle["configuredSections"],
): PlanBuilderWorkflow["sectionStatuses"] {
  return Object.fromEntries(
    Object.entries(configuredSections).map(([step, status]) => [
      step,
      {
        isComplete: status.isConfigured,
        label: status.label,
        tone: status.tone,
      },
    ]),
  ) as PlanBuilderWorkflow["sectionStatuses"];
}
