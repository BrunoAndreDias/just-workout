import { X } from "lucide-react";
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
        className="pill-btn"
        disabled={isPending}
        onClick={() => setIsOpen(true)}
        type="button"
      >
        {actionLabel}
      </button>
      {isOpen ? (
        <div className="panel-layer">
          <div aria-hidden="true" className="scrim" />
          <div aria-labelledby={titleId} aria-modal="true" className="panel" role="dialog">
            <div className="panel-top">
              <div className="panel-title-row">
                <div>
                  <h3 className="panel-title" id={titleId}>
                    {dialogTitle}
                  </h3>
                  <p className="panel-note">{scopeCopy}</p>
                </div>
                <button
                  aria-label={`Close ${dialogTitle}`}
                  className="icon-btn panel-close"
                  disabled={isApplying}
                  onClick={() => setIsOpen(false)}
                  type="button"
                >
                  <X aria-hidden="true" size={18} strokeWidth={2} />
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
            </div>

            <div className="panel-body panel-form">
              <label className="field">
                <span className="field-label">Compatible replacement</span>
                <select
                  aria-label="Compatible replacement"
                  className="field-input"
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
              {selectedChoice ? <p className="panel-note">{selectedChoice.reason}</p> : null}
            </div>

            <div className="panel-foot training-block-exercise-swap__actions">
              <button
                className="secondary"
                disabled={isApplying}
                onClick={() => setIsOpen(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="primary"
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
