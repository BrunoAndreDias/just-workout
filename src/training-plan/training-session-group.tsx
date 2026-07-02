import { CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import type {
  TrainingSessionExecutionAction,
  TrainingSessionExecutionGroup,
  TrainingSessionExecutionGroupSummary,
  TrainingSessionExecutionSetRow,
} from "./training-session-execution";
import {
  changeTrainingSessionExecutionSetDone,
  changeTrainingSessionExecutionSetReps,
  changeTrainingSessionExecutionSetWeight,
  toggleTrainingSessionExecutionGroup,
} from "./training-session-execution";
import "./training-session-group.css";

export function TrainingSessionGroup({
  group,
  onAction,
}: {
  group: TrainingSessionExecutionGroup;
  onAction: (action: TrainingSessionExecutionAction) => void;
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
          <TrainingSessionGroupSummary
            groupSummary={group.summary}
            isOpen={group.isOpen}
            roundCount={group.rounds.length}
          />
        </div>
        <button
          aria-expanded={group.isOpen}
          aria-label={`${group.isOpen ? "Collapse" : "Expand"} ${group.title}`}
          className="training-session-group__toggle"
          onClick={() => onAction(toggleTrainingSessionExecutionGroup(group))}
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
                  lastPlannedRoundIndex={group.rounds[group.rounds.length - 1]?.roundIndex ?? 0}
                  onAction={onAction}
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
  roundCount,
}: {
  groupSummary: TrainingSessionExecutionGroupSummary;
  isOpen: boolean;
  roundCount: number;
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
          <span>{roundCount} rounds</span>
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
  onAction,
  round,
  lastPlannedRoundIndex,
}: {
  onAction: (action: TrainingSessionExecutionAction) => void;
  round: TrainingSessionExecutionGroup["rounds"][number];
  lastPlannedRoundIndex: number;
}) {
  return (
    <tbody aria-label={`Round ${round.roundIndex} superset`} className="training-session-round">
      {round.rows.map((row) => (
        <tr
          className={getTrainingSessionRowClassName({
            done: row.done,
            isFuture: row.setIndex === lastPlannedRoundIndex,
          })}
          key={row.setId}
        >
          <TrainingSessionSetCells onAction={onAction} row={row} />
        </tr>
      ))}
    </tbody>
  );
}

function TrainingSessionSetCells({
  onAction,
  row,
}: {
  onAction: (action: TrainingSessionExecutionAction) => void;
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
              onAction(changeTrainingSessionExecutionSetWeight(row, event.target.value))
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
            onAction(changeTrainingSessionExecutionSetReps(row, event.target.value))
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
              onAction(changeTrainingSessionExecutionSetDone(row, event.target.checked))
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

function getTrainingSessionRowClassName(row: { done: boolean; isFuture: boolean }): string {
  return [
    "training-session-exercise-row",
    row.done ? "training-session-exercise-row--done" : "",
    row.isFuture ? "training-session-exercise-row--future" : "",
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
