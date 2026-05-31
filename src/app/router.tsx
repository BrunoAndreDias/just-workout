import { createRootRoute, createRoute, createRouter, redirect } from "@tanstack/react-router";
import {
  getPlanBuilderRedirectStep,
  type PlanBuilderGuardedStep,
  type PlanBuilderRedirectStep,
  PlanBuilderRepRangesRoute,
  PlanBuilderRoute,
  PlanBuilderSplitRoute,
  PlanBuilderVolumeRoute,
  planBuilderPaths,
  planBuilderService,
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
  beforeLoad: requireConfirmedTrainingFrequency,
  component: PlanBuilderSplitRoute,
  getParentRoute: () => rootRoute,
  path: planBuilderPaths.split,
});

const planBuilderRedirectPaths = {
  frequency: planBuilderPaths.frequency,
  split: planBuilderPaths.split,
  "rep-ranges": planBuilderPaths.repRanges,
} as const satisfies Record<PlanBuilderRedirectStep, string>;

async function requirePlanBuilderStep(step: PlanBuilderGuardedStep) {
  const blueprint = await planBuilderService.getOrCreatePlanBlueprint();

  const redirectStep = getPlanBuilderRedirectStep(blueprint, step);

  if (!redirectStep) {
    return;
  }

  throw redirect({
    replace: true,
    to: planBuilderRedirectPaths[redirectStep],
  });
}

async function requireConfirmedTrainingFrequency() {
  return requirePlanBuilderStep("split");
}

async function requireConfirmedTrainingSplit() {
  return requirePlanBuilderStep("rep-ranges");
}

async function requireConfirmedRepRangeStyle() {
  return requirePlanBuilderStep("volume");
}

const planBuilderRepRangesRoute = createRoute({
  beforeLoad: requireConfirmedTrainingSplit,
  component: PlanBuilderRepRangesRoute,
  getParentRoute: () => rootRoute,
  path: planBuilderPaths.repRanges,
});

const planBuilderVolumeRoute = createRoute({
  beforeLoad: requireConfirmedRepRangeStyle,
  component: PlanBuilderVolumeRoute,
  getParentRoute: () => rootRoute,
  path: planBuilderPaths.volume,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  workoutRoute,
  planBuilderEntryRoute,
  planBuilderFrequencyRoute,
  planBuilderSplitRoute,
  planBuilderRepRangesRoute,
  planBuilderVolumeRoute,
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
