import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { type ReactNode, useEffect } from "react";
import { Button } from "../design-system/button";
import { Card, CardHeader, CardTitle } from "../design-system/card";
import { cn } from "../design-system/cn";
import type { PlanBlueprint, PlanBlueprintSummary } from "./plan-blueprint";
import {
  getTrainingFrequencyRecommendation,
  isFrequencyStepComplete,
  selectTrainingFrequency,
  selectTrainingSplit,
  summarizePlanBlueprint,
  type TrainingFrequencyDaysPerWeek,
  type TrainingFrequencyOption,
  type TrainingFrequencyRecommendation,
  trainingFrequencyOptions,
} from "./plan-blueprint";
import { planBuilderPaths } from "./plan-builder-paths";
import { planBuilderService } from "./plan-builder-service";
import {
  getCompatibleTrainingSplits,
  getRecommendedTrainingSplitId,
  getTrainingSplit,
  isTrainingSplitCompatible,
  type TrainingSplitDefinition,
  type TrainingSplitId,
  type TrainingSplitSchedule,
  unsupportedTrainingSplitCategories,
} from "./training-split";

const planBlueprintSummaryRows = [
  { key: "trainingGoal", label: "Training Goal" },
  { key: "trainingFrequency", label: "Training Frequency" },
  { key: "split", label: "Training Split" },
  { key: "weeklyRhythm", label: "Weekly rhythm" },
  { key: "muscleFrequency", label: "Muscle frequency" },
  { key: "recovery", label: "Recovery" },
  { key: "nextStep", label: "Next step" },
  { key: "generationStatus", label: "Training Plan" },
] as const satisfies ReadonlyArray<{ key: keyof PlanBlueprintSummary; label: string }>;

const planBuilderSteps = [
  { id: "frequency", label: "Frequency" },
  { id: "split", label: "Split" },
  { id: "rep-ranges", label: "Rep ranges" },
  { id: "volume", label: "Volume" },
  { id: "exercises", label: "Exercises" },
  { id: "review", label: "Review" },
] as const;

const planBuilderBlueprintQueryKey = ["plan-builder", "blueprint"] as const;

type PlanBuilderStep = (typeof planBuilderSteps)[number]["id"];

type PlanBuilderStepProgressStatus = "completed" | "current" | "upcoming";

const planBuilderStepProgressStyles = {
  completed: {
    cardClassName: "border-[#d6462f]/30 bg-[#fff3ea] text-stone-950",
    labelClassName: "text-stone-500",
  },
  current: {
    cardClassName: "border-stone-950 bg-stone-950 text-stone-50",
    labelClassName: "text-[#f4b860]",
  },
  upcoming: {
    cardClassName: "border-stone-900/10 bg-white/80 text-stone-950",
    labelClassName: "text-stone-500",
  },
} as const satisfies Record<
  PlanBuilderStepProgressStatus,
  { cardClassName: string; labelClassName: string }
>;

type UpdateTrainingFrequencyVariables = {
  timestamp: string;
  trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek;
};

type PlanBlueprintMutationContext = {
  previousBlueprint?: PlanBlueprint;
};

type PlanBlueprintMutationConfig<TVariables> = {
  mutationFn: (variables: TVariables) => Promise<PlanBlueprint>;
  optimisticUpdate: (blueprint: PlanBlueprint, variables: TVariables) => PlanBlueprint;
};

type UpdateTrainingSplitVariables = {
  split: TrainingSplitId;
  timestamp: string;
};

type PlanBuilderPageProps = {
  children: ReactNode;
  currentStep: PlanBuilderStep;
  intro: ReactNode;
  stepLabel: string;
  summary: PlanBlueprintSummary | null;
};

type PlanBuilderStepProgressProps = {
  currentStep: PlanBuilderStep;
};

type PlanBuilderCurrentStepCardProps = {
  currentStep: PlanBuilderStep;
};

type PlanBuilderStepStatusCardProps = {
  body: string;
  title: string;
};

type TrainingSplitStepProps = {
  onTrainingSplitChange: (split: TrainingSplitId) => void;
  selectedSplit: TrainingSplitDefinition;
  trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek;
};

type TrainingSplitOptionRadioProps = {
  isRecommended: boolean;
  isSelected: boolean;
  onSelect: (split: TrainingSplitId) => void;
  option: TrainingSplitDefinition;
};

type TrainingSplitFitStatus = {
  body: string;
  title: string;
};

type TrainingSplitDetailsPanelProps = {
  fitStatus: TrainingSplitFitStatus;
  split: TrainingSplitDefinition;
};

type TrainingSplitFitPanelProps = {
  fitStatus: TrainingSplitFitStatus;
};

type PlanBuilderFutureStepPlaceholderProps = {
  backPath: string;
  backText: string;
  description: string;
  title: string;
};

type TrainingSplitSchedulePanelProps = {
  schedule: TrainingSplitSchedule;
};

export function PlanBuilderRoute() {
  const { blueprint, summary } = usePlanBuilderBlueprint();
  const { mutate: updateTrainingFrequency } = useUpdateTrainingFrequencyMutation();

  function handleTrainingFrequencyChange(
    trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek,
  ) {
    updateTrainingFrequency({
      timestamp: new Date().toISOString(),
      trainingFrequencyDaysPerWeek,
    });
  }

  return (
    <PlanBuilderPage
      currentStep="frequency"
      intro={
        <p className="max-w-2xl text-sm font-medium leading-6 text-stone-700 sm:text-base">
          Start a new Plan Blueprint or resume the unfinished one saved on this device. The builder
          currently assumes a Build Muscle goal and starts Training Frequency at 3 days/week.
        </p>
      }
      stepLabel="Frequency step"
      summary={summary}
    >
      {blueprint ? (
        <TrainingFrequencyStep
          canContinueToSplit={isFrequencyStepComplete(blueprint)}
          onTrainingFrequencyChange={handleTrainingFrequencyChange}
          selectedTrainingFrequencyDaysPerWeek={blueprint.trainingFrequencyDaysPerWeek}
        />
      ) : (
        <p className="text-sm font-semibold text-stone-600">Loading Training Frequency...</p>
      )}
    </PlanBuilderPage>
  );
}

export function PlanBuilderSplitRoute() {
  const { blueprint, summary } = usePlanBuilderBlueprint();
  const { mutate: updateTrainingSplit } = useUpdateTrainingSplitMutation();
  const selectedSplitId = blueprint ? getVisibleTrainingSplitId(blueprint) : null;
  const selectedSplit = selectedSplitId ? getTrainingSplit(selectedSplitId) : null;

  useEffect(() => {
    if (!blueprint || hasCompatibleSelectedTrainingSplit(blueprint)) {
      return;
    }

    updateTrainingSplit({
      split: getRecommendedTrainingSplitId(blueprint.trainingFrequencyDaysPerWeek),
      timestamp: new Date().toISOString(),
    });
  }, [blueprint, updateTrainingSplit]);

  function handleTrainingSplitChange(split: TrainingSplitId) {
    updateTrainingSplit({
      split,
      timestamp: new Date().toISOString(),
    });
  }

  return (
    <PlanBuilderPage
      currentStep="split"
      intro={
        <p className="max-w-2xl text-sm font-medium leading-6 text-stone-700 sm:text-base">
          Choose a compatible Training Split for the saved Plan Blueprint. Just Workout will
          recommend the best fit for this Training Frequency without locking you into one option.
        </p>
      }
      stepLabel="Split step"
      summary={summary}
    >
      {blueprint && selectedSplit ? (
        <TrainingSplitStep
          onTrainingSplitChange={handleTrainingSplitChange}
          selectedSplit={selectedSplit}
          trainingFrequencyDaysPerWeek={blueprint.trainingFrequencyDaysPerWeek}
        />
      ) : (
        <p className="text-sm font-semibold text-stone-600">Loading Training Split...</p>
      )}
    </PlanBuilderPage>
  );
}

export function PlanBuilderRepRangesRoute() {
  const { summary } = usePlanBuilderBlueprint();

  return (
    <PlanBuilderPage
      currentStep="rep-ranges"
      intro={
        <p className="max-w-2xl text-sm font-medium leading-6 text-stone-700 sm:text-base">
          The Plan Blueprint keeps moving forward by route, but Rep ranges stay out of scope in this
          slice.
        </p>
      }
      stepLabel="Rep ranges step"
      summary={summary}
    >
      <PlanBuilderFutureStepPlaceholder
        backPath={planBuilderPaths.split}
        backText="Back to Split"
        description="Split is now configured, but Rep ranges will land in a later issue."
        title="Rep ranges placeholder"
      />
    </PlanBuilderPage>
  );
}

function usePlanBuilderBlueprint() {
  const blueprintQuery = useQuery({
    queryKey: planBuilderBlueprintQueryKey,
    queryFn: planBuilderService.getOrCreatePlanBlueprint,
  });

  const blueprint = blueprintQuery.data;
  const summary = blueprint ? summarizePlanBlueprint(blueprint) : null;

  return {
    blueprint,
    summary,
  };
}

function useUpdateTrainingFrequencyMutation() {
  return usePlanBlueprintMutation<UpdateTrainingFrequencyVariables>({
    mutationFn: ({ timestamp, trainingFrequencyDaysPerWeek }) =>
      planBuilderService.updateTrainingFrequency({
        timestamp,
        trainingFrequencyDaysPerWeek,
      }),
    optimisticUpdate: (blueprint, { timestamp, trainingFrequencyDaysPerWeek }) =>
      selectTrainingFrequency({
        blueprint,
        timestamp,
        trainingFrequencyDaysPerWeek,
      }),
  });
}

function useUpdateTrainingSplitMutation() {
  return usePlanBlueprintMutation<UpdateTrainingSplitVariables>({
    mutationFn: ({ split, timestamp }) =>
      planBuilderService.updateTrainingSplit({
        split,
        timestamp,
      }),
    optimisticUpdate: (blueprint, { split, timestamp }) =>
      selectTrainingSplit({
        blueprint,
        split,
        timestamp,
      }),
  });
}

function usePlanBlueprintMutation<TVariables>({
  mutationFn,
  optimisticUpdate,
}: PlanBlueprintMutationConfig<TVariables>) {
  const queryClient = useQueryClient();

  return useMutation<PlanBlueprint, Error, TVariables, PlanBlueprintMutationContext>({
    mutationFn,
    onError: (_error, _variables, context) => {
      if (context?.previousBlueprint) {
        queryClient.setQueryData(planBuilderBlueprintQueryKey, context.previousBlueprint);
      }
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: planBuilderBlueprintQueryKey });

      const previousBlueprint = queryClient.getQueryData<PlanBlueprint>(
        planBuilderBlueprintQueryKey,
      );

      if (previousBlueprint) {
        queryClient.setQueryData(
          planBuilderBlueprintQueryKey,
          optimisticUpdate(previousBlueprint, variables),
        );
      }

      return { previousBlueprint };
    },
    onSuccess: (updatedBlueprint) => {
      queryClient.setQueryData(planBuilderBlueprintQueryKey, updatedBlueprint);
    },
  });
}

function getVisibleTrainingSplitId(blueprint: PlanBlueprint): TrainingSplitId {
  if (hasCompatibleSelectedTrainingSplit(blueprint)) {
    return blueprint.split;
  }

  return getRecommendedTrainingSplitId(blueprint.trainingFrequencyDaysPerWeek);
}

function hasCompatibleSelectedTrainingSplit(
  blueprint: PlanBlueprint,
): blueprint is PlanBlueprint & {
  split: TrainingSplitId;
} {
  return isTrainingSplitCompatible(blueprint.split, blueprint.trainingFrequencyDaysPerWeek);
}

function PlanBuilderPage({
  children,
  currentStep,
  intro,
  stepLabel,
  summary,
}: PlanBuilderPageProps) {
  return (
    <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)] lg:items-start">
      <section aria-label="Plan Builder workspace" className="min-w-0 space-y-4">
        <Card className="overflow-hidden bg-[#f2ecdf]">
          <CardHeader className="mb-0 flex-col items-start gap-4 xl:flex-row xl:justify-between">
            <div className="min-w-0 space-y-2">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#b93725]">
                {stepLabel}
              </p>
              <CardTitle className="text-3xl font-black sm:text-4xl">Plan Builder</CardTitle>
              {intro}
            </div>

            <PlanBuilderCurrentStepCard currentStep={currentStep} />
          </CardHeader>

          <div className="mt-4">
            <PlanBuilderStepProgress currentStep={currentStep} />
          </div>
        </Card>

        <Card className="bg-white/82">{children}</Card>
      </section>

      <PlanBlueprintSummaryCard summary={summary} />
    </section>
  );
}

function PlanBuilderCurrentStepCard({ currentStep }: PlanBuilderCurrentStepCardProps) {
  const stepDetails = getPlanBuilderStepDetails(currentStep);

  return (
    <div className="w-full rounded-lg border border-stone-900/10 bg-white/72 p-4 xl:max-w-[18rem]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wide text-stone-500">Current step</p>
        <p className="text-xs font-bold uppercase tracking-wide text-[#b93725]">
          Step {stepDetails.number} of {planBuilderSteps.length}
        </p>
      </div>
      <p className="mt-2 text-lg font-black text-stone-950">{stepDetails.title}</p>
      <p className="mt-2 text-sm text-stone-600">
        Just Workout keeps this in-progress Plan Blueprint visible while you move through each
        builder step.
      </p>
    </div>
  );
}

function PlanBuilderStepProgress({ currentStep }: PlanBuilderStepProgressProps) {
  const currentStepIndex = getPlanBuilderStepDetails(currentStep).index;

  return (
    <nav aria-label="Plan Builder progress">
      <ol aria-label="Plan Builder steps" className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {planBuilderSteps.map((step, index) => {
          const status = getPlanBuilderStepProgressStatus(index, currentStepIndex);
          const styles = planBuilderStepProgressStyles[status];

          return (
            <li
              className={cn("min-w-0 rounded-lg border px-3 py-3", styles.cardClassName)}
              key={step.id}
            >
              <p
                className={cn(
                  "text-[11px] font-bold uppercase tracking-wide",
                  styles.labelClassName,
                )}
              >
                Step {index + 1}
              </p>
              <p
                aria-current={status === "current" ? "step" : undefined}
                className="mt-1 text-sm font-black leading-5"
              >
                {step.label}
              </p>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function getPlanBuilderStepDetails(currentStep: PlanBuilderStep) {
  const index = planBuilderSteps.findIndex((step) => step.id === currentStep);
  const step = planBuilderSteps[index];

  return {
    index,
    number: index + 1,
    title: step?.label ?? "Current step",
  };
}

function getPlanBuilderStepProgressStatus(
  stepIndex: number,
  currentStepIndex: number,
): PlanBuilderStepProgressStatus {
  if (stepIndex < currentStepIndex) {
    return "completed";
  }

  if (stepIndex === currentStepIndex) {
    return "current";
  }

  return "upcoming";
}

type TrainingFrequencyStepProps = {
  canContinueToSplit: boolean;
  onTrainingFrequencyChange: (trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek) => void;
  selectedTrainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek;
};

function TrainingFrequencyStep({
  canContinueToSplit,
  onTrainingFrequencyChange,
  selectedTrainingFrequencyDaysPerWeek,
}: TrainingFrequencyStepProps) {
  const recommendation = getTrainingFrequencyRecommendation(selectedTrainingFrequencyDaysPerWeek);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-start">
      <div className="min-w-0 space-y-4">
        <section aria-labelledby="training-frequency-title" className="space-y-3">
          <div>
            <h3
              className="text-xl font-black text-stone-950 sm:text-2xl"
              id="training-frequency-title"
            >
              Select Training Frequency
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-stone-600">
              Later builder steps will adapt split choices to this frequency without forcing a
              single split style.
            </p>
          </div>

          <fieldset className="grid gap-3 sm:grid-cols-2">
            <legend className="sr-only">Training Frequency</legend>
            {trainingFrequencyOptions.map((option) => (
              <TrainingFrequencyOptionRadio
                isSelected={option.daysPerWeek === selectedTrainingFrequencyDaysPerWeek}
                key={option.daysPerWeek}
                onSelect={onTrainingFrequencyChange}
                option={option}
              />
            ))}
          </fieldset>

          <p className="text-sm font-semibold text-stone-600">
            6-day plans are not available in this first version.
          </p>
        </section>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button disabled type="button" variant="outline">
            Back
          </Button>
          {canContinueToSplit ? (
            <Button asChild>
              <Link to={planBuilderPaths.split}>Continue to Split</Link>
            </Button>
          ) : (
            <Button disabled type="button">
              Continue to Split
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <PlanBuilderStepStatusCard
          body="This entry point establishes the resumable blueprint before later builder choices exist."
          title="Current step"
        />
        <TrainingFrequencyRecommendationCard recommendation={recommendation} />
      </div>
    </div>
  );
}

function TrainingSplitStep({
  onTrainingSplitChange,
  selectedSplit,
  trainingFrequencyDaysPerWeek,
}: TrainingSplitStepProps) {
  const compatibleSplits = getCompatibleTrainingSplits(trainingFrequencyDaysPerWeek);
  const recommendedSplitId = getRecommendedTrainingSplitId(trainingFrequencyDaysPerWeek);
  const trainingFrequencyLabel = `${trainingFrequencyDaysPerWeek} days/week`;
  const fitStatus = getTrainingSplitFitStatus({
    recommendedSplitId,
    selectedSplit,
    trainingFrequencyLabel,
  });

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-start">
      <div className="min-w-0 space-y-4">
        <section aria-labelledby="training-split-title" className="space-y-3">
          <div>
            <h3 className="text-xl font-black text-stone-950 sm:text-2xl" id="training-split-title">
              Select Training Split
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-stone-600">
              These options stay compatible with {trainingFrequencyLabel}. The saved Plan Blueprint
              keeps only the selected split id while weekly rhythm and recovery stay derived.
            </p>
          </div>

          <fieldset className="grid gap-3">
            <legend className="sr-only">Training Split</legend>
            {compatibleSplits.map((option) => (
              <TrainingSplitOptionRadio
                isRecommended={option.id === recommendedSplitId}
                isSelected={option.id === selectedSplit.id}
                key={option.id}
                onSelect={onTrainingSplitChange}
                option={option}
              />
            ))}
          </fieldset>
        </section>

        <TrainingSplitDetailsPanel
          fitStatus={fitStatus}
          key={selectedSplit.id}
          split={selectedSplit}
        />

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button asChild variant="outline">
            <Link to={planBuilderPaths.frequency}>Back to Frequency</Link>
          </Button>
          <Button asChild>
            <Link to={planBuilderPaths.repRanges}>Continue to Rep ranges</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <PlanBuilderStepStatusCard
          body="No Training Plan has been generated yet. Review is still the point where the full Training Plan is created."
          title="Plan status"
        />
      </div>
    </div>
  );
}

function getTrainingSplitFitStatus({
  recommendedSplitId,
  selectedSplit,
  trainingFrequencyLabel,
}: {
  recommendedSplitId: TrainingSplitId;
  selectedSplit: TrainingSplitDefinition;
  trainingFrequencyLabel: string;
}): TrainingSplitFitStatus {
  if (selectedSplit.id === recommendedSplitId) {
    return {
      body: `Just Workout recommends ${selectedSplit.label} for ${trainingFrequencyLabel} as the clearest starting point.`,
      title: "Recommended fit",
    };
  }

  return {
    body: `${selectedSplit.label} still fits ${trainingFrequencyLabel}, but it trades the default recommendation for a different weekly rhythm.`,
    title: "Compatible alternative",
  };
}

function PlanBuilderFutureStepPlaceholder({
  backPath,
  backText,
  description,
  title,
}: PlanBuilderFutureStepPlaceholderProps) {
  return (
    <div className="space-y-4">
      <section aria-labelledby="future-step-placeholder-title" className="space-y-3">
        <div>
          <h3
            className="text-xl font-black text-stone-950 sm:text-2xl"
            id="future-step-placeholder-title"
          >
            {title}
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-stone-600">{description}</p>
        </div>

        <PlanBuilderStepStatusCard
          body="This placeholder keeps the builder flow moving by route without generating a Training Plan early."
          title="What this step proves"
        />
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button asChild variant="outline">
          <Link to={backPath}>{backText}</Link>
        </Button>
      </div>
    </div>
  );
}

type TrainingFrequencyOptionRadioProps = {
  isSelected: boolean;
  onSelect: (trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek) => void;
  option: TrainingFrequencyOption;
};

function TrainingFrequencyOptionRadio({
  isSelected,
  onSelect,
  option,
}: TrainingFrequencyOptionRadioProps) {
  const optionLabel = `${option.daysPerWeek} days/week`;

  return (
    <label
      className={cn(
        "min-w-0 rounded-lg border p-4 text-left transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-stone-950",
        isSelected
          ? "border-stone-950 bg-stone-950 text-stone-50 shadow-sm"
          : "border-stone-900/10 bg-white/85 text-stone-950 hover:bg-white",
      )}
    >
      <input
        checked={isSelected}
        className="sr-only"
        name="training-frequency-days-per-week"
        onChange={() => onSelect(option.daysPerWeek)}
        type="radio"
        value={option.daysPerWeek}
      />
      <p className="text-sm font-bold uppercase tracking-wide text-inherit/80">Days per week</p>
      <p className="mt-2 text-lg font-black">{optionLabel}</p>
      <p className={cn("mt-2 text-sm", isSelected ? "text-stone-300" : "text-stone-600")}>
        {option.helperText}
      </p>
    </label>
  );
}

function TrainingSplitOptionRadio({
  isRecommended,
  isSelected,
  onSelect,
  option,
}: TrainingSplitOptionRadioProps) {
  const badgeLabel = isRecommended ? "Recommended" : "Also works";

  return (
    <label
      className={cn(
        "min-w-0 rounded-lg border p-4 text-left transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-stone-950",
        isSelected
          ? "border-stone-950 bg-stone-950 text-stone-50 shadow-sm"
          : "border-stone-900/10 bg-white/85 text-stone-950 hover:bg-white",
      )}
    >
      <input
        checked={isSelected}
        className="sr-only"
        name="training-split"
        onChange={() => onSelect(option.id)}
        type="radio"
        value={option.id}
      />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg font-black">{option.label}</p>
          <p className={cn("mt-2 text-sm", isSelected ? "text-stone-300" : "text-stone-600")}>
            {option.cardDescription}
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide",
            isSelected ? "bg-white/12 text-[#f4b860]" : "bg-[#fff3ea] text-[#b93725]",
          )}
        >
          {badgeLabel}
        </span>
      </div>
    </label>
  );
}

function TrainingSplitDetailsPanel({ fitStatus, split }: TrainingSplitDetailsPanelProps) {
  return (
    <section
      aria-labelledby="training-split-details-title"
      aria-atomic="true"
      aria-live="polite"
      className="rounded-lg border border-stone-900/10 bg-[#f9f6ef] p-4"
    >
      <p className="text-sm font-bold uppercase tracking-wide text-[#b93725]">Selected split</p>
      <h3 className="mt-1 text-xl font-black text-stone-950" id="training-split-details-title">
        {split.label}
      </h3>
      <p className="mt-2 max-w-3xl text-sm text-stone-600">{split.cardDescription}</p>

      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        <SummaryRow label="Weekly rhythm" value={split.weeklyRhythm} />
        <SummaryRow label="Muscle frequency" value={split.muscleFrequency} />
        <SummaryRow label="Recovery" value={split.recovery} />
      </dl>

      <TrainingSplitFitPanel fitStatus={fitStatus} />
      <TrainingSplitSchedulePanel schedule={split.schedule} />
      <UnsupportedTrainingSplitsPanel />
    </section>
  );
}

function TrainingSplitFitPanel({ fitStatus }: TrainingSplitFitPanelProps) {
  return (
    <div className="mt-4 rounded-lg border border-stone-900/10 bg-white/80 p-4">
      <h4 className="text-sm font-bold uppercase tracking-wide text-stone-500">
        Why this split fits
      </h4>
      <p className="mt-2 text-sm font-semibold text-stone-900">{fitStatus.title}</p>
      <p className="mt-2 text-sm text-stone-600">{fitStatus.body}</p>
    </div>
  );
}

function UnsupportedTrainingSplitsPanel() {
  return (
    <section aria-labelledby="not-recommended-split-title" className="mt-4 space-y-3">
      <div>
        <h4
          className="text-lg font-black text-stone-950 sm:text-xl"
          id="not-recommended-split-title"
        >
          Not included in this step
        </h4>
        <p className="mt-1 max-w-2xl text-sm text-stone-600">
          Common split categories that do not fit this first Plan Builder version stay explanatory
          only.
        </p>
      </div>

      <div className="grid gap-3">
        {unsupportedTrainingSplitCategories.map((category) => (
          <PlanBuilderStepStatusCard
            body={category.description}
            key={category.title}
            title={category.title}
          />
        ))}
      </div>
    </section>
  );
}

function TrainingSplitSchedulePanel({ schedule }: TrainingSplitSchedulePanelProps) {
  return (
    <div className="mt-4 rounded-lg border border-stone-900/10 bg-white/80 p-4">
      <h4 className="text-sm font-bold uppercase tracking-wide text-stone-500">
        {getTrainingSplitScheduleHeading(schedule)}
      </h4>
      <p className="mt-2 text-sm text-stone-600">{schedule.description}</p>

      <TrainingSplitScheduleContent schedule={schedule} />
    </div>
  );
}

function TrainingSplitScheduleContent({ schedule }: TrainingSplitSchedulePanelProps) {
  switch (schedule.kind) {
    case "fixed-week":
      return (
        <ol className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {schedule.week.map((day) => (
            <li
              className="rounded-md border border-stone-900/10 bg-[#f4f0e8] px-3 py-3"
              key={`${day.dayLabel}-${day.sessionLabel}`}
            >
              <p className="text-xs font-bold uppercase tracking-wide text-stone-500">
                {day.dayLabel}
              </p>
              <p className="mt-1 text-sm font-semibold text-stone-900">{day.sessionLabel}</p>
            </li>
          ))}
        </ol>
      );
    case "rotating-cycle":
      return (
        <div className="mt-4 space-y-3">
          <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {schedule.cycle.map((session, index) => (
              <li
                className="rounded-md border border-stone-900/10 bg-[#f4f0e8] px-3 py-3"
                key={session.id}
              >
                <p className="text-xs font-bold uppercase tracking-wide text-stone-500">
                  Cycle step {index + 1}
                </p>
                <p className="mt-1 text-sm font-semibold text-stone-900">{session.sessionLabel}</p>
              </li>
            ))}
          </ol>
          <p className="text-sm font-semibold text-stone-700">{schedule.cadence}</p>
        </div>
      );
  }
}

function getTrainingSplitScheduleHeading(schedule: TrainingSplitSchedule): string {
  switch (schedule.kind) {
    case "fixed-week":
      return "Suggested weekly layout";
    case "rotating-cycle":
      return "Rotating-cycle preview";
  }
}

type TrainingFrequencyRecommendationCardProps = {
  recommendation: TrainingFrequencyRecommendation;
};

function TrainingFrequencyRecommendationCard({
  recommendation,
}: TrainingFrequencyRecommendationCardProps) {
  return (
    <section
      aria-labelledby="training-frequency-recommendation-title"
      className="rounded-md border border-stone-900/10 bg-stone-950 p-4 text-stone-50"
    >
      <p className="text-sm font-bold text-[#f4b860]">Recommendation</p>
      <h3 className="mt-1 text-xl font-black" id="training-frequency-recommendation-title">
        {recommendation.title}
      </h3>
      <p className="mt-2 text-sm text-stone-300">{recommendation.description}</p>
      <p className="mt-3 text-sm font-semibold text-stone-200">
        Future steps will narrow the split options for this frequency without locking you into a
        single template.
      </p>
    </section>
  );
}

function PlanBuilderStepStatusCard({ body, title }: PlanBuilderStepStatusCardProps) {
  return (
    <div className="rounded-md border border-stone-900/10 bg-white/80 p-4">
      <p className="text-sm font-bold text-stone-700">{title}</p>
      <p className="mt-2 text-sm text-stone-600">{body}</p>
    </div>
  );
}

type PlanBlueprintSummaryCardProps = {
  summary: PlanBlueprintSummary | null;
};

function PlanBlueprintSummaryCard({ summary }: PlanBlueprintSummaryCardProps) {
  return (
    <aside aria-labelledby="plan-blueprint-summary-title" className="self-start lg:sticky lg:top-4">
      <Card className="bg-white/78">
        <CardHeader>
          <div>
            <CardTitle id="plan-blueprint-summary-title">Plan Blueprint Summary</CardTitle>
            <p className="mt-2 text-sm text-stone-600">
              Review the saved Just Workout blueprint while you move through the builder.
            </p>
          </div>
        </CardHeader>

        {summary ? (
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {planBlueprintSummaryRows.map(({ key, label }) => (
              <SummaryRow key={key} label={label} value={summary[key]} />
            ))}
          </dl>
        ) : (
          <p className="text-sm font-semibold text-stone-600">Loading Plan Blueprint...</p>
        )}
      </Card>
    </aside>
  );
}

type SummaryRowProps = {
  label: string;
  value: string;
};

function SummaryRow({ label, value }: SummaryRowProps) {
  return (
    <div className="min-w-0 rounded-lg border border-stone-900/10 bg-[#f9f6ef] px-3 py-3">
      <dt className="text-xs font-bold uppercase tracking-wide text-stone-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-stone-900">{value}</dd>
    </div>
  );
}
