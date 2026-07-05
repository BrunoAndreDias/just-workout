import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { CheckCircle2, Save } from "lucide-react";
import { type Dispatch, type SetStateAction, useEffect, useMemo, useState } from "react";
import { parsePositiveBodyweight } from "./bodyweight-input";
import { hasBodyweightLoadExercise } from "./bodyweight-load";
import type {
  TrainingPlan,
  TrainingPlanStartingLoadSuggestion,
  WorkoutTemplate,
} from "./training-plan";
import {
  trainingPlanQueryOptions,
  trainingPlanSessionsQueryOptions,
} from "./training-plan-query-options";
import { trainingPlanService } from "./training-plan-service";
import type {
  TrainingSession,
  TrainingSessionBodyweight,
  TrainingSessionBodyweightSource,
  TrainingSessionExerciseEntry,
} from "./training-session";
import {
  applyTrainingSessionExecutionAction,
  createEmptyTrainingSessionExecutionState,
  createInitialTrainingSessionExecutionState,
  createTrainingSessionExecutionReadModel,
  getTrainingSessionExecutionActionExerciseId,
  hasTrainingSessionExecutionDrafts,
  type TrainingSessionExecutionAction,
  type TrainingSessionExecutionState,
} from "./training-session-execution";
import { TrainingSessionGroup } from "./training-session-group";
import {
  createTrainingSessionLoadPrefills,
  type TrainingSessionLoadPrefill,
} from "./training-session-load-prefill";
import {
  getWorkoutTemplateForTrainingSessionRoute,
  parseTrainingSessionRoutePathname,
} from "./training-session-route-read-model";
import { resolveTrainingWeekBodyweight } from "./training-week-bodyweight";
import "./training-plan-loading.css";
import "./training-session-route.css";

export function TrainingSessionRoute() {
  const routeParams = useTrainingSessionRouteParams();
  const {
    previousTrainingSessions,
    startingLoadPrefills,
    trainingPlan,
    trainingPlanQuery,
    workoutTemplate,
  } = useTrainingSessionData(routeParams);
  const [executionState, setExecutionState] = useState<TrainingSessionExecutionState>(() =>
    createEmptyTrainingSessionExecutionState(),
  );
  const [completedSession, setCompletedSession] = useState<TrainingSession | null>(null);
  const [dismissedPrefillExerciseIds, setDismissedPrefillExerciseIds] = useState<
    ReadonlyArray<string>
  >([]);
  const bodyweightState = useTrainingSessionBodyweight({
    trainingPlan,
    workoutTemplate,
  });
  const executionReadModel = useTrainingSessionReadModel({
    completedSession,
    previousTrainingSessions,
    sessionBodyweight: bodyweightState.sessionBodyweight,
    state: executionState,
    trainingBlockWeekNumber: trainingPlan?.trainingBlock?.weekNumber ?? null,
    trainingBlockWeeks: trainingPlan?.trainingBlockWeeks ?? 6,
    workoutTemplate,
  });
  const completeSession = useCompleteTrainingSession({
    onCompletedSession: setCompletedSession,
    routeParams,
    workoutTemplate,
  });

  useInitializeTrainingSessionExecutionState({
    setExecutionState,
    startingLoadSuggestions: startingLoadPrefills,
    workoutTemplate,
  });

  if (trainingPlanQuery.isLoading) {
    return <TrainingSessionShell>Loading Training Session...</TrainingSessionShell>;
  }

  if (!trainingPlan || !workoutTemplate || !executionReadModel) {
    return <TrainingSessionShell>Training Session not found.</TrainingSessionShell>;
  }

  const activeExecutionReadModel = executionReadModel;
  const activeLoadPrefills = completedSession
    ? []
    : startingLoadPrefills.filter(
        (prefill) => !dismissedPrefillExerciseIds.includes(prefill.exerciseId),
      );
  const activeWorkoutTemplate = workoutTemplate;

  async function handleCompleteSession() {
    const completionInput = bodyweightState.getCompletionInput();

    if (!completionInput) {
      return;
    }

    await completeSession.mutateAsync({
      entries: activeExecutionReadModel.entries,
      ...completionInput,
    });
  }

  function handleExecutionAction(action: TrainingSessionExecutionAction) {
    const exerciseId = getTrainingSessionExecutionActionExerciseId({
      action,
      workoutTemplate: activeWorkoutTemplate,
    });

    if (exerciseId) {
      setDismissedPrefillExerciseIds((currentExerciseIds) =>
        currentExerciseIds.includes(exerciseId)
          ? currentExerciseIds
          : [...currentExerciseIds, exerciseId],
      );
    }

    setExecutionState((currentState) =>
      applyTrainingSessionExecutionAction({
        action,
        state: currentState,
        workoutTemplate: activeWorkoutTemplate,
      }),
    );
  }

  return (
    <TrainingSessionPageContent
      completedSession={completedSession}
      executionReadModel={activeExecutionReadModel}
      isCompleteSessionPending={completeSession.isPending}
      loadPrefills={activeLoadPrefills}
      onCompleteSession={handleCompleteSession}
      onExecutionAction={handleExecutionAction}
      bodyweightState={bodyweightState}
      workoutTemplate={activeWorkoutTemplate}
    />
  );
}

function TrainingSessionPageContent({
  bodyweightState,
  completedSession,
  executionReadModel,
  isCompleteSessionPending,
  loadPrefills,
  onCompleteSession,
  onExecutionAction,
  workoutTemplate,
}: {
  bodyweightState: TrainingSessionBodyweightState;
  completedSession: TrainingSession | null;
  executionReadModel: NonNullable<ReturnType<typeof useTrainingSessionReadModel>>;
  isCompleteSessionPending: boolean;
  loadPrefills: ReadonlyArray<TrainingSessionLoadPrefill>;
  onCompleteSession: () => Promise<void>;
  onExecutionAction: (action: TrainingSessionExecutionAction) => void;
  workoutTemplate: WorkoutTemplate;
}) {
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
      <TrainingSessionBodyweightPanel bodyweightState={bodyweightState} />
      <TrainingSessionPrefillNotes loadPrefills={loadPrefills} />

      <div className="training-session-work">
        {executionReadModel.groups.map((group) => (
          <TrainingSessionGroup group={group} key={group.groupId} onAction={onExecutionAction} />
        ))}
      </div>

      <footer className="training-session-footer">
        <span>
          {executionReadModel.completedSetCount}/{executionReadModel.plannedSetCount} planned sets
          completed
        </span>
        {executionReadModel.volumeByMovementPattern.length > 0 ? (
          <div className="training-session-volume-inline">
            {executionReadModel.volumeByMovementPattern.map((row) => (
              <span key={row.movementPattern}>
                {row.movementPatternLabel}{" "}
                <strong className="training-session-volume-inline__value">{row.volume} kg</strong>
              </span>
            ))}
          </div>
        ) : null}
        {executionReadModel.hasPartialVolume ? (
          <span>Partial volume until Session Bodyweight is set.</span>
        ) : null}
        <button
          className="training-session-complete-button"
          disabled={isCompleteSessionPending || completedSession !== null}
          onClick={() => {
            void onCompleteSession();
          }}
          type="button"
        >
          <Save aria-hidden="true" />
          <span>{completedSession ? "Session stored" : "Complete session"}</span>
        </button>
      </footer>
    </section>
  );
}

function TrainingSessionPrefillNotes({
  loadPrefills,
}: {
  loadPrefills: ReadonlyArray<TrainingSessionLoadPrefill>;
}) {
  const exactExercisePrefills = loadPrefills.filter((prefill) => prefill.showPrefillExplanation);

  if (exactExercisePrefills.length === 0) {
    return null;
  }

  return (
    <section aria-label="Load prefill notes" className="training-session-prefill-notes">
      {exactExercisePrefills.map((prefill) => (
        <p key={prefill.exerciseId}>
          {prefill.exerciseName} was prefilled from your last exact exercise load.
        </p>
      ))}
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

function useTrainingSessionData(routeParams: { planId: string; templateId: string } | null) {
  const trainingPlanQuery = useQuery(trainingPlanQueryOptions(routeParams?.planId ?? null));
  const trainingSessionsQuery = useQuery(
    trainingPlanSessionsQueryOptions(routeParams?.planId ?? null),
  );

  return buildTrainingSessionData({
    routeParams,
    trainingPlan: trainingPlanQuery.data,
    trainingPlanQuery,
    trainingSessions: trainingSessionsQuery.data ?? [],
  });
}

function useTrainingSessionReadModel({
  completedSession,
  previousTrainingSessions,
  sessionBodyweight,
  state,
  trainingBlockWeekNumber,
  trainingBlockWeeks,
  workoutTemplate,
}: {
  completedSession: TrainingSession | null;
  previousTrainingSessions: ReadonlyArray<TrainingSession>;
  sessionBodyweight: number | null;
  state: TrainingSessionExecutionState;
  trainingBlockWeekNumber: number | null;
  trainingBlockWeeks: number;
  workoutTemplate: WorkoutTemplate | null;
}) {
  return useMemo(
    () =>
      workoutTemplate
        ? createTrainingSessionExecutionReadModel({
            completedSession,
            previousTrainingSessions,
            sessionBodyweight,
            state,
            trainingBlockWeekNumber,
            trainingBlockWeeks,
            workoutTemplate,
          })
        : null,
    [
      completedSession,
      previousTrainingSessions,
      sessionBodyweight,
      state,
      trainingBlockWeekNumber,
      trainingBlockWeeks,
      workoutTemplate,
    ],
  );
}

function useCompleteTrainingSession({
  onCompletedSession,
  routeParams,
  workoutTemplate,
}: {
  onCompletedSession: (session: TrainingSession) => void;
  routeParams: { planId: string; templateId: string } | null;
  workoutTemplate: WorkoutTemplate | null;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      entries,
      sessionBodyweight,
    }: {
      entries: ReadonlyArray<TrainingSessionExerciseEntry>;
      sessionBodyweight?: TrainingSessionBodyweight | null;
    }) => {
      if (!routeParams || !workoutTemplate) {
        throw new Error("Cannot complete this Training Session yet.");
      }

      return trainingPlanService.completeTrainingSession({
        entries,
        planId: routeParams.planId,
        sessionBodyweight,
        templateId: workoutTemplate.id,
      });
    },
    onSuccess: (session) => {
      onCompletedSession(session);

      if (routeParams) {
        void queryClient.invalidateQueries({
          queryKey: trainingPlanSessionsQueryOptions(routeParams.planId).queryKey,
        });
      }
    },
  });
}

function useInitializeTrainingSessionExecutionState({
  setExecutionState,
  startingLoadSuggestions,
  workoutTemplate,
}: {
  setExecutionState: Dispatch<SetStateAction<TrainingSessionExecutionState>>;
  startingLoadSuggestions: ReadonlyArray<TrainingPlanStartingLoadSuggestion>;
  workoutTemplate: WorkoutTemplate | null;
}) {
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
  }, [setExecutionState, startingLoadSuggestions, workoutTemplate]);
}

type TrainingSessionBodyweightState = {
  error: string | null;
  getCompletionInput: () => {
    sessionBodyweight: TrainingSessionBodyweight | null;
  } | null;
  input: string;
  onInputChange: (value: string) => void;
  requiresSessionBodyweight: boolean;
  sessionBodyweight: number | null;
  sourceLabel: string;
};

function useTrainingSessionBodyweight({
  trainingPlan,
  workoutTemplate,
}: {
  trainingPlan: TrainingPlan | null | undefined;
  workoutTemplate: WorkoutTemplate | null;
}): TrainingSessionBodyweightState {
  const [sessionBodyweightInput, setSessionBodyweightInput] = useState("");
  const [sessionBodyweightSource, setSessionBodyweightSource] =
    useState<TrainingSessionBodyweightSource | null>(null);
  const [sessionBodyweightError, setSessionBodyweightError] = useState<string | null>(null);
  const resolvedTrainingWeekBodyweight =
    trainingPlan && workoutTemplate
      ? resolveTrainingWeekBodyweight({
          referenceDate: new Date().toISOString(),
          trainingPlan,
        })
      : null;
  const requiresSessionBodyweight = workoutTemplate
    ? hasWorkoutTemplateBodyweightExercises(workoutTemplate)
    : false;
  const sessionBodyweight = parsePositiveBodyweight(sessionBodyweightInput);

  useEffect(() => {
    if (!requiresSessionBodyweight) {
      setSessionBodyweightInput("");
      setSessionBodyweightSource(null);
      setSessionBodyweightError(null);
      return;
    }

    setSessionBodyweightInput(resolvedTrainingWeekBodyweight?.bodyweight?.toString() ?? "");
    setSessionBodyweightSource(resolvedTrainingWeekBodyweight?.source ?? null);
    setSessionBodyweightError(null);
  }, [
    requiresSessionBodyweight,
    resolvedTrainingWeekBodyweight?.bodyweight,
    resolvedTrainingWeekBodyweight?.source,
  ]);

  return {
    error: sessionBodyweightError,
    getCompletionInput: () => {
      if (requiresSessionBodyweight && sessionBodyweight === null) {
        setSessionBodyweightError("Session Bodyweight is required to complete bodyweight volume.");
        return null;
      }

      setSessionBodyweightError(null);

      return {
        sessionBodyweight:
          requiresSessionBodyweight && sessionBodyweight !== null
            ? {
                bodyweight: sessionBodyweight,
                source: sessionBodyweightSource ?? "session_override",
              }
            : null,
      };
    },
    input: sessionBodyweightInput,
    onInputChange: (value) => {
      setSessionBodyweightError(null);
      setSessionBodyweightInput(value);
      setSessionBodyweightSource("session_override");
    },
    requiresSessionBodyweight,
    sessionBodyweight,
    sourceLabel: getSessionBodyweightSourceLabel(sessionBodyweightSource),
  };
}

function TrainingSessionBodyweightPanel({
  bodyweightState,
}: {
  bodyweightState: TrainingSessionBodyweightState;
}) {
  if (!bodyweightState.requiresSessionBodyweight) {
    return null;
  }

  return (
    <section className="training-session-bodyweight" aria-labelledby="session-bodyweight-title">
      <div>
        <h2 id="session-bodyweight-title">Session Bodyweight</h2>
        <p>Store Session Bodyweight so bodyweight exercises contribute to Completed Load Volume.</p>
      </div>
      <label className="training-session-bodyweight__field">
        <span>Session Bodyweight</span>
        <div className="training-session-bodyweight__input">
          <input
            aria-label="Session Bodyweight"
            inputMode="decimal"
            min="0"
            onChange={(event) => bodyweightState.onInputChange(event.target.value)}
            type="number"
            value={bodyweightState.input}
          />
          <span>kg</span>
        </div>
        <small>{bodyweightState.sourceLabel}</small>
        {bodyweightState.error ? (
          <strong className="training-session-bodyweight__error" role="alert">
            {bodyweightState.error}
          </strong>
        ) : null}
      </label>
    </section>
  );
}

function buildTrainingSessionData({
  routeParams,
  trainingPlan,
  trainingPlanQuery,
  trainingSessions,
}: {
  routeParams: { planId: string; templateId: string } | null;
  trainingPlan: TrainingPlan | null | undefined;
  trainingPlanQuery: ReturnType<typeof useQuery<TrainingPlan | null>>;
  trainingSessions: ReadonlyArray<TrainingSession>;
}) {
  const workoutTemplate = getTrainingSessionWorkoutTemplate({ routeParams, trainingPlan });

  return {
    previousTrainingSessions: trainingSessions,
    startingLoadPrefills:
      trainingPlan && workoutTemplate
        ? createTrainingSessionLoadPrefills({
            previousTrainingSessions: trainingSessions,
            trainingPlan,
            workoutTemplate,
          })
        : [],
    trainingPlan,
    trainingPlanQuery,
    workoutTemplate,
  };
}

function hasWorkoutTemplateBodyweightExercises(workoutTemplate: WorkoutTemplate): boolean {
  return hasBodyweightLoadExercise(
    workoutTemplate.supersetGroups.flatMap((group) =>
      group.slots.map((slot) => ({
        exerciseId: slot.exerciseId,
        exerciseName: slot.exerciseName,
      })),
    ),
  );
}

function getTrainingSessionWorkoutTemplate({
  routeParams,
  trainingPlan,
}: {
  routeParams: { planId: string; templateId: string } | null;
  trainingPlan: TrainingPlan | null | undefined;
}) {
  if (!trainingPlan) {
    return null;
  }

  return getWorkoutTemplateForTrainingSessionRoute({
    templateId: routeParams?.templateId ?? null,
    workoutTemplates: trainingPlan.workoutTemplates,
  });
}

function getSessionBodyweightSourceLabel(
  sessionBodyweightSource: TrainingSessionBodyweightSource | null,
): string {
  switch (sessionBodyweightSource) {
    case "baseline":
      return "Inherited from Baseline Bodyweight.";
    case "inherited_weekly":
      return "Inherited from the current Training Week bodyweight.";
    case "session_override":
      return "Stored as a Per-Session Bodyweight Override.";
    case "historical_correction":
      return "Stored as a Historical Bodyweight Correction.";
    default:
      return "Required before completing bodyweight volume.";
  }
}
