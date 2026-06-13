import { useQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader, PageMain } from "../design-system/typography";
import {
  buildTrainingHistoryWeekReport,
  type TrainingHistoryMovementPatternComparison,
  type TrainingHistorySessionExerciseReport,
  type TrainingHistorySessionReport,
  type TrainingHistoryWeekReport,
  type TrainingHistoryWeekSummary,
} from "./training-history-week";
import { trainingPlanService } from "./training-plan-service";

const completedDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
});

const weightFormatter = new Intl.NumberFormat("en-US");

export function TrainingSessionHistoryRoute() {
  const planId = useTrainingSessionHistoryPlanId();
  const { trainingPlanQuery, trainingSessionsQuery } = useTrainingHistoryData(planId);
  const trainingPlan = trainingPlanQuery.data;
  const trainingSessions = trainingSessionsQuery.data ?? [];
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedWeekEndKey, setSelectedWeekEndKey] = useState<string | null>(null);
  const trainingWeekReport = useMemo(
    () =>
      trainingPlan
        ? buildTrainingHistoryWeekReport({
            selectedWeekEndKey,
            trainingPlan,
            trainingSessions,
          })
        : null,
    [selectedWeekEndKey, trainingPlan, trainingSessions],
  );

  if (trainingPlanQuery.isLoading || trainingSessionsQuery.isLoading) {
    return <TrainingSessionHistoryShell>Loading Training history...</TrainingSessionHistoryShell>;
  }

  if (!trainingPlan) {
    return <TrainingSessionHistoryShell>Training Plan not found.</TrainingSessionHistoryShell>;
  }

  if (!trainingWeekReport) {
    return <TrainingSessionHistoryShell>Loading Training history...</TrainingSessionHistoryShell>;
  }

  const selectedSessions = trainingWeekReport.selectedSessions;
  const selectedSession =
    selectedSessions.find((session) => session.id === selectedSessionId) ?? null;

  return (
    <section className="training-history-page" aria-label="Training history">
      <PageHeader
        description="Review weekly training volume, compare progress, and inspect completed sessions."
        title="Training history"
      />
      <PageMain className="training-history-layout">
        <TrainingWeekSection
          trainingWeekReport={trainingWeekReport}
          onSelectWeek={setSelectedWeekEndKey}
        />
        <CompletedSessionsSection
          selectedSession={selectedSession}
          selectedSessions={selectedSessions}
          onToggleSession={(sessionId) =>
            setSelectedSessionId((currentSessionId) =>
              currentSessionId === sessionId ? null : sessionId,
            )
          }
        />
      </PageMain>
    </section>
  );
}

function TrainingSessionHistoryShell({ children }: { children: string }) {
  return (
    <section className="training-history-page" aria-label="Training history">
      <p className="active-training-plan-loading">{children}</p>
    </section>
  );
}

function useTrainingHistoryData(planId: string | null) {
  const trainingPlanQuery = useQuery({
    enabled: planId !== null,
    queryFn: () => {
      if (!planId) {
        return null;
      }

      return trainingPlanService.getTrainingPlan(planId);
    },
    queryKey: ["training-plan", planId],
  });
  const trainingSessionsQuery = useQuery({
    enabled: planId !== null,
    queryFn: () => {
      if (!planId) {
        return [];
      }

      return trainingPlanService.getTrainingSessionsForPlan(planId);
    },
    queryKey: ["training-sessions", planId],
  });

  return { trainingPlanQuery, trainingSessionsQuery };
}

function TrainingWeekSection({
  onSelectWeek,
  trainingWeekReport,
}: {
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
      <TrainingWeekSummaryStrip summary={trainingWeekReport.summary} />
      <WeeklyMovementVolumeReport
        emptyMessage="Complete a Training Session to build a weekly report."
        rows={trainingWeekReport.movementPatternComparisons}
      />
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
  );
}

function CompletedSessionsSection({
  onToggleSession,
  selectedSession,
  selectedSessions,
}: {
  onToggleSession: (sessionId: string) => void;
  selectedSession: TrainingHistorySessionReport | null;
  selectedSessions: ReadonlyArray<TrainingHistorySessionReport>;
}) {
  return (
    <section className="training-history-list" aria-labelledby="training-history-list-title">
      <div className="training-history-section-heading">
        <div>
          <h2 id="training-history-list-title">Completed sessions</h2>
          <p>Open a completed Training Session only when you need session-level detail.</p>
        </div>
      </div>
      {selectedSessions.length > 0 ? (
        <div className="training-history-list__items">
          {selectedSessions.map((session) => (
            <CompletedSessionRow
              isExpanded={session.id === selectedSession?.id}
              key={session.id}
              session={session}
              onToggleSession={onToggleSession}
            />
          ))}
        </div>
      ) : (
        <p className="training-history-empty">
          No completed Training Sessions in this Training Week.
        </p>
      )}
    </section>
  );
}

function CompletedSessionRow({
  isExpanded,
  onToggleSession,
  session,
}: {
  isExpanded: boolean;
  onToggleSession: (sessionId: string) => void;
  session: TrainingHistorySessionReport;
}) {
  const actionLabel = isExpanded
    ? `Hide session ${session.templateLabel}`
    : `View session ${session.templateLabel}`;

  return (
    <article className="training-history-session-row">
      <div className="training-history-session-row__summary">
        <div className="training-history-session-row__identity">
          <strong>{session.templateLabel}</strong>
          <small className="training-history-session-row__date">
            {formatCompletedDate(session.completedAt)}
          </small>
        </div>
        <dl className="training-history-session-row__metrics">
          <div>
            <dt>Completed Load Volume</dt>
            <dd>{formatWeight(session.completedLoadVolume)} kg</dd>
          </div>
          <div>
            <dt>Loaded Sets</dt>
            <dd>{formatLoadedSetCount(session.loadedSetCount)}</dd>
          </div>
        </dl>
        <button
          aria-expanded={isExpanded}
          aria-label={actionLabel}
          className="training-history-session-row__action"
          onClick={() => onToggleSession(session.id)}
          type="button"
        >
          {isExpanded ? "Hide session" : "View session"}
        </button>
      </div>
      {isExpanded ? <CompletedSessionDetails session={session} /> : null}
    </article>
  );
}

function CompletedSessionDetails({ session }: { session: TrainingHistorySessionReport }) {
  return (
    <section
      className="training-history-session-details"
      aria-label={`${session.templateLabel} session details`}
    >
      {session.loadedSetCount === 0 ? (
        <p className="training-history-empty">No loaded sets recorded for this session.</p>
      ) : null}
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
            <CompletedSessionExerciseRow key={exercise.exerciseId} exercise={exercise} />
          ))}
        </tbody>
      </table>
    </section>
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

function WeeklyMovementVolumeReport({
  emptyMessage,
  rows,
}: {
  emptyMessage: string;
  rows: ReadonlyArray<TrainingHistoryMovementPatternComparison>;
}) {
  return (
    <section
      className="training-history-comparison"
      aria-labelledby="training-history-comparison-title"
    >
      <WeeklyMovementVolumeHeading />
      {rows.length === 0 ? (
        <p className="training-history-empty">{emptyMessage}</p>
      ) : (
        <WeeklyMovementVolumeTable rows={rows} />
      )}
    </section>
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
            <th scope="col">Delta</th>
            <th scope="col">Change</th>
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
                    <span
                      aria-hidden="true"
                      className="training-history-comparison-table__bar-track"
                    >
                      <span
                        className={`training-history-comparison-table__bar-fill training-history-comparison-table__bar-fill--${changeTone}`}
                        style={{ width: `${row.relativeVolumePercentage}%` }}
                      />
                    </span>
                  </div>
                </td>
                <td className="training-history-comparison-table__metric">
                  {formatWeight(row.currentVolume)} kg
                </td>
                <td
                  className={`training-history-comparison-table__delta training-history-comparison-table__delta--${changeTone}`}
                >
                  {formatWeightDelta(row.deltaVolume)}
                </td>
                <td>
                  <span
                    className={`training-history-comparison-table__chip training-history-comparison-table__chip--${changeTone}`}
                  >
                    {formatMovementPatternChange(row)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function useTrainingSessionHistoryPlanId(): string | null {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const match = /^\/training-plans\/([^/]+)\/sessions$/.exec(pathname);
  const planId = match?.[1];

  return planId ? decodeURIComponent(planId) : null;
}

function formatCompletedDate(value: string | null): string {
  if (!value) {
    return "Unknown date";
  }

  return completedDateFormatter.format(new Date(value));
}

function formatLoadedSetCount(count: number): string {
  return `${count} loaded set${count === 1 ? "" : "s"}`;
}

function formatCompletion(summary: TrainingHistoryWeekSummary): string {
  return `${summary.completedSessions} / ${summary.completionTarget} sessions`;
}

function formatProgress(value: number | null): string {
  if (value === null) {
    return "No prior volume";
  }

  const prefix = value > 0 ? "+" : "";

  return `${prefix}${value}% vs previous week`;
}

function formatWeight(value: number): string {
  return weightFormatter.format(value);
}

function formatWeightDelta(value: number): string {
  if (value === 0) {
    return "0 kg";
  }

  const prefix = value > 0 ? "+" : "-";

  return `${prefix}${formatWeight(Math.abs(value))} kg`;
}

function formatMovementPatternChange(row: TrainingHistoryMovementPatternComparison): string {
  switch (row.change) {
    case "increase":
      return `Up ${Math.abs(row.changePercentage ?? 0)}%`;
    case "decrease":
      return `Down ${Math.abs(row.changePercentage ?? 0)}%`;
    case "same":
      return "Same";
    case "new":
      return "New this week";
    case "dropped":
      return "No volume this week";
  }
}

function getMovementPatternChangeTone(
  change: TrainingHistoryMovementPatternComparison["change"],
): "neutral" | "positive" | "regression" {
  switch (change) {
    case "increase":
    case "new":
      return "positive";
    case "decrease":
    case "dropped":
      return "regression";
    case "same":
      return "neutral";
  }
}
