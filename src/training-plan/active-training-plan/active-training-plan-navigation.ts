import type { TrainingPlan, WorkoutTemplate } from "../training-plan";

export type StartWorkoutRouteTarget = {
  params: {
    planId: string;
    templateId: string;
  };
  to: "/training-plans/$planId/sessions/new/$templateId";
};

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
  return {
    params: {
      planId,
      templateId: workoutTemplateId,
    },
    to: "/training-plans/$planId/sessions/new/$templateId",
  };
}

export function getNextWorkoutTemplateId({
  workoutTemplates,
}: Pick<TrainingPlan, "workoutTemplates">): WorkoutTemplate["id"] {
  return workoutTemplates[0]?.id ?? "template-1";
}
