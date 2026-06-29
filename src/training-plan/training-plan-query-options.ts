import { queryOptions } from "@tanstack/react-query";
import { trainingPlanService } from "./training-plan-service";

const trainingPlanQueryKeys = {
  plan: (planId: string | null) => ["training-plan", planId] as const,
  plans: () => ["training-plans"] as const,
  sessions: (planId: string | null) => ["training-plan-sessions", planId] as const,
};

export function trainingPlansQueryOptions() {
  return queryOptions({
    queryFn: () => trainingPlanService.getTrainingPlans(),
    queryKey: trainingPlanQueryKeys.plans(),
  });
}

export function trainingPlanQueryOptions(planId: string | null) {
  return queryOptions({
    enabled: planId !== null,
    queryFn: () => {
      if (!planId) {
        return null;
      }

      return trainingPlanService.getTrainingPlan(planId);
    },
    queryKey: trainingPlanQueryKeys.plan(planId),
  });
}

export function trainingPlanSessionsQueryOptions(planId: string | null) {
  return queryOptions({
    enabled: planId !== null,
    queryFn: () => {
      if (!planId) {
        return [];
      }

      return trainingPlanService.getTrainingSessionsForPlan(planId);
    },
    queryKey: trainingPlanQueryKeys.sessions(planId),
  });
}
