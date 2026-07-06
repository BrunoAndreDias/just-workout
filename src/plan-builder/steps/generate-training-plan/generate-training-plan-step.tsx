import { Wand2 } from "lucide-react";
import { Button } from "../../../design-system/button";
import { StepActions, StepPanel } from "../../../design-system/step-screen";
import type { TrainingPlanDraft } from "../../../training-plan";
import { getExerciseCatalogExercise } from "../../exercise-catalog";
import { getEquipmentPreset } from "../../exercise-selection-preferences";
import {
  OnePageRepRangeStep,
  OnePageTrainingScheduleStep,
  OnePageVolumeStep,
} from "../../one-page/one-page-step-panels";
import {
  getRepRangeStyle,
  type PlanBlueprint,
  type PlanBlueprintDefaultResolution,
  type PlanBlueprintRecommendedDefault,
  type PlanBlueprintSummary,
  type RepRangeStyle,
} from "../../plan-blueprint";
import { PlanBuilderStepStatusCard } from "../../shared-ui/step-status-card/step-status-card";
import { getTrainingSplitLabel, type TrainingSplitId } from "../../training-split";
import {
  getVolumePreset,
  type OptionalVolumeMuscleGroupId,
  type VolumePresetId,
} from "../../training-volume";
import { formatMovementPatternLabel } from "../../weekly-movement-coverage";
import {
  shouldShowTrainingPlanDraftReviewPrototype,
  TrainingPlanDraftReviewPrototype,
} from "./prototype-training-plan-draft-review";

type RecommendedDefaultsConfirmationProps = {
  onAcceptRecommendedDefaults: (resolution: PlanBlueprintDefaultResolution) => Promise<void>;
  onCancelRecommendedDefaults: () => void;
  resolution: PlanBlueprintDefaultResolution;
};

type GenerateTrainingPlanStepProps = {
  blueprint?: PlanBlueprint | null;
  blockingIssues?: PlanBlueprintDefaultResolution["blockingIssues"];
  isGenerating: boolean;
  onAcceptDraft: () => Promise<void>;
  onGenerateTrainingPlan: () => Promise<void>;
  onOptionalVolumeTargetToggle?: (
    muscleGroup: OptionalVolumeMuscleGroupId,
    isEnabled: boolean,
  ) => void;
  onRepRangeStyleChange?: (repRangeStyle: PlanBlueprint["repRanges"] & string) => void;
  onResetDraft?: () => Promise<void>;
  onTrainingFrequencyChange?: (
    trainingFrequencyDaysPerWeek: PlanBlueprint["trainingFrequencyDaysPerWeek"],
  ) => void;
  onTrainingSplitChange?: (split: TrainingSplitId) => void;
  onVolumePresetChange?: (volumePreset: VolumePresetId) => void;
  repRangeStyle?: RepRangeStyle | null;
  recommendedDefaultsConfirmation?: RecommendedDefaultsConfirmationProps | null;
  savedRepRangeStyleId?: PlanBlueprint["repRanges"];
  summary: PlanBlueprintSummary | null;
  trainingPlanDraft: TrainingPlanDraft | null;
  visibleTrainingSplitId?: TrainingSplitId | null;
};

type DraftGenerationInputProps = {
  blueprint: PlanBlueprint | null;
  onOptionalVolumeTargetToggle?: (
    muscleGroup: OptionalVolumeMuscleGroupId,
    isEnabled: boolean,
  ) => void;
  onRepRangeStyleChange?: (repRangeStyle: PlanBlueprint["repRanges"] & string) => void;
  onTrainingFrequencyChange?: (
    trainingFrequencyDaysPerWeek: PlanBlueprint["trainingFrequencyDaysPerWeek"],
  ) => void;
  onTrainingSplitChange?: (split: TrainingSplitId) => void;
  onVolumePresetChange?: (volumePreset: VolumePresetId) => void;
  repRangeStyle: RepRangeStyle | null;
  savedRepRangeStyleId: PlanBlueprint["repRanges"] | null;
  visibleTrainingSplitId: TrainingSplitId | null;
};

type TrainingPlanDraftReviewProps = DraftGenerationInputProps & {
  isAccepting: boolean;
  onAcceptDraft: () => Promise<void>;
  onResetDraft?: () => Promise<void>;
  summary: PlanBlueprintSummary | null;
  trainingPlanDraft: TrainingPlanDraft;
};

const generateStepPreferenceMappingCopy =
  "The Generate Step turns your Exercises Step preferences into final Main Compound Selections, Main Compound Rotation Pools, and generated accessory choices.";

const defaultGenerationPreferenceMappingCopy =
  "The Generate Step will turn your Exercises Step preferences into final Main Compound Selections, Main Compound Rotation Pools, and generated accessory choices.";

export function GenerateTrainingPlanStep(props: GenerateTrainingPlanStepProps) {
  const {
    blockingIssues = [],
    blueprint,
    isGenerating,
    onAcceptDraft,
    onGenerateTrainingPlan,
    onOptionalVolumeTargetToggle,
    onRepRangeStyleChange,
    onResetDraft,
    onTrainingFrequencyChange,
    onTrainingSplitChange,
    onVolumePresetChange,
    repRangeStyle,
    recommendedDefaultsConfirmation,
    savedRepRangeStyleId,
    summary,
    trainingPlanDraft,
    visibleTrainingSplitId,
  } = props;

  if (shouldShowTrainingPlanDraftReviewPrototype()) {
    return <TrainingPlanDraftReviewPrototype summary={summary} />;
  }

  if (trainingPlanDraft) {
    return (
      <TrainingPlanDraftReview
        blueprint={blueprint ?? null}
        isAccepting={isGenerating}
        onAcceptDraft={onAcceptDraft}
        onOptionalVolumeTargetToggle={onOptionalVolumeTargetToggle}
        onRepRangeStyleChange={onRepRangeStyleChange}
        onResetDraft={onResetDraft}
        onTrainingFrequencyChange={onTrainingFrequencyChange}
        onTrainingSplitChange={onTrainingSplitChange}
        onVolumePresetChange={onVolumePresetChange}
        repRangeStyle={repRangeStyle ?? null}
        savedRepRangeStyleId={savedRepRangeStyleId ?? null}
        summary={summary}
        trainingPlanDraft={trainingPlanDraft}
        visibleTrainingSplitId={visibleTrainingSplitId ?? null}
      />
    );
  }

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-start">
        <div className="min-w-0 space-y-4">
          <StepPanel>
            <h3 className="text-xl font-black text-stone-950 sm:text-2xl">
              Generate Training Plan
            </h3>
            <p className="mt-3 max-w-2xl text-sm text-stone-600">
              {generateStepPreferenceMappingCopy} Just Workout will create an active Training Plan
              from this completed Plan Blueprint using split-derived Workout Templates, weekly
              volume targets, rep range style, and Superset Groups.
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
              <Button
                disabled={isGenerating || blockingIssues.length > 0}
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

            {blockingIssues.length > 0 ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                <p className="font-semibold">Generation is blocked.</p>
                <p className="mt-2">
                  Exercise Selection Preferences are hard exclusions. Just Workout will not generate
                  an avoided exercise.
                </p>
                <ul className="mt-2 space-y-2">
                  {blockingIssues.map((issue) => (
                    <li key={`${issue.kind}-${issue.movementPattern}`}>{issue.message}</li>
                  ))}
                </ul>
              </div>
            ) : null}
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

      {recommendedDefaultsConfirmation ? (
        <DefaultGenerationConfirmation
          isGenerating={isGenerating}
          onAcceptRecommendedDefaults={recommendedDefaultsConfirmation.onAcceptRecommendedDefaults}
          onCancelRecommendedDefaults={recommendedDefaultsConfirmation.onCancelRecommendedDefaults}
          resolution={recommendedDefaultsConfirmation.resolution}
        />
      ) : null}
    </>
  );
}

function TrainingPlanDraftReview({
  isAccepting,
  onAcceptDraft,
  onResetDraft,
  summary,
  trainingPlanDraft,
  ...draftGenerationInputs
}: TrainingPlanDraftReviewProps) {
  const isStale = trainingPlanDraft.isStale === true;

  return (
    <div className="grid gap-4">
      <TrainingPlanDraftReviewHeader
        isAccepting={isAccepting}
        isStale={isStale}
        onAcceptDraft={onAcceptDraft}
        onResetDraft={onResetDraft}
        summary={summary}
        trainingPlanDraft={trainingPlanDraft}
      />

      <DraftGenerationInputs {...draftGenerationInputs} />

      <div className="grid gap-4">
        {trainingPlanDraft.content.workoutTemplates.map((template) => (
          <StepPanel key={template.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-lg font-black text-stone-950">{template.label}</h4>
                <p className="text-sm text-stone-600">
                  {template.purpose === "strength" ? "Strength-focused template" : template.purpose}
                </p>
              </div>
              <span className="rounded-full bg-stone-900/5 px-3 py-1 text-xs font-semibold uppercase text-stone-600">
                {template.supersetGroups.length} groups
              </span>
            </div>

            <div className="mt-4 grid gap-4">
              {template.supersetGroups.map((group) => (
                <section
                  aria-label={group.title}
                  className="rounded-2xl border border-stone-900/10 bg-white/70 p-4"
                  key={group.id}
                >
                  <h5 className="text-base font-black text-stone-950">{group.title}</h5>
                  <ul className="mt-3 space-y-3">
                    {group.slots.map((slot) => (
                      <li
                        className="rounded-xl border border-stone-900/10 bg-stone-50/80 p-3"
                        key={`${group.id}-${slot.exerciseId}-${slot.slotLabel}`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <strong className="text-sm text-stone-950">{slot.exerciseName}</strong>
                          <span className="text-xs font-semibold uppercase text-stone-500">
                            {slot.slotLabel}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-600">
                          <span>{slot.role}</span>
                          <span>
                            {formatTrainingPlanDraftMovementPattern(slot.movementPattern)}
                          </span>
                          <span>
                            {slot.trainingPrescription
                              ? `${slot.trainingPrescription.setCount} × ${slot.trainingPrescription.repRange.min}–${slot.trainingPrescription.repRange.max}`
                              : "Prescription pending"}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </StepPanel>
        ))}
      </div>
    </div>
  );
}

function TrainingPlanDraftReviewHeader({
  isAccepting,
  isStale,
  onAcceptDraft,
  onResetDraft,
  summary,
  trainingPlanDraft,
}: {
  isAccepting: boolean;
  isStale: boolean;
  onAcceptDraft: () => Promise<void>;
  onResetDraft?: () => Promise<void>;
  summary: PlanBlueprintSummary | null;
  trainingPlanDraft: TrainingPlanDraft;
}) {
  return (
    <StepPanel>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-black text-stone-950 sm:text-2xl">Training Plan Draft</h3>
          <p className="mt-3 max-w-3xl text-sm text-stone-600">
            Review the generated Workout Templates, Superset Groups, exercise slots, and Training
            Prescriptions before creating the Active Training Plan.
          </p>
          {isStale ? (
            <p className="mt-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
              Stale Builder Output. Reset Draft to regenerate from your current Plan Builder choices
              before accepting it.
            </p>
          ) : null}
        </div>
        <StepActions>
          {onResetDraft ? (
            <Button
              disabled={isAccepting}
              onClick={() => {
                void onResetDraft();
              }}
              type="button"
              variant="secondary"
            >
              Reset Draft
            </Button>
          ) : null}
          <Button
            disabled={isAccepting || isStale}
            onClick={() => {
              void onAcceptDraft();
            }}
            type="button"
            variant="builderPrimary"
          >
            {isAccepting ? "Accepting..." : "Accept Draft"}
          </Button>
        </StepActions>
      </div>

      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
        <GenerateSummaryField label="Frequency" value={summary?.trainingFrequency ?? "Ready"} />
        <GenerateSummaryField label="Split" value={trainingPlanDraft.content.split} />
        <GenerateSummaryField
          label="Rep ranges"
          value={summary?.repRanges ?? trainingPlanDraft.content.repRangeStyle}
        />
        <GenerateSummaryField
          label="Templates"
          value={String(trainingPlanDraft.content.workoutTemplates.length)}
        />
      </dl>
    </StepPanel>
  );
}

function DraftGenerationInputs({
  blueprint,
  onOptionalVolumeTargetToggle,
  onRepRangeStyleChange,
  onTrainingFrequencyChange,
  onTrainingSplitChange,
  onVolumePresetChange,
  repRangeStyle,
  savedRepRangeStyleId,
  visibleTrainingSplitId,
}: DraftGenerationInputProps) {
  if (
    !blueprint ||
    !onTrainingFrequencyChange ||
    !onTrainingSplitChange ||
    !onRepRangeStyleChange ||
    !onVolumePresetChange ||
    !onOptionalVolumeTargetToggle ||
    !repRangeStyle ||
    !visibleTrainingSplitId
  ) {
    return null;
  }

  return (
    <div className="grid gap-4">
      <StepPanel>
        <h4 className="text-lg font-black text-stone-950">Generation inputs</h4>
        <p className="mt-2 text-sm text-stone-600">
          Edit the upstream Plan Builder choices here. These changes update the Plan Builder and can
          make the current draft stale until you reset it.
        </p>
        <div className="mt-5 grid gap-6">
          <OnePageTrainingScheduleStep
            blueprint={blueprint}
            onTrainingFrequencyChange={onTrainingFrequencyChange}
            onTrainingSplitChange={onTrainingSplitChange}
            selectedTrainingSplitId={visibleTrainingSplitId}
          />
          <OnePageRepRangeStep
            onRepRangeStyleChange={onRepRangeStyleChange}
            savedRepRangeStyleId={savedRepRangeStyleId}
            selectedRepRangeStyle={repRangeStyle}
          />
          <OnePageVolumeStep
            blueprint={blueprint}
            onOptionalVolumeTargetToggle={onOptionalVolumeTargetToggle}
            onVolumePresetChange={onVolumePresetChange}
            repRangeStyle={repRangeStyle}
          />
        </div>
      </StepPanel>
    </div>
  );
}

function DefaultGenerationConfirmation({
  isGenerating,
  onAcceptRecommendedDefaults,
  onCancelRecommendedDefaults,
  resolution,
}: {
  isGenerating: boolean;
  onAcceptRecommendedDefaults: RecommendedDefaultsConfirmationProps["onAcceptRecommendedDefaults"];
  onCancelRecommendedDefaults: RecommendedDefaultsConfirmationProps["onCancelRecommendedDefaults"];
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
          <p className="mt-2 text-sm text-stone-600">{defaultGenerationPreferenceMappingCopy}</p>

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
    case "main_compound_selection":
      return `${recommendedDefault.kind}-${recommendedDefault.movementPattern}-${recommendedDefault.exerciseId}`;
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
    case "main_compound_selection":
      return getMainCompoundSelectionRecommendedDefaultLabel(recommendedDefault);
  }
}

function getMainCompoundSelectionRecommendedDefaultLabel(
  recommendedDefault: Extract<PlanBlueprintRecommendedDefault, { kind: "main_compound_selection" }>,
): string {
  const exerciseName =
    getExerciseCatalogExercise(recommendedDefault.exerciseId)?.name ?? "Main compound";

  return `Recommended Default Main Compound Selection for ${formatMovementPatternLabel(recommendedDefault.movementPattern)}: ${exerciseName}`;
}

function formatTrainingPlanDraftMovementPattern(movementPattern: string): string {
  if (
    movementPattern === "horizontal_push" ||
    movementPattern === "horizontal_pull" ||
    movementPattern === "vertical_push" ||
    movementPattern === "vertical_pull" ||
    movementPattern === "quad_dominant" ||
    movementPattern === "hip_hamstring_dominant"
  ) {
    return formatMovementPatternLabel(movementPattern);
  }

  return movementPattern
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
