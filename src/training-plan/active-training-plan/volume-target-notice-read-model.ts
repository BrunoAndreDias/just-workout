import type { TrainingPlan } from "../training-plan";
import {
  getWeeklyRepTargetDriftNotices,
  type WeeklyRepTargetDriftNotice,
} from "../weekly-rep-target-drift";

export type ActiveTrainingPlanVolumeTargetNoticeReadModel = WeeklyRepTargetDriftNotice;

export function getVolumeTargetNoticesReadModel(
  trainingPlan: TrainingPlan,
): ActiveTrainingPlanVolumeTargetNoticeReadModel[] {
  return getWeeklyRepTargetDriftNotices(trainingPlan);
}
