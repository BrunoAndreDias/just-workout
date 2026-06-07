import { useQuery } from "@tanstack/react-query";
import { Link, useRouterState } from "@tanstack/react-router";
import { Button } from "../design-system/button";
import { PageLead, PageTitle } from "../design-system/typography";
import { type TrainingPlan, type TrainingPlanSlot, trainingPlanService } from "./index";

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
          <p className="mt-2 text-sm font-medium leading-6 text-stone-600">
            Complete the Plan Builder and generate a Training Plan to see it here.
          </p>
          <Button asChild className="mt-5" variant="builderPrimary">
            <Link to="/plan-builder/generate">Generate Training Plan</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-8 grid max-w-4xl gap-3">
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
    return (
      <section className="px-6 py-8 sm:px-8">
        <p className="text-sm font-semibold text-stone-600">Loading Training Plan...</p>
      </section>
    );
  }

  if (!trainingPlan) {
    return (
      <section className="px-6 py-8 sm:px-8">
        <PageTitle>Training Plan not found</PageTitle>
        <PageLead className="mt-3 max-w-2xl">
          Generate a Training Plan from the Plan Builder to see its workout templates.
        </PageLead>
        <Button asChild className="mt-6" variant="builderPrimary">
          <Link to="/plan-builder/generate">Back to Generate</Link>
        </Button>
      </section>
    );
  }

  return (
    <section className="training-plan-page px-6 py-8 sm:px-8 lg:px-10">
      <header className="max-w-4xl">
        <p className="text-sm font-black uppercase tracking-[0.14em] text-[#007780]">
          {trainingPlan.active ? "Active Training Plan" : "Training Plan"}
        </p>
        <PageTitle className="mt-2">{trainingPlan.split}</PageTitle>
        <PageLead className="mt-3 max-w-2xl">
          {trainingPlan.trainingFrequencyDaysPerWeek} days/week · {trainingPlan.trainingBlockWeeks}
          -week Training Block · Superset Group templates
        </PageLead>
      </header>

      <dl className="mt-6 grid max-w-4xl gap-3 text-sm sm:grid-cols-3">
        <TrainingPlanMetric
          label="Rep range style"
          value={formatRepRangeStyle(trainingPlan.repRangeStyle)}
        />
        <TrainingPlanMetric
          label="Volume targets"
          value={`${trainingPlan.weeklyRepTargets.filter((target) => target.isEnabled).length} enabled`}
        />
        <TrainingPlanMetric
          label="Rotation pools"
          value={`${trainingPlan.mainCompoundRotationPools.length} configured`}
        />
      </dl>

      <div className="mt-8 grid gap-4 xl:grid-cols-2">
        {trainingPlan.workoutTemplates.map((template) => (
          <article
            className="rounded-md border border-stone-900/10 bg-white/80 p-5 shadow-sm"
            key={template.id}
          >
            <h2 className="text-xl font-black text-stone-950">{template.label}</h2>
            <div className="mt-4 grid gap-3">
              {template.supersetGroups.map((group) => (
                <section
                  aria-label={group.title}
                  className="rounded-md border border-stone-900/10 bg-stone-50 p-4"
                  key={group.id}
                >
                  <h3 className="text-sm font-black text-stone-900">{group.title}</h3>
                  <ol className="mt-3 grid gap-2">
                    {group.slots.map((slot) => (
                      <li
                        className="flex min-h-10 items-center justify-between gap-3 rounded-md bg-white px-3 py-2 text-sm"
                        key={getTrainingPlanSlotKey(group.id, slot)}
                      >
                        <span className="font-semibold text-stone-950">
                          {formatTrainingPlanSlot(slot)}
                        </span>
                        <span className="text-xs font-semibold uppercase text-stone-500">
                          {slot.slotLabel}
                        </span>
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function useTrainingPlanIdFromPathname(): string | null {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const match = /^\/training-plans\/([^/]+)$/.exec(pathname);

  return match?.[1] ?? null;
}

function TrainingPlanMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-stone-900/10 bg-white/80 px-4 py-3">
      <dt className="text-xs font-semibold uppercase text-stone-500">{label}</dt>
      <dd className="mt-1 font-semibold text-stone-950">{value}</dd>
    </div>
  );
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

function formatTrainingPlanSlot(slot: TrainingPlanSlot): string {
  return slot.exerciseName;
}

function getTrainingPlanSlotKey(groupId: string, slot: TrainingPlanSlot): string {
  return `${groupId}-${slot.exerciseId}`;
}

function formatRepRangeStyle(repRangeStyle: string): string {
  return repRangeStyle
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}
