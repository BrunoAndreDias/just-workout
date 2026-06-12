import { useQuery } from "@tanstack/react-query";
import { Outlet, useRouterState } from "@tanstack/react-router";
import { AppShell } from "../design-system/app-shell";
import { trainingPlanService } from "../training-plan";

export function RootLayout() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const trainingPlansQuery = useQuery({
    queryFn: () => trainingPlanService.getTrainingPlans(),
    queryKey: ["training-plans"],
  });
  const activeTrainingPlan = trainingPlansQuery.data?.find((trainingPlan) => trainingPlan.active);
  const nextWorkoutTemplate = activeTrainingPlan?.workoutTemplates[0];

  return (
    <AppShell
      currentPathname={pathname}
      trainingSessionTarget={
        activeTrainingPlan && nextWorkoutTemplate
          ? {
              planId: activeTrainingPlan.id,
              templateId: nextWorkoutTemplate.id,
            }
          : null
      }
    >
      <Outlet />
    </AppShell>
  );
}
