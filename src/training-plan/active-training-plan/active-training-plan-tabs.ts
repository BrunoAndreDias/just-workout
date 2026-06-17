import type { TrainingPlan, WorkoutTemplate } from "../index";

export type ActiveTrainingPlanTabId = "overview" | `workout-${number}` | "compare";

export type ActiveTrainingPlanTab = {
  id: ActiveTrainingPlanTabId;
  label: string;
};

export function getWorkoutTemplateForTab(
  trainingPlan: TrainingPlan,
  activeTabId: ActiveTrainingPlanTabId,
): WorkoutTemplate | null {
  if (activeTabId.startsWith("workout-")) {
    const templateIndex = Number(activeTabId.replace("workout-", ""));

    return trainingPlan.workoutTemplates[templateIndex] ?? null;
  }

  return null;
}

export function getActiveTrainingPlanTabs(trainingPlan: TrainingPlan): ActiveTrainingPlanTab[] {
  return [
    { id: "overview", label: "Overview" },
    ...trainingPlan.workoutTemplates.map((template, index) => ({
      id: `workout-${index}` as const,
      label: template.label,
    })),
    { id: "compare", label: "Compare" },
  ];
}
