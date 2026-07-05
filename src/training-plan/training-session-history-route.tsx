import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../design-system/button";
import { PageHeader, PageMain } from "../design-system/typography";
import { CompletedSessionsSection } from "./completed-sessions-section";
import { buildTrainingHistoryWeekReport } from "./training-history-week";
import { parseTrainingSessionHistoryPathname } from "./training-plan-paths";
import {
  trainingPlanQueryOptions,
  trainingPlanSessionsQueryOptions,
} from "./training-plan-query-options";
import { trainingPlanService } from "./training-plan-service";
import { TrainingWeekSection } from "./training-week-section";
import "./training-plan-loading.css";
import "./training-history-shared.css";
import "./training-session-history-route.css";

const trainingHistoryCompactLayoutQuery = "(max-width: 720px)";

export function TrainingSessionHistoryRoute() {
  const planId = useTrainingSessionHistoryPlanId();
  const queryClient = useQueryClient();
  const isCompactLayout = useTrainingHistoryCompactLayout();
  const { trainingPlanQuery, trainingSessionsQuery } = useTrainingHistoryData(planId);
  const trainingPlan = trainingPlanQuery.data;
  const trainingSessions = trainingSessionsQuery.data ?? [];
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedWeekEndKey, setSelectedWeekEndKey] = useState<string | null>(null);
  const saveHistoricalBodyweightCorrection = useMutation({
    mutationFn: ({ bodyweight, sessionId }: { bodyweight: number; sessionId: string }) =>
      trainingPlanService.saveHistoricalBodyweightCorrection({
        bodyweight,
        sessionId,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: trainingPlanSessionsQueryOptions(planId).queryKey,
      });
    },
  });
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
          onSaveHistoricalBodyweightCorrection={(sessionId, bodyweight) =>
            saveHistoricalBodyweightCorrection.mutateAsync({
              bodyweight,
              sessionId,
            })
          }
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

function useTrainingSessionHistoryPlanId(): string | null {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return parseTrainingSessionHistoryPathname(pathname)?.planId ?? null;
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
