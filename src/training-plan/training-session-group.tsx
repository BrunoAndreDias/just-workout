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
  changeTrainingSessionExecutionSetRir,
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
  const finalRoundIndex = group.rounds[group.rounds.length - 1]?.roundIndex ?? 0;
  const roundIndexes = group.rounds.map((round) => round.roundIndex);
  const exerciseRows = createExerciseRows(group);

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
                  <th scope="col">Exercise</th>
                  {group.rounds.map((round) => (
                    <th key={`${group.groupId}-set-${round.roundIndex}`} scope="col">
                      Set {round.roundIndex}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {exerciseRows.map((exerciseRow) => (
                  <ExerciseSessionRow
                    exerciseRow={exerciseRow}
                    finalRoundIndex={finalRoundIndex}
                    key={exerciseRow.rowId}
                    onAction={onAction}
                    roundIndexes={roundIndexes}
                  />
                ))}
              </tbody>
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
  if (groupSummary.isComplete && !isOpen) {
    return (
      <p>
        <strong className="training-session-group__complete-state">
          <CheckCircle2 aria-hidden="true" />
          Complete
        </strong>
        <span>{groupSummary.plannedSetCount} sets logged</span>
      </p>
    );
  }

  if (isOpen) {
    return (
      <p>
        <span>Superset</span>
        <span>{roundCount} rounds</span>
        <strong className="training-session-group__sets-completed">
          {groupSummary.completedSetCount}/{groupSummary.plannedSetCount} sets completed
        </strong>
      </p>
    );
  }

  return (
    <p>
      <span>{groupSummary.exerciseCount} exercises</span>
      <span>{groupSummary.plannedSetCount} planned sets</span>
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
        {group.now.targetRepsLabel} · {group.now.targetRirLabel}
        <span className="training-session-prescription">{group.now.prescriptionLabel}</span>
      </small>
    </p>
  );
}

type ExerciseSessionRow = {
  exerciseName: string;
  movementPatternLabel: string;
  prescriptionLabel: string;
  rowId: string;
  sets: ReadonlyArray<TrainingSessionExecutionSetRow | null>;
};

function createExerciseRows(group: TrainingSessionExecutionGroup): ExerciseSessionRow[] {
  const roundIndexes = group.rounds.map((round) => round.roundIndex);
  const exerciseRows = new Map<string, ExerciseSessionRow>();

  for (const round of group.rounds) {
    for (const row of round.rows) {
      const rowId = getExerciseRowId(row);
      const exerciseRow =
        exerciseRows.get(rowId) ??
        ({
          exerciseName: row.exerciseName,
          movementPatternLabel: row.movementPatternLabel,
          prescriptionLabel: row.prescriptionLabel,
          rowId,
          sets: roundIndexes.map(() => null),
        } satisfies ExerciseSessionRow);
      const setPosition = roundIndexes.indexOf(row.setIndex);

      if (setPosition >= 0) {
        exerciseRow.sets = exerciseRow.sets.map((currentSet, index) =>
          index === setPosition ? row : currentSet,
        );
      }

      exerciseRows.set(rowId, exerciseRow);
    }
  }

  return Array.from(exerciseRows.values());
}

function getExerciseRowId(row: TrainingSessionExecutionSetRow): string {
  return row.setId.replace(/-set-\d+$/, "");
}

function ExerciseSessionRow({
  exerciseRow,
  finalRoundIndex,
  onAction,
  roundIndexes,
}: {
  exerciseRow: ExerciseSessionRow;
  finalRoundIndex: number;
  onAction: (action: TrainingSessionExecutionAction) => void;
  roundIndexes: ReadonlyArray<number>;
}) {
  return (
    <tr className="training-session-exercise-row">
      <th scope="row">
        <span className="training-session-exercise-row__name">{exerciseRow.exerciseName}</span>
        <span className="training-session-exercise-row__meta">
          {exerciseRow.movementPatternLabel}
          <span className="training-session-prescription">{exerciseRow.prescriptionLabel}</span>
        </span>
      </th>
      {exerciseRow.sets.map((row, index) => (
        <TrainingSessionSetCell
          isFuture={row?.setIndex === finalRoundIndex}
          key={row?.setId ?? `${exerciseRow.rowId}-empty-set-${roundIndexes[index]}`}
          onAction={onAction}
          row={row}
          setIndex={roundIndexes[index] ?? index + 1}
        />
      ))}
    </tr>
  );
}

function TrainingSessionSetCell({
  isFuture,
  onAction,
  row,
  setIndex,
}: {
  isFuture: boolean;
  onAction: (action: TrainingSessionExecutionAction) => void;
  row: TrainingSessionExecutionSetRow | null;
  setIndex: number;
}) {
  if (!row) {
    return (
      <td
        className="training-session-set-cell training-session-set-cell--empty"
        data-set-label={`Set ${setIndex}`}
      >
        <span>Not planned</span>
      </td>
    );
  }

  return (
    <td
      className={getTrainingSessionSetCellClassName({
        done: row.done,
        isFuture,
      })}
      data-set-label={`Set ${setIndex}`}
    >
      <TrainingSessionSetControls onAction={onAction} row={row} />
    </td>
  );
}

function TrainingSessionSetControls({
  onAction,
  row,
}: {
  onAction: (action: TrainingSessionExecutionAction) => void;
  row: TrainingSessionExecutionSetRow;
}) {
  return (
    <div className="training-session-set-cell__inner">
      <div className="training-session-set-cell__controls">
        <label className="training-session-sr" htmlFor={`${row.inputId}-weight`}>
          {row.exerciseName} set {row.setIndex} weight
        </label>
        <div className="training-session-weight-input">
          <input
            aria-label={`${row.exerciseName} set ${row.setIndex} weight`}
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
        <label className="training-session-sr" htmlFor={`${row.inputId}-reps`}>
          {row.exerciseName} set {row.setIndex} reps
        </label>
        <input
          aria-label={`${row.exerciseName} set ${row.setIndex} reps`}
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
        <label className="training-session-sr" htmlFor={`${row.inputId}-rir`}>
          {row.exerciseName} set {row.setIndex} RIR
        </label>
        <input
          aria-label={`${row.exerciseName} set ${row.setIndex} RIR`}
          className="training-session-reps-input"
          id={`${row.inputId}-rir`}
          inputMode="numeric"
          min="0"
          onChange={(event) =>
            onAction(changeTrainingSessionExecutionSetRir(row, event.target.value))
          }
          type="number"
          value={row.rir}
        />
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
      </div>
      <span className="training-session-set-cell__previous">
        Prev <strong>{row.previousSetLabel}</strong> · Target RIR <strong>{row.targetRir}</strong>
      </span>
    </div>
  );
}

function getTrainingSessionSetCellClassName(row: { done: boolean; isFuture: boolean }): string {
  return [
    "training-session-set-cell",
    row.done ? "training-session-set-cell--done" : "",
    row.isFuture ? "training-session-set-cell--future" : "",
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
