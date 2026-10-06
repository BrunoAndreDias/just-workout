import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useMemo } from "react";
import { Button } from "../design-system/button";
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
  const trainingPlans = trainingPlansQuery.data ?? [];

  if (trainingPlansQuery.isLoading) {
    return (
      <section className="px-6 py-8 sm:px-8">
        <p className="text-sm font-semibold text-muted">Loading Training Plans...</p>
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
          <div className="max-w-2xl card p-5">
            <h2 className="text-lg font-black text-ink">No Training Plans yet</h2>
            <p className="mt-2 text-sm font-semibold text-muted">
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

function TrainingPlanListItem({ trainingPlan }: { trainingPlan: TrainingPlan }) {
  return (
    <Link
      className="card p-5 transition-colors hover:border-accent/45"
      params={{ planId: trainingPlan.id }}
      to={trainingPlanPaths.plan}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-black text-ink">{trainingPlan.split}</h2>
        {trainingPlan.active ? (
          <span className="rounded-full bg-accent-tint px-3 py-1 text-xs font-black uppercase text-accent">
            Active
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-sm font-semibold text-muted">
        {trainingPlan.trainingFrequencyDaysPerWeek} days/week ·{" "}
        {trainingPlan.workoutTemplates.length} workout templates
      </p>
    </Link>
  );
}
