import type { TrainingPlan, WorkoutTemplate } from "../training-plan";
import {
  getTrainingSessionStartRouteTarget,
  type TrainingSessionStartRouteTarget,
} from "../training-plan-paths";

export type StartWorkoutRouteTarget = TrainingSessionStartRouteTarget;

export function getStartNextWorkoutRouteTarget(
  trainingPlan: Pick<TrainingPlan, "id" | "workoutTemplates">,
): StartWorkoutRouteTarget {
  return getStartWorkoutRouteTarget({
    planId: trainingPlan.id,
    workoutTemplateId: getNextWorkoutTemplateId(trainingPlan),
  });
}

export function getStartWorkoutRouteTarget({
  planId,
  workoutTemplateId,
}: {
  planId: string;
  workoutTemplateId: string;
}): StartWorkoutRouteTarget {
  return getTrainingSessionStartRouteTarget({ planId, templateId: workoutTemplateId });
}

export function getNextWorkoutTemplateId({
  workoutTemplates,
}: Pick<TrainingPlan, "workoutTemplates">): WorkoutTemplate["id"] {
  return workoutTemplates[0]?.id ?? "template-1";
}
