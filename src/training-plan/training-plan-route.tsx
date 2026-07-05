import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Button } from "../design-system/button";
import { PageHeader, PageMain } from "../design-system/typography";
import {
  ActiveTrainingPlanLoading,
  ActiveTrainingPlanPage,
} from "./active-training-plan/active-training-plan-page";
import { createNextTrainingBlockTransitionWorkflow } from "./training-block-transition";
import type { TrainingPlan } from "./training-plan";
import {
  getTrainingPlanRouteTarget,
  parseTrainingPlanPathname,
  trainingPlanPaths,
} from "./training-plan-paths";
import {
  trainingPlanQueryOptions,
  trainingPlanSessionsQueryOptions,
  trainingPlansQueryOptions,
} from "./training-plan-query-options";
import { trainingPlanService } from "./training-plan-service";

export function TrainingPlansRoute() {
  const trainingPlansQuery = useQuery(trainingPlansQueryOptions());
  const trainingPlans = trainingPlansQuery.data ?? [];

  if (trainingPlansQuery.isLoading) {
    return (
      <section className="px-6 py-8 sm:px-8">
        <p className="text-sm font-semibold text-stone-600">Loading Training Plans...</p>
      </section>
    );
  }

  return (
    <section className="training-plan-page px-[var(--jw-page-padding-x)] py-[var(--jw-page-padding-y)]">
      <PageHeader
        description="Open the active Training Plan or generate a new one from the Plan Builder."
        title="Generated training plans"
      />

      <PageMain>
        {trainingPlans.length === 0 ? (
          <div className="max-w-2xl rounded-md border border-stone-900/10 bg-white/80 p-5 shadow-sm">
            <h2 className="text-lg font-black text-stone-950">No Training Plans yet</h2>
            <p className="mt-2 text-sm font-semibold text-stone-600">
              Complete the Plan Builder to generate your first Training Plan.
            </p>
            <Button asChild className="mt-4" variant="builderPrimary">
              <Link to="/plan-builder">Open Plan Builder</Link>
            </Button>
          </div>
        ) : (
          <div className="grid max-w-4xl gap-3">
            {trainingPlans.map((trainingPlan) => (
              <TrainingPlanListItem key={trainingPlan.id} trainingPlan={trainingPlan} />
            ))}
          </div>
        )}
      </PageMain>
    </section>
  );
}

export function TrainingPlanRoute() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const planId = useTrainingPlanIdFromPathname();
  const trainingPlanQuery = useQuery(trainingPlanQueryOptions(planId));
  const trainingSessionsQuery = useQuery(trainingPlanSessionsQueryOptions(planId));
  const trainingPlan = trainingPlanQuery.data;
  const saveAcceptedTrainingPlan = useMutation({
    mutationFn: (acceptedTrainingPlan: TrainingPlan) =>
      trainingPlanService.saveAcceptedTrainingPlan(acceptedTrainingPlan),
    onSuccess: (savedTrainingPlan) => {
      queryClient.setQueryData(
        trainingPlanQueryOptions(savedTrainingPlan.id).queryKey,
        savedTrainingPlan,
      );
      void queryClient.invalidateQueries({
        queryKey: trainingPlansQueryOptions().queryKey,
      });
    },
  });

  if (trainingPlanQuery.isLoading) {
    return <ActiveTrainingPlanLoading>Loading Training Plan...</ActiveTrainingPlanLoading>;
  }

  if (!trainingPlan) {
    return <ActiveTrainingPlanLoading>Training Plan not found.</ActiveTrainingPlanLoading>;
  }

  return (
    <ActiveTrainingPlanPage
      nextTrainingBlockTransition={
        createNextTrainingBlockTransitionWorkflow({
          onAcceptedTrainingPlan: (savedTrainingPlan) =>
            navigate(getTrainingPlanRouteTarget(savedTrainingPlan.id)),
          saveAcceptedTrainingPlan: (acceptedTrainingPlan) =>
            saveAcceptedTrainingPlan.mutateAsync(acceptedTrainingPlan),
          trainingPlan,
          trainingSessions: trainingSessionsQuery.data ?? [],
        }) ?? undefined
      }
      trainingPlan={trainingPlan}
    />
  );
}

function useTrainingPlanIdFromPathname(): string | null {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return parseTrainingPlanPathname(pathname)?.planId ?? null;
}

function TrainingPlanListItem({ trainingPlan }: { trainingPlan: TrainingPlan }) {
  return (
    <Link
      className="rounded-md border border-stone-900/10 bg-white/80 p-5 shadow-sm transition-colors hover:border-[#007780]/45 hover:bg-white"
      params={{ planId: trainingPlan.id }}
      to={trainingPlanPaths.plan}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-black text-stone-950">{trainingPlan.split}</h2>
        {trainingPlan.active ? (
          <span className="rounded-full bg-[#007780]/10 px-3 py-1 text-xs font-black uppercase text-[#007780]">
            Active
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-sm font-semibold text-stone-600">
        {trainingPlan.trainingFrequencyDaysPerWeek} days/week ·{" "}
        {trainingPlan.workoutTemplates.length} workout templates
      </p>
    </Link>
  );
}
