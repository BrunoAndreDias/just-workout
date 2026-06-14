import { Link } from "@tanstack/react-router";
import { Wand2 } from "lucide-react";
import { Button } from "../../design-system/button";
import { StepActions, StepPanel } from "../../design-system/step-screen";
import { PlanBuilderStepStatusCard } from "../components/plan-builder-page";
import { getEquipmentPreset } from "../exercise-selection-preferences";
import type {
  PlanBlueprintDefaultResolution,
  PlanBlueprintRecommendedDefault,
  PlanBlueprintSummary,
} from "../plan-blueprint";
import { getRepRangeStyle } from "../plan-blueprint";
import { planBuilderPaths } from "../plan-builder-paths";
import { getTrainingSplitLabel } from "../training-split";
import { getVolumePreset } from "../training-volume";

type GenerateTrainingPlanStepProps = {
  isGenerating: boolean;
  onAcceptRecommendedDefaults: (resolution: PlanBlueprintDefaultResolution) => Promise<void>;
  onCancelRecommendedDefaults: () => void;
  onGenerateTrainingPlan: () => Promise<void>;
  pendingDefaultResolution: PlanBlueprintDefaultResolution | null;
  summary: PlanBlueprintSummary | null;
};

export function GenerateTrainingPlanStep({
  isGenerating,
  onAcceptRecommendedDefaults,
  onCancelRecommendedDefaults,
  onGenerateTrainingPlan,
  pendingDefaultResolution,
  summary,
}: GenerateTrainingPlanStepProps) {
  return (
    <>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-start">
        <div className="min-w-0 space-y-4">
          <StepPanel>
            <h3 className="text-xl font-black text-stone-950 sm:text-2xl">
              Generate Training Plan
            </h3>
            <p className="mt-3 max-w-2xl text-sm text-stone-600">
              Just Workout will create an active Training Plan from this completed Plan Blueprint.
              The first generated plan uses split-derived Workout Templates, selected main
              compounds, weekly volume targets, rep range style, and Superset Groups.
            </p>

            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
              <GenerateSummaryField
                label="Frequency"
                value={summary?.trainingFrequency ?? "Ready"}
              />
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

      {pendingDefaultResolution ? (
        <DefaultGenerationConfirmation
          isGenerating={isGenerating}
          onAcceptRecommendedDefaults={onAcceptRecommendedDefaults}
          onCancelRecommendedDefaults={onCancelRecommendedDefaults}
          resolution={pendingDefaultResolution}
        />
      ) : null}
    </>
  );
}

function DefaultGenerationConfirmation({
  isGenerating,
  onAcceptRecommendedDefaults,
  onCancelRecommendedDefaults,
  resolution,
}: {
  isGenerating: boolean;
  onAcceptRecommendedDefaults: (resolution: PlanBlueprintDefaultResolution) => Promise<void>;
  onCancelRecommendedDefaults: () => void;
  resolution: PlanBlueprintDefaultResolution;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/45 p-4">
      <div
        aria-labelledby="default-generation-confirmation-title"
        aria-modal="true"
        className="w-full max-w-xl rounded-3xl border border-stone-900/10 bg-[#fcfaf6] p-6 shadow-[0_24px_80px_rgba(28,25,23,0.26)]"
        role="dialog"
      >
        <StepPanel>
          <h3
            className="text-xl font-black text-stone-950 sm:text-2xl"
            id="default-generation-confirmation-title"
          >
            Default Generation Confirmation
          </h3>
          <p className="mt-3 text-sm text-stone-600">
            Just Workout will apply these Recommended Defaults before generation continues.
          </p>

          <ul className="mt-5 space-y-3 text-sm text-stone-900">
            {resolution.recommendedDefaults.map((recommendedDefault) => (
              <li
                className="rounded-2xl border border-stone-900/10 bg-white/85 px-4 py-3"
                key={getRecommendedDefaultKey(recommendedDefault)}
              >
                {getRecommendedDefaultLabel(recommendedDefault)}
              </li>
            ))}
          </ul>

          <StepActions className="mt-6">
            <Button
              disabled={isGenerating}
              onClick={onCancelRecommendedDefaults}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={isGenerating}
              onClick={() => {
                void onAcceptRecommendedDefaults(resolution);
              }}
              type="button"
              variant="builderPrimary"
            >
              <Wand2 aria-hidden="true" size={18} strokeWidth={2} />
              {isGenerating ? "Generating..." : "Generate with Recommended Defaults"}
            </Button>
          </StepActions>
        </StepPanel>
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

function getRecommendedDefaultKey(recommendedDefault: PlanBlueprintRecommendedDefault) {
  switch (recommendedDefault.kind) {
    case "training_split":
      return `${recommendedDefault.kind}-${recommendedDefault.split}`;
    case "rep_range_style":
      return `${recommendedDefault.kind}-${recommendedDefault.repRangeStyle}`;
    case "training_volume":
      return `${recommendedDefault.kind}-${recommendedDefault.volumePreset}`;
    case "equipment_preset":
      return `${recommendedDefault.kind}-${recommendedDefault.equipmentPreset}`;
  }
}

function getRecommendedDefaultLabel(recommendedDefault: PlanBlueprintRecommendedDefault) {
  switch (recommendedDefault.kind) {
    case "training_split":
      return getTrainingSplitLabel(recommendedDefault.split);
    case "rep_range_style":
      return getRepRangeStyle(recommendedDefault.repRangeStyle).title;
    case "training_volume":
      return `${getVolumePreset(recommendedDefault.volumePreset).title} volume preset`;
    case "equipment_preset":
      return `${getEquipmentPreset(recommendedDefault.equipmentPreset).title} equipment preset`;
  }
}
