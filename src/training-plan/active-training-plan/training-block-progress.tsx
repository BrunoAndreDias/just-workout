import { useState } from "react";
import type { NextTrainingBlockTransitionWorkflow } from "../index";
import "./training-block-progress.css";

export function TrainingBlockProgress({
  blockProgressPercent,
  blockWeek,
  cycleNumber = 1,
  nextTrainingBlockTransition,
  trainingBlockWeeks,
}: {
  blockProgressPercent: number;
  blockWeek: number;
  cycleNumber?: number;
  nextTrainingBlockTransition?: NextTrainingBlockTransitionWorkflow;
  trainingBlockWeeks: number;
}) {
  const weeksUntilRotation = Math.max(trainingBlockWeeks - blockWeek, 0);
  const summaryId = `training-block-${cycleNumber}-summary`;
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const isNextBlockReady = weeksUntilRotation === 0 && nextTrainingBlockTransition !== undefined;

  return (
    <section className="active-training-plan-progress" aria-labelledby={summaryId}>
      <h2 id={summaryId}>Cycle {cycleNumber}</h2>
      <p>
        Cycle {cycleNumber} · Week {blockWeek} of {trainingBlockWeeks}
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
        After week 6, Just Workout can rotate exercises and prefill starting loads based on your
        previous cycle.
      </p>
      <TrainingBlockProgressActions
        isPreviewExpanded={isPreviewExpanded}
        isReady={isNextBlockReady}
        onExpandPreview={() => setIsPreviewExpanded(true)}
        transition={nextTrainingBlockTransition}
      />
    </section>
  );
}

function TrainingBlockProgressActions({
  isPreviewExpanded,
  isReady,
  onExpandPreview,
  transition,
}: {
  isPreviewExpanded: boolean;
  isReady: boolean;
  onExpandPreview: () => void;
  transition?: NextTrainingBlockTransitionWorkflow;
}) {
  if (!isReady || !transition) {
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
        Generate next cycle
      </button>
      {isPreviewExpanded ? <TrainingBlockPreviewDetails transition={transition} /> : null}
    </>
  );
}

function TrainingBlockPreviewSummary({
  transition,
}: {
  transition: NextTrainingBlockTransitionWorkflow;
}) {
  const { preview } = transition;

  return (
    <div className="active-training-plan-progress__preview">
      <h3>Next cycle preview</h3>
      <p>
        {preview.rotation.rotated.length}{" "}
        {preview.rotation.rotated.length === 1 ? "exercise" : "exercises"} rotated
      </p>
      <p>
        {preview.rotation.kept.length}{" "}
        {preview.rotation.kept.length === 1 ? "exercise" : "exercises"} kept
      </p>
    </div>
  );
}

function TrainingBlockPreviewDetails({
  transition,
}: {
  transition: NextTrainingBlockTransitionWorkflow;
}) {
  const { preview } = transition;
  const [loadSuggestions, setLoadSuggestions] = useState(preview.loadSuggestions);
  const [isAccepting, setIsAccepting] = useState(false);
  const [loadInputValues, setLoadInputValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      preview.loadSuggestions.map((suggestion) => [
        suggestion.exerciseId,
        String(suggestion.userEditedLoad ?? suggestion.suggestedLoad),
      ]),
    ),
  );

  return (
    <div className="active-training-plan-progress__details">
      <h3>Exercise rotation preview</h3>
      <ul className="active-training-plan-progress__detail-list">
        {preview.rotation.rotated.map((rotation) => {
          const loadSuggestion = loadSuggestions.find(
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
              {loadSuggestion ? (
                <>
                  <span>Previous load: {formatLoad(loadSuggestion.previousLoad)}</span>
                  <span>Suggested start: {formatLoad(loadSuggestion.suggestedLoad)}</span>
                  <span>{loadSuggestion.reason}</span>
                  <span className="active-training-plan-progress__load-edit">
                    <label htmlFor={`load-suggestion-${loadSuggestion.exerciseId}`}>
                      Suggested starting load for {rotation.nextExerciseName}
                    </label>
                    <input
                      id={`load-suggestion-${loadSuggestion.exerciseId}`}
                      inputMode="decimal"
                      min={0}
                      onChange={(event) => {
                        const nextValue = event.currentTarget.value;

                        setLoadInputValues((current) => ({
                          ...current,
                          [loadSuggestion.exerciseId]: nextValue,
                        }));

                        if (nextValue.trim() === "") {
                          return;
                        }

                        const nextLoad = Number(nextValue);

                        if (!Number.isFinite(nextLoad)) {
                          return;
                        }

                        setLoadSuggestions((current) =>
                          transition.editLoadSuggestion({
                            exerciseId: loadSuggestion.exerciseId,
                            suggestions: current,
                            userEditedLoad: nextLoad,
                          }),
                        );
                      }}
                      step={2.5}
                      type="number"
                      value={
                        loadInputValues[loadSuggestion.exerciseId] ??
                        String(loadSuggestion.userEditedLoad ?? loadSuggestion.suggestedLoad)
                      }
                    />
                  </span>
                  {loadSuggestion.userEditedLoad === null ? null : (
                    <span>Edited start: {formatLoad(loadSuggestion.userEditedLoad)}</span>
                  )}
                </>
              ) : null}
            </li>
          );
        })}
        {preview.rotation.kept.map((kept) => (
          <li key={`${kept.templateId}-${kept.groupId}-${kept.slotIndex}-${kept.exerciseId}`}>
            <span>
              {kept.templateLabel} · {kept.slotLabel}
            </span>
            <span>{kept.exerciseName}</span>
            <span>{kept.reason}</span>
          </li>
        ))}
      </ul>
      {transition.accept ? (
        <button
          className="active-training-plan-progress__accept"
          disabled={isAccepting}
          onClick={async () => {
            setIsAccepting(true);

            try {
              await transition.accept?.({ suggestions: loadSuggestions });
            } finally {
              setIsAccepting(false);
            }
          }}
          type="button"
        >
          {isAccepting ? "Saving next cycle..." : "Accept next cycle"}
        </button>
      ) : null}
    </div>
  );
}

function formatLoad(load: number | null): string {
  return load === null ? "No previous load" : `${load} kg`;
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
    return "Ready for exercise rotation";
  }

  return "Complete each Training Week in this block to unlock exercise rotation";
}
