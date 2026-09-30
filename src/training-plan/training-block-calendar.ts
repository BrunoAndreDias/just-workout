import type { TrainingBlock } from "./training-block";
import type { TrainingPlan } from "./training-plan";
import type { TrainingSession } from "./training-session";
import { addUtcDays, toDayKey, toUtcDay } from "./training-week-date";
import { formatTrainingWeekRangeLabel } from "./training-week-range-label";

/** Inclusive UTC day-key range for a Training Week. */
export type TrainingWeekRange = {
  weekEnd: string;
  weekStart: string;
};

/** One calendar Training Week inside the Training Block, anchored to the block start. */
export type TrainingWeekWindow = TrainingWeekRange & {
  end: Date;
  /**
   * The final block week stays current until the next Training Block is accepted, so completed
   * sessions logged after its calendar end still belong to it.
   */
  isOpenEnded: boolean;
  label: string;
  start: Date;
  weekNumber: number;
};

type TrainingBlockCalendarPlan = Pick<TrainingPlan, "generatedAt" | "trainingBlockWeeks"> &
  Partial<Pick<TrainingPlan, "trainingBlock">>;

type TrainingBlockCalendarSession = Pick<
  TrainingSession,
  "completedAt" | "planId" | "trainingBlockId" | "trainingBlockWeekNumber"
>;

const DAYS_PER_WEEK = 7;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Resolves the Training Block week for a date, clamped to the block's weeks: dates before the
 * block start are week 1 and a late block stays in its final week until the next is accepted.
 * Plans without a Training Block are anchored to their generation date.
 */
function getTrainingBlockWeekForDate(plan: TrainingBlockCalendarPlan, date: Date): number {
  const dayOffset = Math.floor(
    (toUtcDay(date.toISOString()).getTime() - getCalendarAnchor(plan).getTime()) /
      MILLISECONDS_PER_DAY,
  );

  if (Number.isNaN(dayOffset)) {
    return 1;
  }

  return Math.min(Math.max(Math.floor(dayOffset / DAYS_PER_WEEK) + 1, 1), plan.trainingBlockWeeks);
}

/**
 * Returns the Training Week window that is current on the given day. The calendar week wins
 * unless the stored block week is already further along, since a block week never moves back.
 */
export function getCurrentTrainingWeek(
  plan: TrainingBlockCalendarPlan,
  now: Date,
): TrainingWeekWindow {
  return getTrainingWeekWindow(
    plan,
    Math.max(getTrainingBlockWeekForDate(plan, now), plan.trainingBlock?.weekNumber ?? 1),
  );
}

/**
 * Returns the seven-day window of a block week. Week 0 and below are the weeks before the block
 * starts, which serve as the previous-week reference for week 1.
 */
export function getTrainingWeekWindow(
  plan: TrainingBlockCalendarPlan,
  weekNumber: number,
): TrainingWeekWindow {
  const start = addUtcDays(getCalendarAnchor(plan), (weekNumber - 1) * DAYS_PER_WEEK);
  const end = addUtcDays(start, DAYS_PER_WEEK - 1);

  return {
    end,
    isOpenEnded: weekNumber >= plan.trainingBlockWeeks,
    label: formatTrainingWeekRangeLabel(start, end),
    start,
    weekEnd: toDayKey(end),
    weekNumber,
    weekStart: toDayKey(start),
  };
}

/**
 * Resolves the block week a completed session counts toward in the plan's current Training Block.
 * A stored in-range week wins; otherwise the week follows the completion date. Returns null for
 * incomplete sessions and sessions outside the block.
 */
export function getSessionTrainingBlockWeek(
  plan: TrainingBlockCalendarPlan,
  session: TrainingBlockCalendarSession,
): number | null {
  if (!plan.trainingBlock || !isSessionInTrainingBlock(plan.trainingBlock, session)) {
    return null;
  }

  const storedWeekNumber = session.trainingBlockWeekNumber;

  if (
    session.trainingBlockId === plan.trainingBlock.id &&
    typeof storedWeekNumber === "number" &&
    storedWeekNumber >= 1 &&
    storedWeekNumber <= plan.trainingBlockWeeks
  ) {
    return storedWeekNumber;
  }

  return getTrainingBlockWeekForDate(plan, new Date(session.completedAt ?? ""));
}

/**
 * Checks whether a completed session belongs to a Training Block. Sessions stamped with a block
 * id belong to that block; legacy sessions without one belong when completed within the block's
 * scheduled dates, since nothing else ties them to it.
 */
export function isSessionInTrainingBlock(
  block: Pick<TrainingBlock, "endDate" | "id" | "planId" | "startDate">,
  session: TrainingBlockCalendarSession,
): boolean {
  if (session.planId !== block.planId || !session.completedAt) {
    return false;
  }

  if (session.trainingBlockId) {
    return session.trainingBlockId === block.id;
  }

  const completedDay = toDayKey(toUtcDay(session.completedAt));

  return completedDay >= block.startDate && completedDay <= block.endDate;
}

/** Checks whether a completed session falls inside a Training Week window. */
export function isSessionInTrainingWeek(
  session: Pick<TrainingSession, "completedAt">,
  week: Pick<TrainingWeekWindow, "isOpenEnded" | "weekEnd" | "weekStart">,
): boolean {
  if (!session.completedAt) {
    return false;
  }

  const completedDay = toDayKey(toUtcDay(session.completedAt));

  return completedDay >= week.weekStart && (week.isOpenEnded || completedDay <= week.weekEnd);
}

function getCalendarAnchor(plan: TrainingBlockCalendarPlan): Date {
  return toUtcDay(plan.trainingBlock?.startDate ?? plan.generatedAt);
}
