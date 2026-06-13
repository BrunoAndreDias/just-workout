import { useQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader, PageMain } from "../design-system/typography";
import { trainingPlanService } from "./training-plan-service";
import type { TrainingSession, TrainingSessionMovementVolume } from "./training-session";

export function TrainingSessionHistoryRoute() {
  const planId = useTrainingSessionHistoryPlanId();
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
  const trainingPlan = trainingPlanQuery.data;
  const trainingSessions = trainingSessionsQuery.data ?? [];
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const selectedSession =
    trainingSessions.find((session) => session.id === selectedSessionId) ?? trainingSessions[0];
  const weeklyVolume = useMemo(
    () => calculateWeeklyVolumeByMovementPattern(trainingSessions),
    [trainingSessions],
  );

  if (trainingPlanQuery.isLoading || trainingSessionsQuery.isLoading) {
    return <TrainingSessionHistoryShell>Loading Training history...</TrainingSessionHistoryShell>;
  }

  if (!trainingPlan) {
    return <TrainingSessionHistoryShell>Training Plan not found.</TrainingSessionHistoryShell>;
  }

  return (
    <section className="training-history-page" aria-label="Training history">
      <PageHeader
        description="Review completed Training Sessions and inspect movement-pattern volume from your recent work."
        title="Training history"
      />

      <PageMain className="training-history-layout">
        <section className="training-history-week" aria-labelledby="training-history-week-title">
          <div className="training-history-section-heading">
            <div>
              <h2 id="training-history-week-title">This week</h2>
              <p>{formatCompletedSessionCount(trainingSessions.length)}</p>
            </div>
            <BarChart3 aria-hidden="true" />
          </div>
          <MovementVolumeTable
            emptyMessage="Complete a Training Session to build a weekly report."
            rows={weeklyVolume}
          />
        </section>

        <section className="training-history-list" aria-labelledby="training-history-list-title">
          <h2 id="training-history-list-title">Completed sessions</h2>
          {trainingSessions.length > 0 ? (
            <div className="training-history-list__items">
              {trainingSessions.map((session) => (
                <button
                  aria-label={`View ${session.templateLabel} report`}
                  aria-pressed={session.id === selectedSession?.id}
                  className="training-history-session-button"
                  key={session.id}
                  onClick={() => setSelectedSessionId(session.id)}
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
            <p className="training-history-empty">No completed Training Sessions yet.</p>
          )}
        </section>

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

function calculateWeeklyVolumeByMovementPattern(
  trainingSessions: ReadonlyArray<TrainingSession>,
): TrainingSessionMovementVolume[] {
  const weekStart = getCurrentWeekStart();
  const volumeByPattern = new Map<string, TrainingSessionMovementVolume>();

  for (const session of trainingSessions) {
    if (!session.completedAt || new Date(session.completedAt) < weekStart) {
      continue;
    }

    for (const row of session.volumeByMovementPattern) {
      const currentRow = volumeByPattern.get(row.movementPattern);

      volumeByPattern.set(row.movementPattern, {
        movementPattern: row.movementPattern,
        movementPatternLabel: row.movementPatternLabel,
        volume: (currentRow?.volume ?? 0) + row.volume,
      });
    }
  }

  return Array.from(volumeByPattern.values());
}

function getCurrentWeekStart(): Date {
  const now = new Date();
  const weekStart = new Date(now);
  const daysSinceMonday = (weekStart.getDay() + 6) % 7;

  weekStart.setDate(weekStart.getDate() - daysSinceMonday);
  weekStart.setHours(0, 0, 0, 0);

  return weekStart;
}

function formatCompletedSessionCount(count: number): string {
  return `${count} completed ${count === 1 ? "session" : "sessions"}`;
}

function formatCompletedDate(value: string | null): string {
  if (!value) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(value));
}
