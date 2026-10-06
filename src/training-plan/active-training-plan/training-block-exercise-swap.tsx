import { ArrowLeftRight } from "lucide-react";
import { useEffect, useId, useState } from "react";
import type { TrainingBlockExerciseRole, TrainingBlockExerciseSwapChoice } from "../training-block";
import { formatExerciseRole, formatMovementPattern } from "../training-plan-presentation";
import "./training-block-exercise-swap.css";

export function TrainingBlockExerciseSwap({
  actionLabel = "Swap exercise",
  affectedSlotCount,
  choices,
  dialogTitle,
  isPending = false,
  movementPattern,
  onApply,
  role,
  scopeCopy,
}: {
  actionLabel?: string;
  affectedSlotCount?: number;
  choices: ReadonlyArray<TrainingBlockExerciseSwapChoice>;
  dialogTitle: string;
  isPending?: boolean;
  movementPattern: Parameters<typeof formatMovementPattern>[0];
  onApply: (exerciseId: string) => Promise<void> | void;
  role: TrainingBlockExerciseRole;
  scopeCopy: string;
}) {
  const titleId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>(
    choices[0]?.exerciseId ?? "",
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setSelectedExerciseId(choices[0]?.exerciseId ?? "");
  }, [choices, isOpen]);

  const selectedChoice =
    choices.find((choice) => choice.exerciseId === selectedExerciseId) ?? choices[0] ?? null;

  async function handleApply() {
    if (!selectedChoice) {
      return;
    }

    setIsApplying(true);

    try {
      await onApply(selectedChoice.exerciseId);
      setIsOpen(false);
    } finally {
      setIsApplying(false);
    }
  }

  return (
    <>
      <button
        aria-label={actionLabel}
        className="training-block-exercise-swap__trigger"
        disabled={isPending}
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <ArrowLeftRight aria-hidden="true" className="training-block-exercise-swap__trigger-icon" />
        Swap
      </button>
      {isOpen ? (
        <div
          aria-labelledby={titleId}
          aria-modal="true"
          className="training-block-exercise-swap"
          role="dialog"
        >
          <div className="training-block-exercise-swap__surface">
            <div className="training-block-exercise-swap__header">
              <div>
                <h3 className="training-block-exercise-swap__title" id={titleId}>
                  {dialogTitle}
                </h3>
                <p className="training-block-exercise-swap__copy">{scopeCopy}</p>
              </div>
              <button
                aria-label={`Close ${dialogTitle}`}
                className="training-block-exercise-swap__close"
                disabled={isApplying}
                onClick={() => setIsOpen(false)}
                type="button"
              >
                Close
              </button>
            </div>

            <div className="training-block-exercise-swap__meta">
              <span>{formatMovementPattern(movementPattern)}</span>
              <span>{formatExerciseRole(role)}</span>
              {typeof affectedSlotCount === "number" ? (
                <span>
                  {affectedSlotCount}{" "}
                  {affectedSlotCount === 1 ? "generated slot" : "generated slots"}
                </span>
              ) : null}
            </div>

            <label className="training-block-exercise-swap__field">
              <span>Compatible replacement</span>
              <select
                aria-label="Compatible replacement"
                className="training-block-exercise-swap__select"
                onChange={(event) => setSelectedExerciseId(event.currentTarget.value)}
                value={selectedExerciseId}
              >
                {choices.map((choice) => (
                  <option key={choice.exerciseId} value={choice.exerciseId}>
                    {choice.exerciseName}
                  </option>
                ))}
              </select>
            </label>
            {selectedChoice ? (
              <p className="training-block-exercise-swap__choice-reason">{selectedChoice.reason}</p>
            ) : null}

            <div className="training-block-exercise-swap__actions">
              <button
                className="training-block-exercise-swap__secondary"
                disabled={isApplying}
                onClick={() => setIsOpen(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="training-block-exercise-swap__primary"
                disabled={isApplying || !selectedChoice}
                onClick={() => {
                  void handleApply();
                }}
                type="button"
              >
                {isApplying ? "Applying swap..." : "Apply swap"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
