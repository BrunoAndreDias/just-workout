import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
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

const routeTree = rootRoute.addChildren([indexRoute, workoutRoute]);

export const router = createRouter({
  defaultPreload: "intent",
  routeTree,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
