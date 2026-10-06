import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { Button } from "../design-system/button";
import { cn } from "../design-system/cn";
import { PageHeader, PageMain } from "../design-system/typography";
import {
  ActiveTrainingPlanLoading,
  ActiveTrainingPlanPage,
} from "./active-training-plan/active-training-plan-page";
import { applyTrainingBlockExerciseSwapToTrainingPlan } from "./training-block";
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
import type { TrainingSession } from "./training-session";

export function TrainingPlansRoute() {
  const trainingPlansQuery = useQuery(trainingPlansQueryOptions());
  const trainingPlans = useMemo(
    () =>
      [...(trainingPlansQuery.data ?? [])].sort(
        (left, right) =>
          Number(right.active) - Number(left.active) ||
          right.generatedAt.localeCompare(left.generatedAt),
      ),
    [trainingPlansQuery.data],
  );

  if (trainingPlansQuery.isLoading) {
    return (
      <section className="px-6 py-8 sm:px-8">
        <p className="text-sm font-semibold text-stone-600">Loading Training Plans...</p>
      </section>
    );
  }

  return (
    <section className="training-plan-page px-[var(--jw-page-padding-x)] py-[var(--jw-page-padding-y)]">
      <div className="flex max-w-4xl flex-wrap items-end justify-between gap-4">
        <PageHeader
          description="Open your Active Training Plan to train, or build a new one."
          title="Training Plans"
        />
        {trainingPlans.length > 0 ? (
          <Button asChild variant="outline">
            <Link to="/plan-builder">Build a new plan</Link>
          </Button>
        ) : null}
      </div>

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

const noTrainingSessions: ReadonlyArray<TrainingSession> = [];

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
  const saveTrainingPlan = useMutation({
    mutationFn: (nextTrainingPlan: TrainingPlan) =>
      trainingPlanService.saveTrainingPlan(nextTrainingPlan),
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
  const undoAcceptedTrainingBlockTransition = useMutation({
    mutationFn: (acceptedPlanId: string) =>
      trainingPlanService.undoAcceptedTrainingBlockTransition({
        planId: acceptedPlanId,
      }),
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

  const trainingSessions = trainingSessionsQuery.data ?? noTrainingSessions;
  const today = new Date().toISOString().slice(0, 10);
  const { mutateAsync: saveAcceptedTrainingPlanAsync } = saveAcceptedTrainingPlan;
  const { mutateAsync: undoAcceptedTrainingBlockTransitionAsync } =
    undoAcceptedTrainingBlockTransition;
  // Building the next-block previews walks every session; only redo it when the plan, its
  // sessions, or the calendar day change rather than on every mutation state flip.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `today` refreshes the `now` date.
  const nextTrainingBlockTransition = useMemo(
    () =>
      trainingPlan
        ? (createNextTrainingBlockTransitionWorkflow({
            now: new Date(),
            onAcceptedTrainingPlan: (savedTrainingPlan) =>
              navigate(getTrainingPlanRouteTarget(savedTrainingPlan.id)),
            saveAcceptedTrainingPlan: (acceptedTrainingPlan) =>
              saveAcceptedTrainingPlanAsync(acceptedTrainingPlan),
            undoAcceptedTrainingBlockTransition: (acceptedPlanId) =>
              undoAcceptedTrainingBlockTransitionAsync(acceptedPlanId),
            trainingPlan,
            trainingSessions,
          }) ?? undefined)
        : undefined,
    [
      navigate,
      saveAcceptedTrainingPlanAsync,
      today,
      trainingPlan,
      trainingSessions,
      undoAcceptedTrainingBlockTransitionAsync,
    ],
  );

  if (trainingPlanQuery.isLoading) {
    return <ActiveTrainingPlanLoading>Loading Training Plan...</ActiveTrainingPlanLoading>;
  }

  if (!trainingPlan) {
    return <ActiveTrainingPlanLoading>Training Plan not found.</ActiveTrainingPlanLoading>;
  }

  return (
    <ActiveTrainingPlanPage
      nextTrainingBlockTransition={nextTrainingBlockTransition}
      onSwapCurrentBlockExercise={async ({ groupId, nextExerciseId, slotIndex, templateId }) =>
        saveTrainingPlan.mutateAsync(
          applyTrainingBlockExerciseSwapToTrainingPlan({
            groupId,
            nextExerciseId,
            slotIndex,
            templateId,
            timestamp: new Date().toISOString(),
            trainingPlan,
          }),
        )
      }
      trainingPlan={trainingPlan}
      trainingSessions={trainingSessions}
    />
  );
}

function useTrainingPlanIdFromPathname(): string | null {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return parseTrainingPlanPathname(pathname)?.planId ?? null;
}

const planCreatedDateFormat = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function TrainingPlanListItem({ trainingPlan }: { trainingPlan: TrainingPlan }) {
  const details = [
    `${trainingPlan.trainingFrequencyDaysPerWeek} days/week`,
    `${trainingPlan.workoutTemplates.length} workouts`,
    trainingPlan.trainingBlock ? `Training Block ${trainingPlan.trainingBlock.cycleNumber}` : null,
    `Created ${planCreatedDateFormat.format(new Date(trainingPlan.generatedAt))}`,
  ].filter(Boolean);

  return (
    <Link
      className={cn(
        "group flex items-center justify-between gap-4 rounded-md border bg-white/80 p-5 shadow-sm transition-colors hover:border-[#007780]/45 hover:bg-white",
        trainingPlan.active ? "border-[#007780]/40" : "border-stone-900/10",
      )}
      params={{ planId: trainingPlan.id }}
      to={trainingPlanPaths.plan}
    >
      <div className="grid min-w-0 gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-black text-stone-950">{trainingPlan.split}</h2>
          {trainingPlan.active ? (
            <span className="rounded-full bg-[#007780]/10 px-2.5 py-0.5 text-xs font-black text-[#007780]">
              Active
            </span>
          ) : null}
        </div>
        <p className="text-sm font-semibold text-stone-600">{details.join(" · ")}</p>
      </div>
      <ChevronRight
        aria-hidden="true"
        className="size-5 shrink-0 text-stone-400 transition-colors group-hover:text-[#007780]"
      />
    </Link>
  );
}
