import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { CheckCircle2, Save } from "lucide-react";
import { type Dispatch, type SetStateAction, useEffect, useMemo, useState } from "react";
import { parsePositiveBodyweight } from "./bodyweight-input";
import {
  completeSessionBodyweightField,
  describeBodyweightSource,
  editSessionBodyweightField,
  initSessionBodyweightField,
  type SessionBodyweightField,
} from "./session-bodyweight";
import type { TrainingPlan, WorkoutTemplate } from "./training-plan";
import { parseTrainingSessionStartIntentSearch } from "./training-plan-paths";
import {
  trainingPlanQueryOptions,
  trainingPlanSessionsQueryOptions,
  trainingPlansQueryOptions,
} from "./training-plan-query-options";
import { trainingPlanService } from "./training-plan-service";
import { useTrainingPlanAndSessions } from "./training-plan-session-queries";
import type {
  TrainingSession,
  TrainingSessionBodyweight,
  TrainingSessionExerciseEntry,
  TrainingSessionIntent,
} from "./training-session";
import {
  clearTrainingSessionDraft,
  getTrainingSessionDraftStorageKey,
  loadTrainingSessionDraft,
  saveTrainingSessionDraft,
} from "./training-session-draft-storage";
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
import { resolveRequestedTrainingSessionIntent } from "./training-session-sequencing";
import "./training-plan-loading.css";
import "./training-session-route.css";

export function TrainingSessionRoute() {
  const routeParams = useTrainingSessionRouteParams();
  const {
    previousTrainingSessions,
    sessionIntent,
    sessionHistoryReady,
    startingLoadPrefills,
    trainingPlan,
    trainingPlanQuery,
    workoutTemplate,
  } = useTrainingSessionData(routeParams);
  const [completedSession, setCompletedSession] = useState<TrainingSession | null>(null);
  const bodyweightState = useTrainingSessionBodyweight({
    trainingPlan,
    workoutTemplate,
  });
  useConsumeUndoableTrainingBlockTransition({
    routeParams,
    trainingPlan,
    workoutTemplate,
  });
  const execution = useTrainingSessionExecution({
    completedSession,
    isReady: sessionHistoryReady,
    routeParams,
    startingLoadPrefills,
    workoutTemplate,
  });
  const executionReadModel = useTrainingSessionReadModel({
    completedSession,
    loadPrefills: startingLoadPrefills,
    previousTrainingSessions,
    sessionBodyweight: bodyweightState.sessionBodyweight,
    state: execution.executionState,
    trainingPlan,
    workoutTemplate,
  });
  const completeSession = useCompleteTrainingSession({
    onCompletedSession: setCompletedSession,
    routeParams,
    sessionIntent,
    workoutTemplate,
  });

  if (trainingPlanQuery.isLoading || !sessionHistoryReady) {
    return <TrainingSessionShell>Loading Training Session...</TrainingSessionShell>;
  }

  if (!trainingPlan || !workoutTemplate || !executionReadModel) {
    return <TrainingSessionShell>Training Session not found.</TrainingSessionShell>;
  }

  async function handleCompleteSession() {
    const completionInput = bodyweightState.getCompletionInput();

    if (completionInput && executionReadModel) {
      await completeSession.mutateAsync({
        entries: executionReadModel.entries,
        ...completionInput,
      });
    }
  }

  return (
    <TrainingSessionPageContent
      completedSession={completedSession}
      executionReadModel={executionReadModel}
      isCompleteSessionPending={completeSession.isPending}
      loadPrefills={execution.activeLoadPrefills}
      sessionTargets={execution.sessionTargets}
      trainingPlan={trainingPlan}
      onCompleteSession={handleCompleteSession}
      onExecutionAction={execution.onExecutionAction}
      bodyweightState={bodyweightState}
      sessionIntent={sessionIntent}
      workoutTemplate={workoutTemplate}
    />
  );
}

function useTrainingSessionExecution({
  completedSession,
  isReady,
  routeParams,
  startingLoadPrefills,
  workoutTemplate,
}: {
  completedSession: TrainingSession | null;
  isReady: boolean;
  routeParams: { planId: string; templateId: string } | null;
  startingLoadPrefills: ReadonlyArray<TrainingSessionLoadPrefill>;
  workoutTemplate: WorkoutTemplate | null;
}) {
  const [executionState, setExecutionState] = useState<TrainingSessionExecutionState>(() =>
    createEmptyTrainingSessionExecutionState(),
  );
  const [dismissedPrefillExerciseIds, setDismissedPrefillExerciseIds] = useState<
    ReadonlyArray<string>
  >([]);
  const draftStorageKey =
    routeParams && workoutTemplate
      ? getTrainingSessionDraftStorageKey({
          planId: routeParams.planId,
          templateId: workoutTemplate.id,
        })
      : null;

  useInitializeTrainingSessionExecutionState({
    draftStorageKey,
    isReady,
    setExecutionState,
    startingLoadSuggestions: startingLoadPrefills,
    workoutTemplate,
  });
  usePersistTrainingSessionDraft({
    completedSession,
    draftStorageKey,
    executionState,
  });

  function onExecutionAction(action: TrainingSessionExecutionAction) {
    if (!workoutTemplate) {
      return;
    }

    const exerciseId = getTrainingSessionExecutionActionExerciseId({ action, workoutTemplate });

    if (exerciseId) {
      setDismissedPrefillExerciseIds((currentExerciseIds) =>
        currentExerciseIds.includes(exerciseId)
          ? currentExerciseIds
          : [...currentExerciseIds, exerciseId],
      );
    }

    setExecutionState((currentState) =>
      applyTrainingSessionExecutionAction({ action, state: currentState, workoutTemplate }),
    );
  }

  return {
    activeLoadPrefills: completedSession
      ? []
      : startingLoadPrefills.filter(
          (prefill) => !dismissedPrefillExerciseIds.includes(prefill.exerciseId),
        ),
    executionState,
    onExecutionAction,
    sessionTargets: completedSession ? [] : startingLoadPrefills,
  };
}

function TrainingSessionPageContent({
  bodyweightState,
  completedSession,
  executionReadModel,
  isCompleteSessionPending,
  loadPrefills,
  onCompleteSession,
  onExecutionAction,
  sessionIntent,
  sessionTargets,
  trainingPlan,
  workoutTemplate,
}: {
  bodyweightState: TrainingSessionBodyweightState;
  completedSession: TrainingSession | null;
  executionReadModel: NonNullable<ReturnType<typeof useTrainingSessionReadModel>>;
  isCompleteSessionPending: boolean;
  loadPrefills: ReadonlyArray<TrainingSessionLoadPrefill>;
  onCompleteSession: () => Promise<void>;
  onExecutionAction: (action: TrainingSessionExecutionAction) => void;
  sessionIntent: TrainingSessionIntent;
  sessionTargets: ReadonlyArray<TrainingSessionLoadPrefill>;
  trainingPlan: TrainingPlan;
  workoutTemplate: WorkoutTemplate;
}) {
  return (
    <section className="training-session-page" aria-label="Training Session">
      <header className="training-session-header">
        <h1>
          {workoutTemplate.label} {sessionIntent === "extra" ? "extra session" : "session"}
        </h1>
        <p>{trainingPlan.split}</p>
      </header>
      {completedSession ? <TrainingSessionCompletedNotice sessionIntent={sessionIntent} /> : null}
      <TrainingSessionPrefillNotes loadPrefills={loadPrefills} />
      <TrainingSessionTargets
        sessionTargets={sessionTargets}
        trainingBlockWeekNumber={trainingPlan.trainingBlock?.weekNumber ?? null}
        trainingBlockWeeks={trainingPlan.trainingBlockWeeks}
      />

      <div className="training-session-work">
        {executionReadModel.groups.map((group) => (
          <TrainingSessionGroup group={group} key={group.groupId} onAction={onExecutionAction} />
        ))}
      </div>

      <TrainingSessionBodyweightPanel bodyweightState={bodyweightState} />
      <TrainingSessionFooter
        executionReadModel={executionReadModel}
        isCompleteSessionPending={isCompleteSessionPending}
        isSessionStored={completedSession !== null}
        onCompleteSession={onCompleteSession}
      />
    </section>
  );
}

function TrainingSessionCompletedNotice({
  sessionIntent,
}: {
  sessionIntent: TrainingSessionIntent;
}) {
  return (
    <section className="training-session-complete" aria-labelledby="session-complete-title">
      <CheckCircle2 aria-hidden="true" />
      <div>
        <h2 id="session-complete-title">
          {sessionIntent === "extra" ? "Extra Training Session completed" : "Session completed"}
        </h2>
        <p>
          The {sessionIntent === "extra" ? "Extra Training Session" : "Training Session"} was stored
          with movement-pattern volume.
        </p>
      </div>
    </section>
  );
}

function TrainingSessionFooter({
  executionReadModel,
  isCompleteSessionPending,
  isSessionStored,
  onCompleteSession,
}: {
  executionReadModel: NonNullable<ReturnType<typeof useTrainingSessionReadModel>>;
  isCompleteSessionPending: boolean;
  isSessionStored: boolean;
  onCompleteSession: () => Promise<void>;
}) {
  return (
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
        disabled={isCompleteSessionPending || isSessionStored}
        onClick={() => {
          void onCompleteSession();
        }}
        type="button"
      >
        <Save aria-hidden="true" />
        <span>{isSessionStored ? "Session stored" : "Complete session"}</span>
      </button>
    </footer>
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

function TrainingSessionTargets({
  sessionTargets,
  trainingBlockWeekNumber,
  trainingBlockWeeks,
}: {
  sessionTargets: ReadonlyArray<TrainingSessionLoadPrefill>;
  trainingBlockWeekNumber: number | null;
  trainingBlockWeeks: number;
}) {
  if (sessionTargets.length === 0) {
    return null;
  }

  const weekNumber = trainingBlockWeekNumber ?? 1;

  return (
    <details className="training-session-targets">
      <summary>
        <span>
          Week {weekNumber} of {trainingBlockWeeks}
        </span>
        <strong>{getTrainingWeekEffortCopy(weekNumber, trainingBlockWeeks)}</strong>
        <small>Why these targets?</small>
      </summary>
      <ul aria-label="Session targets">
        {sessionTargets.map((target) => (
          <li key={target.exerciseId}>
            <strong>{target.exerciseName}</strong>
            <span>{target.progressionNote}</span>
          </li>
        ))}
      </ul>
      <p className="training-session-targets__hint">
        Tap the RIR chip (reps left in the tank) on each set; the dashed chip is this week's target.
        Logging real effort makes next time's rep and load targets smarter.
      </p>
    </details>
  );
}

function getTrainingWeekEffortCopy(weekNumber: number, trainingBlockWeeks: number): string {
  if (weekNumber <= 1) {
    return "Easy week: stop with 4-5 reps left in the tank.";
  }

  if (weekNumber >= trainingBlockWeeks) {
    return "Peak week: 1 RIR on compounds, isolations to failure (0 RIR).";
  }

  return "Effort builds each week toward 1 RIR in the final week.";
}

function TrainingSessionShell({ children }: { children: string }) {
  return (
    <section className="training-session-page" aria-label="Training Session">
      <p className="active-training-plan-loading">{children}</p>
    </section>
  );
}

function useTrainingSessionRouteParams(): {
  planId: string;
  requestedIntent: "extra" | null;
  templateId: string;
} | null {
  // Select primitives so the parsed params keep a stable identity across renders and don't
  // invalidate the memos and effects that depend on them.
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const searchStr = useRouterState({ select: (state) => state.location.searchStr });

  return useMemo(() => {
    const params = parseTrainingSessionRoutePathname(pathname);

    if (!params) {
      return null;
    }

    return {
      ...params,
      requestedIntent: parseTrainingSessionStartIntentSearch(searchStr),
    };
  }, [pathname, searchStr]);
}

function useTrainingSessionData(
  routeParams: { planId: string; requestedIntent: "extra" | null; templateId: string } | null,
) {
  const { trainingPlan, trainingPlanQuery, trainingSessions, trainingSessionsQuery } =
    useTrainingPlanAndSessions(routeParams?.planId ?? null);
  const sessionHistoryReady = routeParams === null || !trainingSessionsQuery.isPending;
  const workoutTemplate = useMemo(
    () => getTrainingSessionWorkoutTemplate({ routeParams, trainingPlan }),
    [routeParams, trainingPlan],
  );
  const sessionIntent = useMemo(
    () =>
      trainingPlan && routeParams
        ? resolveRequestedTrainingSessionIntent({
            requestedIntent: routeParams.requestedIntent ?? undefined,
            trainingPlan,
            trainingSessions,
          })
        : "planned",
    [routeParams, trainingPlan, trainingSessions],
  );
  const startingLoadPrefills = useMemo(
    () =>
      trainingPlan && workoutTemplate
        ? createTrainingSessionLoadPrefills({
            previousTrainingSessions: trainingSessions,
            trainingPlan,
            workoutTemplate,
          })
        : [],
    [trainingPlan, trainingSessions, workoutTemplate],
  );

  return {
    previousTrainingSessions: trainingSessions,
    sessionIntent,
    sessionHistoryReady,
    startingLoadPrefills,
    trainingPlan,
    trainingPlanQuery,
    workoutTemplate,
  };
}

function useTrainingSessionReadModel({
  completedSession,
  loadPrefills,
  previousTrainingSessions,
  sessionBodyweight,
  state,
  trainingPlan,
  workoutTemplate,
}: {
  completedSession: TrainingSession | null;
  loadPrefills: ReadonlyArray<TrainingSessionLoadPrefill>;
  previousTrainingSessions: ReadonlyArray<TrainingSession>;
  sessionBodyweight: number | null;
  state: TrainingSessionExecutionState;
  trainingPlan: TrainingPlan | null | undefined;
  workoutTemplate: WorkoutTemplate | null;
}) {
  return useMemo(
    () =>
      trainingPlan && workoutTemplate
        ? createTrainingSessionExecutionReadModel({
            completedSession,
            loadPrefills,
            previousTrainingSessions,
            sessionBodyweight,
            state,
            trainingBlockWeekNumber: trainingPlan.trainingBlock?.weekNumber ?? null,
            trainingBlockWeeks: trainingPlan.trainingBlockWeeks,
            workoutTemplate,
          })
        : null,
    [
      completedSession,
      loadPrefills,
      previousTrainingSessions,
      sessionBodyweight,
      state,
      trainingPlan,
      workoutTemplate,
    ],
  );
}

function useConsumeUndoableTrainingBlockTransition({
  routeParams,
  trainingPlan,
  workoutTemplate,
}: {
  routeParams: { planId: string; requestedIntent: "extra" | null; templateId: string } | null;
  trainingPlan: TrainingPlan | null | undefined;
  workoutTemplate: WorkoutTemplate | null;
}) {
  const queryClient = useQueryClient();
  const clearUndoableTrainingBlockTransition = useMutation({
    mutationFn: (planId: string) =>
      trainingPlanService.clearUndoableTrainingBlockTransition({
        planId,
      }),
    onSuccess: (updatedTrainingPlan) => {
      queryClient.setQueryData(
        trainingPlanQueryOptions(updatedTrainingPlan.id).queryKey,
        updatedTrainingPlan,
      );
      void queryClient.invalidateQueries({
        queryKey: trainingPlansQueryOptions().queryKey,
      });
    },
  });

  useEffect(() => {
    if (
      !routeParams ||
      !trainingPlan?.undoableTrainingBlockTransition ||
      !workoutTemplate ||
      clearUndoableTrainingBlockTransition.isPending
    ) {
      return;
    }

    void clearUndoableTrainingBlockTransition.mutateAsync(routeParams.planId);
  }, [
    clearUndoableTrainingBlockTransition,
    routeParams,
    trainingPlan?.undoableTrainingBlockTransition,
    workoutTemplate,
  ]);
}

function useCompleteTrainingSession({
  onCompletedSession,
  routeParams,
  sessionIntent,
  workoutTemplate,
}: {
  onCompletedSession: (session: TrainingSession) => void;
  routeParams: { planId: string; requestedIntent: "extra" | null; templateId: string } | null;
  sessionIntent: TrainingSessionIntent;
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
        sessionIntent,
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

function usePersistTrainingSessionDraft({
  completedSession,
  draftStorageKey,
  executionState,
}: {
  completedSession: TrainingSession | null;
  draftStorageKey: string | null;
  executionState: TrainingSessionExecutionState;
}) {
  useEffect(() => {
    if (!draftStorageKey) {
      return;
    }

    if (completedSession) {
      clearTrainingSessionDraft(draftStorageKey);
      return;
    }

    if (hasTrainingSessionExecutionDrafts(executionState)) {
      saveTrainingSessionDraft(draftStorageKey, executionState);
    }
  }, [completedSession, draftStorageKey, executionState]);
}

function useInitializeTrainingSessionExecutionState({
  draftStorageKey,
  isReady,
  setExecutionState,
  startingLoadSuggestions,
  workoutTemplate,
}: {
  draftStorageKey: string | null;
  isReady: boolean;
  setExecutionState: Dispatch<SetStateAction<TrainingSessionExecutionState>>;
  startingLoadSuggestions: ReadonlyArray<TrainingSessionLoadPrefill>;
  workoutTemplate: WorkoutTemplate | null;
}) {
  useEffect(() => {
    if (!isReady || !workoutTemplate) {
      return;
    }

    setExecutionState((currentState) => {
      if (hasTrainingSessionExecutionDrafts(currentState)) {
        return currentState;
      }

      return (
        (draftStorageKey ? loadTrainingSessionDraft(draftStorageKey) : null) ??
        createInitialTrainingSessionExecutionState({
          startingLoadSuggestions,
          workoutTemplate,
        })
      );
    });
  }, [draftStorageKey, isReady, setExecutionState, startingLoadSuggestions, workoutTemplate]);
}

type TrainingSessionBodyweightState = {
  field: SessionBodyweightField;
  getCompletionInput: () => { sessionBodyweight: TrainingSessionBodyweight | null } | null;
  onInputChange: (value: string) => void;
  sessionBodyweight: number | null;
};

function useTrainingSessionBodyweight({
  trainingPlan,
  workoutTemplate,
}: {
  trainingPlan: TrainingPlan | null | undefined;
  workoutTemplate: WorkoutTemplate | null;
}): TrainingSessionBodyweightState {
  const initialField = initSessionBodyweightField({
    referenceDate: new Date().toISOString(),
    trainingPlan,
    workoutTemplate,
  });
  const [field, setField] = useState(initialField);

  // Re-seed the field whenever the resolved default changes (e.g. once the plan has loaded).
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed on the resolved default values.
  useEffect(() => {
    setField(initialField);
  }, [initialField.input, initialField.required, initialField.source]);

  return {
    field,
    getCompletionInput: () => {
      const completion = completeSessionBodyweightField(field);

      setField(completion.field);

      return completion.ok ? { sessionBodyweight: completion.sessionBodyweight } : null;
    },
    onInputChange: (value) =>
      setField((currentField) => editSessionBodyweightField(currentField, value)),
    sessionBodyweight: parsePositiveBodyweight(field.input),
  };
}

function TrainingSessionBodyweightPanel({
  bodyweightState,
}: {
  bodyweightState: TrainingSessionBodyweightState;
}) {
  const { field } = bodyweightState;

  if (!field.required) {
    return null;
  }

  return (
    <section className="training-session-bodyweight" aria-labelledby="session-bodyweight-title">
      <div>
        <h2 id="session-bodyweight-title">Session Bodyweight</h2>
        <p>Needed before completing, so bodyweight exercises count toward volume.</p>
      </div>
      <label className="training-session-bodyweight__field">
        <div className="training-session-bodyweight__input">
          <input
            aria-label="Session Bodyweight"
            inputMode="decimal"
            min="0"
            onChange={(event) => bodyweightState.onInputChange(event.target.value)}
            type="number"
            value={field.input}
          />
          <span>kg</span>
        </div>
        <small>{describeBodyweightSource(field.source, "session")}</small>
        {field.error ? (
          <strong className="training-session-bodyweight__error" role="alert">
            {field.error}
          </strong>
        ) : null}
      </label>
    </section>
  );
}

function getTrainingSessionWorkoutTemplate({
  routeParams,
  trainingPlan,
}: {
  routeParams: { planId: string; requestedIntent: "extra" | null; templateId: string } | null;
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
