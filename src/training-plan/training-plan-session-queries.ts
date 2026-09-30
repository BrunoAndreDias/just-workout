import { useQuery } from "@tanstack/react-query";
import {
  trainingPlanQueryOptions,
  trainingPlanSessionsQueryOptions,
} from "./training-plan-query-options";
import type { TrainingSession } from "./training-session";

// Shared empty list keeps a stable identity while sessions load, so dependent memos hold.
const noTrainingSessions: ReadonlyArray<TrainingSession> = [];

export function useTrainingPlanAndSessions(planId: string | null) {
  const trainingPlanQuery = useQuery(trainingPlanQueryOptions(planId));
  const trainingSessionsQuery = useQuery(trainingPlanSessionsQueryOptions(planId));

  return {
    trainingPlan: trainingPlanQuery.data,
    trainingPlanQuery,
    trainingSessions: trainingSessionsQuery.data ?? noTrainingSessions,
    trainingSessionsQuery,
  };
}
