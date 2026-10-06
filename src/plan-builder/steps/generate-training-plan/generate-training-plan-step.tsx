import { ChevronRight, Wand2 } from "lucide-react";
import {
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Button } from "../../../design-system/button";
import { StepPanel } from "../../../design-system/step-screen";
import type {
  TrainingPlanDraft,
  TrainingPlanDraftSetupUpdate,
  WorkoutTemplatePurpose,
} from "../../../training-plan";
import { parsePositiveBodyweight } from "../../../training-plan/bodyweight-input";
import { isBodyweightLoadExercise } from "../../../training-plan/bodyweight-load";
import { requiresSessionBodyweight } from "../../../training-plan/session-bodyweight";
import { getTrainingBlockExerciseSwapChoices } from "../../../training-plan/training-block";
import type { PlanBuilderStep } from "../../builder-state/plan-builder-config";
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
import {
  PlanBuilderStepHeader,
  PlanBuilderStepSection,
} from "../../shared-ui/step-layout/plan-builder-step-layout";
import { getTrainingSplitLabel, type TrainingSplitId } from "../../training-split";
import {
  getVolumePreset,
  type OptionalVolumeMuscleGroupId,
  type VolumePresetId,
} from "../../training-volume";
import { formatMovementPatternLabel } from "../../weekly-movement-coverage";
import "./generate-training-plan-step.css";

type RecommendedDefaultsConfirmationProps = {
  onAcceptRecommendedDefaults: (resolution: PlanBlueprintDefaultResolution) => Promise<void>;
  onCancelRecommendedDefaults: () => void;
  resolution: PlanBlueprintDefaultResolution;
};

type GenerateChoiceSummary = {
  isConfigured: boolean;
  step: PlanBuilderStep;
  title: string;
  value: string;
};

type GenerateTrainingPlanStepProps = {
  blockingIssues?: PlanBlueprintDefaultResolution["blockingIssues"];
  choiceSummaries?: ReadonlyArray<GenerateChoiceSummary>;
  draftActions: TrainingPlanDraftActions;
  generationInputs: DraftGenerationInputProps;
  isGenerating: boolean;
  onEditStep?: (step: PlanBuilderStep) => void;
  onGenerateTrainingPlan: () => Promise<void>;
  pendingDraftAction?: PendingTrainingPlanDraftAction;
  recommendedDefaultsConfirmation?: RecommendedDefaultsConfirmationProps | null;
  summary: PlanBlueprintSummary | null;
  trainingPlanDraft: TrainingPlanDraft | null;
};

type DraftGenerationInputProps = {
  blueprint: PlanBlueprint;
  onOptionalVolumeTargetToggle: (
    muscleGroup: OptionalVolumeMuscleGroupId,
    isEnabled: boolean,
  ) => void;
  onRepRangeStyleChange: (repRangeStyle: PlanBlueprint["repRanges"] & string) => void;
  onTrainingFrequencyChange: (
    trainingFrequencyDaysPerWeek: PlanBlueprint["trainingFrequencyDaysPerWeek"],
  ) => void;
  onTrainingSplitChange: (split: TrainingSplitId) => void;
  onVolumePresetChange: (volumePreset: VolumePresetId) => void;
  repRangeStyle: RepRangeStyle;
  savedRepRangeStyleId: PlanBlueprint["repRanges"] | null;
  visibleTrainingSplitId: TrainingSplitId;
};

export type PendingTrainingPlanDraftAction = "accept" | "discard" | "reset" | "save-setup" | null;

type TrainingPlanDraftActions = {
  addDraftSlot: (templateId: string, groupId: string) => void;
  acceptDraft: () => Promise<void>;
  addSupersetGroup: (templateId: string, targetIndex: number) => void;
  deleteDraftSlot: (templateId: string, groupId: string, slotIndex: number) => void;
  deleteSupersetGroup: (templateId: string, groupId: string) => void;
  discardDraft: () => Promise<void>;
  moveWorkoutTemplate: (templateId: string, targetIndex: number) => void;
  moveDraftSlotToSupersetGroup: (
    templateId: string,
    sourceGroupId: string,
    slotIndex: number,
    targetGroupId: string,
    targetSlotIndex: number,
  ) => void;
  reorderDraftSlot: (
    templateId: string,
    groupId: string,
    slotIndex: number,
    targetSlotIndex: number,
  ) => void;
  moveSupersetGroup: (templateId: string, groupId: string, targetIndex: number) => void;
  renameWorkoutTemplate: (templateId: string, label: string) => void;
  renameSupersetGroup: (templateId: string, groupId: string, title: string) => void;
  replaceDraftSlotExercise: (
    templateId: string,
    groupId: string,
    slotIndex: number,
    exerciseId: string,
  ) => void;
  replaceWorkoutTemplateWithCustomFocus: (templateId: string) => void;
  resetDraft: () => Promise<void>;
  saveDraftSetup: (update: TrainingPlanDraftSetupUpdate) => Promise<void>;
  updateDraftSlotTrainingPrescription: (update: TrainingPlanDraftSlotPrescriptionUpdate) => void;
  setWorkoutTemplatePurpose: (templateId: string, purpose: WorkoutTemplatePurpose) => void;
};

type TrainingPlanDraftSlotPrescriptionUpdate = {
  groupId: string;
  repTargetMax: number;
  repTargetMin: number;
  setCount: number;
  slotIndex: number;
  templateId: string;
};

type TrainingPlanDraftSlot =
  TrainingPlanDraft["content"]["workoutTemplates"][number]["supersetGroups"][number]["slots"][number];

const trainingBlockProgressionCopy =
  "Each Training Block runs 6 weeks: week 1 starts easy at 4-5 Reps In Reserve, then effort builds each week until week 6 reaches 1 RIR on compound lifts and 0 RIR on isolation exercises.";

const defaultGenerationPreferenceMappingCopy =
  "The Generate Step will turn your Exercises Step preferences into final Main Compound Selections, Main Compound Rotation Pools, and generated accessory choices.";

export function GenerateTrainingPlanStep(props: GenerateTrainingPlanStepProps) {
  const {
    blockingIssues = [],
    choiceSummaries = [],
    draftActions,
    generationInputs,
    isGenerating,
    onEditStep,
    onGenerateTrainingPlan,
    pendingDraftAction = null,
    recommendedDefaultsConfirmation,
    summary,
    trainingPlanDraft,
  } = props;
  const [actionError, setActionError] = useState<string | null>(null);

  async function runAction(action: () => Promise<void>, failureMessage: string) {
    setActionError(null);

    try {
      await action();
    } catch (error) {
      setActionError(formatActionError(failureMessage, error));
    }
  }

  const safeDraftActions: TrainingPlanDraftActions = {
    ...draftActions,
    acceptDraft: () =>
      runAction(draftActions.acceptDraft, "Could not accept the Training Plan Draft."),
    discardDraft: () =>
      runAction(draftActions.discardDraft, "Could not discard the Training Plan Draft."),
    resetDraft: () =>
      runAction(draftActions.resetDraft, "Could not reset the Training Plan Draft."),
    saveDraftSetup: (update) =>
      runAction(
        () => draftActions.saveDraftSetup(update),
        "Could not save the Training Plan Draft setup.",
      ),
  };
  const errorAlert = actionError ? <GenerateStepErrorAlert message={actionError} /> : null;

  if (trainingPlanDraft) {
    return (
      <TrainingPlanDraftReview
        draftActions={safeDraftActions}
        errorAlert={errorAlert}
        generationInputs={generationInputs}
        pendingDraftAction={pendingDraftAction}
        summary={summary}
        trainingPlanDraft={trainingPlanDraft}
      />
    );
  }

  const unsetChoiceCount = choiceSummaries.filter((choice) => !choice.isConfigured).length;

  return (
    <>
      <section aria-labelledby="generate-training-plan-title" className="pb-step pb-generate">
        <PlanBuilderStepHeader
          description="Check your choices, then generate. You get a draft to review and edit first; nothing changes until you accept it."
          title="Generate Training Plan"
          titleId="generate-training-plan-title"
        />

        <div className="pb-step__body">
          {choiceSummaries.length > 0 ? (
            <PlanBuilderStepSection
              description={
                unsetChoiceCount > 0
                  ? "Unset choices will use a Recommended Default. You'll see the list before anything is created."
                  : "Everything is set. Change anything before you generate."
              }
              title="Your choices"
            >
              <ul className="pb-generate__choices">
                {choiceSummaries.map((choice) => (
                  <li className="pb-generate__choice" key={choice.step}>
                    <span className="pb-generate__choice-title">{choice.title}</span>
                    <span
                      className="pb-generate__choice-value"
                      data-default={choice.isConfigured ? undefined : "true"}
                    >
                      {choice.isConfigured ? choice.value : "Recommended Default"}
                    </span>
                    {onEditStep ? (
                      <button
                        aria-label={`Edit ${choice.title}`}
                        className="pb-generate__choice-edit"
                        onClick={() => onEditStep(choice.step)}
                        type="button"
                      >
                        Edit
                        <ChevronRight aria-hidden="true" size={15} strokeWidth={2.4} />
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </PlanBuilderStepSection>
          ) : null}

          <PlanBuilderStepSection title="What happens next">
            <ol className="pb-generate__next-steps">
              <li>
                <strong>Draft.</strong> Just Workout builds your workouts, sets and reps from these
                choices.
              </li>
              <li>
                <strong>Review.</strong> Swap exercises and adjust sets and reps until it looks
                right.
              </li>
              <li>
                <strong>Accept.</strong> It becomes your Active Training Plan. Each Training Block
                runs 6 weeks and gets gradually harder.
              </li>
            </ol>
          </PlanBuilderStepSection>

          {blockingIssues.length > 0 ? (
            <div className="pb-generate__blocked" role="alert">
              <p className="pb-generate__blocked-title">Generation is blocked.</p>
              <p>
                Exercise Selection Preferences are hard exclusions. Just Workout will not generate
                an avoided exercise.
              </p>
              <ul>
                {blockingIssues.map((issue) => (
                  <li key={`${issue.kind}-${issue.movementPattern}`}>{issue.message}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {errorAlert}
        </div>

        <footer className="pb-step-footer">
          <div className="pb-step-footer__inner">
            <p className="pb-step-footer__status pb-generate__footer-note">
              {unsetChoiceCount > 0
                ? `${unsetChoiceCount} ${unsetChoiceCount === 1 ? "choice uses" : "choices use"} a Recommended Default`
                : "Ready to generate"}
            </p>
            <button
              className="pb-step-footer__next"
              disabled={isGenerating || blockingIssues.length > 0}
              onClick={() => {
                void runAction(
                  onGenerateTrainingPlan,
                  "Could not generate the Training Plan Draft.",
                );
              }}
              type="button"
            >
              <Wand2 aria-hidden="true" size={18} strokeWidth={2} />
              {isGenerating ? "Generating..." : "Generate Training Plan"}
            </button>
          </div>
        </footer>
      </section>

      {recommendedDefaultsConfirmation ? (
        <DefaultGenerationConfirmation
          isGenerating={isGenerating}
          onAcceptRecommendedDefaults={(resolution) =>
            runAction(
              () => recommendedDefaultsConfirmation.onAcceptRecommendedDefaults(resolution),
              "Could not generate the Training Plan Draft.",
            )
          }
          onCancelRecommendedDefaults={recommendedDefaultsConfirmation.onCancelRecommendedDefaults}
          resolution={recommendedDefaultsConfirmation.resolution}
        />
      ) : null}
    </>
  );
}

function TrainingPlanDraftReview({
  draftActions,
  errorAlert,
  generationInputs,
  pendingDraftAction,
  summary,
  trainingPlanDraft,
}: {
  draftActions: TrainingPlanDraftActions;
  errorAlert: ReactNode;
  generationInputs: DraftGenerationInputProps;
  pendingDraftAction: PendingTrainingPlanDraftAction;
  summary: PlanBlueprintSummary | null;
  trainingPlanDraft: TrainingPlanDraft;
}) {
  const isStale = trainingPlanDraft.isStale === true;
  const [editableLoadValues, setEditableLoadValues] = useState<Record<string, string>>({});
  const [baselineBodyweightInput, setBaselineBodyweightInput] = useState("");
  const requiresBodyweight = requiresSessionBodyweight(trainingPlanDraft.content.workoutTemplates);
  const hasBlockers = trainingPlanDraft.validation.blockers.length > 0;

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
      <TrainingPlanDraftHeader
        baselineBodyweightInput={baselineBodyweightInput}
        draftActions={draftActions}
        errorAlert={errorAlert}
        isStale={isStale}
        onBaselineBodyweightInputChange={setBaselineBodyweightInput}
        pendingDraftAction={pendingDraftAction}
        requiresBodyweight={requiresBodyweight}
        summary={summary}
        trainingPlanDraft={trainingPlanDraft}
      />

      <DraftGenerationInputs {...generationInputs} />

      {trainingPlanDraft.validation.warnings.length > 0 ? (
        <StepPanel>
          <h4 className="text-base font-black text-under-fg">Draft warnings</h4>
          <ul className="mt-3 space-y-2 text-sm text-under-fg">
            {trainingPlanDraft.validation.warnings.map((warning) => (
              <li key={`${warning.kind}-${warning.message}`}>{warning.message}</li>
            ))}
          </ul>
        </StepPanel>
      ) : null}

      {hasBlockers ? (
        <StepPanel>
          <h4 className="text-base font-black text-over-fg">Draft blockers</h4>
          <ul className="mt-3 space-y-2 text-sm text-over-fg">
            {trainingPlanDraft.validation.blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        </StepPanel>
      ) : null}

      <div className="grid gap-4">
        {trainingPlanDraft.content.workoutTemplates.map((template, templateIndex, templates) => (
          <TrainingPlanDraftTemplateCard
            draftActions={draftActions}
            editableLoadValues={editableLoadValues}
            key={template.id}
            onEditableLoadValueChange={setEditableLoadValues}
            template={template}
            templateIndex={templateIndex}
            templatesLength={templates.length}
            trainingPlanDraft={trainingPlanDraft}
          />
        ))}
      </div>
    </div>
  );
}

function TrainingPlanDraftHeader({
  baselineBodyweightInput,
  draftActions,
  errorAlert,
  isStale,
  onBaselineBodyweightInputChange,
  pendingDraftAction,
  requiresBodyweight,
  summary,
  trainingPlanDraft,
}: {
  baselineBodyweightInput: string;
  draftActions: TrainingPlanDraftActions;
  errorAlert: ReactNode;
  isStale: boolean;
  onBaselineBodyweightInputChange: (value: string) => void;
  pendingDraftAction: PendingTrainingPlanDraftAction;
  requiresBodyweight: boolean;
  summary: PlanBlueprintSummary | null;
  trainingPlanDraft: TrainingPlanDraft;
}) {
  const hasBlockers = trainingPlanDraft.validation.blockers.length > 0;

  return (
    <StepPanel>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <TrainingPlanDraftIntro isStale={isStale} />
        <TrainingPlanDraftActions
          draftActions={draftActions}
          hasBlockers={hasBlockers}
          isStale={isStale}
          pendingDraftAction={pendingDraftAction}
        />
      </div>

      {errorAlert}

      <TrainingPlanDraftSummaryFields summary={summary} trainingPlanDraft={trainingPlanDraft} />

      {requiresBodyweight ? (
        <BaselineBodyweightDraftSetup
          baselineBodyweight={trainingPlanDraft.content.baselineBodyweight}
          baselineBodyweightInput={baselineBodyweightInput}
          onBaselineBodyweightInputChange={onBaselineBodyweightInputChange}
          onSaveDraftSetup={draftActions.saveDraftSetup}
        />
      ) : null}
    </StepPanel>
  );
}

function TrainingPlanDraftIntro({ isStale }: { isStale: boolean }) {
  return (
    <div>
      <h3 className="text-xl font-black text-ink sm:text-2xl">Training Plan Draft</h3>
      <p className="mt-3 max-w-3xl text-sm text-muted">
        Review and edit the generated Workout Templates, Superset Groups, exercise slots, and
        Training Prescriptions. Accept the draft to make it your Active Training Plan, or discard it
        to change your setup and generate again.
      </p>
      <p className="mt-2 max-w-3xl text-sm text-muted">{trainingBlockProgressionCopy}</p>
      {isStale ? <TrainingPlanDraftStaleNotice /> : null}
    </div>
  );
}

function TrainingPlanDraftStaleNotice() {
  return (
    <p className="mt-3 rounded-[var(--radius-16)] border border-under/45 bg-under-bg px-4 py-3 text-sm font-semibold text-under-fg">
      Stale Builder Output. Reset Draft to regenerate from your current Plan Builder choices before
      accepting it.
    </p>
  );
}

function TrainingPlanDraftActions({
  draftActions,
  hasBlockers,
  isStale,
  pendingDraftAction,
}: {
  draftActions: TrainingPlanDraftActions;
  hasBlockers: boolean;
  isStale: boolean;
  pendingDraftAction: PendingTrainingPlanDraftAction;
}) {
  const [isConfirmingDiscard, setIsConfirmingDiscard] = useState(false);
  const isBusy = pendingDraftAction !== null;

  if (isConfirmingDiscard) {
    return (
      <fieldset
        aria-label="Confirm discard Training Plan Draft"
        className="m-0 grid w-full min-w-0 max-w-md gap-3 rounded-[var(--radius-16)] border border-over-fg/30 bg-over-bg px-4 py-3 text-sm text-over-fg"
      >
        <p className="font-semibold">
          Discard this draft? Your Plan Builder choices stay, and you can generate a new draft.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={isBusy}
            onClick={() => {
              void draftActions.discardDraft().finally(() => {
                setIsConfirmingDiscard(false);
              });
            }}
            type="button"
            variant="builderPrimary"
          >
            {pendingDraftAction === "discard" ? "Discarding..." : "Yes, discard draft"}
          </Button>
          <Button
            disabled={isBusy}
            onClick={() => {
              setIsConfirmingDiscard(false);
            }}
            type="button"
            variant="outline"
          >
            Keep draft
          </Button>
        </div>
      </fieldset>
    );
  }

  return (
    <div className="flex w-full flex-wrap gap-2 sm:w-auto [&>button]:flex-1 sm:[&>button]:flex-none">
      <Button
        disabled={isBusy}
        onClick={() => {
          setIsConfirmingDiscard(true);
        }}
        type="button"
        variant="outline"
      >
        Discard Draft
      </Button>
      <Button
        disabled={isBusy}
        onClick={() => {
          void draftActions.resetDraft();
        }}
        type="button"
        variant="outline"
      >
        {pendingDraftAction === "reset" ? "Resetting..." : "Reset Draft"}
      </Button>
      <Button
        disabled={isBusy || isStale || hasBlockers}
        onClick={() => {
          void draftActions.acceptDraft();
        }}
        type="button"
        variant="builderPrimary"
      >
        {getAcceptDraftButtonLabel(pendingDraftAction)}
      </Button>
    </div>
  );
}

function getAcceptDraftButtonLabel(pendingDraftAction: PendingTrainingPlanDraftAction): string {
  if (pendingDraftAction === "accept") {
    return "Accepting...";
  }

  if (pendingDraftAction === "save-setup") {
    return "Saving draft...";
  }

  return "Accept Draft";
}

function GenerateStepErrorAlert({ message }: { message: string }) {
  return (
    <p
      className="mt-4 rounded-[var(--radius-16)] border border-over-fg/30 bg-over-bg px-4 py-3 text-sm font-semibold text-over-fg"
      role="alert"
    >
      {message}
    </p>
  );
}

function formatActionError(failureMessage: string, error: unknown): string {
  const detail = error instanceof Error && error.message.trim() !== "" ? error.message : null;

  return detail ? `${failureMessage} ${detail}` : `${failureMessage} Please try again.`;
}

function TrainingPlanDraftSummaryFields({
  summary,
  trainingPlanDraft,
}: {
  summary: PlanBlueprintSummary | null;
  trainingPlanDraft: TrainingPlanDraft;
}) {
  return (
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
  );
}

function BaselineBodyweightDraftSetup({
  baselineBodyweight,
  baselineBodyweightInput,
  onBaselineBodyweightInputChange,
  onSaveDraftSetup,
}: {
  baselineBodyweight?: number | null;
  baselineBodyweightInput: string;
  onBaselineBodyweightInputChange: (value: string) => void;
  onSaveDraftSetup: TrainingPlanDraftActions["saveDraftSetup"];
}) {
  return (
    <section className="mt-5 rounded-[var(--radius-16)] border border-border bg-surface p-4">
      <h4 className="text-base font-black text-ink">Baseline Bodyweight</h4>
      <p className="mt-2 text-sm text-muted">
        Store known bodyweight so bodyweight exercise load volume has a usable default after
        acceptance.
      </p>
      <label className="mt-3 block text-sm font-medium text-ink-2">
        <span>Baseline Bodyweight</span>
        <input
          aria-label="Baseline Bodyweight"
          className="mt-2 w-full rounded-[var(--radius-12)] border border-input-border bg-surface px-3 py-2"
          inputMode="decimal"
          min={0}
          onBlur={() => {
            void onSaveDraftSetup({
              baselineBodyweight: parsePositiveBodyweight(baselineBodyweightInput),
              kind: "baseline_bodyweight",
            });
          }}
          onChange={(event) => {
            onBaselineBodyweightInputChange(event.currentTarget.value);
          }}
          step={0.1}
          type="number"
          value={baselineBodyweightInput}
        />
      </label>
      {baselineBodyweight ? null : (
        <p className="mt-2 text-sm text-under-fg">
          Missing Baseline Bodyweight: bodyweight exercise volume will stay partial until you set it
          here or later on the Training surface.
        </p>
      )}
    </section>
  );
}

function TrainingPlanDraftTemplateCard({
  draftActions,
  editableLoadValues,
  onEditableLoadValueChange,
  template,
  templateIndex,
  templatesLength,
  trainingPlanDraft,
}: {
  draftActions: TrainingPlanDraftActions;
  editableLoadValues: Record<string, string>;
  onEditableLoadValueChange: Dispatch<SetStateAction<Record<string, string>>>;
  template: TrainingPlanDraft["content"]["workoutTemplates"][number];
  templateIndex: number;
  templatesLength: number;
  trainingPlanDraft: TrainingPlanDraft;
}) {
  const canEditSupersetGroups = template.purpose === "strength";

  return (
    <StepPanel>
      <TrainingPlanDraftTemplateHeader
        draftActions={draftActions}
        template={template}
        templateIndex={templateIndex}
        templatesLength={templatesLength}
      />

      <div className="mt-4 grid gap-4">
        {template.supersetGroups.map((group, groupIndex) => (
          <section
            aria-label={group.title}
            className="rounded-[var(--radius-16)] border border-border bg-surface p-4"
            key={group.id}
          >
            {canEditSupersetGroups ? (
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <label className="text-xs font-semibold uppercase text-muted" htmlFor={group.id}>
                    Superset Group title
                  </label>
                  <input
                    aria-label={`Superset Group title ${groupIndex + 1}`}
                    className="mt-2 w-full rounded-[var(--radius-12)] border border-input-border px-3 py-2 text-sm font-semibold text-ink"
                    id={group.id}
                    onChange={(event) => {
                      draftActions.renameSupersetGroup(template.id, group.id, event.target.value);
                    }}
                    type="text"
                    value={group.title}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={group.slots.length > 0 || template.supersetGroups.length === 1}
                    onClick={() => {
                      draftActions.deleteSupersetGroup(template.id, group.id);
                    }}
                    type="button"
                    variant="secondary"
                  >
                    Delete group
                  </Button>
                </div>
              </div>
            ) : (
              <h5 className="text-base font-black text-ink">{group.title}</h5>
            )}
            <ul className="mt-3 space-y-3">
              {group.slots.map((slot, slotIndex) => (
                <TrainingPlanDraftSlotItem
                  canMoveSlot={canEditSupersetGroups}
                  currentGroupId={group.id}
                  draftActions={draftActions}
                  editableLoadValues={editableLoadValues}
                  key={`${group.id}-${slot.exerciseId}-${slot.slotLabel}`}
                  onEditableLoadValueChange={onEditableLoadValueChange}
                  slot={slot}
                  slotIndex={slotIndex}
                  template={template}
                  trainingPlanDraft={trainingPlanDraft}
                />
              ))}
            </ul>
            {canEditSupersetGroups && group.slots.length > 0 ? (
              <div className="mt-3">
                <Button
                  onClick={() => {
                    draftActions.addDraftSlot(template.id, group.id);
                  }}
                  type="button"
                  variant="secondary"
                >
                  Add slot
                </Button>
              </div>
            ) : null}
            {canEditSupersetGroups && group.slots.length === 0 ? (
              <p className="mt-3 text-sm text-under-fg">
                Empty group. Move a slot here or delete the group before accepting the draft.
              </p>
            ) : null}
          </section>
        ))}
        {canEditSupersetGroups ? (
          <Button
            onClick={() => {
              draftActions.addSupersetGroup(template.id, template.supersetGroups.length);
            }}
            type="button"
            variant="secondary"
          >
            Add Superset Group
          </Button>
        ) : null}
      </div>
    </StepPanel>
  );
}

function TrainingPlanDraftTemplateHeader({
  draftActions,
  template,
  templateIndex,
  templatesLength,
}: {
  draftActions: TrainingPlanDraftActions;
  template: TrainingPlanDraft["content"]["workoutTemplates"][number];
  templateIndex: number;
  templatesLength: number;
}) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <label className="text-xs font-semibold uppercase text-muted" htmlFor={template.id}>
            Workout Template label
          </label>
          <input
            className="mt-2 w-full rounded-[var(--radius-12)] border border-input-border px-3 py-2 text-sm font-semibold text-ink"
            id={template.id}
            onChange={(event) => {
              draftActions.renameWorkoutTemplate(template.id, event.target.value);
            }}
            type="text"
            value={template.label}
          />
          <p className="text-sm text-muted">
            {getWorkoutTemplatePurposeDescription(template.purpose)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={templateIndex === 0}
            onClick={() => {
              draftActions.moveWorkoutTemplate(template.id, templateIndex - 1);
            }}
            type="button"
            variant="secondary"
          >
            Move up
          </Button>
          <Button
            disabled={templateIndex === templatesLength - 1}
            onClick={() => {
              draftActions.moveWorkoutTemplate(template.id, templateIndex + 1);
            }}
            type="button"
            variant="secondary"
          >
            Move down
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          onClick={() => {
            draftActions.setWorkoutTemplatePurpose(
              template.id,
              template.purpose === "strength" ? "custom-focus" : "strength",
            );
          }}
          type="button"
          variant="secondary"
        >
          {template.purpose === "strength" ? "Make custom focus" : "Make strength focus"}
        </Button>
        <Button
          onClick={() => {
            draftActions.replaceWorkoutTemplateWithCustomFocus(template.id);
          }}
          type="button"
          variant="secondary"
        >
          Replace with custom focus
        </Button>
        <span className="rounded-full bg-rule px-3 py-1 text-xs font-semibold uppercase text-muted">
          {template.purpose === "custom-focus"
            ? "Custom focus"
            : `${template.supersetGroups.length} groups`}
        </span>
      </div>
    </>
  );
}

function TrainingPlanDraftSlotItem({
  canMoveSlot,
  currentGroupId,
  draftActions,
  editableLoadValues,
  onEditableLoadValueChange,
  slot,
  slotIndex,
  template,
  trainingPlanDraft,
}: {
  canMoveSlot: boolean;
  currentGroupId: string;
  draftActions: TrainingPlanDraftActions;
  editableLoadValues: Record<string, string>;
  onEditableLoadValueChange: Dispatch<SetStateAction<Record<string, string>>>;
  slot: TrainingPlanDraftSlot;
  slotIndex: number;
  template: TrainingPlanDraft["content"]["workoutTemplates"][number];
  trainingPlanDraft: TrainingPlanDraft;
}) {
  const moveTargets = canMoveSlot
    ? template.supersetGroups.filter((group) => group.id !== currentGroupId)
    : [];
  const draftContent = trainingPlanDraft.content;
  // Swap choices scan the exercise catalog; only recompute when the draft itself changes,
  // not on every load-input keystroke that re-renders the review.
  const replacementChoices = useMemo(
    () =>
      canMoveSlot
        ? getTrainingBlockExerciseSwapChoices({
            groupId: currentGroupId,
            slotIndex,
            templateId: template.id,
            trainingPlan: {
              exerciseSelectionPreferences: draftContent.exerciseSelectionPreferences,
              isolationExercisePreferences: draftContent.isolationExercisePreferences,
              mainCompoundRotationPools: draftContent.mainCompoundRotationPools,
              trainingBlock: draftContent.trainingBlock,
              workoutTemplates: draftContent.workoutTemplates,
            },
          })
        : [],
    [canMoveSlot, currentGroupId, draftContent, slotIndex, template.id],
  );

  return (
    <li className="min-w-0 rounded-[var(--radius-12)] border border-border bg-field p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <strong className="min-w-0 text-sm text-ink [overflow-wrap:anywhere]">
          {slot.exerciseName}
        </strong>
        <span className="text-xs font-semibold uppercase text-muted">{slot.slotLabel}</span>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
        <span>{slot.role}</span>
        <span>{formatTrainingPlanDraftMovementPattern(slot.movementPattern)}</span>
        <span>
          {slot.trainingPrescription
            ? `${slot.trainingPrescription.setCount} × ${slot.trainingPrescription.repRange.min}–${slot.trainingPrescription.repRange.max}`
            : "Prescription pending"}
        </span>
      </div>
      {replacementChoices.length > 0 ? (
        <label className="mt-3 block text-sm font-medium text-ink-2">
          <span>Exercise choice</span>
          <select
            aria-label={`Exercise choice for ${slot.exerciseName}`}
            className="mt-2 w-full rounded-[var(--radius-12)] border border-input-border bg-surface px-3 py-2"
            onChange={(event) => {
              draftActions.replaceDraftSlotExercise(
                template.id,
                currentGroupId,
                slotIndex,
                event.currentTarget.value,
              );
            }}
            value={slot.exerciseId}
          >
            {replacementChoices.map((choice) => (
              <option key={choice.exerciseId} value={choice.exerciseId}>
                {choice.exerciseName}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <DraftTrainingPrescriptionEditor
        draftActions={draftActions}
        groupId={currentGroupId}
        slot={slot}
        slotIndex={slotIndex}
        templateId={template.id}
      />
      {canMoveSlot ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            disabled={slotIndex === 0}
            onClick={() => {
              draftActions.reorderDraftSlot(template.id, currentGroupId, slotIndex, slotIndex - 1);
            }}
            type="button"
            variant="secondary"
          >
            Move slot up
          </Button>
          <Button
            disabled={slotIndex === groupSlotsLength(template, currentGroupId) - 1}
            onClick={() => {
              draftActions.reorderDraftSlot(template.id, currentGroupId, slotIndex, slotIndex + 1);
            }}
            type="button"
            variant="secondary"
          >
            Move slot down
          </Button>
          <Button
            disabled={groupSlotsLength(template, currentGroupId) <= 1}
            onClick={() => {
              draftActions.deleteDraftSlot(template.id, currentGroupId, slotIndex);
            }}
            type="button"
            variant="secondary"
          >
            Delete slot
          </Button>
        </div>
      ) : null}
      {moveTargets.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {moveTargets.map((group) => (
            <Button
              className="h-auto max-w-full whitespace-normal text-left"
              key={group.id}
              onClick={() => {
                draftActions.moveDraftSlotToSupersetGroup(
                  template.id,
                  currentGroupId,
                  slotIndex,
                  group.id,
                  group.slots.length,
                );
              }}
              type="button"
              variant="secondary"
            >
              Move to {group.title}
            </Button>
          ))}
        </div>
      ) : null}
      <DraftStartingLoadEditor
        loadInputValue={editableLoadValues[slot.exerciseId] ?? ""}
        onInputChange={(nextValue, options) => {
          onEditableLoadValueChange((currentValues) => ({
            ...currentValues,
            [slot.exerciseId]: nextValue,
          }));

          if (options?.persist === false) {
            return;
          }

          void draftActions.saveDraftSetup({
            kind: "starting_load_suggestions",
            startingLoadSuggestions: updateStartingLoadSuggestions({
              exerciseId: slot.exerciseId,
              isBodyweightExercise: isBodyweightLoadExercise(slot),
              startingLoadSuggestions: trainingPlanDraft.content.startingLoadSuggestions ?? [],
              value: nextValue,
            }),
          });
        }}
        slot={slot}
        trainingPlanDraft={trainingPlanDraft}
      />
    </li>
  );
}

function DraftTrainingPrescriptionEditor({
  draftActions,
  groupId,
  slot,
  slotIndex,
  templateId,
}: {
  draftActions: TrainingPlanDraftActions;
  groupId: string;
  slot: TrainingPlanDraftSlot;
  slotIndex: number;
  templateId: string;
}) {
  const trainingPrescription = slot.trainingPrescription;
  const [editableSetCount, setEditableSetCount] = useState("");
  const [editableRepTargetMin, setEditableRepTargetMin] = useState("");
  const [editableRepTargetMax, setEditableRepTargetMax] = useState("");

  useEffect(() => {
    if (!trainingPrescription) {
      return;
    }

    setEditableSetCount(String(trainingPrescription.setCount));
    setEditableRepTargetMin(String(trainingPrescription.repRange.min));
    setEditableRepTargetMax(String(trainingPrescription.repRange.max));
  }, [trainingPrescription]);

  if (!trainingPrescription) {
    return null;
  }

  function persistTrainingPrescription() {
    draftActions.updateDraftSlotTrainingPrescription({
      groupId,
      repTargetMax: parseTrainingPrescriptionInteger(editableRepTargetMax),
      repTargetMin: parseTrainingPrescriptionInteger(editableRepTargetMin),
      setCount: parseTrainingPrescriptionInteger(editableSetCount),
      slotIndex,
      templateId,
    });
  }

  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-3">
      <label className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 text-sm font-medium text-ink-2">
        <span className="whitespace-nowrap">Sets</span>
        <input
          aria-label={`Set count for ${slot.exerciseName}`}
          className="w-full rounded-[var(--radius-12)] border border-input-border bg-surface px-3 py-2"
          min={1}
          onBlur={persistTrainingPrescription}
          onChange={(event) => {
            setEditableSetCount(event.currentTarget.value);
          }}
          type="number"
          value={editableSetCount}
        />
      </label>
      <label className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 text-sm font-medium text-ink-2">
        <span className="whitespace-nowrap">Rep min</span>
        <input
          aria-label={`Rep target minimum for ${slot.exerciseName}`}
          className="w-full rounded-[var(--radius-12)] border border-input-border bg-surface px-3 py-2"
          min={1}
          onBlur={persistTrainingPrescription}
          onChange={(event) => {
            setEditableRepTargetMin(event.currentTarget.value);
          }}
          type="number"
          value={editableRepTargetMin}
        />
      </label>
      <label className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 text-sm font-medium text-ink-2">
        <span className="whitespace-nowrap">Rep max</span>
        <input
          aria-label={`Rep target maximum for ${slot.exerciseName}`}
          className="w-full rounded-[var(--radius-12)] border border-input-border bg-surface px-3 py-2"
          min={1}
          onBlur={persistTrainingPrescription}
          onChange={(event) => {
            setEditableRepTargetMax(event.currentTarget.value);
          }}
          type="number"
          value={editableRepTargetMax}
        />
      </label>
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
  slot: TrainingPlanDraftSlot;
  trainingPlanDraft: TrainingPlanDraft;
}) {
  const loadSuggestion = trainingPlanDraft.content.startingLoadSuggestions?.find(
    (suggestion) => suggestion.exerciseId === slot.exerciseId,
  );

  if (!loadSuggestion) {
    return null;
  }

  return (
    <div className="mt-3 grid gap-1 text-sm text-muted">
      <span>Previous load: {formatLoad(loadSuggestion.previousLoad)}</span>
      <span>Suggested start: {formatLoad(loadSuggestion.suggestedLoad)}</span>
      <span>{loadSuggestion.reason}</span>
      <label className="mt-1 block font-medium text-ink-2">
        <span>Suggested starting load for {slot.exerciseName}</span>
        <input
          aria-label={`Suggested starting load for ${slot.exerciseName}`}
          className="mt-2 w-full rounded-[var(--radius-12)] border border-input-border bg-surface px-3 py-2"
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

function groupSlotsLength(
  template: TrainingPlanDraft["content"]["workoutTemplates"][number],
  groupId: string,
) {
  return template.supersetGroups.find((group) => group.id === groupId)?.slots.length ?? 0;
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

function parseTrainingPrescriptionInteger(value: string): number {
  const parsedValue = Number(value);

  return Number.isInteger(parsedValue) ? parsedValue : 0;
}

function updateStartingLoadSuggestions({
  exerciseId,
  isBodyweightExercise,
  startingLoadSuggestions,
  value,
}: {
  exerciseId: string;
  isBodyweightExercise: boolean;
  startingLoadSuggestions: NonNullable<TrainingPlanDraft["content"]["startingLoadSuggestions"]>;
  value: string;
}): NonNullable<TrainingPlanDraft["content"]["startingLoadSuggestions"]> {
  const userEditedLoad = parseEditableLoad({ isBodyweightExercise, value });

  return startingLoadSuggestions.map((suggestion) =>
    suggestion.exerciseId === exerciseId
      ? {
          ...suggestion,
          effectiveLoad: userEditedLoad ?? suggestion.suggestedLoad,
          userEditedLoad,
        }
      : suggestion,
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
  return (
    <div className="grid gap-4">
      <StepPanel>
        <h4 className="text-lg font-black text-ink">Generation inputs</h4>
        <p className="mt-2 text-sm text-muted">
          Edit the upstream Plan Builder choices here. These changes update the Plan Builder and can
          make the current draft stale until you reset it.
        </p>
        <div className="mt-5 grid gap-8">
          <PlanBuilderStepSection title="Training schedule">
            <div className="grid gap-6">
              <OnePageTrainingScheduleStep
                blueprint={blueprint}
                onTrainingFrequencyChange={onTrainingFrequencyChange}
                onTrainingSplitChange={onTrainingSplitChange}
                selectedTrainingSplitId={visibleTrainingSplitId}
                showWeeklyPreview={false}
              />
            </div>
          </PlanBuilderStepSection>
          <PlanBuilderStepSection title="Rep ranges">
            <OnePageRepRangeStep
              onRepRangeStyleChange={onRepRangeStyleChange}
              savedRepRangeStyleId={savedRepRangeStyleId}
              selectedRepRangeStyle={repRangeStyle}
              showEffectsPanel={false}
            />
          </PlanBuilderStepSection>
          <PlanBuilderStepSection title="Volume">
            <div className="grid gap-6">
              <OnePageVolumeStep
                blueprint={blueprint}
                onOptionalVolumeTargetToggle={onOptionalVolumeTargetToggle}
                onVolumePresetChange={onVolumePresetChange}
                repRangeStyle={repRangeStyle}
              />
            </div>
          </PlanBuilderStepSection>
        </div>
      </StepPanel>
    </div>
  );
}

function getWorkoutTemplatePurposeDescription(purpose: WorkoutTemplatePurpose) {
  return purpose === "custom-focus" ? "Custom-focus template" : "Strength-focused template";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim p-4">
      <div
        aria-labelledby="default-generation-confirmation-title"
        aria-modal="true"
        className="max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto rounded-3xl border border-border bg-surface p-6 shadow-[0_24px_80px_color-mix(in_srgb,var(--shadow-ink)_26%,transparent)]"
        role="dialog"
      >
        <StepPanel>
          <h3
            className="text-xl font-black text-ink sm:text-2xl"
            id="default-generation-confirmation-title"
          >
            Use Recommended Defaults?
          </h3>
          <p className="mt-3 text-sm text-muted">
            Just Workout will apply these Recommended Defaults before generation continues.
          </p>
          <p className="mt-2 text-sm text-muted">{defaultGenerationPreferenceMappingCopy}</p>

          <ul className="mt-5 space-y-3 text-sm text-ink">
            {resolution.recommendedDefaults.map((recommendedDefault) => (
              <li
                className="rounded-[var(--radius-16)] border border-border bg-surface px-4 py-3"
                key={getRecommendedDefaultKey(recommendedDefault)}
              >
                {getRecommendedDefaultLabel(recommendedDefault)}
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
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
          </div>
        </StepPanel>
      </div>
    </div>
  );
}

function GenerateSummaryField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-6)] border border-border bg-surface px-4 py-3">
      <dt className="text-xs font-semibold uppercase text-muted">{label}</dt>
      <dd className="mt-1 font-semibold text-ink">{value}</dd>
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
