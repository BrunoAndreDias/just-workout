import {
  getValidRepRangeStyleId,
  repRangeStyleLabels,
  trainingGoalLabels,
} from "./plan-blueprint-options";
import { isExercisesStepComplete, isVolumeStepComplete } from "./plan-blueprint-progress";
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
  generationStatus: "Not ready yet",
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
  const hasRepRangeStyle = selectedRepRangeStyleId !== null;
  const isExercisesConfirmed = isExercisesStepComplete(blueprint);
  const isVolumeConfirmed = isVolumeStepComplete(blueprint);
  const selectedVolumePresetId = isVolumePresetId(blueprint.volumePreset)
    ? blueprint.volumePreset
    : null;

  return {
    generationStatus: planBlueprintSummaryFallbacks.generationStatus,
    muscleFrequency: splitSummary?.muscleFrequency ?? pendingSplitDetail,
    nextStep: getPlanBlueprintNextStep({
      isExercisesConfirmed,
      hasCompatibleSplit: splitSummary !== null,
      hasRepRangeStyle,
      isVolumeConfirmed,
    }),
    repRanges: hasRepRangeStyle
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
  isExercisesConfirmed,
  hasCompatibleSplit,
  hasRepRangeStyle,
  isVolumeConfirmed,
}: {
  isExercisesConfirmed: boolean;
  hasCompatibleSplit: boolean;
  hasRepRangeStyle: boolean;
  isVolumeConfirmed: boolean;
}): string {
  if (!hasCompatibleSplit) {
    return planBlueprintSummaryFallbacks.nextStep;
  }

  if (!hasRepRangeStyle) {
    return "Rep ranges";
  }

  if (!isVolumeConfirmed) {
    return "Volume";
  }

  if (!isExercisesConfirmed) {
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
