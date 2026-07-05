import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useRouterState } from "@tanstack/react-router";
import { Play } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader, PageMain } from "../design-system/typography";
import { parsePositiveBodyweight } from "./bodyweight-input";
import { hasBodyweightLoadExercise } from "./bodyweight-load";
import type { WorkoutTemplate } from "./training-plan";
import { parseTrainingSessionStartChoicePathname, trainingPlanPaths } from "./training-plan-paths";
import {
  trainingPlanQueryOptions,
  trainingPlanSessionsQueryOptions,
} from "./training-plan-query-options";
import { trainingPlanService } from "./training-plan-service";
import { resolveTrainingWeekBodyweight } from "./training-week-bodyweight";
import "./training-plan-loading.css";
import "./training-session-start-route.css";

export function TrainingSessionStartRoute() {
  const routeParams = useTrainingSessionStartRouteParams();
  const queryClient = useQueryClient();
  const trainingPlanQuery = useQuery(trainingPlanQueryOptions(routeParams?.planId ?? null));
  const trainingPlan = trainingPlanQuery.data;
  const resolvedTrainingWeekBodyweight = trainingPlan
    ? resolveTrainingWeekBodyweight({
        referenceDate: new Date().toISOString(),
        trainingPlan,
      })
    : null;
  const [baselineBodyweightInput, setBaselineBodyweightInput] = useState("");
  const [trainingWeekBodyweightInput, setTrainingWeekBodyweightInput] = useState("");
  const saveBaselineBodyweight = useMutation({
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
  const saveTrainingWeekBodyweight = useMutation({
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

  useEffect(() => {
    setBaselineBodyweightInput(trainingPlan?.baselineBodyweight?.toString() ?? "");
    setTrainingWeekBodyweightInput(resolvedTrainingWeekBodyweight?.bodyweight?.toString() ?? "");
  }, [resolvedTrainingWeekBodyweight?.bodyweight, trainingPlan?.baselineBodyweight]);

  if (trainingPlanQuery.isLoading) {
    return <TrainingSessionStartShell>Loading Training Plan...</TrainingSessionStartShell>;
  }

  if (!trainingPlan) {
    return <TrainingSessionStartShell>Training Plan not found.</TrainingSessionStartShell>;
  }

  return (
    <section className="training-session-start-page" aria-label="Start Training">
      <PageHeader
        description={`${trainingPlan.split} · ${trainingPlan.workoutTemplates.length} workout templates`}
        title="Start training"
      />
      <PageMain>
        {hasTrainingPlanBodyweightExercises(trainingPlan.workoutTemplates) ? (
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

function TrainingSessionStartCard({
  planId,
  workoutTemplate,
}: {
  planId: string;
  workoutTemplate: WorkoutTemplate;
}) {
  const exerciseCount = workoutTemplate.supersetGroups.reduce(
    (count, group) => count + group.slots.length,
    0,
  );

  return (
    <Link
      aria-label={`Start ${workoutTemplate.label} session`}
      className="training-session-start-card"
      params={{ planId, templateId: workoutTemplate.id }}
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

function useTrainingSessionStartRouteParams(): { planId: string } | null {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return parseTrainingSessionStartChoicePathname(pathname);
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
  inheritedBodyweightSource: "baseline" | "inherited_weekly" | null;
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
        <label className="training-session-bodyweight-card__field">
          <span>Baseline Bodyweight</span>
          <div className="training-session-bodyweight-card__input">
            <input
              aria-label="Baseline Bodyweight"
              inputMode="decimal"
              min="0"
              onChange={(event) => onBaselineBodyweightInputChange(event.target.value)}
              type="number"
              value={baselineBodyweightInput}
            />
            <span>kg</span>
          </div>
          <button onClick={onSaveBaselineBodyweight} type="button">
            Save baseline bodyweight
          </button>
        </label>
        <label className="training-session-bodyweight-card__field">
          <span>Inherited Bodyweight Default</span>
          <div className="training-session-bodyweight-card__input">
            <input
              aria-label="Inherited Bodyweight Default"
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
            {getInheritedBodyweightSourceLabel(inheritedBodyweightSource)}
          </small>
          <button onClick={onSaveCurrentWeekBodyweight} type="button">
            Save Training Week bodyweight
          </button>
        </label>
      </div>
    </section>
  );
}

function getInheritedBodyweightSourceLabel(source: "baseline" | "inherited_weekly" | null): string {
  switch (source) {
    case "baseline":
      return "Inherited from Baseline Bodyweight.";
    case "inherited_weekly":
      return "Inherited from the last saved Training Week bodyweight.";
    default:
      return "Set a Baseline Bodyweight first.";
  }
}

function hasTrainingPlanBodyweightExercises(
  workoutTemplates: ReadonlyArray<WorkoutTemplate>,
): boolean {
  return hasBodyweightLoadExercise(
    workoutTemplates.flatMap((template) =>
      template.supersetGroups.flatMap((group) =>
        group.slots.map((slot) => ({
          exerciseId: slot.exerciseId,
          exerciseName: slot.exerciseName,
        })),
      ),
    ),
  );
}
