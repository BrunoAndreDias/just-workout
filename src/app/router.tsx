import { createRootRoute, createRoute, createRouter, redirect } from "@tanstack/react-router";
import { TrainingCycleDevSeedRoute } from "../dev/training-cycle-dev-seed-route";
import { PlanBuilderOnePageRoute, planBuilderPaths } from "../plan-builder";
import {
  TrainingPlanRoute,
  TrainingPlansRoute,
  TrainingSessionHistoryRoute,
  TrainingSessionRoute,
  trainingPlanPaths,
} from "../training-plan";
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

const trainingPlanRoute = createRoute({
  component: TrainingPlanRoute,
  getParentRoute: () => rootRoute,
  path: trainingPlanPaths.plan,
});

const trainingSessionRoute = createRoute({
  component: TrainingSessionRoute,
  getParentRoute: () => rootRoute,
  path: trainingPlanPaths.sessionStart,
});

const trainingSessionHistoryRoute = createRoute({
  component: TrainingSessionHistoryRoute,
  getParentRoute: () => rootRoute,
  path: trainingPlanPaths.sessionHistory,
});

const trainingPlansRoute = createRoute({
  component: TrainingPlansRoute,
  getParentRoute: () => rootRoute,
  path: trainingPlanPaths.list,
});

const trainingCycleDevSeedRoute = createRoute({
  component: TrainingCycleDevSeedRoute,
  getParentRoute: () => rootRoute,
  path: "/dev/training-cycle-seeds",
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  planBuilderEntryRoute,
  trainingCycleDevSeedRoute,
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
