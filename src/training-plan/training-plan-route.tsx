import { useQuery } from "@tanstack/react-query";
import { Link, useRouterState } from "@tanstack/react-router";
import { Button } from "../design-system/button";
import { PageLead, PageTitle } from "../design-system/typography";
import {
  ActiveTrainingPlanLoading,
  ActiveTrainingPlanPage,
} from "./active-training-plan/active-training-plan-page";
import type { TrainingPlan } from "./index";
import { trainingPlanService } from "./index";
import "./training-plan-route.css";

export function TrainingPlansRoute() {
  const trainingPlansQuery = useQuery({
    queryFn: () => trainingPlanService.getTrainingPlans(),
    queryKey: ["training-plans"],
  });
  const trainingPlans = trainingPlansQuery.data ?? [];

  if (trainingPlansQuery.isLoading) {
    return (
      <section className="px-6 py-8 sm:px-8">
        <p className="text-sm font-semibold text-stone-600">Loading Training Plans...</p>
      </section>
    );
  }

  return (
    <section className="training-plan-page px-6 py-8 sm:px-8 lg:px-10">
      <header className="max-w-4xl">
        <p className="text-sm font-black uppercase tracking-[0.14em] text-[#007780]">
          Training Plans
        </p>
        <PageTitle className="mt-2">Generated training plans</PageTitle>
        <PageLead className="mt-3 max-w-2xl">
          Open the active Training Plan or generate a new one from the Plan Builder.
        </PageLead>
      </header>

      {trainingPlans.length === 0 ? (
        <div className="mt-6 max-w-2xl rounded-md border border-stone-900/10 bg-white/80 p-5 shadow-sm">
          <h2 className="text-lg font-black text-stone-950">No Training Plans yet</h2>
          <p className="mt-2 text-sm font-semibold text-stone-600">
            Complete the Plan Builder to generate your first Training Plan.
          </p>
          <Button asChild className="mt-4" variant="builderPrimary">
            <Link to="/plan-builder/generate">Go to Generate</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-6 grid max-w-4xl gap-3">
          {trainingPlans.map((trainingPlan) => (
            <TrainingPlanListItem key={trainingPlan.id} trainingPlan={trainingPlan} />
          ))}
        </div>
      )}
    </section>
  );
}

export function TrainingPlanRoute() {
  const planId = useTrainingPlanIdFromPathname();
  const trainingPlanQuery = useQuery({
    enabled: planId !== null,
    queryFn: () => {
      if (!planId) {
        return null;
      }

      return trainingPlanService.getTrainingPlan(planId);
    },
    queryKey: ["training-plan", planId],
  });
  const trainingPlan = trainingPlanQuery.data;

  if (trainingPlanQuery.isLoading) {
    return <ActiveTrainingPlanLoading>Loading Training Plan...</ActiveTrainingPlanLoading>;
  }

  if (!trainingPlan) {
    return <ActiveTrainingPlanLoading>Training Plan not found.</ActiveTrainingPlanLoading>;
  }

  return <ActiveTrainingPlanPage trainingPlan={trainingPlan} />;
}

function useTrainingPlanIdFromPathname(): string | null {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const match = /^\/training-plans\/([^/]+)$/.exec(pathname);

  return match?.[1] ?? null;
}

function TrainingPlanListItem({ trainingPlan }: { trainingPlan: TrainingPlan }) {
  return (
    <Link
      className="rounded-md border border-stone-900/10 bg-white/80 p-5 shadow-sm transition-colors hover:border-[#007780]/45 hover:bg-white"
      params={{ planId: trainingPlan.id }}
      to="/training-plans/$planId"
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
