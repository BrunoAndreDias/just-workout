import { useQuery } from "@tanstack/react-query";
import {
  trainingPlanQueryOptions,
  trainingPlanSessionsQueryOptions,
} from "./training-plan-query-options";

export function useTrainingPlanAndSessions(planId: string | null) {
  const trainingPlanQuery = useQuery(trainingPlanQueryOptions(planId));
  const trainingSessionsQuery = useQuery(trainingPlanSessionsQueryOptions(planId));

  return {
    trainingPlan: trainingPlanQuery.data,
    trainingPlanQuery,
    trainingSessions: trainingSessionsQuery.data ?? [],
    trainingSessionsQuery,
  };
}
