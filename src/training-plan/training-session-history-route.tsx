import { useQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../design-system/button";
import { PageHeader, PageMain } from "../design-system/typography";
import {
  buildTrainingHistoryWeekReport,
  type TrainingHistoryMovementPatternComparison,
  type TrainingHistorySessionExerciseReport,
  type TrainingHistorySessionReport,
  type TrainingHistoryWeekReport,
  type TrainingHistoryWeekSummary,
} from "./training-history-week";
import {
  trainingPlanQueryOptions,
  trainingPlanSessionsQueryOptions,
} from "./training-plan-query-options";

const completedDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
});

const weightFormatter = new Intl.NumberFormat("en-US");
const trainingHistoryCompactLayoutQuery = "(max-width: 720px)";

type TrainingHistoryTone = "neutral" | "positive" | "regression";

export function TrainingSessionHistoryRoute() {
  const planId = useTrainingSessionHistoryPlanId();
  const isCompactLayout = useTrainingHistoryCompactLayout();
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
    return (
      <TrainingSessionHistoryShell kind="loading">
        Loading Training history...
      </TrainingSessionHistoryShell>
    );
  }

  if (trainingPlanQuery.isError || trainingSessionsQuery.isError) {
    return (
      <TrainingSessionHistoryShell
        action={{
          label: "Retry loading Training history",
          onClick: () => {
            void trainingPlanQuery.refetch();
            void trainingSessionsQuery.refetch();
          },
        }}
        kind="error"
      >
        Training history could not load.
      </TrainingSessionHistoryShell>
    );
  }

  if (!trainingPlan) {
    return (
      <TrainingSessionHistoryShell kind="not-found">
        Training Plan not found.
      </TrainingSessionHistoryShell>
    );
  }

  if (!trainingWeekReport) {
    return (
      <TrainingSessionHistoryShell kind="loading">
        Loading Training history...
      </TrainingSessionHistoryShell>
    );
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
          isCompactLayout={isCompactLayout}
          trainingWeekReport={trainingWeekReport}
          onSelectWeek={setSelectedWeekEndKey}
        />
        <CompletedSessionsSection
          isCompactLayout={isCompactLayout}
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

function TrainingSessionHistoryShell({
  action,
  children,
  kind,
}: {
  action?: {
    label: string;
    onClick: () => void;
  };
  children: string;
  kind: "error" | "loading" | "not-found";
}) {
  return (
    <section className="training-history-page" aria-label="Training history">
      <p className="active-training-plan-loading" role={kind === "loading" ? "status" : undefined}>
        {children}
      </p>
      {action ? (
        <Button
          className="training-history-shell__action"
          onClick={action.onClick}
          type="button"
          variant="builderPrimary"
        >
          {action.label}
        </Button>
      ) : null}
    </section>
  );
}

function useTrainingHistoryData(planId: string | null) {
  const trainingPlanQuery = useQuery(trainingPlanQueryOptions(planId));
  const trainingSessionsQuery = useQuery(trainingPlanSessionsQueryOptions(planId));

  return { trainingPlanQuery, trainingSessionsQuery };
}

function TrainingWeekSection({
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
      <TrainingWeekSummaryStrip summary={trainingWeekReport.summary} />
      <WeeklyMovementVolumeReport
        emptyMessage="Complete a Training Session to build a weekly report."
        isCompactLayout={isCompactLayout}
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
  isCompactLayout,
  onToggleSession,
  selectedSession,
  selectedSessions,
}: {
  isCompactLayout: boolean;
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
  onToggleSession,
  session,
}: {
  isCompactLayout: boolean;
  isExpanded: boolean;
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
          session={session}
        />
      ) : null}
    </article>
  );
}

function CompletedSessionDetails({
  detailsId,
  isCompactLayout,
  session,
}: {
  detailsId: string;
  isCompactLayout: boolean;
  session: TrainingHistorySessionReport;
}) {
  return (
    <section
      aria-label={`${session.templateLabel} session details`}
      className="training-history-session-details"
      id={detailsId}
    >
      {session.loadedSetCount === 0 ? (
        <p className="training-history-empty">No loaded sets recorded for this session.</p>
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

function getTrainingHistoryExerciseKey(exercise: TrainingHistorySessionExerciseReport): string {
  return `${exercise.exerciseId}-${exercise.exerciseName}-${exercise.movementPattern}`;
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

  const completedDate = new Date(value);

  if (Number.isNaN(completedDate.getTime())) {
    return "Unknown date";
  }

  return completedDateFormatter.format(completedDate);
}

function useTrainingHistoryCompactLayout() {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }

    return window.matchMedia(trainingHistoryCompactLayoutQuery).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia(trainingHistoryCompactLayoutQuery);
    const handleChange = () => setMatches(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return matches;
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

function formatMovementPatternComparison(row: TrainingHistoryMovementPatternComparison): string {
  if (row.change === "new") {
    return "No comparison, not done last week";
  }

  return `${formatWeightDelta(row.deltaVolume)}, ${formatMovementPatternChange(row)}`;
}

function formatMovementPatternChange(row: TrainingHistoryMovementPatternComparison): string {
  switch (row.change) {
    case "increase":
      return `up ${Math.abs(row.changePercentage ?? 0)}%`;
    case "decrease":
      return `down ${Math.abs(row.changePercentage ?? 0)}%`;
    case "same":
      return "same";
    case "new":
      return "not done last week";
    case "dropped":
      return "no volume this week";
  }
}

function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, value));
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
