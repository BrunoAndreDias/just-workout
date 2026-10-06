import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useRouterState } from "@tanstack/react-router";
import { Play } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader, PageMain } from "../design-system/typography";
import { parsePositiveBodyweight } from "./bodyweight-input";
import {
  describeBodyweightSource,
  type ResolvedTrainingWeekBodyweight,
  requiresSessionBodyweight,
  resolveTrainingWeekBodyweight,
} from "./session-bodyweight";
import type { TrainingPlan, WorkoutTemplate } from "./training-plan";
import {
  parseTrainingSessionStartChoicePathname,
  parseTrainingSessionStartIntentSearch,
  trainingPlanPaths,
} from "./training-plan-paths";
import {
  trainingPlanQueryOptions,
  trainingPlanSessionsQueryOptions,
} from "./training-plan-query-options";
import { trainingPlanService } from "./training-plan-service";
import { useTrainingPlanAndSessions } from "./training-plan-session-queries";
import type { TrainingSession, TrainingSessionIntent } from "./training-session";
import { resolveRequestedTrainingSessionIntent } from "./training-session-sequencing";
import "./training-plan-loading.css";
import "./training-session-start-route.css";

export function TrainingSessionStartRoute() {
  const routeParams = useTrainingSessionStartRouteParams();
  const queryClient = useQueryClient();
  const { isLoading, resolvedTrainingWeekBodyweight, sessionIntent, trainingPlan } =
    useTrainingSessionStartData(routeParams);
  const {
    baselineBodyweightInput,
    saveBaselineBodyweight,
    saveTrainingWeekBodyweight,
    setBaselineBodyweightInput,
    setTrainingWeekBodyweightInput,
    trainingWeekBodyweightInput,
  } = useTrainingSurfaceBodyweightState({
    queryClient,
    resolvedTrainingWeekBodyweight,
    trainingPlan,
  });

  if (isLoading) {
    return <TrainingSessionStartShell>Loading Training Plan...</TrainingSessionStartShell>;
  }

  if (!trainingPlan) {
    return <TrainingSessionStartShell>Training Plan not found.</TrainingSessionStartShell>;
  }

  return (
    <section className="training-session-start-page" aria-label="Start Training">
      <PageHeader
        description={`${trainingPlan.split} · ${trainingPlan.workoutTemplates.length} workout templates`}
        title={sessionIntent === "extra" ? "Start Extra Training Session" : "Start training"}
      />
      <PageMain>
        {requiresSessionBodyweight(trainingPlan.workoutTemplates) ? (
          <TrainingSurfaceBodyweightCard
            baselineBodyweightInput={baselineBodyweightInput}
            currentWeekInput={trainingWeekBodyweightInput}
            inheritedBodyweightSource={resolvedTrainingWeekBodyweight?.source ?? null}
            onBaselineBodyweightInputChange={setBaselineBodyweightInput}
            onCurrentWeekInputChange={setTrainingWeekBodyweightInput}
            onSaveBaselineBodyweight={() => {
              const bodyweight = parsePositiveBodyweight(baselineBodyweightInput);

              if (bodyweight !== null) {
                void saveBaselineBodyweight.mutateAsync(bodyweight);
              }
            }}
            onSaveCurrentWeekBodyweight={() => {
              const bodyweight = parsePositiveBodyweight(trainingWeekBodyweightInput);

              if (bodyweight !== null) {
                void saveTrainingWeekBodyweight.mutateAsync(bodyweight);
              }
            }}
            weekLabel={
              resolvedTrainingWeekBodyweight
                ? `${resolvedTrainingWeekBodyweight.weekStart} to ${resolvedTrainingWeekBodyweight.weekEnd}`
                : null
            }
          />
        ) : null}
        {trainingPlan.workoutTemplates.length > 0 ? (
          <div className="training-session-start-grid">
            {trainingPlan.workoutTemplates.map((workoutTemplate) => (
              <TrainingSessionStartCard
                isExtraSession={sessionIntent === "extra"}
                key={workoutTemplate.id}
                planId={trainingPlan.id}
                workoutTemplate={workoutTemplate}
              />
            ))}
          </div>
        ) : (
          <p className="active-training-plan-loading">No workout templates configured.</p>
        )}
      </PageMain>
    </section>
  );
}

function useTrainingSessionStartData(
  routeParams: { planId: string; requestedIntent: "extra" | null } | null,
): {
  isLoading: boolean;
  resolvedTrainingWeekBodyweight: ResolvedTrainingWeekBodyweight | null;
  sessionIntent: TrainingSessionIntent;
  trainingPlan: TrainingPlan | null | undefined;
} {
  const { trainingPlan, trainingPlanQuery, trainingSessions, trainingSessionsQuery } =
    useTrainingPlanAndSessions(routeParams?.planId ?? null);

  return {
    isLoading: trainingPlanQuery.isLoading || trainingSessionsQuery.isLoading,
    resolvedTrainingWeekBodyweight: trainingPlan
      ? resolveTrainingWeekBodyweight({
          referenceDate: new Date().toISOString(),
          trainingPlan,
        })
      : null,
    sessionIntent: resolveTrainingSessionStartIntent({
      routeParams,
      trainingPlan,
      trainingSessions,
    }),
    trainingPlan,
  };
}

function resolveTrainingSessionStartIntent({
  routeParams,
  trainingPlan,
  trainingSessions,
}: {
  routeParams: { planId: string; requestedIntent: "extra" | null } | null;
  trainingPlan: TrainingPlan | null | undefined;
  trainingSessions: ReadonlyArray<TrainingSession> | undefined;
}): TrainingSessionIntent {
  if (!trainingPlan || !routeParams) {
    return "planned";
  }

  return resolveRequestedTrainingSessionIntent({
    requestedIntent: routeParams.requestedIntent ?? undefined,
    trainingPlan,
    trainingSessions: trainingSessions ?? [],
  });
}

function useTrainingSurfaceBodyweightState({
  queryClient,
  resolvedTrainingWeekBodyweight,
  trainingPlan,
}: {
  queryClient: ReturnType<typeof useQueryClient>;
  resolvedTrainingWeekBodyweight: ResolvedTrainingWeekBodyweight | null;
  trainingPlan: TrainingPlan | null | undefined;
}) {
  const [baselineBodyweightInput, setBaselineBodyweightInput] = useState("");
  const [trainingWeekBodyweightInput, setTrainingWeekBodyweightInput] = useState("");
  const saveBaselineBodyweight = useSaveBaselineBodyweightMutation({
    queryClient,
    trainingPlan,
  });
  const saveTrainingWeekBodyweight = useSaveTrainingWeekBodyweightMutation({
    queryClient,
    trainingPlan,
  });

  useEffect(() => {
    setBaselineBodyweightInput(trainingPlan?.baselineBodyweight?.toString() ?? "");
    setTrainingWeekBodyweightInput(resolvedTrainingWeekBodyweight?.bodyweight?.toString() ?? "");
  }, [resolvedTrainingWeekBodyweight?.bodyweight, trainingPlan?.baselineBodyweight]);

  return {
    baselineBodyweightInput,
    saveBaselineBodyweight,
    saveTrainingWeekBodyweight,
    setBaselineBodyweightInput,
    setTrainingWeekBodyweightInput,
    trainingWeekBodyweightInput,
  };
}

function useSaveBaselineBodyweightMutation({
  queryClient,
  trainingPlan,
}: {
  queryClient: ReturnType<typeof useQueryClient>;
  trainingPlan: TrainingPlan | null | undefined;
}) {
  return useMutation({
    mutationFn: (bodyweight: number) => {
      if (!trainingPlan) {
        throw new Error("Cannot save Baseline Bodyweight without a Training Plan.");
      }

      return trainingPlanService.saveBaselineBodyweight({
        bodyweight,
        planId: trainingPlan.id,
      });
    },
    onSuccess: (updatedTrainingPlan) => {
      queryClient.setQueryData(
        trainingPlanQueryOptions(updatedTrainingPlan.id).queryKey,
        updatedTrainingPlan,
      );
    },
  });
}

function useSaveTrainingWeekBodyweightMutation({
  queryClient,
  trainingPlan,
}: {
  queryClient: ReturnType<typeof useQueryClient>;
  trainingPlan: TrainingPlan | null | undefined;
}) {
  return useMutation({
    mutationFn: (bodyweight: number) => {
      if (!trainingPlan) {
        throw new Error("Cannot save Training Week Bodyweight without a Training Plan.");
      }

      return trainingPlanService.saveTrainingWeekBodyweight({
        bodyweight,
        planId: trainingPlan.id,
      });
    },
    onSuccess: (updatedTrainingPlan) => {
      queryClient.setQueryData(
        trainingPlanQueryOptions(updatedTrainingPlan.id).queryKey,
        updatedTrainingPlan,
      );
      void queryClient.invalidateQueries({
        queryKey: trainingPlanSessionsQueryOptions(updatedTrainingPlan.id).queryKey,
      });
    },
  });
}

function TrainingSessionStartCard({
  isExtraSession,
  planId,
  workoutTemplate,
}: {
  isExtraSession: boolean;
  planId: string;
  workoutTemplate: WorkoutTemplate;
}) {
  const exerciseCount = workoutTemplate.supersetGroups.reduce(
    (count, group) => count + group.slots.length,
    0,
  );

  return (
    <Link
      aria-label={`Start ${workoutTemplate.label} ${isExtraSession ? "extra " : ""}session`}
      className="card training-session-start-card"
      params={{ planId, templateId: workoutTemplate.id }}
      search={isExtraSession ? { intent: "extra" } : undefined}
      to={trainingPlanPaths.sessionStart}
    >
      <span className="training-session-start-card__icon" aria-hidden="true">
        <Play fill="currentColor" />
      </span>
      <span className="training-session-start-card__content">
        <strong>{workoutTemplate.label}</strong>
        <span>
          {workoutTemplate.supersetGroups.length} blocks · {exerciseCount} exercises
        </span>
      </span>
    </Link>
  );
}

function TrainingSessionStartShell({ children }: { children: string }) {
  return (
    <section className="training-session-start-page" aria-label="Start Training">
      <p className="active-training-plan-loading">{children}</p>
    </section>
  );
}

function useTrainingSessionStartRouteParams(): {
  planId: string;
  requestedIntent: "extra" | null;
} | null {
  const location = useRouterState({
    select: (state) => ({
      pathname: state.location.pathname,
      searchStr: state.location.searchStr,
    }),
  });

  const params = parseTrainingSessionStartChoicePathname(location.pathname);

  if (!params) {
    return null;
  }

  return {
    ...params,
    requestedIntent: parseTrainingSessionStartIntentSearch(location.searchStr),
  };
}

function TrainingSurfaceBodyweightCard({
  baselineBodyweightInput,
  currentWeekInput,
  inheritedBodyweightSource,
  onBaselineBodyweightInputChange,
  onCurrentWeekInputChange,
  onSaveBaselineBodyweight,
  onSaveCurrentWeekBodyweight,
  weekLabel,
}: {
  baselineBodyweightInput: string;
  currentWeekInput: string;
  inheritedBodyweightSource: ResolvedTrainingWeekBodyweight["source"];
  onBaselineBodyweightInputChange: (value: string) => void;
  onCurrentWeekInputChange: (value: string) => void;
  onSaveBaselineBodyweight: () => void;
  onSaveCurrentWeekBodyweight: () => void;
  weekLabel: string | null;
}) {
  return (
    <section
      className="training-session-bodyweight-card"
      aria-labelledby="training-bodyweight-title"
    >
      <div>
        <h2 id="training-bodyweight-title">Training Week bodyweight</h2>
        <p>Store known bodyweight so bodyweight exercises contribute to Completed Load Volume.</p>
      </div>
      <div className="training-session-bodyweight-card__grid">
        <label className="field training-session-bodyweight-card__field">
          <span className="field-label">Baseline Bodyweight</span>
          <div className="training-session-bodyweight-card__input">
            <input
              aria-label="Baseline Bodyweight"
              className="field-input"
              inputMode="decimal"
              min="0"
              onChange={(event) => onBaselineBodyweightInputChange(event.target.value)}
              type="number"
              value={baselineBodyweightInput}
            />
            <span>kg</span>
          </div>
          <button className="primary" onClick={onSaveBaselineBodyweight} type="button">
            Save baseline bodyweight
          </button>
        </label>
        <label className="field training-session-bodyweight-card__field">
          <span className="field-label">Inherited Bodyweight Default</span>
          <div className="training-session-bodyweight-card__input">
            <input
              aria-label="Inherited Bodyweight Default"
              className="field-input"
              inputMode="decimal"
              min="0"
              onChange={(event) => onCurrentWeekInputChange(event.target.value)}
              type="number"
              value={currentWeekInput}
            />
            <span>kg</span>
          </div>
          <small>
            {weekLabel ? `Current Training Week ${weekLabel}. ` : ""}
            {describeBodyweightSource(inheritedBodyweightSource, "week")}
          </small>
          <button className="primary" onClick={onSaveCurrentWeekBodyweight} type="button">
            Save Training Week bodyweight
          </button>
        </label>
      </div>
    </section>
  );
}
