import { CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import type {
  TrainingSessionExecutionDraftChange,
  TrainingSessionExecutionGroup,
  TrainingSessionExecutionGroupSummary,
  TrainingSessionExecutionSetRow,
} from "./training-session-execution";
import "./training-session-group.css";

export function TrainingSessionGroup({
  group,
  onDraftChange,
  onToggleGroup,
}: {
  group: TrainingSessionExecutionGroup;
  onDraftChange: (change: TrainingSessionExecutionDraftChange) => void;
  onToggleGroup: (groupId: string) => void;
}) {
  return (
    <section
      aria-labelledby={`training-session-group-${group.groupId}`}
      className={getTrainingSessionGroupClassName(group.summary.isComplete, group.isOpen)}
    >
      <header className="training-session-group__header">
        <div>
          <h2 aria-label={group.accessibleTitle} id={`training-session-group-${group.groupId}`}>
            {group.title}
          </h2>
          <TrainingSessionGroupSummary groupSummary={group.summary} isOpen={group.isOpen} />
        </div>
        <button
          aria-expanded={group.isOpen}
          aria-label={`${group.isOpen ? "Collapse" : "Expand"} ${group.title}`}
          className="training-session-group__toggle"
          onClick={() => onToggleGroup(group.groupId)}
          type="button"
        >
          {group.isOpen ? (
            <ChevronUp aria-hidden="true" className="training-session-group__chevron" />
          ) : (
            <ChevronDown aria-hidden="true" className="training-session-group__chevron" />
          )}
        </button>
      </header>

      {group.isOpen ? (
        <>
          <TrainingSessionNow group={group} />
          <div className="training-session-table-wrap">
            <table className="training-session-table">
              <thead>
                <tr>
                  <th scope="col">Round</th>
                  <th scope="col">Exercise</th>
                  <th scope="col">Pattern</th>
                  <th scope="col">Previous</th>
                  <th scope="col">Weight</th>
                  <th scope="col">Reps</th>
                  <th scope="col">Done</th>
                </tr>
              </thead>
              {group.rounds.map((round) => (
                <RoundSessionRows
                  key={`${group.groupId}-round-${round.roundIndex}`}
                  onDraftChange={onDraftChange}
                  round={round}
                />
              ))}
            </table>
          </div>
        </>
      ) : null}
    </section>
  );
}

function TrainingSessionGroupSummary({
  groupSummary,
  isOpen,
}: {
  groupSummary: TrainingSessionExecutionGroupSummary;
  isOpen: boolean;
}) {
  return (
    <p>
      {groupSummary.isComplete && !isOpen ? (
        <>
          <strong className="training-session-group__complete-state">
            <CheckCircle2 aria-hidden="true" />
            Complete
          </strong>
          <span>{groupSummary.plannedSetCount} sets logged</span>
        </>
      ) : isOpen ? (
        <>
          <span>Superset</span>
          <span>3 rounds</span>
          <strong className="training-session-group__sets-completed">
            {groupSummary.completedSetCount}/{groupSummary.plannedSetCount} sets completed
          </strong>
        </>
      ) : (
        <>
          <span>{groupSummary.exerciseCount} exercises</span>
          <span>{groupSummary.plannedSetCount} planned sets</span>
        </>
      )}
    </p>
  );
}

function TrainingSessionNow({ group }: { group: TrainingSessionExecutionGroup }) {
  if (!group.now) {
    return null;
  }

  return (
    <p className="training-session-now">
      <span>Now</span>
      <strong className="training-session-now__exercise" data-exercise={group.now.exerciseName} />
      <small>
        {group.now.movementPatternLabel} · {group.now.roleLabel} · {group.now.setLabel} ·{" "}
        {group.now.targetRepsLabel}
        <span className="training-session-prescription">{group.now.prescriptionLabel}</span>
      </small>
    </p>
  );
}

function RoundSessionRows({
  onDraftChange,
  round,
}: {
  onDraftChange: (change: TrainingSessionExecutionDraftChange) => void;
  round: TrainingSessionExecutionGroup["rounds"][number];
}) {
  return (
    <tbody aria-label={`Round ${round.roundIndex} superset`} className="training-session-round">
      {round.rows.map((row) => (
        <tr
          className={getTrainingSessionRowClassName(row)}
          key={`${row.exerciseKey}-set-${row.setIndex}`}
        >
          <TrainingSessionSetCells onDraftChange={onDraftChange} row={row} />
        </tr>
      ))}
    </tbody>
  );
}

function TrainingSessionSetCells({
  onDraftChange,
  row,
}: {
  onDraftChange: (change: TrainingSessionExecutionDraftChange) => void;
  row: TrainingSessionExecutionSetRow;
}) {
  return (
    <>
      <td>{row.setIndex}</td>
      <td>
        {row.exerciseName}
        <span className="training-session-prescription">{row.prescriptionLabel}</span>
      </td>
      <td>{row.movementPatternLabel}</td>
      <td>{row.previousSetLabel}</td>
      <td>
        <label className="training-session-sr" htmlFor={`${row.inputId}-weight`}>
          Set {row.setIndex} weight
        </label>
        <div className="training-session-weight-input">
          <input
            aria-label={`Set ${row.setIndex} weight`}
            id={`${row.inputId}-weight`}
            inputMode="decimal"
            min={row.weightInputMin}
            onChange={(event) =>
              onDraftChange({
                exerciseKey: row.exerciseKey,
                field: "weight",
                setIndex: row.setIndex,
                value: event.target.value,
              })
            }
            type="number"
            value={row.weight}
          />
          <span>kg</span>
        </div>
      </td>
      <td>
        <label className="training-session-sr" htmlFor={`${row.inputId}-reps`}>
          Set {row.setIndex} reps
        </label>
        <input
          aria-label={`Set ${row.setIndex} reps`}
          className="training-session-reps-input"
          id={`${row.inputId}-reps`}
          inputMode="numeric"
          min="0"
          onChange={(event) =>
            onDraftChange({
              exerciseKey: row.exerciseKey,
              field: "reps",
              setIndex: row.setIndex,
              value: event.target.value,
            })
          }
          type="number"
          value={row.reps}
        />
      </td>
      <td>
        <label className="training-session-done">
          <input
            aria-label={row.doneLabel}
            checked={row.done}
            onChange={(event) =>
              onDraftChange({
                exerciseKey: row.exerciseKey,
                field: "done",
                setIndex: row.setIndex,
                value: event.target.checked,
              })
            }
            type="checkbox"
          />
          <span aria-hidden="true" className="training-session-done__control">
            <span className="training-session-done__mark" />
          </span>
        </label>
      </td>
    </>
  );
}

function getTrainingSessionRowClassName(
  row: Pick<TrainingSessionExecutionSetRow, "done" | "setIndex">,
): string {
  return [
    "training-session-exercise-row",
    row.done ? "training-session-exercise-row--done" : "",
    row.setIndex === 3 ? "training-session-exercise-row--future" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function getTrainingSessionGroupClassName(isComplete: boolean, isOpen: boolean): string {
  return [
    "training-session-group",
    isComplete ? "training-session-group--complete" : "",
    isComplete && !isOpen ? "training-session-group--complete-closed" : "",
  ]
    .filter(Boolean)
    .join(" ");
}
