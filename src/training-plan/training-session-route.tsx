import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { CheckCircle2, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  trainingPlanQueryOptions,
  trainingPlanSessionsQueryOptions,
} from "./training-plan-query-options";
import { trainingPlanService } from "./training-plan-service";
import type { TrainingSession, TrainingSessionExerciseEntry } from "./training-session";
import {
  applyTrainingSessionExecutionChange,
  createEmptyTrainingSessionExecutionState,
  createInitialTrainingSessionExecutionState,
  createTrainingSessionExecutionReadModel,
  hasTrainingSessionExecutionDrafts,
  type TrainingSessionExecutionDraftChange,
  type TrainingSessionExecutionState,
  toggleTrainingSessionExecutionGroup,
} from "./training-session-execution";
import { TrainingSessionGroup } from "./training-session-group";
import {
  getWorkoutTemplateForTrainingSessionRoute,
  parseTrainingSessionRoutePathname,
} from "./training-session-route-read-model";
import "./training-plan-loading.css";
import "./training-session-route.css";

export function TrainingSessionRoute() {
  const routeParams = useTrainingSessionRouteParams();
  const trainingPlanQuery = useQuery(trainingPlanQueryOptions(routeParams?.planId ?? null));
  const trainingSessionsQuery = useQuery(
    trainingPlanSessionsQueryOptions(routeParams?.planId ?? null),
  );
  const trainingPlan = trainingPlanQuery.data;
  const previousTrainingSessions = trainingSessionsQuery.data ?? [];
  const workoutTemplate = trainingPlan
    ? getWorkoutTemplateForTrainingSessionRoute({
        templateId: routeParams?.templateId ?? null,
        workoutTemplates: trainingPlan.workoutTemplates,
      })
    : null;
  const [executionState, setExecutionState] = useState<TrainingSessionExecutionState>(() =>
    createEmptyTrainingSessionExecutionState(),
  );
  const [completedSession, setCompletedSession] = useState<TrainingSession | null>(null);
  const startingLoadSuggestions = trainingPlan?.startingLoadSuggestions ?? [];
  const executionReadModel = useMemo(
    () =>
      workoutTemplate
        ? createTrainingSessionExecutionReadModel({
            completedSession,
            previousTrainingSessions,
            state: executionState,
            workoutTemplate,
          })
        : null,
    [completedSession, executionState, previousTrainingSessions, workoutTemplate],
  );
  const completeSession = useMutation({
    mutationFn: (entries: ReadonlyArray<TrainingSessionExerciseEntry>) => {
      if (!routeParams || !workoutTemplate) {
        throw new Error("Cannot complete this Training Session yet.");
      }

      return trainingPlanService.completeTrainingSession({
        entries,
        planId: routeParams.planId,
        templateId: workoutTemplate.id,
      });
    },
    onSuccess: (session) => setCompletedSession(session),
  });

  useEffect(() => {
    if (!workoutTemplate) {
      return;
    }

    setExecutionState((currentState) =>
      hasTrainingSessionExecutionDrafts(currentState)
        ? currentState
        : createInitialTrainingSessionExecutionState({
            startingLoadSuggestions,
            workoutTemplate,
          }),
    );
  }, [startingLoadSuggestions, workoutTemplate]);

  if (trainingPlanQuery.isLoading) {
    return <TrainingSessionShell>Loading Training Session...</TrainingSessionShell>;
  }

  if (!trainingPlan || !workoutTemplate || !executionReadModel) {
    return <TrainingSessionShell>Training Session not found.</TrainingSessionShell>;
  }

  const activeExecutionReadModel = executionReadModel;
  const activeWorkoutTemplate = workoutTemplate;

  async function handleCompleteSession() {
    await completeSession.mutateAsync(activeExecutionReadModel.entries);
  }

  function handleExecutionChange(change: TrainingSessionExecutionDraftChange) {
    setExecutionState((currentState) =>
      applyTrainingSessionExecutionChange({
        change,
        state: currentState,
        workoutTemplate: activeWorkoutTemplate,
      }),
    );
  }

  function handleToggleGroup(groupId: string) {
    setExecutionState((currentState) =>
      toggleTrainingSessionExecutionGroup({
        groupId,
        state: currentState,
      }),
    );
  }

  return (
    <section className="training-session-page" aria-label="Training Session">
      <h1 className="training-session-sr">{workoutTemplate.label} session</h1>
      {completedSession ? (
        <section className="training-session-complete" aria-labelledby="session-complete-title">
          <CheckCircle2 aria-hidden="true" />
          <div>
            <h2 id="session-complete-title">Session completed</h2>
            <p>The Training Session was stored with movement-pattern volume.</p>
          </div>
        </section>
      ) : null}

      <div className="training-session-work">
        {activeExecutionReadModel.groups.map((group) => (
          <TrainingSessionGroup
            group={group}
            key={group.groupId}
            onDraftChange={handleExecutionChange}
            onToggleGroup={handleToggleGroup}
          />
        ))}
      </div>

      <footer className="training-session-footer">
        <span>
          {activeExecutionReadModel.completedSetCount}/{activeExecutionReadModel.plannedSetCount}{" "}
          planned sets completed
        </span>
        {activeExecutionReadModel.volumeByMovementPattern.length > 0 ? (
          <div className="training-session-volume-inline">
            {activeExecutionReadModel.volumeByMovementPattern.map((row) => (
              <span key={row.movementPattern}>
                {row.movementPatternLabel}{" "}
                <strong className="training-session-volume-inline__value">{row.volume} kg</strong>
              </span>
            ))}
          </div>
        ) : null}
        <button
          className="training-session-complete-button"
          disabled={completeSession.isPending || completedSession !== null}
          onClick={handleCompleteSession}
          type="button"
        >
          <Save aria-hidden="true" />
          <span>{completedSession ? "Session stored" : "Complete session"}</span>
        </button>
      </footer>
    </section>
  );
}

function TrainingSessionShell({ children }: { children: string }) {
  return (
    <section className="training-session-page" aria-label="Training Session">
      <p className="active-training-plan-loading">{children}</p>
    </section>
  );
}

function useTrainingSessionRouteParams(): { planId: string; templateId: string } | null {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return parseTrainingSessionRoutePathname(pathname);
}
