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
import type {
  TrainingSessionExerciseTargetComparison,
  TrainingSessionSetTargetOutcome,
  TrainingSessionTargetSummary,
} from "./training-session-target-comparison";
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
  const actionLabel = getCompletedSessionActionLabel({ isExpanded, session });
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
        <CompletedSessionIdentity session={session} />
        <span className="training-history-session-row__metric" data-label="Completed Load Volume">
          {formatWeight(session.completedLoadVolume)} kg
        </span>
        <span className="training-history-session-row__metric" data-label="Loaded Sets">
          {formatLoadedSetCount(session.loadedSetCount)}
        </span>
        <CompletedSessionActionIndicator isExpanded={isExpanded} />
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

function getCompletedSessionActionLabel({
  isExpanded,
  session,
}: {
  isExpanded: boolean;
  session: TrainingHistorySessionReport;
}) {
  const prefix = session.sessionIntent === "extra" ? "extra " : "";

  return `${isExpanded ? "Hide" : "View"} ${prefix}session ${session.templateLabel}`;
}

function CompletedSessionIdentity({ session }: { session: TrainingHistorySessionReport }) {
  return (
    <span className="training-history-session-row__identity">
      <strong>{session.templateLabel}</strong>
      {session.sessionIntent === "extra" ? (
        <small className="training-history-session-row__date">Extra Training Session</small>
      ) : null}
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
  );
}

function CompletedSessionActionIndicator({ isExpanded }: { isExpanded: boolean }) {
  return (
    <span className="training-history-session-row__action" aria-hidden="true">
      <span>{isExpanded ? "Hide session" : "View session"}</span>
      <ChevronDown
        className={`training-history-session-row__chevron${
          isExpanded ? " training-history-session-row__chevron--expanded" : ""
        }`}
        data-expanded={isExpanded}
      />
    </span>
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
      aria-label={`${session.templateLabel} ${
        session.sessionIntent === "extra" ? "extra " : ""
      }session details`}
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
      {session.targetComparisons.length > 0 ? (
        <CompletedSessionTargetComparisons
          comparisons={session.targetComparisons}
          sessionId={session.id}
          summary={session.targetSummary}
        />
      ) : null}
    </section>
  );
}

function CompletedSessionTargetComparisons({
  comparisons,
  sessionId,
  summary,
}: {
  comparisons: ReadonlyArray<TrainingSessionExerciseTargetComparison>;
  sessionId: string;
  summary: TrainingSessionTargetSummary;
}) {
  const titleId = `${sessionId}-targets-title`;

  return (
    <section aria-labelledby={titleId} className="training-history-targets">
      <div className="training-history-targets__header">
        <h3 id={titleId}>Session Targets vs actual</h3>
        {summary.targetCount > 0 ? (
          <p>
            Hit {summary.hitCount} of {summary.targetCount} targets
          </p>
        ) : null}
      </div>
      {comparisons.map((exercise) => (
        <div className="training-history-targets__exercise" key={exercise.exerciseId}>
          <p className="training-history-targets__exercise-name">{exercise.exerciseName}</p>
          <ol
            aria-label={`${exercise.exerciseName} sets`}
            className="training-history-targets__sets"
          >
            {exercise.sets.map((set) => (
              <li className="training-history-targets__set" key={set.setIndex}>
                <span className="training-history-targets__set-index">Set {set.setIndex}</span>
                <span className="training-history-targets__actual">{set.actualLabel}</span>
                {set.targetLabel ? (
                  <span className="training-history-targets__target">Target {set.targetLabel}</span>
                ) : null}
                {set.outcome ? <CompletedSetTargetOutcome outcome={set.outcome} /> : null}
              </li>
            ))}
          </ol>
        </div>
      ))}
    </section>
  );
}

function CompletedSetTargetOutcome({
  outcome,
}: {
  outcome: Exclude<TrainingSessionSetTargetOutcome, null>;
}) {
  return (
    <span
      className={`training-history-targets__outcome training-history-targets__outcome--${outcome}`}
    >
      {outcome === "hit" ? "Hit" : "Missed"}
    </span>
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
