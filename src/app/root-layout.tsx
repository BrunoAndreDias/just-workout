import { useQuery } from "@tanstack/react-query";
import { Outlet, useRouterState } from "@tanstack/react-router";
import { AppShell } from "../design-system/app-shell";
import type { TrainingPlan } from "../training-plan/training-plan";
import { trainingPlansQueryOptions } from "../training-plan/training-plan-query-options";

export function RootLayout() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  // Select just the id the shell needs so plan edits elsewhere don't re-render the whole app.
  const { data: activeTrainingPlanId } = useQuery({
    ...trainingPlansQueryOptions(),
    select: selectStartableActiveTrainingPlanId,
  });

  return (
    <AppShell
      currentPathname={pathname}
      trainingSessionTarget={
        activeTrainingPlanId
          ? {
              planId: activeTrainingPlanId,
            }
          : null
      }
    >
      <Outlet />
    </AppShell>
  );
}

function selectStartableActiveTrainingPlanId(
  trainingPlans: ReadonlyArray<TrainingPlan>,
): string | null {
  const activeTrainingPlan = trainingPlans.find((trainingPlan) => trainingPlan.active);

  return activeTrainingPlan && activeTrainingPlan.workoutTemplates.length > 0
    ? activeTrainingPlan.id
    : null;
}
