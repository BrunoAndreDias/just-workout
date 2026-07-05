import { summarizeCompletedLoadVolume } from "../completed-load-volume";
import {
  formatTrainingWeekProgressVerdict,
  formatTrainingWeekVolumeReference,
  formatWeight,
} from "../training-history-formatting";
import type {
  TrainingWeekProgressVerdict,
  TrainingWeekVolumeReference,
} from "../training-history-week";
import type { TrainingPlan } from "../training-plan";
import type { TrainingSession } from "../training-session";
import { addUtcDays, toDayKey, toUtcDay } from "../training-week-date";
import { formatTrainingWeekRangeLabel } from "../training-week-range-label";

type TrainingWeekVolumeSummary = {
  completedSessions: number;
  hasPartialVolume: boolean;
  totalVolume: number;
};

type TrainingWeekRange = {
  end: Date;
  endKey: string;
  label: string;
  start: Date;
};

/**
 * Compact Training Week progress summary shown on the Active Training Plan surface.
 */
export type ActiveTrainingPlanWeekProgressReadModel = {
  /** Partial-volume warning for the current or referenced Training Week, if needed. */
  caveat: string | null;
  /** Compact supporting count or week-range detail for the progress summary. */
  detail: string;
  /** Whether the compact summary represents an open week or a closed-week verdict. */
  kind: "current_week" | "latest_verdict";
  /** Previous-week reference text, or the no-reference fallback. */
  support: string;
  /** Accessible heading text for the compact progress summary. */
  title: string;
  /** Primary value shown in the compact progress summary. */
  value: string;
  /** Label describing the primary value. */
  valueLabel: string;
};

/**
 * Builds the compact Active Training Plan progress signal for the current block week.
 *
 * Open weeks show known Completed Load Volume against the previous Training Week reference.
 * Closed weeks show the latest Training Week verdict using the same reference.
 */
export function getTrainingWeekProgressReadModel({
  now = new Date(),
  trainingPlan,
  trainingSessions,
}: {
  now?: Date;
  trainingPlan: TrainingPlan;
  trainingSessions: ReadonlyArray<TrainingSession>;
}): ActiveTrainingPlanWeekProgressReadModel {
  const currentWeek = getCurrentTrainingWeekRange(trainingPlan);
  const previousWeek = createTrainingWeekRange(addUtcDays(currentWeek.start, -7));
  const currentWeekSummary = summarizeTrainingWeekVolume({
    trainingSessions,
    weekRange: currentWeek,
  });
  const previousWeekSummary = summarizeTrainingWeekVolume({
    trainingSessions,
    weekRange: previousWeek,
  });
  const reference = createTrainingWeekVolumeReference({
    previousWeek,
    previousWeekSummary,
  });
  const caveat = getTrainingWeekProgressCaveat({
    currentWeekSummary,
    previousWeekSummary,
  });

  if (isTrainingWeekClosed({ now, weekRange: currentWeek })) {
    return {
      caveat,
      detail: `${currentWeek.label} · ${currentWeekSummary.completedSessions} / ${trainingPlan.trainingFrequencyDaysPerWeek} sessions`,
      kind: "latest_verdict",
      support: formatTrainingWeekVolumeReference(reference),
      title: "Latest Training Week verdict",
      value: formatTrainingWeekProgressVerdict(
        calculateTrainingWeekProgressVerdict({
          currentWeekSummary,
          previousWeekSummary,
        }),
      ),
      valueLabel: "Verdict",
    };
  }

  return {
    caveat,
    detail: `${currentWeekSummary.completedSessions} / ${trainingPlan.trainingFrequencyDaysPerWeek} sessions`,
    kind: "current_week",
    support: formatTrainingWeekVolumeReference(reference),
    title: "Current week progress",
    value: reference
      ? `${formatWeight(currentWeekSummary.totalVolume)} kg / ${formatWeight(reference.totalVolume)} kg reference`
      : `${formatWeight(currentWeekSummary.totalVolume)} kg`,
    valueLabel: "Known volume",
  };
}

function summarizeTrainingWeekVolume({
  trainingSessions,
  weekRange,
}: {
  trainingSessions: ReadonlyArray<TrainingSession>;
  weekRange: TrainingWeekRange;
}): TrainingWeekVolumeSummary {
  return trainingSessions
    .filter(isCompletedTrainingSession)
    .filter((trainingSession) => isTrainingSessionInWeek(trainingSession, weekRange))
    .reduce<TrainingWeekVolumeSummary>(
      (summary, trainingSession) => {
        const completedLoadVolume = summarizeCompletedLoadVolume(trainingSession.exercises, {
          sessionBodyweight: trainingSession.sessionBodyweight,
        });

        return {
          completedSessions: summary.completedSessions + 1,
          hasPartialVolume: summary.hasPartialVolume || completedLoadVolume.hasPartialVolume,
          totalVolume: summary.totalVolume + completedLoadVolume.totalVolume,
        };
      },
      {
        completedSessions: 0,
        hasPartialVolume: false,
        totalVolume: 0,
      },
    );
}

function getCurrentTrainingWeekRange(trainingPlan: TrainingPlan): TrainingWeekRange {
  const anchorDay = toUtcDay(trainingPlan.trainingBlock?.startDate ?? trainingPlan.generatedAt);
  const weekNumber = trainingPlan.trainingBlock?.weekNumber ?? 2;
  const start = addUtcDays(anchorDay, Math.max(weekNumber - 1, 0) * 7);

  return createTrainingWeekRange(start);
}

function createTrainingWeekRange(start: Date): TrainingWeekRange {
  const end = addUtcDays(start, 6);

  return {
    end,
    endKey: toDayKey(end),
    label: formatTrainingWeekRangeLabel(start, end),
    start,
  };
}

function isTrainingWeekClosed({
  now,
  weekRange,
}: {
  now: Date;
  weekRange: TrainingWeekRange;
}): boolean {
  return toUtcDay(now.toISOString()).getTime() > weekRange.end.getTime();
}

function calculateTrainingWeekProgressVerdict({
  currentWeekSummary,
  previousWeekSummary,
}: {
  currentWeekSummary: TrainingWeekVolumeSummary;
  previousWeekSummary: TrainingWeekVolumeSummary;
}): TrainingWeekProgressVerdict {
  if (
    previousWeekSummary.totalVolume <= 0 ||
    previousWeekSummary.hasPartialVolume ||
    currentWeekSummary.hasPartialVolume
  ) {
    return "not_comparable";
  }

  if (currentWeekSummary.totalVolume === previousWeekSummary.totalVolume) {
    return "unchanged";
  }

  return currentWeekSummary.totalVolume > previousWeekSummary.totalVolume
    ? "progressed"
    : "regressed";
}

function createTrainingWeekVolumeReference({
  previousWeek,
  previousWeekSummary,
}: {
  previousWeek: TrainingWeekRange;
  previousWeekSummary: TrainingWeekVolumeSummary;
}): TrainingWeekVolumeReference | null {
  if (
    previousWeekSummary.completedSessions === 0 &&
    previousWeekSummary.hasPartialVolume === false
  ) {
    return null;
  }

  return {
    hasPartialVolume: previousWeekSummary.hasPartialVolume,
    totalVolume: previousWeekSummary.totalVolume,
    weekLabel: previousWeek.label,
  };
}

function getTrainingWeekProgressCaveat({
  currentWeekSummary,
  previousWeekSummary,
}: {
  currentWeekSummary: TrainingWeekVolumeSummary;
  previousWeekSummary: TrainingWeekVolumeSummary;
}): string | null {
  if (currentWeekSummary.hasPartialVolume) {
    return "Partial volume comparison in this Training Week.";
  }

  if (previousWeekSummary.hasPartialVolume) {
    return "Partial volume comparison in the previous Training Week reference.";
  }

  return null;
}

function isCompletedTrainingSession(
  trainingSession: TrainingSession,
): trainingSession is TrainingSession & { completedAt: string } {
  return trainingSession.completedAt !== null;
}

function isTrainingSessionInWeek(
  trainingSession: TrainingSession & { completedAt: string },
  weekRange: TrainingWeekRange,
): boolean {
  const completedDayKey = toDayKey(toUtcDay(trainingSession.completedAt));

  return completedDayKey >= toDayKey(weekRange.start) && completedDayKey <= weekRange.endKey;
}
