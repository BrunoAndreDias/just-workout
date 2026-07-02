import { useQuery } from "@tanstack/react-query";
import { Outlet, useRouterState } from "@tanstack/react-router";
import { AppShell } from "../design-system/app-shell";
import { trainingPlansQueryOptions } from "../training-plan";

export function RootLayout() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const trainingPlansQuery = useQuery(trainingPlansQueryOptions());
  const activeTrainingPlan = trainingPlansQuery.data?.find((trainingPlan) => trainingPlan.active);

  return (
    <AppShell
      currentPathname={pathname}
      trainingSessionTarget={
        activeTrainingPlan && activeTrainingPlan.workoutTemplates.length > 0
          ? {
              planId: activeTrainingPlan.id,
            }
          : null
      }
    >
      <Outlet />
    </AppShell>
  );
}
