import { useQuery } from "@tanstack/react-query";
import { Link, useRouterState } from "@tanstack/react-router";
import { Play } from "lucide-react";
import { PageHeader, PageMain } from "../design-system/typography";
import type { WorkoutTemplate } from "./training-plan";
import { parseTrainingSessionStartChoicePathname, trainingPlanPaths } from "./training-plan-paths";
import { trainingPlanQueryOptions } from "./training-plan-query-options";
import "./training-plan-loading.css";
import "./training-session-start-route.css";

export function TrainingSessionStartRoute() {
  const routeParams = useTrainingSessionStartRouteParams();
  const trainingPlanQuery = useQuery(trainingPlanQueryOptions(routeParams?.planId ?? null));
  const trainingPlan = trainingPlanQuery.data;

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
