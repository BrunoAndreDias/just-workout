import type {
  TrainingHistoryMovementPatternComparison,
  TrainingHistorySessionExerciseReport,
  TrainingHistorySessionVolumeProgression,
  TrainingHistoryWeekSummary,
  TrainingWeekCompletionContext,
  TrainingWeekProgressVerdict,
  TrainingWeekVolumeReference,
} from "./training-history-week";

const completedDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
});

const weightFormatter = new Intl.NumberFormat("en-US");

export type TrainingHistoryTone = "neutral" | "positive" | "regression";

export function formatCompletedDate(value: string | null): string {
  if (!value) {
    return "Unknown date";
  }

  const completedDate = new Date(value);

  if (Number.isNaN(completedDate.getTime())) {
    return "Unknown date";
  }

  return completedDateFormatter.format(completedDate);
}

export function formatLoadedSetCount(count: number): string {
  return `${count} loaded set${count === 1 ? "" : "s"}`;
}

export function formatCompletion(summary: TrainingHistoryWeekSummary): string {
  return `${summary.completedSessions} / ${summary.completionTarget} sessions`;
}

export function formatProgress(value: number | null): string {
  if (value === null) {
    return "No prior volume";
  }

  const prefix = value > 0 ? "+" : "";

  return `${prefix}${value}% vs previous week`;
}

export function formatWeight(value: number): string {
  return weightFormatter.format(value);
}

export function formatTrainingWeekCompletionContext(
  completionContext: TrainingWeekCompletionContext,
): string {
  switch (completionContext.status) {
    case "below_target":
      return `${Math.abs(completionContext.deltaSessions)} session${Math.abs(completionContext.deltaSessions) === 1 ? "" : "s"} below target.`;
    case "met_target":
      return "Weekly session target met.";
    case "above_target":
      return `${completionContext.deltaSessions} extra session${completionContext.deltaSessions === 1 ? "" : "s"} above target.`;
  }
}

export function formatTrainingWeekProgressVerdict(verdict: TrainingWeekProgressVerdict): string {
  switch (verdict) {
    case "progressed":
      return "Progressed";
    case "unchanged":
      return "Unchanged";
    case "regressed":
      return "Regressed";
    case "not_comparable":
      return "Not comparable";
  }
}

export function formatTrainingWeekVolumeReference(
  reference: TrainingWeekVolumeReference | null,
): string {
  if (!reference) {
    return "No prior Training Week Volume Reference.";
  }

  return `Training Week Volume Reference: ${formatWeight(reference.totalVolume)} kg from ${reference.weekLabel}.`;
}

export function formatTrainingSessionVolumeProgression(
  volumeProgression: TrainingHistorySessionVolumeProgression,
): string {
  if (!volumeProgression.previousComparableCompletedAt) {
    return "No prior comparable session.";
  }

  if (volumeProgression.verdict === "not_comparable") {
    return `Not comparable vs ${formatCompletedDate(volumeProgression.previousComparableCompletedAt)}.`;
  }

  if (volumeProgression.verdict === "unchanged") {
    return `Unchanged vs ${formatCompletedDate(volumeProgression.previousComparableCompletedAt)}.`;
  }

  return `${formatTrainingWeekProgressVerdict(volumeProgression.verdict)} by ${formatWeightDelta(volumeProgression.deltaVolume ?? 0)} vs ${formatCompletedDate(volumeProgression.previousComparableCompletedAt)}.`;
}

export function formatMovementPatternComparison(
  row: TrainingHistoryMovementPatternComparison,
): string {
  if (row.change === "new") {
    return "No comparison, not done last week";
  }

  return `${formatWeightDelta(row.deltaVolume)}, ${formatMovementPatternChange(row)}`;
}

export function getMovementPatternChangeTone(
  change: TrainingHistoryMovementPatternComparison["change"],
): TrainingHistoryTone {
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

export function getTrainingHistoryExerciseKey(
  exercise: TrainingHistorySessionExerciseReport,
): string {
  return `${exercise.exerciseId}-${exercise.exerciseName}-${exercise.movementPattern}`;
}

export function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, value));
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
