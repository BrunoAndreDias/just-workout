import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { CheckCircle2, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { calculateVolumeByMovementPattern } from "./completed-load-volume";
import {
  trainingPlanQueryOptions,
  trainingPlanSessionsQueryOptions,
} from "./training-plan-query-options";
import { trainingPlanService } from "./training-plan-service";
import type { TrainingSession, TrainingSessionExerciseEntry } from "./training-session";
import {
  countCompletedTrainingSessionSets,
  createInitialTrainingSessionDrafts,
  createTrainingSessionEntries,
  createTrainingSessionExercises,
  type TrainingSessionExerciseDrafts,
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
  const sessionExercises = useMemo(
    () => (workoutTemplate ? createTrainingSessionExercises(workoutTemplate) : []),
    [workoutTemplate],
  );
  const [drafts, setDrafts] = useState<TrainingSessionExerciseDrafts>(() =>
    createInitialTrainingSessionDrafts([]),
  );
  const [completedSession, setCompletedSession] = useState<TrainingSession | null>(null);
  const [expandedGroupIds, setExpandedGroupIds] = useState<ReadonlyArray<string>>([]);
  const startingLoadSuggestions = trainingPlan?.startingLoadSuggestions ?? [];
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
    setDrafts((currentDrafts) =>
      Object.keys(currentDrafts).length > 0
        ? currentDrafts
        : createInitialTrainingSessionDrafts(sessionExercises, startingLoadSuggestions),
    );
  }, [sessionExercises, startingLoadSuggestions]);

  useEffect(() => {
    setExpandedGroupIds(
      workoutTemplate?.supersetGroups[0]?.id ? [workoutTemplate.supersetGroups[0].id] : [],
    );
  }, [workoutTemplate]);

  if (trainingPlanQuery.isLoading) {
    return <TrainingSessionShell>Loading Training Session...</TrainingSessionShell>;
  }

  if (!trainingPlan || !workoutTemplate) {
    return <TrainingSessionShell>Training Session not found.</TrainingSessionShell>;
  }

  const entries = createTrainingSessionEntries(sessionExercises, drafts);
  const completedSetCount = countCompletedTrainingSessionSets(drafts);
  const plannedSetCount = sessionExercises.length * 3;
  const volumeByMovementPattern = completedSession
    ? completedSession.volumeByMovementPattern
    : calculateVolumeByMovementPattern(entries);

  async function handleCompleteSession() {
    await completeSession.mutateAsync(entries);
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
        {workoutTemplate.supersetGroups.map((group, groupIndex) => (
          <TrainingSessionGroup
            drafts={drafts}
            expandedGroupIds={expandedGroupIds}
            group={group}
            groupIndex={groupIndex}
            groups={workoutTemplate.supersetGroups}
            key={group.id}
            previousTrainingSessions={previousTrainingSessions}
            setDrafts={setDrafts}
            setExpandedGroupIds={setExpandedGroupIds}
            workoutTemplateLabel={workoutTemplate.label}
          />
        ))}
      </div>

      <footer className="training-session-footer">
        <span>
          {completedSetCount}/{plannedSetCount} planned sets completed
        </span>
        {volumeByMovementPattern.length > 0 ? (
          <div className="training-session-volume-inline">
            {volumeByMovementPattern.map((row) => (
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
