import { Link } from "@tanstack/react-router";
import { Wand2 } from "lucide-react";
import { Button } from "../../design-system/button";
import { StepActions, StepPanel } from "../../design-system/step-screen";
import { PlanBuilderStepStatusCard } from "../components/plan-builder-page";
import type { PlanBlueprintSummary } from "../plan-blueprint";
import { planBuilderPaths } from "../plan-builder-paths";

type GenerateTrainingPlanStepProps = {
  isGenerating: boolean;
  onGenerateTrainingPlan: () => Promise<void>;
  summary: PlanBlueprintSummary | null;
};

export function GenerateTrainingPlanStep({
  isGenerating,
  onGenerateTrainingPlan,
  summary,
}: GenerateTrainingPlanStepProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-start">
      <div className="min-w-0 space-y-4">
        <StepPanel>
          <h3 className="text-xl font-black text-stone-950 sm:text-2xl">Generate Training Plan</h3>
          <p className="mt-3 max-w-2xl text-sm text-stone-600">
            Just Workout will create an active Training Plan from this completed Plan Blueprint. The
            first generated plan uses split-derived Workout Templates, selected main compounds,
            weekly volume targets, rep range style, and Superset Groups.
          </p>

          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <GenerateSummaryField label="Frequency" value={summary?.trainingFrequency ?? "Ready"} />
            <GenerateSummaryField label="Split" value={summary?.split ?? "Ready"} />
            <GenerateSummaryField label="Rep ranges" value={summary?.repRanges ?? "Ready"} />
            <GenerateSummaryField label="Volume" value={summary?.volumePreset ?? "Ready"} />
          </dl>

          <StepActions className="mt-6">
            <Button asChild variant="outline">
              <Link to={planBuilderPaths.exercises}>Back to Exercises</Link>
            </Button>
            <Button
              disabled={isGenerating}
              onClick={() => {
                void onGenerateTrainingPlan();
              }}
              type="button"
              variant="builderPrimary"
            >
              <Wand2 aria-hidden="true" size={18} strokeWidth={2} />
              {isGenerating ? "Generating..." : "Generate Training Plan"}
            </Button>
          </StepActions>
        </StepPanel>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <PlanBuilderStepStatusCard
          body="Generation creates a new Active Training Plan. The Plan Blueprint stays available for later edits."
          title="Generation"
          titleDisplay="visible"
        />
        <PlanBuilderStepStatusCard
          body="Workout Templates use Superset Groups by default, with selected compounds and concrete default exercises where details are still configurable later."
          title="Template shape"
          titleDisplay="visible"
        />
      </div>
    </div>
  );
}

function GenerateSummaryField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-stone-900/10 bg-white/70 px-4 py-3">
      <dt className="text-xs font-semibold uppercase text-stone-500">{label}</dt>
      <dd className="mt-1 font-semibold text-stone-950">{value}</dd>
    </div>
  );
}
