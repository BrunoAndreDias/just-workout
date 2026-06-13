import { useQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader, PageMain } from "../design-system/typography";
import {
  buildTrainingHistoryWeekReport,
  type TrainingHistoryMovementPatternComparison,
  type TrainingHistoryWeekReport,
  type TrainingHistoryWeekSummary,
} from "./training-history-week";
import { trainingPlanService } from "./training-plan-service";
import type { TrainingSession, TrainingSessionMovementVolume } from "./training-session";

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
    selectedSessions.find((session) => session.id === selectedSessionId) ?? selectedSessions[0];

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
          onSelectSession={setSelectedSessionId}
        />
        <SessionReport session={selectedSession} />
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
  onSelectSession,
  selectedSession,
  selectedSessions,
}: {
  onSelectSession: (sessionId: string) => void;
  selectedSession: TrainingSession | undefined;
  selectedSessions: ReadonlyArray<TrainingSession>;
}) {
  return (
    <section className="training-history-list" aria-labelledby="training-history-list-title">
      <h2 id="training-history-list-title">Completed sessions</h2>
      {selectedSessions.length > 0 ? (
        <div className="training-history-list__items">
          {selectedSessions.map((session) => (
            <button
              aria-label={`View ${session.templateLabel} report`}
              aria-pressed={session.id === selectedSession?.id}
              className="training-history-session-button"
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              type="button"
            >
              <span>
                <strong>{session.templateLabel}</strong>
                <small className="training-history-session-button__date">
                  {formatCompletedDate(session.completedAt)}
                </small>
              </span>
              <span className="training-history-session-button__action">
                View {session.templateLabel} report
              </span>
            </button>
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

function SessionReport({ session }: { session: TrainingSession | undefined }) {
  if (!session) {
    return (
      <section className="training-history-report" aria-labelledby="training-history-report-title">
        <h2 id="training-history-report-title">Session report</h2>
        <p className="training-history-empty">
          Select or complete a Training Session to see a report.
        </p>
      </section>
    );
  }

  return (
    <section className="training-history-report" aria-labelledby="training-history-report-title">
      <div className="training-history-section-heading">
        <div>
          <h2 id="training-history-report-title">{session.templateLabel} report</h2>
          <p>Completed {formatCompletedDate(session.completedAt)}</p>
        </div>
      </div>
      <MovementVolumeTable
        emptyMessage="No loaded sets were recorded for this Training Session."
        rows={session.volumeByMovementPattern}
      />
      <div className="training-history-report__exercises">
        {session.exercises.map((exercise) => (
          <div className="training-history-report__exercise" key={exercise.exerciseId}>
            <span>{exercise.exerciseName}</span>
            <strong>
              {exercise.sets.filter((set) => set.weight > 0 && set.reps > 0).length} loaded sets
            </strong>
          </div>
        ))}
      </div>
    </section>
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

function MovementVolumeTable({
  emptyMessage,
  rows,
}: {
  emptyMessage: string;
  rows: ReadonlyArray<TrainingSessionMovementVolume>;
}) {
  if (rows.length === 0) {
    return <p className="training-history-empty">{emptyMessage}</p>;
  }

  return (
    <table className="training-history-volume-table">
      <thead>
        <tr>
          <th scope="col">Movement pattern</th>
          <th scope="col">Volume</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.movementPattern}>
            <td>{row.movementPatternLabel}</td>
            <td>{row.volume} kg</td>
          </tr>
        ))}
      </tbody>
    </table>
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
