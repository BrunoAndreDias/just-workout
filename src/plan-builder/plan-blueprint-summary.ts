import {
  getValidRepRangeStyleId,
  repRangeStyleLabels,
  trainingGoalLabels,
} from "./plan-blueprint-options";
import {
  hasConfiguredExercises,
  hasConfiguredTrainingSchedule,
  hasConfiguredTrainingVolume,
} from "./plan-blueprint-progress";
import type {
  PlanBlueprint,
  PlanBlueprintSplitSummaryDetails,
  PlanBlueprintSummary,
  RepRangeStyleId,
  TrainingFrequencyDaysPerWeek,
  TrainingGoal,
} from "./plan-blueprint-types";
import {
  getRecommendedTrainingSplitId,
  isTrainingSplitCompatible,
  summarizeTrainingSplit,
} from "./training-split";
import { getVolumePreset, isVolumePresetId, type VolumePresetId } from "./training-volume";

const planBlueprintSummaryFallbacks = {
  generationStatus: "Defaults or choices still needed",
  nextStep: "Choose a Training Split",
  pendingSplitDerivedDetail: "Choose a compatible split to see this detail.",
  repRanges: "Choose Rep ranges",
  split: "Choose a Training Split",
  volumePreset: "Not chosen yet",
} as const;

export function summarizePlanBlueprint(blueprint: PlanBlueprint): PlanBlueprintSummary {
  const { splitStatus, splitSummary } = getPlanBlueprintSplitSummaryDetails(blueprint);
  const pendingSplitDetail = planBlueprintSummaryFallbacks.pendingSplitDerivedDetail;
  const selectedRepRangeStyleId = getValidRepRangeStyleId(blueprint.repRanges);
  const isTrainingScheduleConfigured = hasConfiguredTrainingSchedule(blueprint);
  const isExercisesConfigured = hasConfiguredExercises(blueprint);
  const isVolumeConfigured = hasConfiguredTrainingVolume(blueprint);
  const selectedVolumePresetId = isVolumePresetId(blueprint.volumePreset)
    ? blueprint.volumePreset
    : null;

  return {
    generationStatus: isExercisesConfigured
      ? "Ready to generate"
      : planBlueprintSummaryFallbacks.generationStatus,
    muscleFrequency: splitSummary?.muscleFrequency ?? pendingSplitDetail,
    nextStep: getPlanBlueprintNextStep({
      hasCompatibleSplit: isTrainingScheduleConfigured,
      hasConfiguredRepRangeStyle: selectedRepRangeStyleId !== null,
      hasConfiguredVolume: isVolumeConfigured,
      isExercisesConfigured,
    }),
    repRanges: selectedRepRangeStyleId
      ? formatRepRangeStyle(selectedRepRangeStyleId)
      : planBlueprintSummaryFallbacks.repRanges,
    recovery: splitSummary?.recovery ?? pendingSplitDetail,
    split: splitSummary?.split ?? planBlueprintSummaryFallbacks.split,
    splitStatus,
    trainingGoal: formatTrainingGoal(blueprint.trainingGoal),
    trainingFrequency: formatTrainingFrequency(blueprint.trainingFrequencyDaysPerWeek),
    trainingFrequencyStatus: "Completed",
    volumePreset: selectedVolumePresetId
      ? formatVolumePreset(selectedVolumePresetId)
      : planBlueprintSummaryFallbacks.volumePreset,
    weeklyRhythm: splitSummary?.weeklyRhythm ?? pendingSplitDetail,
  };
}

function getPlanBlueprintNextStep({
  hasConfiguredRepRangeStyle,
  hasCompatibleSplit,
  hasConfiguredVolume,
  isExercisesConfigured,
}: {
  hasConfiguredRepRangeStyle: boolean;
  hasCompatibleSplit: boolean;
  hasConfiguredVolume: boolean;
  isExercisesConfigured: boolean;
}): string {
  if (!hasCompatibleSplit) {
    return planBlueprintSummaryFallbacks.nextStep;
  }

  if (!hasConfiguredRepRangeStyle) {
    return "Rep ranges";
  }

  if (!hasConfiguredVolume) {
    return "Volume";
  }

  if (!isExercisesConfigured) {
    return "Exercises";
  }

  return "Generate";
}

function getPlanBlueprintSplitSummaryDetails(
  blueprint: PlanBlueprint,
): PlanBlueprintSplitSummaryDetails {
  const selectedSplit = blueprint.split;

  if (!isTrainingSplitCompatible(selectedSplit, blueprint.trainingFrequencyDaysPerWeek)) {
    return {
      splitStatus: null,
      splitSummary: null,
    };
  }

  const recommendedSplit = getRecommendedTrainingSplitId(blueprint.trainingFrequencyDaysPerWeek);

  return {
    splitStatus: selectedSplit === recommendedSplit ? "Recommended" : "Also works",
    splitSummary: summarizeTrainingSplit(selectedSplit),
  };
}

function formatTrainingGoal(trainingGoal: TrainingGoal): string {
  return trainingGoalLabels[trainingGoal];
}

function formatRepRangeStyle(repRangeStyleId: RepRangeStyleId): string {
  return repRangeStyleLabels[repRangeStyleId];
}

function formatVolumePreset(volumePresetId: VolumePresetId): string {
  return getVolumePreset(volumePresetId).title;
}

function formatTrainingFrequency(
  trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek,
): string {
  return `${trainingFrequencyDaysPerWeek} days/week`;
}
