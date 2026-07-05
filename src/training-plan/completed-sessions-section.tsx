import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { parsePositiveBodyweight } from "./bodyweight-input";
import {
  formatCompletedDate,
  formatLoadedSetCount,
  formatTrainingSessionVolumeProgression,
  formatWeight,
  getTrainingHistoryExerciseKey,
} from "./training-history-formatting";
import type {
  TrainingHistorySessionExerciseReport,
  TrainingHistorySessionReport,
} from "./training-history-week";
import "./completed-sessions-section.css";

export function CompletedSessionsSection({
  isCompactLayout,
  onSaveHistoricalBodyweightCorrection,
  onToggleSession,
  selectedSession,
  selectedSessions,
}: {
  isCompactLayout: boolean;
  onSaveHistoricalBodyweightCorrection: (sessionId: string, bodyweight: number) => Promise<unknown>;
  onToggleSession: (sessionId: string) => void;
  selectedSession: TrainingHistorySessionReport | null;
  selectedSessions: ReadonlyArray<TrainingHistorySessionReport>;
}) {
  return (
    <section className="training-history-list" aria-labelledby="training-history-list-title">
      <div className="training-history-section-heading">
        <div>
          <h2 id="training-history-list-title">Completed sessions</h2>
          <p>Compare each session with the previous time you ran the same Workout Template.</p>
        </div>
      </div>
      {selectedSessions.length > 0 ? (
        <>
          <div className="training-history-list__header" aria-hidden="true">
            <span>Session</span>
            <span>Completed Load Volume</span>
            <span>Loaded Sets</span>
          </div>
          <div className="training-history-list__items">
            {selectedSessions.map((session) => (
              <CompletedSessionRow
                isCompactLayout={isCompactLayout}
                isExpanded={session.id === selectedSession?.id}
                key={session.id}
                onSaveHistoricalBodyweightCorrection={onSaveHistoricalBodyweightCorrection}
                session={session}
                onToggleSession={onToggleSession}
              />
            ))}
          </div>
        </>
      ) : (
        <p className="training-history-empty">
          No completed Training Sessions in this Training Week.
        </p>
      )}
    </section>
  );
}

function CompletedSessionRow({
  isCompactLayout,
  isExpanded,
  onSaveHistoricalBodyweightCorrection,
  onToggleSession,
  session,
}: {
  isCompactLayout: boolean;
  isExpanded: boolean;
  onSaveHistoricalBodyweightCorrection: (sessionId: string, bodyweight: number) => Promise<unknown>;
  onToggleSession: (sessionId: string) => void;
  session: TrainingHistorySessionReport;
}) {
  const actionLabel = isExpanded
    ? `Hide session ${session.templateLabel}`
    : `View session ${session.templateLabel}`;
  const detailsId = `training-history-session-details-${session.id}`;

  return (
    <article className="training-history-session-row">
      <button
        aria-controls={detailsId}
        aria-expanded={isExpanded}
        aria-label={actionLabel}
        className={`training-history-session-row__summary${
          isExpanded ? " training-history-session-row__summary--expanded" : ""
        }`}
        onClick={() => onToggleSession(session.id)}
        type="button"
      >
        <span className="training-history-session-row__identity">
          <strong>{session.templateLabel}</strong>
          {session.hasPartialVolume ? (
            <small className="training-history-session-row__date">Partial volume</small>
          ) : null}
          <small className="training-history-session-row__progression">
            {formatTrainingSessionVolumeProgression(session.volumeProgression)}
          </small>
          <small className="training-history-session-row__date">
            {formatCompletedDate(session.completedAt)}
          </small>
        </span>
        <span className="training-history-session-row__metric" data-label="Completed Load Volume">
          {formatWeight(session.completedLoadVolume)} kg
        </span>
        <span className="training-history-session-row__metric" data-label="Loaded Sets">
          {formatLoadedSetCount(session.loadedSetCount)}
        </span>
        <span className="training-history-session-row__action" aria-hidden="true">
          <span>{isExpanded ? "Hide session" : "View session"}</span>
          <ChevronDown
            className={`training-history-session-row__chevron${
              isExpanded ? " training-history-session-row__chevron--expanded" : ""
            }`}
            data-expanded={isExpanded}
          />
        </span>
      </button>
      {isExpanded ? (
        <CompletedSessionDetails
          detailsId={detailsId}
          isCompactLayout={isCompactLayout}
          onSaveHistoricalBodyweightCorrection={onSaveHistoricalBodyweightCorrection}
          session={session}
        />
      ) : null}
    </article>
  );
}

function CompletedSessionDetails({
  detailsId,
  isCompactLayout,
  onSaveHistoricalBodyweightCorrection,
  session,
}: {
  detailsId: string;
  isCompactLayout: boolean;
  onSaveHistoricalBodyweightCorrection: (sessionId: string, bodyweight: number) => Promise<unknown>;
  session: TrainingHistorySessionReport;
}) {
  return (
    <section
      aria-label={`${session.templateLabel} session details`}
      className="training-history-session-details"
      id={detailsId}
    >
      {session.hasPartialVolume ? (
        <p className="training-history-empty">
          Partial volume comparison: Session Bodyweight missing for one or more bodyweight
          exercises.
        </p>
      ) : null}
      {session.loadedSetCount === 0 && !session.hasPartialVolume ? (
        <p className="training-history-empty">No loaded sets recorded for this session.</p>
      ) : null}
      {session.hasBodyweightExercises ? (
        <HistoricalBodyweightCorrectionForm
          onSaveHistoricalBodyweightCorrection={onSaveHistoricalBodyweightCorrection}
          session={session}
        />
      ) : null}
      {isCompactLayout ? (
        <CompletedSessionExerciseCards exercises={session.exercises} />
      ) : (
        <table className="training-history-volume-table">
          <thead>
            <tr>
              <th scope="col">Exercise</th>
              <th scope="col">Movement pattern</th>
              <th scope="col">Loaded Sets</th>
              <th scope="col">Completed Load Volume</th>
            </tr>
          </thead>
          <tbody>
            {session.exercises.map((exercise) => (
              <CompletedSessionExerciseRow
                key={getTrainingHistoryExerciseKey(exercise)}
                exercise={exercise}
              />
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function HistoricalBodyweightCorrectionForm({
  onSaveHistoricalBodyweightCorrection,
  session,
}: {
  onSaveHistoricalBodyweightCorrection: (sessionId: string, bodyweight: number) => Promise<unknown>;
  session: TrainingHistorySessionReport;
}) {
  const [bodyweightInput, setBodyweightInput] = useState(
    session.sessionBodyweight?.toString() ?? "",
  );

  useEffect(() => {
    setBodyweightInput(session.sessionBodyweight?.toString() ?? "");
  }, [session.sessionBodyweight]);

  return (
    <form
      className="training-history-session-bodyweight-form"
      onSubmit={(event) => {
        event.preventDefault();

        const bodyweight = parsePositiveBodyweight(bodyweightInput);

        if (bodyweight !== null) {
          void onSaveHistoricalBodyweightCorrection(session.id, bodyweight);
        }
      }}
    >
      <label className="training-history-session-bodyweight-form__field">
        <span>Historical Bodyweight Correction</span>
        <div className="training-history-session-bodyweight-form__input">
          <input
            aria-label="Historical Bodyweight Correction"
            inputMode="decimal"
            min="0"
            onChange={(event) => setBodyweightInput(event.target.value)}
            type="number"
            value={bodyweightInput}
          />
          <span>kg</span>
        </div>
      </label>
      <button type="submit">Save historical bodyweight correction</button>
    </form>
  );
}

function CompletedSessionExerciseCards({
  exercises,
}: {
  exercises: ReadonlyArray<TrainingHistorySessionExerciseReport>;
}) {
  return (
    <ul className="training-history-session-details-cards">
      {exercises.map((exercise) => (
        <CompletedSessionExerciseCard
          exercise={exercise}
          key={getTrainingHistoryExerciseKey(exercise)}
        />
      ))}
    </ul>
  );
}

function CompletedSessionExerciseCard({
  exercise,
}: {
  exercise: TrainingHistorySessionExerciseReport;
}) {
  return (
    <li className="training-history-session-detail-card">
      <dl className="training-history-session-detail-card__metrics">
        <div>
          <dt>Exercise</dt>
          <dd>{exercise.exerciseName}</dd>
        </div>
        <div>
          <dt>Movement pattern</dt>
          <dd>{exercise.movementPatternLabel}</dd>
        </div>
        <div>
          <dt>Loaded sets</dt>
          <dd>{formatLoadedSetCount(exercise.loadedSetCount)}</dd>
        </div>
        <div>
          <dt>Completed load volume</dt>
          <dd>{formatWeight(exercise.completedLoadVolume)} kg</dd>
        </div>
      </dl>
    </li>
  );
}

function CompletedSessionExerciseRow({
  exercise,
}: {
  exercise: TrainingHistorySessionExerciseReport;
}) {
  return (
    <tr>
      <td>{exercise.exerciseName}</td>
      <td>{exercise.movementPatternLabel}</td>
      <td>{formatLoadedSetCount(exercise.loadedSetCount)}</td>
      <td>{formatWeight(exercise.completedLoadVolume)} kg</td>
    </tr>
  );
}
