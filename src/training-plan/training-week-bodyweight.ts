import { calculateVolumeByMovementPattern } from "./completed-load-volume";
import type { TrainingPlan } from "./training-plan";
import type { TrainingSession, TrainingSessionBodyweightSource } from "./training-session";
import { addUtcDays, toDayKey, toUtcDay } from "./training-week-date";

/** Bodyweight saved for a specific Training Week inheritance window. */
export type TrainingWeekBodyweightUpdate = {
  bodyweight: number;
  updatedAt: string;
  weekEnd: string;
  weekStart: string;
};

/** Inclusive UTC day-key range for a Training Week. */
export type TrainingWeekRange = Pick<TrainingWeekBodyweightUpdate, "weekEnd" | "weekStart">;

/** Bodyweight value resolved for a Training Week, including its inheritance source. */
export type ResolvedTrainingWeekBodyweight = TrainingWeekRange & {
  bodyweight: number | null;
  source: Exclude<
    TrainingSessionBodyweightSource,
    "historical_correction" | "session_override"
  > | null;
};

const DAYS_PER_WEEK = 7;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

/** Returns the inclusive Training Week range containing the reference date. */
export function getTrainingWeekRangeForReferenceDate({
  referenceDate,
  trainingPlan,
}: {
  referenceDate: string;
  trainingPlan: TrainingPlan;
}): TrainingWeekRange {
  const anchorDay = toUtcDay(trainingPlan.trainingBlock?.startDate ?? trainingPlan.generatedAt);
  const referenceDay = toUtcDay(referenceDate);
  const dayOffset = Math.max(
    0,
    Math.floor((referenceDay.getTime() - anchorDay.getTime()) / MILLISECONDS_PER_DAY),
  );
  const weekOffset = Math.floor(dayOffset / DAYS_PER_WEEK) * DAYS_PER_WEEK;
  const weekStart = addUtcDays(anchorDay, weekOffset);

  return {
    weekEnd: toDayKey(addUtcDays(weekStart, DAYS_PER_WEEK - 1)),
    weekStart: toDayKey(weekStart),
  };
}

/** Resolves the bodyweight inherited by sessions in the current Training Week. */
export function resolveTrainingWeekBodyweight({
  referenceDate,
  trainingPlan,
}: {
  referenceDate: string;
  trainingPlan: TrainingPlan;
}): ResolvedTrainingWeekBodyweight {
  const currentWeek = getTrainingWeekRangeForReferenceDate({ referenceDate, trainingPlan });
  const weeklyBodyweightUpdates = trainingPlan.weeklyBodyweightUpdates ?? [];
  const explicitUpdate = weeklyBodyweightUpdates.find(
    (update) =>
      update.weekEnd === currentWeek.weekEnd && update.weekStart === currentWeek.weekStart,
  );

  if (explicitUpdate) {
    return {
      bodyweight: explicitUpdate.bodyweight,
      source: "inherited_weekly",
      ...currentWeek,
    };
  }

  const previousWeeklyUpdate = [...weeklyBodyweightUpdates]
    .filter((update) => update.weekStart <= currentWeek.weekStart)
    .sort((firstUpdate, secondUpdate) =>
      secondUpdate.weekStart.localeCompare(firstUpdate.weekStart),
    )[0];

  if (previousWeeklyUpdate) {
    return {
      bodyweight: previousWeeklyUpdate.bodyweight,
      source: "inherited_weekly",
      ...currentWeek,
    };
  }

  return {
    bodyweight: trainingPlan.baselineBodyweight ?? null,
    source: trainingPlan.baselineBodyweight == null ? null : "baseline",
    ...currentWeek,
  };
}

/** Adds or replaces the bodyweight update for one Training Week, sorted by week start. */
export function upsertTrainingWeekBodyweightUpdate({
  bodyweight,
  timestamp,
  trainingPlan,
  weekRange,
}: {
  bodyweight: number;
  timestamp: string;
  trainingPlan: TrainingPlan;
  weekRange: TrainingWeekRange;
}): ReadonlyArray<TrainingWeekBodyweightUpdate> {
  const weeklyBodyweightUpdates = trainingPlan.weeklyBodyweightUpdates ?? [];
  const nextUpdate: TrainingWeekBodyweightUpdate = {
    bodyweight,
    updatedAt: timestamp,
    weekEnd: weekRange.weekEnd,
    weekStart: weekRange.weekStart,
  };
  const otherUpdates = weeklyBodyweightUpdates.filter(
    (update) => update.weekEnd !== weekRange.weekEnd || update.weekStart !== weekRange.weekStart,
  );

  return [...otherUpdates, nextUpdate].sort((firstUpdate, secondUpdate) =>
    firstUpdate.weekStart.localeCompare(secondUpdate.weekStart),
  );
}

/** Checks whether a completed Training Session falls inside a Training Week range. */
export function isTrainingSessionInWeekRange({
  trainingSession,
  weekRange,
}: {
  trainingSession: TrainingSession;
  weekRange: TrainingWeekRange;
}): boolean {
  if (!trainingSession.completedAt) {
    return false;
  }

  const completedDay = toDayKey(toUtcDay(trainingSession.completedAt));

  return completedDay >= weekRange.weekStart && completedDay <= weekRange.weekEnd;
}

/** Applies a bodyweight correction to a Training Session and recalculates its movement volume. */
export function updateTrainingSessionBodyweight({
  bodyweight,
  source,
  timestamp,
  trainingSession,
}: {
  bodyweight: number;
  source: TrainingSessionBodyweightSource;
  timestamp: string;
  trainingSession: TrainingSession;
}): TrainingSession {
  return {
    ...trainingSession,
    sessionBodyweight: bodyweight,
    sessionBodyweightSource: source,
    updatedAt: timestamp,
    volumeByMovementPattern: calculateVolumeByMovementPattern(trainingSession.exercises, {
      sessionBodyweight: bodyweight,
    }),
  };
}
