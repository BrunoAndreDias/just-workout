import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { PlanBuilderRoute, PlanBuilderSplitRoute } from "../plan-builder";
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

const planBuilderRoute = createRoute({
  component: PlanBuilderRoute,
  getParentRoute: () => rootRoute,
  path: "/plan-builder",
});

const planBuilderSplitRoute = createRoute({
  component: PlanBuilderSplitRoute,
  getParentRoute: () => rootRoute,
  path: "/plan-builder/split",
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  workoutRoute,
  planBuilderRoute,
  planBuilderSplitRoute,
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
