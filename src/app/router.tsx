import { createRootRoute, createRoute, createRouter, redirect } from "@tanstack/react-router";
import {
  PlanBuilderRepRangesRoute,
  PlanBuilderRoute,
  PlanBuilderSplitRoute,
  planBuilderPaths,
} from "../plan-builder";
import { DashboardRoute, WorkoutRoute } from "../training";
import { RootLayout } from "./root-layout";

const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  component: DashboardRoute,
  getParentRoute: () => rootRoute,
  path: "/",
});

const workoutRoute = createRoute({
  component: WorkoutRoute,
  getParentRoute: () => rootRoute,
  path: "/workout",
});

const planBuilderEntryRoute = createRoute({
  beforeLoad: () => {
    throw redirect({
      replace: true,
      to: planBuilderPaths.frequency,
    });
  },
  getParentRoute: () => rootRoute,
  path: planBuilderPaths.entry,
});

const planBuilderFrequencyRoute = createRoute({
  component: PlanBuilderRoute,
  getParentRoute: () => rootRoute,
  path: planBuilderPaths.frequency,
});

const planBuilderSplitRoute = createRoute({
  component: PlanBuilderSplitRoute,
  getParentRoute: () => rootRoute,
  path: planBuilderPaths.split,
});

const planBuilderRepRangesRoute = createRoute({
  component: PlanBuilderRepRangesRoute,
  getParentRoute: () => rootRoute,
  path: planBuilderPaths.repRanges,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  workoutRoute,
  planBuilderEntryRoute,
  planBuilderFrequencyRoute,
  planBuilderSplitRoute,
  planBuilderRepRangesRoute,
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
