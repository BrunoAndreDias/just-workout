import { createRootRoute, createRoute, createRouter, redirect } from "@tanstack/react-router";
import {
  PlanBuilderExercisesRoute,
  PlanBuilderGenerateRoute,
  PlanBuilderOnePageRoute,
  PlanBuilderRepRangesRoute,
  PlanBuilderRoute,
  PlanBuilderVolumeRoute,
  planBuilderPaths,
} from "../plan-builder";
import { TrainingPlanRoute, TrainingPlansRoute } from "../training-plan/training-plan-route";
import { TrainingSessionHistoryRoute } from "../training-plan/training-session-history-route";
import { TrainingSessionRoute } from "../training-plan/training-session-route";
import { RootLayout } from "./root-layout";

const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  beforeLoad: () => {
    throw redirect({
      replace: true,
      to: planBuilderPaths.entry,
    });
  },
  getParentRoute: () => rootRoute,
  path: "/",
});

const planBuilderEntryRoute = createRoute({
  component: PlanBuilderOnePageRoute,
  getParentRoute: () => rootRoute,
  path: planBuilderPaths.entry,
});

const planBuilderOverviewRoute = createRoute({
  beforeLoad: () => {
    throw redirect({
      replace: true,
      to: planBuilderPaths.entry,
    });
  },
  getParentRoute: () => rootRoute,
  path: planBuilderPaths.overview,
});

const planBuilderFrequencyRoute = createRoute({
  component: PlanBuilderRoute,
  getParentRoute: () => rootRoute,
  path: planBuilderPaths.frequency,
});

const planBuilderRepRangesRoute = createRoute({
  component: PlanBuilderRepRangesRoute,
  getParentRoute: () => rootRoute,
  path: planBuilderPaths.repRanges,
});

const planBuilderVolumeRoute = createRoute({
  component: PlanBuilderVolumeRoute,
  getParentRoute: () => rootRoute,
  path: planBuilderPaths.volume,
});

const planBuilderExercisesRoute = createRoute({
  component: PlanBuilderExercisesRoute,
  getParentRoute: () => rootRoute,
  path: planBuilderPaths.exercises,
});

const planBuilderGenerateRoute = createRoute({
  component: PlanBuilderGenerateRoute,
  getParentRoute: () => rootRoute,
  path: planBuilderPaths.generate,
});

const trainingPlanRoute = createRoute({
  component: TrainingPlanRoute,
  getParentRoute: () => rootRoute,
  path: "/training-plans/$planId",
});

const trainingSessionRoute = createRoute({
  component: TrainingSessionRoute,
  getParentRoute: () => rootRoute,
  path: "/training-plans/$planId/sessions/new/$templateId",
});

const trainingSessionHistoryRoute = createRoute({
  component: TrainingSessionHistoryRoute,
  getParentRoute: () => rootRoute,
  path: "/training-plans/$planId/sessions",
});

const trainingPlansRoute = createRoute({
  component: TrainingPlansRoute,
  getParentRoute: () => rootRoute,
  path: "/training-plans",
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  planBuilderEntryRoute,
  planBuilderOverviewRoute,
  planBuilderFrequencyRoute,
  planBuilderRepRangesRoute,
  planBuilderVolumeRoute,
  planBuilderExercisesRoute,
  planBuilderGenerateRoute,
  trainingPlansRoute,
  trainingSessionHistoryRoute,
  trainingSessionRoute,
  trainingPlanRoute,
]);

type AppRouterHistory = Parameters<typeof createRouter>[0]["history"];

type CreateAppRouterOptions = {
  history?: AppRouterHistory;
};

export function createAppRouter({ history }: CreateAppRouterOptions = {}) {
  return createRouter({
    defaultPreload: "intent",
    history,
    routeTree,
  });
}

export const router = createAppRouter();

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
