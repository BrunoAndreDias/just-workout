import type { WorkoutTemplate } from "./training-plan";

export type TrainingSessionRouteParams = {
  planId: string;
  templateId: string;
};

export function parseTrainingSessionRoutePathname(
  pathname: string,
): TrainingSessionRouteParams | null {
  const match = /^\/training-plans\/([^/]+)\/sessions\/new\/([^/]+)$/.exec(pathname);
  const planId = match?.[1];
  const templateId = match?.[2];

  if (!planId || !templateId) {
    return null;
  }

  return {
    planId: decodeURIComponent(planId),
    templateId: decodeURIComponent(templateId),
  };
}

export function getWorkoutTemplateForTrainingSessionRoute({
  templateId,
  workoutTemplates,
}: {
  templateId: string | null;
  workoutTemplates: ReadonlyArray<WorkoutTemplate>;
}): WorkoutTemplate | null {
  return workoutTemplates.find((template) => template.id === templateId) ?? null;
}
