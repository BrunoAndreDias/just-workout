import { isRepRangeStyleId, isTrainingFrequencyDaysPerWeek } from "./plan-blueprint-options";
import type {
  ExercisesStepCompletionCandidate,
  FrequencyStepCompletionCandidate,
  PlanBlueprint,
  PlanBuilderConfirmedSteps,
  PlanBuilderGuardedStep,
  PlanBuilderRedirectStep,
  RepRangesStepCompletionCandidate,
  SplitStepCompletionCandidate,
  VolumeStepCompletionCandidate,
} from "./plan-blueprint-types";
import { isTrainingSplitCompatible } from "./training-split";
import { isTrainingVolumeConfiguration } from "./training-volume";
import { getWeeklyMovementCoverage } from "./weekly-movement-coverage";

export const defaultConfirmedBuilderSteps = {
  exercises: false,
  frequency: false,
  repRanges: false,
  split: false,
  volume: false,
} satisfies PlanBuilderConfirmedSteps;

export function hasValidTrainingFrequency(
  blueprint: FrequencyStepCompletionCandidate | null | undefined,
): boolean {
  if (!blueprint) {
    return false;
  }

  return isTrainingFrequencyDaysPerWeek(blueprint.trainingFrequencyDaysPerWeek);
}

export function isFrequencyStepComplete(
  blueprint: FrequencyStepCompletionCandidate | null | undefined,
): boolean {
  if (!blueprint || !hasValidTrainingFrequency(blueprint)) {
    return false;
  }

  return getConfirmedBuilderSteps(blueprint).frequency;
}

export function isSplitStepComplete(
  blueprint: SplitStepCompletionCandidate | null | undefined,
): boolean {
  if (!blueprint) {
    return false;
  }

  return (
    getConfirmedBuilderSteps(blueprint).split &&
    isTrainingSplitCompatible(blueprint.split, blueprint.trainingFrequencyDaysPerWeek)
  );
}

export function isRepRangesStepComplete(
  blueprint: RepRangesStepCompletionCandidate | null | undefined,
): boolean {
  if (!blueprint) {
    return false;
  }

  return getConfirmedBuilderSteps(blueprint).repRanges && isRepRangeStyleId(blueprint.repRanges);
}

export function isVolumeStepComplete(
  blueprint: VolumeStepCompletionCandidate | null | undefined,
): boolean {
  if (!blueprint) {
    return false;
  }

  return getConfirmedBuilderSteps(blueprint).volume && isTrainingVolumeConfiguration(blueprint);
}

export function isExercisesStepComplete(
  blueprint: ExercisesStepCompletionCandidate | null | undefined,
): boolean {
  if (!blueprint) {
    return false;
  }

  return getConfirmedBuilderSteps(blueprint).exercises;
}

export function hasConfiguredTrainingSchedule(
  blueprint: Pick<PlanBlueprint, "split" | "trainingFrequencyDaysPerWeek"> | null | undefined,
): boolean {
  if (!blueprint) {
    return false;
  }

  return isTrainingSplitCompatible(blueprint.split, blueprint.trainingFrequencyDaysPerWeek);
}

export function hasConfiguredRepRanges(
  blueprint: Pick<PlanBlueprint, "repRanges"> | null | undefined,
): boolean {
  if (!blueprint) {
    return false;
  }

  return isRepRangeStyleId(blueprint.repRanges);
}

export function hasConfiguredTrainingVolume(
  blueprint: VolumeStepCompletionCandidate | null | undefined,
): boolean {
  if (!blueprint) {
    return false;
  }

  return isTrainingVolumeConfiguration(blueprint);
}

export function hasConfiguredExercises(blueprint: PlanBlueprint | null | undefined): boolean {
  if (
    !blueprint ||
    !hasConfiguredTrainingSchedule(blueprint) ||
    !hasConfiguredTrainingVolume(blueprint)
  ) {
    return false;
  }

  const split = blueprint.split;

  if (!split) {
    return false;
  }

  return getWeeklyMovementCoverage({
    mainCompoundSelections: blueprint.mainCompoundSelections,
    split,
    trainingFrequencyDaysPerWeek: blueprint.trainingFrequencyDaysPerWeek,
  }).canConfirmExercises;
}

export function getPlanBuilderRedirectStep(
  blueprint: PlanBlueprint,
  targetStep: PlanBuilderGuardedStep,
): PlanBuilderRedirectStep | null {
  if (!isFrequencyStepComplete(blueprint)) {
    return "frequency";
  }

  if (!isSplitStepComplete(blueprint)) {
    return "frequency";
  }

  if (targetStep === "rep-ranges") {
    return null;
  }

  if (!isRepRangesStepComplete(blueprint)) {
    return "rep-ranges";
  }

  if (targetStep === "volume") {
    return null;
  }

  if (!isVolumeStepComplete(blueprint)) {
    return "volume";
  }

  if (targetStep === "exercises") {
    return null;
  }

  if (isExercisesStepComplete(blueprint)) {
    return null;
  }

  return "exercises";
}

export function getConfirmedBuilderSteps({
  confirmedBuilderSteps,
}: {
  confirmedBuilderSteps?: Partial<PlanBuilderConfirmedSteps>;
}): PlanBuilderConfirmedSteps {
  return {
    exercises: confirmedBuilderSteps?.exercises === true,
    frequency: confirmedBuilderSteps?.frequency === true,
    repRanges: confirmedBuilderSteps?.repRanges === true,
    split: confirmedBuilderSteps?.split === true,
    volume: confirmedBuilderSteps?.volume === true,
  };
}
