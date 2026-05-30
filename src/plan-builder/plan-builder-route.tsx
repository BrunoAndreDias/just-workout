import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle } from "../design-system/card";
import { summarizePlanBlueprint } from "./plan-blueprint";
import { planBuilderService } from "./plan-builder-service";

export function PlanBuilderRoute() {
  const blueprintQuery = useQuery({
    queryFn: planBuilderService.getOrCreatePlanBlueprint,
    queryKey: ["plan-builder", "blueprint"],
  });

  const summary = blueprintQuery.data ? summarizePlanBlueprint(blueprintQuery.data) : null;

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

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-stone-900/10 bg-white/80 p-4">
              <p className="text-sm font-bold text-stone-700">Current step</p>
              <p className="mt-1 text-xl font-black text-stone-950">Training Frequency</p>
              <p className="mt-2 text-sm text-stone-600">
                This entry point establishes the resumable blueprint before later builder choices
                exist.
              </p>
            </div>

            <div className="rounded-md border border-stone-900/10 bg-stone-950 p-4 text-stone-50">
              <p className="text-sm font-bold text-[#f4b860]">Default baseline</p>
              <p className="mt-1 text-xl font-black">
                {summary?.trainingFrequency ?? "Loading frequency..."}
              </p>
              <p className="mt-2 text-sm text-stone-300">
                Future steps will fill in split, rep ranges, volume, and equipment before a Training
                Plan can be generated.
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plan Blueprint Summary</CardTitle>
        </CardHeader>

        {summary ? (
          <dl className="space-y-3">
            <SummaryRow label="Training Goal" value={summary.trainingGoal} />
            <SummaryRow label="Training Frequency" value={summary.trainingFrequency} />
            <SummaryRow label="Split" value={summary.split} />
            <SummaryRow label="Rep ranges" value={summary.repRanges} />
            <SummaryRow label="Volume preset" value={summary.volumePreset} />
            <SummaryRow label="Equipment" value={summary.equipment} />
            <SummaryRow label="Generation status" value={summary.generationStatus} />
          </dl>
        ) : (
          <p className="text-sm font-semibold text-stone-600">Loading Plan Blueprint...</p>
        )}
      </Card>
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
