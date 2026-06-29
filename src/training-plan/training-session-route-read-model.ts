import type { WorkoutTemplate } from "./training-plan";
import {
  parseTrainingSessionStartPathname,
  type TrainingSessionRouteParams,
} from "./training-plan-paths";

export function parseTrainingSessionRoutePathname(
  pathname: string,
): TrainingSessionRouteParams | null {
  return parseTrainingSessionStartPathname(pathname);
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
