import type { PlanBuilderStep } from "./builder-state/plan-builder-config";
import {
  type PlanBlueprintDefaultResolution,
  resolvePlanBlueprintRecommendedDefaults,
} from "./plan-blueprint-default-resolution";
import { defaultRepRangeStyleId, getValidRepRangeStyleId } from "./plan-blueprint-options";
import {
  hasConfiguredExercises,
  hasConfiguredTrainingSchedule,
  hasConfiguredTrainingVolume,
} from "./plan-blueprint-progress";
import type { PlanBlueprint, RepRangeStyleId } from "./plan-blueprint-types";
import { getRecommendedTrainingSplitId, isTrainingSplitCompatible } from "./training-split";
import { isTrainingVolumeConfiguration, type TrainingVolumeConfiguration } from "./training-volume";

export type PlanBuilderConfiguredSectionStatus = {
  isConfigured: boolean;
  label: string;
  tone: "complete" | "current" | "next" | "ready";
};

export type PlanBuilderGenerationState =
  | "blocked-by-default-resolution"
  | "needs-default-generation-confirmation"
  | "ready-to-generate";

export type PlanBuilderChoiceLifecycle = {
  configuredSections: Record<PlanBuilderStep, PlanBuilderConfiguredSectionStatus>;
  defaultEntryActions: {
    shouldInitializeTrainingVolume: boolean;
    shouldSelectDefaultRepRangeStyle: boolean;
  };
  exercisesStep: {
    configuredBlueprint: PlanBlueprint;
    isReady: true;
    requiresTrainingSchedule: false;
    requiresVolume: false;
  };
  generation: {
    defaultResolution: PlanBlueprintDefaultResolution;
    requiresDefaultGenerationConfirmation: boolean;
    state: PlanBuilderGenerationState;
  };
  nextUnconfiguredStep: PlanBuilderStep | null;
  selectedDefaults: {
    savedRepRangeStyleId: RepRangeStyleId | null;
    selectedRepRangeStyleId: RepRangeStyleId;
    trainingVolumeConfiguration: TrainingVolumeConfiguration | null;
    visibleTrainingSplitId: NonNullable<PlanBlueprint["split"]>;
  };
};

const planBuilderChoiceLifecycleStepOrder = [
  "frequency",
  "rep-ranges",
  "volume",
  "exercises",
  "generate",
] as const satisfies ReadonlyArray<PlanBuilderStep>;

export function getPlanBuilderChoiceLifecycle({
  activeStep = null,
  blueprint,
}: {
  activeStep?: PlanBuilderStep | null;
  blueprint: PlanBlueprint;
}): PlanBuilderChoiceLifecycle {
  const nextUnconfiguredStep = getNextUnconfiguredStep(blueprint);
  const savedRepRangeStyleId = getValidRepRangeStyleId(blueprint.repRanges);
  const trainingVolumeConfiguration = isTrainingVolumeConfiguration(blueprint) ? blueprint : null;
  const defaultResolution = resolvePlanBlueprintRecommendedDefaults(blueprint);

  return {
    configuredSections: getConfiguredSections({
      activeStep,
      blueprint,
      nextUnconfiguredStep,
    }),
    defaultEntryActions: {
      shouldInitializeTrainingVolume:
        activeStep === "volume" && trainingVolumeConfiguration === null,
      shouldSelectDefaultRepRangeStyle:
        activeStep === "rep-ranges" && savedRepRangeStyleId === null,
    },
    exercisesStep: {
      configuredBlueprint: blueprint,
      isReady: true,
      requiresTrainingSchedule: false,
      requiresVolume: false,
    },
    generation: {
      defaultResolution,
      requiresDefaultGenerationConfirmation: defaultResolution.recommendedDefaults.length > 0,
      state: getGenerationState(defaultResolution),
    },
    nextUnconfiguredStep,
    selectedDefaults: {
      savedRepRangeStyleId,
      selectedRepRangeStyleId: savedRepRangeStyleId ?? defaultRepRangeStyleId,
      trainingVolumeConfiguration,
      visibleTrainingSplitId: getVisibleTrainingSplitId(blueprint),
    },
  };
}

function getConfiguredSections({
  activeStep,
  blueprint,
  nextUnconfiguredStep,
}: {
  activeStep: PlanBuilderStep | null;
  blueprint: PlanBlueprint;
  nextUnconfiguredStep: PlanBuilderStep | null;
}): PlanBuilderChoiceLifecycle["configuredSections"] {
  return Object.fromEntries(
    planBuilderChoiceLifecycleStepOrder.map((sectionId) => [
      sectionId,
      getConfiguredSectionStatus({
        activeStep,
        blueprint,
        nextUnconfiguredStep,
        sectionId,
      }),
    ]),
  ) as PlanBuilderChoiceLifecycle["configuredSections"];
}

function getNextUnconfiguredStep(blueprint: PlanBlueprint): PlanBuilderStep | null {
  return (
    planBuilderChoiceLifecycleStepOrder.find(
      (sectionId) => !isBuilderSectionConfigured(sectionId, blueprint),
    ) ?? null
  );
}

function getConfiguredSectionStatus({
  activeStep,
  blueprint,
  nextUnconfiguredStep,
  sectionId,
}: {
  activeStep: PlanBuilderStep | null;
  blueprint: PlanBlueprint;
  nextUnconfiguredStep: PlanBuilderStep | null;
  sectionId: PlanBuilderStep;
}): PlanBuilderConfiguredSectionStatus {
  const isConfigured = isBuilderSectionConfigured(sectionId, blueprint);

  if (isConfigured) {
    return { isConfigured, label: "Done", tone: "complete" };
  }

  if (sectionId === activeStep) {
    return { isConfigured, label: "Open", tone: "current" };
  }

  if (sectionId === nextUnconfiguredStep) {
    return { isConfigured, label: "Next", tone: "next" };
  }

  return { isConfigured, label: "Ready", tone: "ready" };
}

function isBuilderSectionConfigured(sectionId: PlanBuilderStep, blueprint: PlanBlueprint): boolean {
  switch (sectionId) {
    case "frequency":
      return hasConfiguredTrainingSchedule(blueprint);
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

function getVisibleTrainingSplitId(blueprint: PlanBlueprint): NonNullable<PlanBlueprint["split"]> {
  if (isTrainingSplitCompatible(blueprint.split, blueprint.trainingFrequencyDaysPerWeek)) {
    return blueprint.split;
  }

  return getRecommendedTrainingSplitId(blueprint.trainingFrequencyDaysPerWeek);
}

function getGenerationState({
  blockingIssues,
  recommendedDefaults,
}: PlanBlueprintDefaultResolution): PlanBuilderGenerationState {
  if (blockingIssues.length > 0) {
    return "blocked-by-default-resolution";
  }

  if (recommendedDefaults.length > 0) {
    return "needs-default-generation-confirmation";
  }

  return "ready-to-generate";
}
