import { repRangeStyleLabels } from "../../plan-builder/plan-blueprint-options";
import type { TrainingPlan } from "../index";

export type PlanSummaryReadModel = {
  blockLength: string;
  repRangeStyle: string;
  rotationPools: string;
  volumeTargets: string;
};

export function getPlanSummaryReadModel(trainingPlan: TrainingPlan): PlanSummaryReadModel {
  return {
    blockLength: `${trainingPlan.trainingBlockWeeks} weeks`,
    repRangeStyle: formatSummaryRepRangeStyle(trainingPlan),
    rotationPools: `${trainingPlan.mainCompoundRotationPools.length} configured`,
    volumeTargets: `${getEnabledVolumeTargetCount(trainingPlan)} enabled`,
  };
}

function formatSummaryRepRangeStyle(trainingPlan: TrainingPlan): string {
  return getRepRangeStyleLabel(trainingPlan).replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getEnabledVolumeTargetCount(trainingPlan: TrainingPlan): number {
  return trainingPlan.weeklyRepTargets.filter((target) => target.isEnabled).length;
}

function getRepRangeStyleLabel(trainingPlan: TrainingPlan): string {
  return repRangeStyleLabels[trainingPlan.repRangeStyle] ?? "Balanced hypertrophy";
}
