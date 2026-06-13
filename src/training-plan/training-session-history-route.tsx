import { useQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader, PageMain } from "../design-system/typography";
import {
  buildTrainingHistoryWeekReport,
  type TrainingHistoryMovementPatternComparison,
  type TrainingHistoryProgressInsights,
  type TrainingHistoryPushPullBalanceInsight,
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
const trainingHistoryCompactLayoutQuery = "(max-width: 720px)";

type TrainingProgressInsightTone = "neutral" | "positive" | "regression";

type TrainingProgressInsightItem = {
  key: string;
  text: string;
  tone: TrainingProgressInsightTone;
};

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
        insights={trainingWeekReport.progressInsights}
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
      {isExpanded ? (
        <CompletedSessionDetails isCompactLayout={isCompactLayout} session={session} />
      ) : null}
    </article>
  );
}

function CompletedSessionDetails({
  isCompactLayout,
  session,
}: {
  isCompactLayout: boolean;
  session: TrainingHistorySessionReport;
}) {
  return (
    <section
      className="training-history-session-details"
      aria-label={`${session.templateLabel} session details`}
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
              <CompletedSessionExerciseRow key={exercise.exerciseId} exercise={exercise} />
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
        <CompletedSessionExerciseCard exercise={exercise} key={exercise.exerciseId} />
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

function WeeklyMovementVolumeReport({
  emptyMessage,
  isCompactLayout,
  insights,
  rows,
}: {
  emptyMessage: string;
  isCompactLayout: boolean;
  insights: TrainingHistoryProgressInsights;
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
        <TrainingProgressInsightsPanel hasRows={rows.length > 0} insights={insights} />
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

function TrainingProgressInsightsPanel({
  hasRows,
  insights,
}: {
  hasRows: boolean;
  insights: TrainingHistoryProgressInsights;
}) {
  const insightItems = hasRows ? createTrainingProgressInsightItems(insights) : [];

  return (
    <aside className="training-history-insights" aria-labelledby="training-history-insights-title">
      <div className="training-history-section-heading training-history-section-heading--compact">
        <div>
          <h3 id="training-history-insights-title">Progress vs previous week</h3>
          <p>Interpret the biggest changes instead of scanning another table.</p>
        </div>
      </div>
      {hasRows ? (
        <ul className="training-history-insights__list">
          {insightItems.map((item) => (
            <li
              className={`training-history-insights__item training-history-insights__item--${item.tone}`}
              key={item.key}
            >
              {item.text}
            </li>
          ))}
        </ul>
      ) : (
        <p className="training-history-empty">
          Complete a Training Session to unlock progress insights.
        </p>
      )}
    </aside>
  );
}

function createTrainingProgressInsightItems(
  insights: TrainingHistoryProgressInsights,
): TrainingProgressInsightItem[] {
  const items: TrainingProgressInsightItem[] = [
    {
      key: "increases",
      text: formatIncreaseInsight(insights),
      tone: getIncreaseInsightTone(insights),
    },
    {
      key: "best-progress",
      text: formatBestProgressInsight(insights.bestProgress),
      tone: insights.bestProgress ? "positive" : "neutral",
    },
    {
      key: "needs-attention",
      text: formatNeedsAttentionInsight(insights.needsAttention),
      tone: insights.needsAttention ? "regression" : "neutral",
    },
  ];

  if (insights.pushPullBalance) {
    items.push({
      key: "push-pull-balance",
      text: formatPushPullBalanceInsight(insights.pushPullBalance),
      tone: getPushPullBalanceInsightTone(insights.pushPullBalance),
    });
  }

  return items;
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
                  {formatWeightDelta(row.deltaVolume)}
                </td>
                <td>
                  <MovementPatternChangeChip row={row} tone={changeTone} />
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
              <MovementPatternChangeChip row={row} tone={changeTone} />
            </div>
            <dl className="training-history-comparison-card__metrics">
              <div>
                <dt>Current volume</dt>
                <dd>{formatWeight(row.currentVolume)} kg</dd>
              </div>
              <div>
                <dt>Delta</dt>
                <dd
                  className={`training-history-comparison-card__delta training-history-comparison-card__delta--${changeTone}`}
                >
                  {formatWeightDelta(row.deltaVolume)}
                </dd>
              </div>
              <div>
                <dt>Change</dt>
                <dd>{formatMovementPatternChange(row)}</dd>
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
  tone: TrainingProgressInsightTone;
}) {
  return (
    <span aria-hidden="true" className="training-history-comparison-table__bar-track">
      <span
        className={`training-history-comparison-table__bar-fill training-history-comparison-table__bar-fill--${tone}`}
        style={{ width: `${relativeVolumePercentage}%` }}
      />
    </span>
  );
}

function MovementPatternChangeChip({
  row,
  tone,
}: {
  row: TrainingHistoryMovementPatternComparison;
  tone: TrainingProgressInsightTone;
}) {
  return (
    <span
      className={`training-history-comparison-table__chip training-history-comparison-table__chip--${tone}`}
    >
      {formatMovementPatternChange(row)}
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

  return completedDateFormatter.format(new Date(value));
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

function formatIncreaseInsight(insights: TrainingHistoryProgressInsights): string {
  const increasedLabel = formatInsightCount(
    insights.increasedMovementPatternCount,
    "movement pattern",
  );
  const newLabel = formatInsightCount(insights.newMovementPatternCount, "new pattern");

  if (insights.increasedMovementPatternCount > 0 && insights.newMovementPatternCount > 0) {
    return `${increasedLabel} increased, and ${newLabel} appeared this week.`;
  }

  if (insights.increasedMovementPatternCount > 0) {
    return `${increasedLabel} increased versus the previous week.`;
  }

  if (insights.newMovementPatternCount > 0) {
    return `No movement patterns increased, and ${newLabel} appeared this week.`;
  }

  return "No movement patterns increased versus the previous week.";
}

function formatBestProgressInsight(row: TrainingHistoryMovementPatternComparison | null): string {
  if (!row) {
    return "Best progress: No positive volume delta this week.";
  }

  return `Best progress: ${row.movementPatternLabel} added ${formatWeight(row.deltaVolume)} kg versus the previous week.`;
}

function formatNeedsAttentionInsight(row: TrainingHistoryMovementPatternComparison | null): string {
  if (!row) {
    return "Needs attention: No regressions versus the previous week.";
  }

  return `Needs attention: ${row.movementPatternLabel} dropped by ${formatWeight(Math.abs(row.deltaVolume))} kg from the previous week.`;
}

function formatPushPullBalanceInsight(balance: TrainingHistoryPushPullBalanceInsight): string {
  if (balance.leadingPatternGroup === "even") {
    return "Push and pull volume were even this week.";
  }

  const trailingPatternGroup = balance.leadingPatternGroup === "push" ? "pull" : "push";
  const leadingLabel = capitalizeWord(balance.leadingPatternGroup);

  return `${leadingLabel} volume led ${trailingPatternGroup} volume by ${formatWeight(balance.deltaVolume)} kg this week.`;
}

function getIncreaseInsightTone(
  insights: TrainingHistoryProgressInsights,
): TrainingProgressInsightTone {
  return insights.increasedMovementPatternCount > 0 || insights.newMovementPatternCount > 0
    ? "positive"
    : "neutral";
}

function getPushPullBalanceInsightTone(
  balance: TrainingHistoryPushPullBalanceInsight,
): TrainingProgressInsightTone {
  if (balance.leadingPatternGroup === "even") {
    return "positive";
  }

  return "neutral";
}

function formatInsightCount(value: number, noun: string): string {
  return `${value} ${noun}${value === 1 ? "" : "s"}`;
}

function capitalizeWord(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
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
