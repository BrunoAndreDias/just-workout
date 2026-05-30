import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle } from "../design-system/card";
import { cn } from "../design-system/cn";
import type { PlanBlueprint, PlanBlueprintSummary } from "./plan-blueprint";
import {
  getTrainingFrequencyRecommendation,
  selectTrainingFrequency,
  summarizePlanBlueprint,
  type TrainingFrequencyDaysPerWeek,
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

const planBuilderBlueprintQueryKey = ["plan-builder", "blueprint"] as const;
type UpdateTrainingFrequencyMutation = {
  timestamp: string;
  trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek;
};
type UpdateTrainingFrequencyMutationContext = {
  previousBlueprint?: PlanBlueprint;
};

export function PlanBuilderRoute() {
  const queryClient = useQueryClient();
  const blueprintQuery = useQuery({
    queryKey: planBuilderBlueprintQueryKey,
    queryFn: planBuilderService.getOrCreatePlanBlueprint,
  });

  const summary = blueprintQuery.data ? summarizePlanBlueprint(blueprintQuery.data) : null;
  const recommendation = blueprintQuery.data
    ? getTrainingFrequencyRecommendation(blueprintQuery.data.trainingFrequencyDaysPerWeek)
    : null;

  const updateTrainingFrequencyMutation = useMutation<
    PlanBlueprint,
    Error,
    UpdateTrainingFrequencyMutation,
    UpdateTrainingFrequencyMutationContext
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
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <Card className="bg-[#f2ecdf]">
        <CardHeader className="flex-col items-start gap-2">
          <p className="text-xs font-bold uppercase tracking-wide text-[#b93725]">Frequency step</p>
          <CardTitle className="text-3xl font-black sm:text-4xl">Plan Builder</CardTitle>
        </CardHeader>

        <div className="space-y-4">
          <p className="max-w-2xl text-sm font-medium leading-6 text-stone-700 sm:text-base">
            Start a new Plan Blueprint or resume the unfinished one saved on this device. The
            builder currently assumes a Build Muscle goal and starts Training Frequency at 3
            days/week.
          </p>

          {blueprintQuery.data && recommendation ? (
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
                    Later builder steps will adapt split choices to this frequency without forcing a
                    single split style.
                  </p>
                </div>

                <fieldset className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <legend className="sr-only">Training Frequency</legend>
                  {trainingFrequencyOptions.map((option) => {
                    const isSelected =
                      option.daysPerWeek === blueprintQuery.data.trainingFrequencyDaysPerWeek;

                    return (
                      <label
                        className={cn(
                          "rounded-md border p-4 text-left transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-stone-950",
                          isSelected
                            ? "border-stone-950 bg-stone-950 text-stone-50 shadow-sm"
                            : "border-stone-900/10 bg-white/85 text-stone-950 hover:bg-white",
                        )}
                        key={option.daysPerWeek}
                      >
                        <input
                          checked={isSelected}
                          className="sr-only"
                          name="training-frequency-days-per-week"
                          onChange={() => handleTrainingFrequencyChange(option.daysPerWeek)}
                          type="radio"
                          value={option.daysPerWeek}
                        />
                        <p className="text-sm font-bold uppercase tracking-wide text-inherit/80">
                          Days per week
                        </p>
                        <p className="mt-2 text-lg font-black">{option.daysPerWeek} days/week</p>
                        <p
                          className={cn(
                            "mt-2 text-sm",
                            isSelected ? "text-stone-300" : "text-stone-600",
                          )}
                        >
                          {option.helperText}
                        </p>
                      </label>
                    );
                  })}
                </fieldset>

                <p className="text-sm font-semibold text-stone-600">
                  6-day plans are not available in this first version.
                </p>
              </section>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-stone-900/10 bg-white/80 p-4">
                  <p className="text-sm font-bold text-stone-700">Current step</p>
                  <p className="mt-1 text-xl font-black text-stone-950">Training Frequency</p>
                  <p className="mt-2 text-sm text-stone-600">
                    This entry point establishes the resumable blueprint before later builder
                    choices exist.
                  </p>
                </div>

                <section
                  aria-labelledby="training-frequency-recommendation-title"
                  className="rounded-md border border-stone-900/10 bg-stone-950 p-4 text-stone-50"
                >
                  <p className="text-sm font-bold text-[#f4b860]">Recommendation</p>
                  <h3
                    className="mt-1 text-xl font-black"
                    id="training-frequency-recommendation-title"
                  >
                    {recommendation.title}
                  </h3>
                  <p className="mt-2 text-sm text-stone-300">{recommendation.description}</p>
                  <p className="mt-3 text-sm font-semibold text-stone-200">
                    Future steps will narrow the split options for this frequency without locking
                    you into a single template.
                  </p>
                </section>
              </div>
            </div>
          ) : (
            <p className="text-sm font-semibold text-stone-600">Loading Training Frequency...</p>
          )}
        </div>
      </Card>

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
    </section>
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
