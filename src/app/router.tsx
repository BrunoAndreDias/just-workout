import { createRootRoute, createRoute, createRouter, redirect } from "@tanstack/react-router";
import {
  getPlanBuilderRedirectStep,
  PlanBuilderExercisesRoute,
  PlanBuilderGenerateRoute,
  type PlanBuilderGuardedStep,
  PlanBuilderOnePageRoute,
  type PlanBuilderRedirectStep,
  PlanBuilderRepRangesRoute,
  PlanBuilderRoute,
  PlanBuilderVolumeRoute,
  planBuilderPaths,
  planBuilderService,
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
      to: planBuilderPaths.frequency,
    });
  },
  getParentRoute: () => rootRoute,
  path: "/",
});

const planBuilderEntryRoute = createRoute({
  beforeLoad: () => {
    throw redirect({
      replace: true,
      to: planBuilderPaths.overview,
    });
  },
  getParentRoute: () => rootRoute,
  path: planBuilderPaths.entry,
});

const planBuilderOverviewRoute = createRoute({
  component: PlanBuilderOnePageRoute,
  getParentRoute: () => rootRoute,
  path: planBuilderPaths.overview,
});

const planBuilderFrequencyRoute = createRoute({
  component: PlanBuilderRoute,
  getParentRoute: () => rootRoute,
  path: planBuilderPaths.frequency,
});

const planBuilderRedirectPaths = {
  exercises: planBuilderPaths.exercises,
  frequency: planBuilderPaths.frequency,
  "rep-ranges": planBuilderPaths.repRanges,
  volume: planBuilderPaths.volume,
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

async function requireConfirmedTrainingSplit() {
  return requirePlanBuilderStep("rep-ranges");
}

async function requireConfirmedRepRangeStyle() {
  return requirePlanBuilderStep("volume");
}

async function requireConfirmedTrainingVolume() {
  return requirePlanBuilderStep("exercises");
}

async function requireConfirmedExercises() {
  return requirePlanBuilderStep("generate");
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

const planBuilderExercisesRoute = createRoute({
  beforeLoad: requireConfirmedTrainingVolume,
  component: PlanBuilderExercisesRoute,
  getParentRoute: () => rootRoute,
  path: planBuilderPaths.exercises,
});

const planBuilderGenerateRoute = createRoute({
  beforeLoad: requireConfirmedExercises,
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
