import {
  clampPercentage,
  formatCompletion,
  formatLoadedSetCount,
  formatMovementPatternComparison,
  formatProgress,
  formatTrainingWeekCompletionContext,
  formatTrainingWeekProgressVerdict,
  formatTrainingWeekVolumeReference,
  formatWeight,
  getMovementPatternChangeTone,
  type TrainingHistoryTone,
} from "./training-history-formatting";
import type {
  TrainingHistoryMovementPatternComparison,
  TrainingHistoryWeekReport,
  TrainingHistoryWeekSummary,
} from "./training-history-week";
import "./training-week-section.css";

export function TrainingWeekSection({
  isCompactLayout,
  onSelectWeek,
  trainingWeekReport,
}: {
  isCompactLayout: boolean;
  onSelectWeek: (weekEndKey: string | null) => void;
  trainingWeekReport: TrainingHistoryWeekReport;
}) {
  const previousWeekEndKey = trainingWeekReport.previousWeekEndKey;
  const nextWeekEndKey = trainingWeekReport.nextWeekEndKey;
  const selectedWeekLabel = trainingWeekReport.selectedWeek?.label ?? "No completed sessions yet";

  return (
    <section className="training-history-week" aria-label="Selected Training Week">
      <div className="training-history-week__header">
        <p className="training-history-week__label">Selected Training Week</p>
        <TrainingWeekSelector
          nextWeekEndKey={nextWeekEndKey}
          previousWeekEndKey={previousWeekEndKey}
          selectedWeekLabel={selectedWeekLabel}
          onSelectWeek={onSelectWeek}
        />
      </div>
      <TrainingWeekVerdictSection summary={trainingWeekReport.summary} />
      <TrainingWeekSummaryStrip summary={trainingWeekReport.summary} />
      <WeeklyMovementVolumeReport
        emptyMessage="Complete a Training Session to build a weekly report."
        isCompactLayout={isCompactLayout}
        rows={trainingWeekReport.movementPatternComparisons}
      />
    </section>
  );
}

function TrainingWeekVerdictSection({ summary }: { summary: TrainingHistoryWeekSummary }) {
  return (
    <section className="training-history-verdict" aria-labelledby="training-history-verdict-title">
      <div className="training-history-section-heading">
        <div>
          <h2 id="training-history-verdict-title">Training Week verdict</h2>
          <p>Weekly Completed Load Volume compared with the previous Training Week.</p>
        </div>
      </div>
      <p className="training-history-verdict__label">
        {formatTrainingWeekProgressVerdict(summary.progressVerdict)}
      </p>
      <div className="training-history-verdict__support">
        <p>{formatTrainingWeekVolumeReference(summary.previousWeekVolumeReference)}</p>
        <p>{formatTrainingWeekCompletionContext(summary.completionContext)}</p>
      </div>
    </section>
  );
}

function TrainingWeekSelector({
  nextWeekEndKey,
  onSelectWeek,
  previousWeekEndKey,
  selectedWeekLabel,
}: {
  nextWeekEndKey: string | null;
  onSelectWeek: (weekEndKey: string | null) => void;
  previousWeekEndKey: string | null;
  selectedWeekLabel: string;
}) {
  return (
    <fieldset className="training-history-week-selector">
      <legend className="training-history-week-selector__legend">Training Week selector</legend>
      <button
        className="training-history-week-selector__button"
        disabled={!previousWeekEndKey}
        onClick={() => onSelectWeek(previousWeekEndKey)}
        type="button"
      >
        Previous week
      </button>
      <p className="training-history-week-selector__range">{selectedWeekLabel}</p>
      <button
        className="training-history-week-selector__button"
        disabled={!nextWeekEndKey}
        onClick={() => onSelectWeek(nextWeekEndKey)}
        type="button"
      >
        Next week
      </button>
    </fieldset>
  );
}

function TrainingWeekSummaryStrip({ summary }: { summary: TrainingHistoryWeekSummary }) {
  return (
    <>
      <dl className="training-history-summary-strip">
        <div>
          <dt>Completion</dt>
          <dd>{formatCompletion(summary)}</dd>
        </div>
        <div>
          <dt>Total volume</dt>
          <dd>{formatWeight(summary.totalVolume)} kg</dd>
        </div>
        <div>
          <dt>Progress</dt>
          <dd>{formatProgress(summary.progressPercentage)}</dd>
        </div>
        <div>
          <dt>Loaded sets</dt>
          <dd>{formatLoadedSetCount(summary.loadedSetCount)}</dd>
        </div>
      </dl>
      {summary.hasPartialVolume ? (
        <p className="training-history-empty">Partial volume comparison in this Training Week.</p>
      ) : null}
      {summary.previousWeekVolumeReference?.hasPartialVolume ? (
        <p className="training-history-empty">
          Partial volume comparison in the previous Training Week reference.
        </p>
      ) : null}
    </>
  );
}

function WeeklyMovementVolumeReport({
  emptyMessage,
  isCompactLayout,
  rows,
}: {
  emptyMessage: string;
  isCompactLayout: boolean;
  rows: ReadonlyArray<TrainingHistoryMovementPatternComparison>;
}) {
  return (
    <section
      className="training-history-comparison"
      aria-labelledby="training-history-comparison-title"
    >
      <WeeklyMovementVolumeHeading />
      <div className="training-history-comparison__body">
        <WeeklyMovementVolumeContent
          emptyMessage={emptyMessage}
          isCompactLayout={isCompactLayout}
          rows={rows}
        />
      </div>
    </section>
  );
}

function WeeklyMovementVolumeContent({
  emptyMessage,
  isCompactLayout,
  rows,
}: {
  emptyMessage: string;
  isCompactLayout: boolean;
  rows: ReadonlyArray<TrainingHistoryMovementPatternComparison>;
}) {
  if (rows.length === 0) {
    return (
      <div>
        <p className="training-history-empty">{emptyMessage}</p>
      </div>
    );
  }

  if (isCompactLayout) {
    return (
      <div>
        <WeeklyMovementVolumeCards rows={rows} />
      </div>
    );
  }

  return (
    <div>
      <WeeklyMovementVolumeTable rows={rows} />
    </div>
  );
}

function WeeklyMovementVolumeHeading() {
  return (
    <div className="training-history-section-heading">
      <div>
        <h2 id="training-history-comparison-title">Weekly movement volume</h2>
        <p>Compare Completed Load Volume against the previous Training Week.</p>
      </div>
    </div>
  );
}

function WeeklyMovementVolumeTable({
  rows,
}: {
  rows: ReadonlyArray<TrainingHistoryMovementPatternComparison>;
}) {
  return (
    <div className="training-history-comparison-table-scroll">
      <table className="training-history-comparison-table">
        <thead>
          <tr>
            <th scope="col">Movement pattern</th>
            <th scope="col">Completed Load Volume</th>
            <th scope="col">Compared with last week</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const changeTone = getMovementPatternChangeTone(row.change);

            return (
              <tr key={row.movementPattern}>
                <td>
                  <div className="training-history-comparison-table__pattern">
                    <span className="training-history-comparison-table__pattern-label">
                      {row.movementPatternLabel}
                    </span>
                    <MovementPatternVolumeBar
                      relativeVolumePercentage={row.relativeVolumePercentage}
                      tone={changeTone}
                    />
                  </div>
                </td>
                <td className="training-history-comparison-table__metric">
                  {formatWeight(row.currentVolume)} kg
                </td>
                <td
                  className={`training-history-comparison-table__delta training-history-comparison-table__delta--${changeTone}`}
                >
                  {formatMovementPatternComparison(row)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function WeeklyMovementVolumeCards({
  rows,
}: {
  rows: ReadonlyArray<TrainingHistoryMovementPatternComparison>;
}) {
  return (
    <ul className="training-history-comparison-cards">
      {rows.map((row) => {
        const changeTone = getMovementPatternChangeTone(row.change);

        return (
          <li className="training-history-comparison-card" key={row.movementPattern}>
            <div className="training-history-comparison-card__header">
              <div className="training-history-comparison-card__pattern">
                <span className="training-history-comparison-card__pattern-label">
                  {row.movementPatternLabel}
                </span>
                <MovementPatternVolumeBar
                  relativeVolumePercentage={row.relativeVolumePercentage}
                  tone={changeTone}
                />
              </div>
            </div>
            <dl className="training-history-comparison-card__metrics">
              <div>
                <dt>Current volume</dt>
                <dd>{formatWeight(row.currentVolume)} kg</dd>
              </div>
              <div>
                <dt>Compared with last week</dt>
                <dd
                  className={`training-history-comparison-card__delta training-history-comparison-card__delta--${changeTone}`}
                >
                  {formatMovementPatternComparison(row)}
                </dd>
              </div>
            </dl>
          </li>
        );
      })}
    </ul>
  );
}

function MovementPatternVolumeBar({
  relativeVolumePercentage,
  tone,
}: {
  relativeVolumePercentage: number;
  tone: TrainingHistoryTone;
}) {
  return (
    <span aria-hidden="true" className="training-history-comparison-table__bar-track">
      <span
        className={`training-history-comparison-table__bar-fill training-history-comparison-table__bar-fill--${tone}`}
        style={{ width: `${clampPercentage(relativeVolumePercentage)}%` }}
      />
    </span>
  );
}
