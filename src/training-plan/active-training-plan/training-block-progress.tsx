import { lazy, type ReactNode, Suspense, useState } from "react";
import { isBodyweightLoadExercise } from "../bodyweight-load";
import type {
  NextTrainingBlockLoadSuggestion,
  NextTrainingBlockTransitionWorkflow,
} from "../index";
import type {
  NextTrainingBlockPreview,
  TrainingBlockExerciseRotationPreview,
  TrainingBlockExerciseRotationPreviewItem,
  TrainingBlockExerciseSwapSlotLocator,
  TrainingBlockKeptExercisePreviewItem,
} from "../training-block";
import {
  applyTrainingBlockExerciseSwapToPreview,
  generateWeeklyIntensityTargets,
  getTrainingBlockExerciseSwapAffectedSlotCount,
  getTrainingBlockExerciseSwapChoices,
} from "../training-block";
import type { TrainingSession } from "../training-session";
import { TrainingBlockExerciseSwap } from "./training-block-exercise-swap";
import type { ActiveTrainingPlanWeekProgressReadModel } from "./training-week-progress-read-model";
import "./training-block-progress.css";

// Dev-only prototype: loaded on demand so production bundles skip its code and CSS.
const TrainingBlockTransitionPrototype = import.meta.env.DEV
  ? lazy(() =>
      import("./prototype-training-block-transition").then((module) => ({
        default: module.TrainingBlockTransitionPrototype,
      })),
    )
  : null;

function shouldShowTrainingBlockTransitionPrototype(): boolean {
  return (
    import.meta.env.DEV &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("variant")
  );
}

type ReviewTrainingBlockTransitionWorkflow = Extract<
  NextTrainingBlockTransitionWorkflow,
  { kind: "review" }
>;
type AcceptedTrainingBlockTransitionWorkflow = Extract<
  NextTrainingBlockTransitionWorkflow,
  { kind: "accepted" }
>;
type TrainingBlockReviewMode = "accept_proposal" | "skip_rotation";

export function TrainingBlockProgress({
  blockCompletedSessions,
  blockPlannedSessions,
  blockProgressPercent,
  blockWeek,
  cycleNumber = 1,
  nextTrainingBlockTransition,
  onOpenTrainingHistory,
  trainingSessions,
  trainingWeekProgress,
  trainingBlockWeeks,
}: {
  blockCompletedSessions: number;
  blockPlannedSessions: number;
  blockProgressPercent: number;
  blockWeek: number;
  cycleNumber?: number;
  nextTrainingBlockTransition?: NextTrainingBlockTransitionWorkflow;
  onOpenTrainingHistory: () => void;
  trainingSessions: ReadonlyArray<TrainingSession>;
  trainingWeekProgress: ActiveTrainingPlanWeekProgressReadModel;
  trainingBlockWeeks: number;
}) {
  const weeksUntilRotation = Math.max(trainingBlockWeeks - blockWeek, 0);
  const summaryId = `training-block-${cycleNumber}-summary`;
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const isNextBlockReady =
    weeksUntilRotation === 0 && nextTrainingBlockTransition?.kind === "review";

  if (
    nextTrainingBlockTransition?.kind === "review" &&
    TrainingBlockTransitionPrototype &&
    shouldShowTrainingBlockTransitionPrototype()
  ) {
    return (
      <Suspense fallback={null}>
        <TrainingBlockTransitionPrototype
          blockWeek={blockWeek}
          cycleNumber={cycleNumber}
          trainingBlockWeeks={trainingBlockWeeks}
          transition={nextTrainingBlockTransition}
        />
      </Suspense>
    );
  }

  return (
    <section className="active-training-plan-progress" aria-labelledby={summaryId}>
      <h2 id={summaryId}>Training Block {cycleNumber}</h2>
      <p>
        Training Block {cycleNumber} · Week {blockWeek} of {trainingBlockWeeks}
      </p>
      <p>Current focus: {getTrainingBlockFocus(blockWeek, trainingBlockWeeks)}</p>
      <p>{getRotationStatusLabel({ isNextBlockReady, weeksUntilRotation })}</p>
      <TrainingBlockEffortRamp blockWeek={blockWeek} trainingBlockWeeks={trainingBlockWeeks} />
      <div className="active-training-plan-progress__row">
        <div
          className="active-training-plan-progress__track"
          aria-label="Block progress"
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={blockProgressPercent}
          aria-valuetext={`${blockCompletedSessions} of ${blockPlannedSessions} sessions (${blockProgressPercent}%)`}
          role="progressbar"
        >
          <span style={{ width: `${blockProgressPercent}%` }} />
        </div>
        <span>
          {blockCompletedSessions} / {blockPlannedSessions} sessions · {blockProgressPercent}%
        </span>
      </div>
      <p className="active-training-plan-progress__helper">
        After week 6, Just Workout can review the next Training Block, rotate exercises, and prefill
        starting loads from your previous block.
      </p>
      <TrainingWeekProgressSummary trainingWeekProgress={trainingWeekProgress} />
      <TrainingBlockProgressActions
        isPreviewExpanded={isPreviewExpanded}
        isReady={isNextBlockReady}
        onOpenTrainingHistory={onOpenTrainingHistory}
        onExpandPreview={() => setIsPreviewExpanded(true)}
        trainingSessions={trainingSessions}
        trainingWeekProgress={trainingWeekProgress}
        transition={nextTrainingBlockTransition}
      />
    </section>
  );
}

function TrainingBlockEffortRamp({
  blockWeek,
  trainingBlockWeeks,
}: {
  blockWeek: number;
  trainingBlockWeeks: number;
}) {
  return (
    <ol aria-label="Weekly effort targets" className="active-training-plan-progress__ramp">
      {generateWeeklyIntensityTargets({ trainingBlockWeeks }).map((target) => (
        <li
          aria-current={target.weekNumber === blockWeek ? "step" : undefined}
          className={
            target.weekNumber === blockWeek
              ? "active-training-plan-progress__ramp-week active-training-plan-progress__ramp-week--current"
              : target.weekNumber < blockWeek
                ? "active-training-plan-progress__ramp-week active-training-plan-progress__ramp-week--done"
                : "active-training-plan-progress__ramp-week"
          }
          key={target.weekNumber}
        >
          <span>W{target.weekNumber}</span>
          <strong>{formatWeeklyTargetRir(target.minTargetRir, target.maxTargetRir)}</strong>
        </li>
      ))}
    </ol>
  );
}

function TrainingWeekProgressSummary({
  trainingWeekProgress,
}: {
  trainingWeekProgress: ActiveTrainingPlanWeekProgressReadModel;
}) {
  return (
    <section
      className="active-training-plan-progress__week"
      aria-label={trainingWeekProgress.title}
    >
      <p className="active-training-plan-progress__week-title">{trainingWeekProgress.title}</p>
      <p className="active-training-plan-progress__week-value">{trainingWeekProgress.value}</p>
      <p className="active-training-plan-progress__week-detail">{trainingWeekProgress.detail}</p>
      <p className="active-training-plan-progress__week-support">{trainingWeekProgress.support}</p>
      {trainingWeekProgress.caveat ? (
        <p className="active-training-plan-progress__week-caveat">{trainingWeekProgress.caveat}</p>
      ) : null}
    </section>
  );
}

function TrainingBlockProgressActions({
  isPreviewExpanded,
  isReady,
  onOpenTrainingHistory,
  onExpandPreview,
  trainingSessions,
  trainingWeekProgress,
  transition,
}: {
  isPreviewExpanded: boolean;
  isReady: boolean;
  onOpenTrainingHistory: () => void;
  onExpandPreview: () => void;
  trainingSessions: ReadonlyArray<TrainingSession>;
  trainingWeekProgress: ActiveTrainingPlanWeekProgressReadModel;
  transition?: NextTrainingBlockTransitionWorkflow;
}) {
  if (transition?.kind === "accepted") {
    return <UndoAcceptedTrainingBlockCallout transition={transition} />;
  }

  if (!isReady || !transition || transition.kind !== "review") {
    return null;
  }

  return (
    <>
      <TrainingBlockPreviewSummary transition={transition} />
      <button
        className="active-training-plan-progress__action"
        onClick={onExpandPreview}
        type="button"
      >
        Review next Training Block
      </button>
      {isPreviewExpanded ? (
        <TrainingBlockPreviewDetails
          onOpenTrainingHistory={onOpenTrainingHistory}
          trainingSessions={trainingSessions}
          trainingWeekProgress={trainingWeekProgress}
          transition={transition}
        />
      ) : null}
    </>
  );
}

function TrainingBlockPreviewSummary({
  transition,
}: {
  transition: ReviewTrainingBlockTransitionWorkflow;
}) {
  const { preview } = transition;

  return (
    <div className="active-training-plan-progress__preview">
      <h3>Next Training Block ready</h3>
      <p>
        {preview.rotation.rotated.length}{" "}
        {preview.rotation.rotated.length === 1 ? "proposed rotation" : "proposed rotations"}
      </p>
      <p>
        {preview.rotation.kept.length}{" "}
        {preview.rotation.kept.length === 1 ? "kept exercise" : "kept exercises"}
      </p>
    </div>
  );
}

function TrainingBlockPreviewDetails({
  onOpenTrainingHistory,
  trainingSessions,
  trainingWeekProgress,
  transition,
}: {
  onOpenTrainingHistory: () => void;
  trainingSessions: ReadonlyArray<TrainingSession>;
  trainingWeekProgress: ActiveTrainingPlanWeekProgressReadModel;
  transition: ReviewTrainingBlockTransitionWorkflow;
}) {
  const [reviewMode, setReviewMode] = useState<TrainingBlockReviewMode>("accept_proposal");
  const [proposalPreview, setProposalPreview] = useState<NextTrainingBlockPreview>(
    transition.preview,
  );
  const [loadSuggestionsByMode, setLoadSuggestionsByMode] = useState<
    Record<TrainingBlockReviewMode, ReadonlyArray<NextTrainingBlockLoadSuggestion>>
  >({
    accept_proposal: transition.preview.loadSuggestions,
    skip_rotation: transition.skipRotationPreview.loadSuggestions,
  });
  const [isAccepting, setIsAccepting] = useState(false);
  const [loadInputValuesByMode, setLoadInputValuesByMode] = useState<
    Record<TrainingBlockReviewMode, Record<string, string>>
  >({
    accept_proposal: createEditableLoadValues(transition.preview.loadSuggestions),
    skip_rotation: createEditableLoadValues(transition.skipRotationPreview.loadSuggestions),
  });
  const activePreview = getReviewModePreview({ preview: proposalPreview, reviewMode, transition });
  const activeLoadSuggestions = loadSuggestionsByMode[reviewMode];
  const activeLoadInputValues = loadInputValuesByMode[reviewMode];
  const acceptButtonLabel = getAcceptButtonLabel({ isAccepting, reviewMode });
  const loadPrefillCopy = getLoadPrefillCopy(reviewMode);
  const reviewModeToggleLabel = getReviewModeToggleLabel(reviewMode);

  function renderLoadSuggestionFields(
    loadSuggestion: NextTrainingBlockLoadSuggestion,
    exerciseName: string,
  ) {
    return (
      <TrainingBlockLoadSuggestionFields
        exerciseName={exerciseName}
        loadInputValue={
          activeLoadInputValues[loadSuggestion.exerciseId] ??
          formatEditableLoad(loadSuggestion.userEditedLoad ?? loadSuggestion.suggestedLoad)
        }
        loadSuggestion={loadSuggestion}
        onInputChange={(nextValue) => {
          setLoadInputValuesByMode((current) => ({
            ...current,
            [reviewMode]: {
              ...current[reviewMode],
              [loadSuggestion.exerciseId]: nextValue,
            },
          }));

          if (nextValue.trim() === "") {
            setLoadSuggestionsByMode((current) => ({
              ...current,
              [reviewMode]: current[reviewMode].map((suggestion) =>
                suggestion.exerciseId === loadSuggestion.exerciseId
                  ? { ...suggestion, userEditedLoad: null }
                  : suggestion,
              ),
            }));
            return;
          }

          const nextLoad = Number(nextValue);

          if (!Number.isFinite(nextLoad)) {
            return;
          }

          setLoadSuggestionsByMode((current) => ({
            ...current,
            [reviewMode]: transition.editLoadSuggestion({
              exerciseId: loadSuggestion.exerciseId,
              suggestions: current[reviewMode],
              userEditedLoad: nextLoad,
            }),
          }));
        }}
      />
    );
  }

  return (
    <div className="active-training-plan-progress__details">
      <h3>Next Training Block review</h3>
      <p className="active-training-plan-progress__details-copy">
        Inspect recent progress, the proposed Training Block rotation, previous load prefills, and
        the six-week RIR ramp before creating the next block.
      </p>

      <TrainingBlockProgressReviewSection
        onOpenTrainingHistory={onOpenTrainingHistory}
        trainingWeekProgress={trainingWeekProgress}
      />
      <TrainingBlockRotationProposalSection
        onSwap={(input) => {
          const nextPreview = applyTrainingBlockExerciseSwapToPreview({
            ...input,
            preview: proposalPreview,
            sessions: trainingSessions,
          });
          const mergedLoadSuggestions = mergeEditedLoadSuggestions({
            currentSuggestions: loadSuggestionsByMode.accept_proposal,
            nextSuggestions: nextPreview.loadSuggestions,
          });

          setProposalPreview(nextPreview);
          setLoadSuggestionsByMode((current) => ({
            ...current,
            accept_proposal: mergedLoadSuggestions,
          }));
          setLoadInputValuesByMode((current) => ({
            ...current,
            accept_proposal: createEditableLoadValues(mergedLoadSuggestions),
          }));
        }}
        preview={proposalPreview}
      />
      <TrainingBlockLoadPrefillSection
        loadPrefillCopy={loadPrefillCopy}
        loadSuggestions={activeLoadSuggestions}
        preview={activePreview.rotation}
        renderLoadSuggestionFields={renderLoadSuggestionFields}
      />
      <TrainingBlockRirRampSection preview={activePreview} />
      {transition.accept ? (
        <TrainingBlockReviewActions
          acceptButtonLabel={acceptButtonLabel}
          isAccepting={isAccepting}
          onAccept={async () => {
            setIsAccepting(true);

            try {
              if (reviewMode === "skip_rotation") {
                await transition.accept?.({
                  reviewMode,
                  suggestions: activeLoadSuggestions,
                });
                return;
              }

              await transition.accept?.({
                preview: proposalPreview,
                reviewMode,
                suggestions: activeLoadSuggestions,
              });
            } finally {
              setIsAccepting(false);
            }
          }}
          onToggleReviewMode={() =>
            setReviewMode((currentMode) =>
              currentMode === "accept_proposal" ? "skip_rotation" : "accept_proposal",
            )
          }
          reviewModeToggleLabel={reviewModeToggleLabel}
        />
      ) : null}
    </div>
  );
}

function TrainingBlockProgressReviewSection({
  onOpenTrainingHistory,
  trainingWeekProgress,
}: {
  onOpenTrainingHistory: () => void;
  trainingWeekProgress: ActiveTrainingPlanWeekProgressReadModel;
}) {
  return (
    <section
      className="active-training-plan-progress__review-section"
      aria-label="Progress summary"
    >
      <div>
        <p className="active-training-plan-progress__section-title">Progress summary</p>
        <p className="active-training-plan-progress__section-value">{trainingWeekProgress.value}</p>
        <p className="active-training-plan-progress__section-detail">
          {trainingWeekProgress.detail}
        </p>
        <p className="active-training-plan-progress__section-detail">
          {trainingWeekProgress.support}
        </p>
        {trainingWeekProgress.caveat ? (
          <p className="active-training-plan-progress__section-caveat">
            {trainingWeekProgress.caveat}
          </p>
        ) : null}
      </div>
      <button
        className="active-training-plan-progress__secondary-link"
        onClick={onOpenTrainingHistory}
        type="button"
      >
        View Training History
      </button>
    </section>
  );
}

function TrainingBlockRotationProposalSection({
  onSwap,
  preview,
}: {
  onSwap: (input: TrainingBlockExerciseSwapSlotLocator & { nextExerciseId: string }) => void;
  preview: NextTrainingBlockPreview;
}) {
  return (
    <section
      className="active-training-plan-progress__review-section"
      aria-label="Training Block Exercise Rotation Proposal"
    >
      <p className="active-training-plan-progress__section-title">
        Training Block Exercise Rotation Proposal
      </p>
      <TrainingBlockRotationList
        preview={preview.rotation}
        renderSwapControl={({
          currentExerciseName,
          groupId,
          movementPattern,
          role,
          slotIndex,
          templateId,
        }) => {
          const affectedSlotCount = getTrainingBlockExerciseSwapAffectedSlotCount();
          const swapChoices = getTrainingBlockExerciseSwapChoices({
            groupId,
            slotIndex,
            templateId,
            trainingPlan: preview.nextTrainingPlan,
          });

          return (
            <TrainingBlockExerciseSwap
              actionLabel={`Swap exercise for ${currentExerciseName}`}
              affectedSlotCount={affectedSlotCount}
              choices={swapChoices}
              dialogTitle={`Training Block Exercise Swap for ${currentExerciseName}`}
              movementPattern={movementPattern}
              onApply={(nextExerciseId) =>
                onSwap({
                  groupId,
                  nextExerciseId,
                  slotIndex,
                  templateId,
                })
              }
              role={role}
              scopeCopy={`This updates ${affectedSlotCount} next-block ${affectedSlotCount === 1 ? "slot" : "slots"} for the same Movement Pattern and Workout Exercise Role.`}
            />
          );
        }}
      />
    </section>
  );
}

function TrainingBlockLoadPrefillSection({
  loadPrefillCopy,
  loadSuggestions,
  preview,
  renderLoadSuggestionFields,
}: {
  loadPrefillCopy: string;
  loadSuggestions: ReadonlyArray<NextTrainingBlockLoadSuggestion>;
  preview: TrainingBlockExerciseRotationPreview;
  renderLoadSuggestionFields: (
    loadSuggestion: NextTrainingBlockLoadSuggestion,
    exerciseName: string,
  ) => ReactNode;
}) {
  return (
    <section
      className="active-training-plan-progress__review-section"
      aria-label="Previous Exercise Load Prefill"
    >
      <p className="active-training-plan-progress__section-title">Previous Exercise Load Prefill</p>
      <p className="active-training-plan-progress__details-copy">{loadPrefillCopy}</p>
      <TrainingBlockRotationList
        loadSuggestions={loadSuggestions}
        preview={preview}
        renderLoadSuggestionFields={renderLoadSuggestionFields}
      />
    </section>
  );
}

function TrainingBlockRirRampSection({
  preview,
}: {
  preview: ReviewTrainingBlockTransitionWorkflow["preview"];
}) {
  return (
    <section
      className="active-training-plan-progress__review-section"
      aria-label="Six-week RIR ramp"
    >
      <p className="active-training-plan-progress__section-title">Six-week RIR ramp</p>
      <ul className="active-training-plan-progress__rir-list">
        {preview.weeklyIntensityTargets.map((target) => (
          <li key={target.weekNumber}>
            <span>Week {target.weekNumber}</span>
            <span>{formatWeeklyTargetRir(target.minTargetRir, target.maxTargetRir)}</span>
          </li>
        ))}
      </ul>
      <p className="active-training-plan-progress__details-copy">
        Main and secondary compounds keep at least 1 RIR even when the ramp reaches 0 RIR for
        isolation finishers.
      </p>
    </section>
  );
}

function TrainingBlockReviewActions({
  acceptButtonLabel,
  isAccepting,
  onAccept,
  onToggleReviewMode,
  reviewModeToggleLabel,
}: {
  acceptButtonLabel: string;
  isAccepting: boolean;
  onAccept: () => Promise<void>;
  onToggleReviewMode: () => void;
  reviewModeToggleLabel: string;
}) {
  return (
    <div className="active-training-plan-progress__button-row">
      <button
        className="active-training-plan-progress__secondary-button"
        onClick={onToggleReviewMode}
        type="button"
      >
        {reviewModeToggleLabel}
      </button>
      <button
        className="active-training-plan-progress__accept"
        disabled={isAccepting}
        onClick={() => {
          void onAccept();
        }}
        type="button"
      >
        {acceptButtonLabel}
      </button>
    </div>
  );
}

function TrainingBlockRotationList({
  loadSuggestions,
  preview,
  renderSwapControl,
  renderLoadSuggestionFields,
}: {
  loadSuggestions?: ReadonlyArray<NextTrainingBlockLoadSuggestion>;
  preview: TrainingBlockExerciseRotationPreview;
  renderSwapControl?: (input: {
    currentExerciseName: string;
    groupId: string;
    movementPattern: TrainingBlockExerciseRotationPreviewItem["movementPattern"];
    role: TrainingBlockExerciseRotationPreviewItem["role"];
    slotIndex: number;
    templateId: string;
  }) => ReactNode;
  renderLoadSuggestionFields?: (
    loadSuggestion: NextTrainingBlockLoadSuggestion,
    exerciseName: string,
  ) => ReactNode;
}) {
  return (
    <ul className="active-training-plan-progress__detail-list">
      {preview.rotated.map((rotation) => {
        const loadSuggestion = getRotatedExerciseLoadSuggestion({
          loadSuggestions,
          rotation,
        });

        return (
          <li key={getRotatedExercisePreviewKey(rotation)}>
            <span>
              {rotation.templateLabel} · {rotation.slotLabel}
            </span>
            <span>
              {rotation.previousExerciseName} → {rotation.nextExerciseName}
            </span>
            <span>{rotation.reason}</span>
            {renderSwapControl
              ? renderSwapControl({
                  currentExerciseName: rotation.nextExerciseName,
                  groupId: rotation.groupId,
                  movementPattern: rotation.movementPattern,
                  role: rotation.role,
                  slotIndex: rotation.slotIndex,
                  templateId: rotation.templateId,
                })
              : null}
            {loadSuggestion && renderLoadSuggestionFields
              ? renderLoadSuggestionFields(loadSuggestion, rotation.nextExerciseName)
              : null}
          </li>
        );
      })}
      {preview.kept.map((kept) => {
        const loadSuggestion = getKeptExerciseLoadSuggestion({
          kept,
          loadSuggestions,
        });

        return (
          <li key={getKeptExercisePreviewKey(kept)}>
            <span>
              {kept.templateLabel} · {kept.slotLabel}
            </span>
            <span>{kept.exerciseName}</span>
            <span>{kept.reason}</span>
            {renderSwapControl
              ? renderSwapControl({
                  currentExerciseName: kept.exerciseName,
                  groupId: kept.groupId,
                  movementPattern: kept.movementPattern,
                  role: kept.role,
                  slotIndex: kept.slotIndex,
                  templateId: kept.templateId,
                })
              : null}
            {loadSuggestion && renderLoadSuggestionFields
              ? renderLoadSuggestionFields(loadSuggestion, kept.exerciseName)
              : null}
          </li>
        );
      })}
    </ul>
  );
}

function getReviewModePreview({
  preview,
  reviewMode,
  transition,
}: {
  preview: NextTrainingBlockPreview;
  reviewMode: TrainingBlockReviewMode;
  transition: ReviewTrainingBlockTransitionWorkflow;
}): ReviewTrainingBlockTransitionWorkflow["preview"] {
  if (reviewMode === "skip_rotation") {
    return transition.skipRotationPreview;
  }

  return preview;
}

function getLoadPrefillCopy(reviewMode: TrainingBlockReviewMode): string {
  if (reviewMode === "skip_rotation") {
    return "Skipping the rotation proposal keeps your current exercises for the next Training Block.";
  }

  return "These prefills apply to the proposed next Training Block exercises.";
}

function getReviewModeToggleLabel(reviewMode: TrainingBlockReviewMode): string {
  if (reviewMode === "skip_rotation") {
    return "Review rotation proposal";
  }

  return "Skip rotation proposal";
}

function getAcceptButtonLabel({
  isAccepting,
  reviewMode,
}: {
  isAccepting: boolean;
  reviewMode: TrainingBlockReviewMode;
}): string {
  if (isAccepting) {
    return "Saving next Training Block...";
  }

  if (reviewMode === "skip_rotation") {
    return "Create next Training Block";
  }

  return "Accept next Training Block";
}

function getRotatedExerciseLoadSuggestion({
  loadSuggestions,
  rotation,
}: {
  loadSuggestions?: ReadonlyArray<NextTrainingBlockLoadSuggestion>;
  rotation: TrainingBlockExerciseRotationPreviewItem;
}): NextTrainingBlockLoadSuggestion | undefined {
  return loadSuggestions?.find((suggestion) => suggestion.exerciseId === rotation.nextExerciseId);
}

function getKeptExerciseLoadSuggestion({
  kept,
  loadSuggestions,
}: {
  kept: TrainingBlockKeptExercisePreviewItem;
  loadSuggestions?: ReadonlyArray<NextTrainingBlockLoadSuggestion>;
}): NextTrainingBlockLoadSuggestion | undefined {
  return loadSuggestions?.find((suggestion) => suggestion.exerciseId === kept.exerciseId);
}

function getRotatedExercisePreviewKey(rotation: TrainingBlockExerciseRotationPreviewItem): string {
  return `${rotation.templateId}-${rotation.groupId}-${rotation.slotIndex}-${rotation.nextExerciseId}`;
}

function getKeptExercisePreviewKey(kept: TrainingBlockKeptExercisePreviewItem): string {
  return `${kept.templateId}-${kept.groupId}-${kept.slotIndex}-${kept.exerciseId}`;
}

function UndoAcceptedTrainingBlockCallout({
  transition,
}: {
  transition: AcceptedTrainingBlockTransitionWorkflow;
}) {
  const [isUndoing, setIsUndoing] = useState(false);

  return (
    <div className="active-training-plan-progress__undo">
      <h3>Next Training Block accepted</h3>
      <p>Undo stays available until you start the first Training Session in this block.</p>
      <button
        className="active-training-plan-progress__secondary-button"
        disabled={isUndoing}
        onClick={async () => {
          setIsUndoing(true);

          try {
            await transition.undo();
          } finally {
            setIsUndoing(false);
          }
        }}
        type="button"
      >
        {isUndoing ? "Undoing Training Block..." : "Undo accepted Training Block"}
      </button>
    </div>
  );
}

function TrainingBlockLoadSuggestionFields({
  exerciseName,
  loadInputValue,
  loadSuggestion,
  onInputChange,
}: {
  exerciseName: string;
  loadInputValue: string;
  loadSuggestion: NextTrainingBlockLoadSuggestion;
  onInputChange: (value: string) => void;
}) {
  return (
    <>
      <span>Previous load: {formatLoad(loadSuggestion.previousLoad)}</span>
      <span>Suggested start: {formatLoad(loadSuggestion.suggestedLoad)}</span>
      <span>{loadSuggestion.reason}</span>
      <span className="active-training-plan-progress__load-edit">
        <label htmlFor={`load-suggestion-${loadSuggestion.exerciseId}`}>
          Suggested starting load for {exerciseName}
        </label>
        <input
          id={`load-suggestion-${loadSuggestion.exerciseId}`}
          inputMode="decimal"
          min={isBodyweightLoadExercise(loadSuggestion) ? -200 : 0}
          onChange={(event) => onInputChange(event.currentTarget.value)}
          step={2.5}
          type="number"
          value={loadInputValue}
        />
      </span>
      {loadSuggestion.userEditedLoad === null ? null : (
        <span>Edited start: {formatLoad(loadSuggestion.userEditedLoad)}</span>
      )}
    </>
  );
}

function formatLoad(load: number | null): string {
  return load === null ? "No previous load" : `${load} kg`;
}

function formatEditableLoad(load: number | null): string {
  return load === null ? "" : String(load);
}

function createEditableLoadValues(
  suggestions: ReadonlyArray<NextTrainingBlockLoadSuggestion>,
): Record<string, string> {
  return Object.fromEntries(
    suggestions.map((suggestion) => [
      suggestion.exerciseId,
      formatEditableLoad(suggestion.userEditedLoad ?? suggestion.suggestedLoad),
    ]),
  );
}

function mergeEditedLoadSuggestions({
  currentSuggestions,
  nextSuggestions,
}: {
  currentSuggestions: ReadonlyArray<NextTrainingBlockLoadSuggestion>;
  nextSuggestions: ReadonlyArray<NextTrainingBlockLoadSuggestion>;
}): ReadonlyArray<NextTrainingBlockLoadSuggestion> {
  const currentSuggestionsByExerciseId = new Map(
    currentSuggestions.map((suggestion) => [suggestion.exerciseId, suggestion]),
  );

  return nextSuggestions.map((suggestion) => {
    const currentSuggestion = currentSuggestionsByExerciseId.get(suggestion.exerciseId);

    return currentSuggestion?.userEditedLoad === null ||
      currentSuggestion?.userEditedLoad === undefined
      ? suggestion
      : {
          ...suggestion,
          userEditedLoad: currentSuggestion.userEditedLoad,
        };
  });
}

function formatWeeklyTargetRir(minTargetRir: number, maxTargetRir: number): string {
  return minTargetRir === maxTargetRir
    ? `${minTargetRir} RIR`
    : `${minTargetRir}-${maxTargetRir} RIR`;
}

export function getBlockProgressPercent({
  completedSessions,
  plannedSessions,
}: {
  completedSessions: number;
  plannedSessions: number;
}): number {
  if (plannedSessions <= 0) {
    return 0;
  }

  return Math.min(Math.round((completedSessions / plannedSessions) * 100), 100);
}

function getTrainingBlockFocus(blockWeek: number, trainingBlockWeeks: number): string {
  if (blockWeek <= 1) {
    return "easy week, 4-5 reps in reserve";
  }

  if (blockWeek <= 2) {
    return "building consistency";
  }

  if (blockWeek < trainingBlockWeeks) {
    return "building intensity";
  }

  return "final hard week";
}

function getRotationStatusLabel({
  isNextBlockReady,
  weeksUntilRotation,
}: {
  isNextBlockReady: boolean;
  weeksUntilRotation: number;
}): string {
  if (weeksUntilRotation > 0) {
    return `${weeksUntilRotation} ${weeksUntilRotation === 1 ? "week" : "weeks"} until exercise rotation`;
  }

  if (isNextBlockReady) {
    return "Ready for next Training Block review";
  }

  return "Complete each Training Week in this block to unlock the next Training Block review";
}
