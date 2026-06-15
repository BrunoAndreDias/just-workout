import { queryOptions } from "@tanstack/react-query";
import { trainingPlanService } from "./training-plan-service";

export function trainingPlanQueryOptions(planId: string | null) {
  return queryOptions({
    enabled: planId !== null,
    queryFn: () => {
      if (!planId) {
        return null;
      }

      return trainingPlanService.getTrainingPlan(planId);
    },
    queryKey: ["training-plan", planId],
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
    queryKey: ["training-plan-sessions", planId],
  });
}
