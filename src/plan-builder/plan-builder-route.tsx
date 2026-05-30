import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Button } from "../design-system/button";
import { Card, CardHeader, CardTitle } from "../design-system/card";
import { cn } from "../design-system/cn";
import type { PlanBlueprint, PlanBlueprintSummary } from "./plan-blueprint";
import {
  getTrainingFrequencyRecommendation,
  isFrequencyStepComplete,
  selectTrainingFrequency,
  summarizePlanBlueprint,
  type TrainingFrequencyDaysPerWeek,
  type TrainingFrequencyOption,
  type TrainingFrequencyRecommendation,
  trainingFrequencyOptions,
} from "./plan-blueprint";
import { planBuilderService } from "./plan-builder-service";

const planBlueprintSummaryRows = [
  { key: "trainingGoal", label: "Training Goal" },
  { key: "trainingFrequency", label: "Training Frequency" },
  { key: "split", label: "Split" },
  { key: "repRanges", label: "Rep ranges" },
  { key: "volumePreset", label: "Volume preset" },
  { key: "equipment", label: "Equipment" },
  { key: "generationStatus", label: "Generation status" },
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

type UpdateTrainingFrequencyContext = {
  previousBlueprint?: PlanBlueprint;
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

type PlanBuilderStepStatusCardProps = {
  body: string;
  title: string;
};

export function PlanBuilderRoute() {
  const queryClient = useQueryClient();
  const { blueprint, summary } = usePlanBuilderBlueprint();

  const updateTrainingFrequencyMutation = useMutation<
    PlanBlueprint,
    Error,
    UpdateTrainingFrequencyVariables,
    UpdateTrainingFrequencyContext
  >({
    mutationFn: ({ timestamp, trainingFrequencyDaysPerWeek }) =>
      planBuilderService.updateTrainingFrequency({
        timestamp,
        trainingFrequencyDaysPerWeek,
      }),
    onError: (_error, _variables, context) => {
      if (context?.previousBlueprint) {
        queryClient.setQueryData(planBuilderBlueprintQueryKey, context.previousBlueprint);
      }
    },
    onMutate: async ({ timestamp, trainingFrequencyDaysPerWeek }) => {
      await queryClient.cancelQueries({ queryKey: planBuilderBlueprintQueryKey });

      const previousBlueprint = queryClient.getQueryData<PlanBlueprint>(
        planBuilderBlueprintQueryKey,
      );

      if (previousBlueprint) {
        queryClient.setQueryData(
          planBuilderBlueprintQueryKey,
          selectTrainingFrequency({
            blueprint: previousBlueprint,
            timestamp,
            trainingFrequencyDaysPerWeek,
          }),
        );
      }

      return { previousBlueprint };
    },
    onSuccess: (updatedBlueprint) => {
      queryClient.setQueryData(planBuilderBlueprintQueryKey, updatedBlueprint);
    },
  });

  function handleTrainingFrequencyChange(
    trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek,
  ) {
    updateTrainingFrequencyMutation.mutate({
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
  const { summary } = usePlanBuilderBlueprint();

  return (
    <PlanBuilderPage
      currentStep="split"
      intro={
        <p className="max-w-2xl text-sm font-medium leading-6 text-stone-700 sm:text-base">
          Move into the next builder step without losing the in-progress Plan Blueprint. Split
          selection stays intentionally lightweight in this slice.
        </p>
      }
      stepLabel="Split step"
      summary={summary}
    >
      <SplitPlaceholderStep />
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

function PlanBuilderPage({
  children,
  currentStep,
  intro,
  stepLabel,
  summary,
}: PlanBuilderPageProps) {
  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <Card className="bg-[#f2ecdf]">
        <CardHeader className="flex-col items-start gap-2">
          <p className="text-xs font-bold uppercase tracking-wide text-[#b93725]">{stepLabel}</p>
          <CardTitle className="text-3xl font-black sm:text-4xl">Plan Builder</CardTitle>
        </CardHeader>

        <div className="space-y-4">
          {intro}
          <PlanBuilderStepProgress currentStep={currentStep} />
          {children}
        </div>
      </Card>

      <PlanBlueprintSummaryCard summary={summary} />
    </section>
  );
}

function PlanBuilderStepProgress({ currentStep }: PlanBuilderStepProgressProps) {
  const currentStepIndex = planBuilderSteps.findIndex((step) => step.id === currentStep);

  return (
    <nav aria-label="Plan Builder progress">
      <ol aria-label="Plan Builder steps" className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
        {planBuilderSteps.map((step, index) => {
          const status = getPlanBuilderStepProgressStatus(index, currentStepIndex);
          const styles = planBuilderStepProgressStyles[status];

          return (
            <li className={cn("rounded-md border px-3 py-3", styles.cardClassName)} key={step.id}>
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
    <div className="space-y-4">
      <section aria-labelledby="training-frequency-title" className="space-y-3">
        <div>
          <h3
            className="text-xl font-black text-stone-950 sm:text-2xl"
            id="training-frequency-title"
          >
            Select Training Frequency
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-stone-600">
            Later builder steps will adapt split choices to this frequency without forcing a single
            split style.
          </p>
        </div>

        <fieldset className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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

      <div className="grid gap-3 sm:grid-cols-2">
        <PlanBuilderStepStatusCard
          body="This entry point establishes the resumable blueprint before later builder choices exist."
          title="Current step"
        />
        <TrainingFrequencyRecommendationCard recommendation={recommendation} />
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button disabled type="button" variant="outline">
          Back
        </Button>
        {canContinueToSplit ? (
          <Button asChild>
            <Link to="/plan-builder/split">Continue to Split</Link>
          </Button>
        ) : (
          <Button disabled type="button">
            Continue to Split
          </Button>
        )}
      </div>
    </div>
  );
}

function SplitPlaceholderStep() {
  return (
    <div className="space-y-4">
      <section aria-labelledby="split-placeholder-title" className="space-y-3">
        <div>
          <h3
            className="text-xl font-black text-stone-950 sm:text-2xl"
            id="split-placeholder-title"
          >
            Split placeholder
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-stone-600">
            Split selection is not built yet. This placeholder only proves the next Plan Builder
            route and keeps the unfinished Plan Blueprint visible while future steps stay out of
            scope.
          </p>
        </div>

        <PlanBuilderStepStatusCard
          body="Frequency is already captured, so this route can stay lightweight until split selection is implemented."
          title="What this step proves"
        />
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button asChild variant="outline">
          <Link to="/plan-builder">Back to Frequency</Link>
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
        "rounded-md border p-4 text-left transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-stone-950",
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
    <aside aria-labelledby="plan-blueprint-summary-title">
      <Card>
        <CardHeader>
          <CardTitle id="plan-blueprint-summary-title">Plan Blueprint Summary</CardTitle>
        </CardHeader>

        {summary ? (
          <dl className="space-y-3">
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
    <div className="rounded-md border border-stone-900/10 bg-[#f9f6ef] px-3 py-3">
      <dt className="text-xs font-bold uppercase tracking-wide text-stone-500">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-stone-900">{value}</dd>
    </div>
  );
}
