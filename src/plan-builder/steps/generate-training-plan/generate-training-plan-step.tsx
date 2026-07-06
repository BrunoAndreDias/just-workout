import { Wand2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../../../design-system/button";
import { StepActions, StepPanel } from "../../../design-system/step-screen";
import type { TrainingPlanDraft } from "../../../training-plan";
import { parsePositiveBodyweight } from "../../../training-plan/bodyweight-input";
import {
  hasBodyweightLoadExercise,
  isBodyweightLoadExercise,
} from "../../../training-plan/bodyweight-load";
import { getExerciseCatalogExercise } from "../../exercise-catalog";
import { getEquipmentPreset } from "../../exercise-selection-preferences";
import {
  getRepRangeStyle,
  type PlanBlueprintDefaultResolution,
  type PlanBlueprintRecommendedDefault,
  type PlanBlueprintSummary,
} from "../../plan-blueprint";
import { PlanBuilderStepStatusCard } from "../../shared-ui/step-status-card/step-status-card";
import { getTrainingSplitLabel } from "../../training-split";
import { getVolumePreset } from "../../training-volume";
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
  blockingIssues?: PlanBlueprintDefaultResolution["blockingIssues"];
  isGenerating: boolean;
  onAcceptDraft: () => Promise<void>;
  onGenerateTrainingPlan: () => Promise<void>;
  onResetDraft: () => Promise<void>;
  onSaveDraft: (draft: TrainingPlanDraft) => Promise<void>;
  recommendedDefaultsConfirmation?: RecommendedDefaultsConfirmationProps | null;
  summary: PlanBlueprintSummary | null;
  trainingPlanDraft: TrainingPlanDraft | null;
};

const generateStepPreferenceMappingCopy =
  "The Generate Step turns your Exercises Step preferences into final Main Compound Selections, Main Compound Rotation Pools, and generated accessory choices.";

const defaultGenerationPreferenceMappingCopy =
  "The Generate Step will turn your Exercises Step preferences into final Main Compound Selections, Main Compound Rotation Pools, and generated accessory choices.";

export function GenerateTrainingPlanStep(props: GenerateTrainingPlanStepProps) {
  const {
    blockingIssues = [],
    isGenerating,
    onAcceptDraft,
    onGenerateTrainingPlan,
    onResetDraft,
    onSaveDraft,
    recommendedDefaultsConfirmation,
    summary,
    trainingPlanDraft,
  } = props;

  if (shouldShowTrainingPlanDraftReviewPrototype()) {
    return <TrainingPlanDraftReviewPrototype summary={summary} />;
  }

  if (trainingPlanDraft) {
    return (
      <TrainingPlanDraftReview
        isAccepting={isGenerating}
        onAcceptDraft={onAcceptDraft}
        onResetDraft={onResetDraft}
        onSaveDraft={onSaveDraft}
        summary={summary}
        trainingPlanDraft={trainingPlanDraft}
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
  onSaveDraft,
  summary,
  trainingPlanDraft,
}: {
  isAccepting: boolean;
  onAcceptDraft: () => Promise<void>;
  onResetDraft: () => Promise<void>;
  onSaveDraft: (draft: TrainingPlanDraft) => Promise<void>;
  summary: PlanBlueprintSummary | null;
  trainingPlanDraft: TrainingPlanDraft;
}) {
  const [editableLoadValues, setEditableLoadValues] = useState<Record<string, string>>({});
  const [baselineBodyweightInput, setBaselineBodyweightInput] = useState("");
  const draftExercises = trainingPlanDraft.content.workoutTemplates.flatMap((template) =>
    template.supersetGroups.flatMap((group) => group.slots),
  );
  const requiresBodyweight = hasBodyweightLoadExercise(draftExercises);

  useEffect(() => {
    setEditableLoadValues(
      Object.fromEntries(
        (trainingPlanDraft.content.startingLoadSuggestions ?? []).map((suggestion) => [
          suggestion.exerciseId,
          formatEditableLoad(suggestion.userEditedLoad ?? suggestion.suggestedLoad),
        ]),
      ),
    );
    setBaselineBodyweightInput(trainingPlanDraft.content.baselineBodyweight?.toString() ?? "");
  }, [trainingPlanDraft]);

  return (
    <div className="grid gap-4">
      <StepPanel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-stone-950 sm:text-2xl">Training Plan Draft</h3>
            <p className="mt-3 max-w-3xl text-sm text-stone-600">
              Review the generated Workout Templates, Superset Groups, exercise slots, and Training
              Prescriptions before creating the Active Training Plan.
            </p>
          </div>
          <StepActions>
            <Button
              disabled={isAccepting}
              onClick={() => {
                void onResetDraft();
              }}
              type="button"
              variant="outline"
            >
              Reset Draft
            </Button>
            <Button
              disabled={isAccepting}
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

        {requiresBodyweight ? (
          <section className="mt-5 rounded-2xl border border-stone-900/10 bg-white/70 p-4">
            <h4 className="text-base font-black text-stone-950">Baseline Bodyweight</h4>
            <p className="mt-2 text-sm text-stone-600">
              Store known bodyweight so bodyweight exercise load volume has a usable default after
              acceptance.
            </p>
            <label className="mt-3 block text-sm font-medium text-stone-700">
              <span>Baseline Bodyweight</span>
              <input
                aria-label="Baseline Bodyweight"
                className="mt-2 w-full rounded-xl border border-stone-900/15 bg-white px-3 py-2"
                inputMode="decimal"
                min={0}
                onChange={(event) => {
                  setBaselineBodyweightInput(event.currentTarget.value);
                }}
                onBlur={() => {
                  void onSaveDraft({
                    content: {
                      ...trainingPlanDraft.content,
                      baselineBodyweight: parsePositiveBodyweight(baselineBodyweightInput),
                    },
                  });
                }}
                step={0.1}
                type="number"
                value={baselineBodyweightInput}
              />
            </label>
            {trainingPlanDraft.content.baselineBodyweight ? null : (
              <p className="mt-2 text-sm text-amber-800">
                Missing Baseline Bodyweight: bodyweight exercise volume will stay partial until you
                set it here or later on the Training surface.
              </p>
            )}
          </section>
        ) : null}
      </StepPanel>

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
                        <DraftStartingLoadEditor
                          loadInputValue={editableLoadValues[slot.exerciseId] ?? ""}
                          onInputChange={(nextValue, options) => {
                            setEditableLoadValues((currentValues) => ({
                              ...currentValues,
                              [slot.exerciseId]: nextValue,
                            }));

                            if (options?.persist === false) {
                              return;
                            }

                            void onSaveDraft({
                              content: {
                                ...trainingPlanDraft.content,
                                startingLoadSuggestions: (
                                  trainingPlanDraft.content.startingLoadSuggestions ?? []
                                ).map((suggestion) =>
                                  suggestion.exerciseId === slot.exerciseId
                                    ? {
                                        ...suggestion,
                                        userEditedLoad: parseEditableLoad({
                                          isBodyweightExercise: isBodyweightLoadExercise(slot),
                                          value: nextValue,
                                        }),
                                      }
                                    : suggestion,
                                ),
                              },
                            });
                          }}
                          slot={slot}
                          trainingPlanDraft={trainingPlanDraft}
                        />
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

function DraftStartingLoadEditor({
  loadInputValue,
  onInputChange,
  slot,
  trainingPlanDraft,
}: {
  loadInputValue: string;
  onInputChange: (value: string, options?: { persist?: boolean }) => void;
  slot: NonNullable<
    TrainingPlanDraft["content"]["workoutTemplates"][number]["supersetGroups"][number]["slots"][number]
  >;
  trainingPlanDraft: TrainingPlanDraft;
}) {
  const loadSuggestion = trainingPlanDraft.content.startingLoadSuggestions?.find(
    (suggestion) => suggestion.exerciseId === slot.exerciseId,
  );

  if (!loadSuggestion) {
    return null;
  }

  return (
    <div className="mt-3 grid gap-1 text-sm text-stone-600">
      <span>Previous load: {formatLoad(loadSuggestion.previousLoad)}</span>
      <span>Suggested start: {formatLoad(loadSuggestion.suggestedLoad)}</span>
      <span>{loadSuggestion.reason}</span>
      <label className="mt-1 block font-medium text-stone-700">
        <span>Suggested starting load for {slot.exerciseName}</span>
        <input
          aria-label={`Suggested starting load for ${slot.exerciseName}`}
          className="mt-2 w-full rounded-xl border border-stone-900/15 bg-white px-3 py-2"
          inputMode="decimal"
          min={isBodyweightLoadExercise(slot) ? -200 : 0}
          onBlur={() => onInputChange(loadInputValue)}
          onChange={(event) => onInputChange(event.currentTarget.value, { persist: false })}
          step={2.5}
          type="number"
          value={loadInputValue}
        />
      </label>
      {loadSuggestion.userEditedLoad === null ? null : (
        <span>Edited start: {formatLoad(loadSuggestion.userEditedLoad)}</span>
      )}
    </div>
  );
}

function formatLoad(load: number | null): string {
  return load === null ? "No previous load" : `${load} kg`;
}

function formatEditableLoad(load: number | null): string {
  return load === null ? "" : String(load);
}

function parseEditableLoad({
  isBodyweightExercise,
  value,
}: {
  isBodyweightExercise: boolean;
  value: string;
}): number | null {
  if (value.trim() === "") {
    return null;
  }

  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return null;
  }

  if (!isBodyweightExercise && parsedValue < 0) {
    return null;
  }

  return parsedValue;
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
