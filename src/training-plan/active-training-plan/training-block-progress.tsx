import { useState } from "react";
import { isBodyweightLoadExercise } from "../bodyweight-load";
import type {
  NextTrainingBlockLoadSuggestion,
  NextTrainingBlockTransitionWorkflow,
} from "../index";
import type { ActiveTrainingPlanWeekProgressReadModel } from "./training-week-progress-read-model";
import "./training-block-progress.css";

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
  blockProgressPercent,
  blockWeek,
  cycleNumber = 1,
  nextTrainingBlockTransition,
  onOpenTrainingHistory,
  trainingWeekProgress,
  trainingBlockWeeks,
}: {
  blockProgressPercent: number;
  blockWeek: number;
  cycleNumber?: number;
  nextTrainingBlockTransition?: NextTrainingBlockTransitionWorkflow;
  onOpenTrainingHistory: () => void;
  trainingWeekProgress: ActiveTrainingPlanWeekProgressReadModel;
  trainingBlockWeeks: number;
}) {
  const weeksUntilRotation = Math.max(trainingBlockWeeks - blockWeek, 0);
  const summaryId = `training-block-${cycleNumber}-summary`;
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const isNextBlockReady =
    weeksUntilRotation === 0 && nextTrainingBlockTransition?.kind === "review";

  return (
    <section className="active-training-plan-progress" aria-labelledby={summaryId}>
      <h2 id={summaryId}>Training Block {cycleNumber}</h2>
      <p>
        Training Block {cycleNumber} · Week {blockWeek} of {trainingBlockWeeks}
      </p>
      <p>Current focus: {getTrainingBlockFocus(blockWeek, trainingBlockWeeks)}</p>
      <p>{getRotationStatusLabel({ isNextBlockReady, weeksUntilRotation })}</p>
      <div className="active-training-plan-progress__row">
        <div
          className="active-training-plan-progress__track"
          aria-label={`Block progress ${blockProgressPercent}%`}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={blockProgressPercent}
          role="progressbar"
        >
          <span style={{ width: `${blockProgressPercent}%` }} />
        </div>
        <span>{blockProgressPercent}%</span>
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
        trainingWeekProgress={trainingWeekProgress}
        transition={nextTrainingBlockTransition}
      />
    </section>
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
  trainingWeekProgress,
  transition,
}: {
  isPreviewExpanded: boolean;
  isReady: boolean;
  onOpenTrainingHistory: () => void;
  onExpandPreview: () => void;
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
  trainingWeekProgress,
  transition,
}: {
  onOpenTrainingHistory: () => void;
  trainingWeekProgress: ActiveTrainingPlanWeekProgressReadModel;
  transition: ReviewTrainingBlockTransitionWorkflow;
}) {
  const [reviewMode, setReviewMode] = useState<TrainingBlockReviewMode>("accept_proposal");
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
  const activePreview =
    reviewMode === "skip_rotation" ? transition.skipRotationPreview : transition.preview;
  const activeLoadSuggestions = loadSuggestionsByMode[reviewMode];
  const activeLoadInputValues = loadInputValuesByMode[reviewMode];

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

      <section
        className="active-training-plan-progress__review-section"
        aria-label="Progress summary"
      >
        <div>
          <p className="active-training-plan-progress__section-title">Progress summary</p>
          <p className="active-training-plan-progress__section-value">
            {trainingWeekProgress.value}
          </p>
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

      <section
        className="active-training-plan-progress__review-section"
        aria-label="Training Block Exercise Rotation Proposal"
      >
        <p className="active-training-plan-progress__section-title">
          Training Block Exercise Rotation Proposal
        </p>
        <ul className="active-training-plan-progress__detail-list">
          {transition.preview.rotation.rotated.map((rotation) => (
            <li
              key={`${rotation.templateId}-${rotation.groupId}-${rotation.slotIndex}-${rotation.nextExerciseId}`}
            >
              <span>
                {rotation.templateLabel} · {rotation.slotLabel}
              </span>
              <span>
                {rotation.previousExerciseName} → {rotation.nextExerciseName}
              </span>
              <span>{rotation.reason}</span>
            </li>
          ))}
          {transition.preview.rotation.kept.map((kept) => (
            <li key={`${kept.templateId}-${kept.groupId}-${kept.slotIndex}-${kept.exerciseId}`}>
              <span>
                {kept.templateLabel} · {kept.slotLabel}
              </span>
              <span>{kept.exerciseName}</span>
              <span>{kept.reason}</span>
            </li>
          ))}
        </ul>
      </section>

      <section
        className="active-training-plan-progress__review-section"
        aria-label="Previous Exercise Load Prefill"
      >
        <p className="active-training-plan-progress__section-title">
          Previous Exercise Load Prefill
        </p>
        <p className="active-training-plan-progress__details-copy">
          {reviewMode === "skip_rotation"
            ? "Skipping the rotation proposal keeps your current exercises for the next Training Block."
            : "These prefills apply to the proposed next Training Block exercises."}
        </p>
        <ul className="active-training-plan-progress__detail-list">
          {activePreview.rotation.rotated.map((rotation) => {
            const loadSuggestion = activeLoadSuggestions.find(
              (suggestion) => suggestion.exerciseId === rotation.nextExerciseId,
            );

            return (
              <li
                key={`${rotation.templateId}-${rotation.groupId}-${rotation.slotIndex}-${rotation.nextExerciseId}`}
              >
                <span>
                  {rotation.templateLabel} · {rotation.slotLabel}
                </span>
                <span>
                  {rotation.previousExerciseName} → {rotation.nextExerciseName}
                </span>
                <span>{rotation.reason}</span>
                {loadSuggestion
                  ? renderLoadSuggestionFields(loadSuggestion, rotation.nextExerciseName)
                  : null}
              </li>
            );
          })}
          {activePreview.rotation.kept.map((kept) => {
            const loadSuggestion = activeLoadSuggestions.find(
              (suggestion) => suggestion.exerciseId === kept.exerciseId,
            );

            return (
              <li key={`${kept.templateId}-${kept.groupId}-${kept.slotIndex}-${kept.exerciseId}`}>
                <span>
                  {kept.templateLabel} · {kept.slotLabel}
                </span>
                <span>{kept.exerciseName}</span>
                <span>{kept.reason}</span>
                {loadSuggestion
                  ? renderLoadSuggestionFields(loadSuggestion, kept.exerciseName)
                  : null}
              </li>
            );
          })}
        </ul>
      </section>
      <section
        className="active-training-plan-progress__review-section"
        aria-label="Six-week RIR ramp"
      >
        <p className="active-training-plan-progress__section-title">Six-week RIR ramp</p>
        <ul className="active-training-plan-progress__rir-list">
          {activePreview.weeklyIntensityTargets.map((target) => (
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
      {transition.accept ? (
        <div className="active-training-plan-progress__button-row">
          <button
            className="active-training-plan-progress__secondary-button"
            onClick={() =>
              setReviewMode((currentMode) =>
                currentMode === "accept_proposal" ? "skip_rotation" : "accept_proposal",
              )
            }
            type="button"
          >
            {reviewMode === "skip_rotation" ? "Review rotation proposal" : "Skip rotation proposal"}
          </button>
          <button
            className="active-training-plan-progress__accept"
            disabled={isAccepting}
            onClick={async () => {
              setIsAccepting(true);

              try {
                await transition.accept?.({
                  reviewMode,
                  suggestions: activeLoadSuggestions,
                });
              } finally {
                setIsAccepting(false);
              }
            }}
            type="button"
          >
            {isAccepting
              ? "Saving next Training Block..."
              : reviewMode === "skip_rotation"
                ? "Create next Training Block"
                : "Accept next Training Block"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function UndoAcceptedTrainingBlockCallout({
  transition,
}: {
  transition: AcceptedTrainingBlockTransitionWorkflow;
}) {
  const [isUndoing, setIsUndoing] = useState(false);

  if (!transition.undo) {
    return null;
  }

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
            await transition.undo?.();
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

function formatWeeklyTargetRir(minTargetRir: number, maxTargetRir: number): string {
  return minTargetRir === maxTargetRir
    ? `${minTargetRir} RIR`
    : `${maxTargetRir}-${minTargetRir} RIR`;
}

export function getCurrentBlockWeek({
  trainingBlock,
}: {
  trainingBlock?: { weekNumber: number };
}): number {
  return trainingBlock?.weekNumber ?? 2;
}

export function getBlockProgressPercent({
  blockWeek,
  trainingBlockWeeks,
}: {
  blockWeek: number;
  trainingBlockWeeks: number;
}): number {
  return Math.round((blockWeek / trainingBlockWeeks) * 100);
}

function getTrainingBlockFocus(blockWeek: number, trainingBlockWeeks: number): string {
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
