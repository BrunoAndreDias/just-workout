import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  redirect,
} from "@tanstack/react-router";
import { planBuilderPaths } from "../plan-builder/plan-builder-paths";
import { trainingPlanPaths } from "../training-plan/training-plan-paths";
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
  component: lazyRouteComponent(
    () => import("../plan-builder/one-page/one-page-route"),
    "PlanBuilderOnePageRoute",
  ),
  getParentRoute: () => rootRoute,
  path: planBuilderPaths.entry,
});

const trainingPlanRoute = createRoute({
  component: lazyRouteComponent(
    () => import("../training-plan/training-plan-route"),
    "TrainingPlanRoute",
  ),
  getParentRoute: () => rootRoute,
  path: trainingPlanPaths.plan,
});

const trainingSessionRoute = createRoute({
  component: lazyRouteComponent(
    () => import("../training-plan/training-session-route"),
    "TrainingSessionRoute",
  ),
  getParentRoute: () => rootRoute,
  path: trainingPlanPaths.sessionStart,
});

const trainingSessionStartRoute = createRoute({
  component: lazyRouteComponent(
    () => import("../training-plan/training-session-start-route"),
    "TrainingSessionStartRoute",
  ),
  getParentRoute: () => rootRoute,
  path: trainingPlanPaths.sessionStartChoice,
});

const trainingSessionHistoryRoute = createRoute({
  component: lazyRouteComponent(
    () => import("../training-plan/training-session-history-route"),
    "TrainingSessionHistoryRoute",
  ),
  getParentRoute: () => rootRoute,
  path: trainingPlanPaths.sessionHistory,
});

const trainingPlansRoute = createRoute({
  component: lazyRouteComponent(
    () => import("../training-plan/training-plan-route"),
    "TrainingPlansRoute",
  ),
  getParentRoute: () => rootRoute,
  path: trainingPlanPaths.list,
});

const trainingCycleDevSeedRoute = createRoute({
  component: lazyRouteComponent(
    () => import("../dev/training-cycle-dev-seed-route"),
    "TrainingCycleDevSeedRoute",
  ),
  getParentRoute: () => rootRoute,
  path: "/dev/training-cycle-seeds",
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  planBuilderEntryRoute,
  trainingCycleDevSeedRoute,
  trainingPlansRoute,
  trainingSessionHistoryRoute,
  trainingSessionStartRoute,
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
