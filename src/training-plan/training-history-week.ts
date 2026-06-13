import type { TrainingPlan } from "./training-plan";
import type { TrainingSession, TrainingSessionMovementVolume } from "./training-session";
import { formatSessionMovementPattern } from "./training-session";

type TrainingHistoryWeek = {
  end: Date;
  endKey: string;
  label: string;
  start: Date;
};

type TrainingHistoryWeekMetrics = {
  loadedSetCount: number;
  totalVolume: number;
  volumeByMovementPattern: TrainingSessionMovementVolume[];
};

export type TrainingHistoryWeekSummary = {
  completedSessions: number;
  completionTarget: number;
  loadedSetCount: number;
  progressPercentage: number | null;
  totalVolume: number;
};

export type TrainingHistoryWeekReport = {
  nextWeekEndKey: string | null;
  previousWeekEndKey: string | null;
  selectedSessions: ReadonlyArray<TrainingSession>;
  selectedWeek: TrainingHistoryWeek | null;
  summary: TrainingHistoryWeekSummary;
  volumeByMovementPattern: ReadonlyArray<TrainingSessionMovementVolume>;
};

export function buildTrainingHistoryWeekReport({
  selectedWeekEndKey,
  trainingPlan,
  trainingSessions,
}: {
  selectedWeekEndKey: string | null;
  trainingPlan: TrainingPlan;
  trainingSessions: ReadonlyArray<TrainingSession>;
}): TrainingHistoryWeekReport {
  const completedSessions = trainingSessions.filter(
    (trainingSession): trainingSession is TrainingSession & { completedAt: string } =>
      trainingSession.completedAt !== null,
  );
  const latestSessionDay = getLatestSessionDay(completedSessions);
  const oldestSessionDay = getOldestSessionDay(completedSessions);

  if (!latestSessionDay || !oldestSessionDay) {
    return createEmptyTrainingHistoryWeekReport(trainingPlan);
  }

  const selectedWeek = getSelectedTrainingWeek({
    latestSessionDay,
    oldestSessionDay,
    selectedWeekEndKey,
  });
  const previousWeek = createTrainingHistoryWeek(addUtcDays(selectedWeek.end, -7));
  const selectedSessions = completedSessions.filter((session) =>
    isSessionInWeek(session, selectedWeek),
  );
  const previousSessions = completedSessions.filter((session) =>
    isSessionInWeek(session, previousWeek),
  );
  const selectedMetrics = summarizeTrainingSessions(selectedSessions);
  const previousMetrics = summarizeTrainingSessions(previousSessions);

  return {
    nextWeekEndKey: getNextWeekEndKey(selectedWeek, latestSessionDay),
    previousWeekEndKey: getPreviousWeekEndKey(selectedWeek, oldestSessionDay),
    selectedSessions,
    selectedWeek,
    summary: createTrainingHistoryWeekSummary(
      trainingPlan,
      selectedSessions,
      selectedMetrics,
      previousMetrics,
    ),
    volumeByMovementPattern: selectedMetrics.volumeByMovementPattern,
  };
}

function summarizeTrainingSessions(
  trainingSessions: ReadonlyArray<TrainingSession>,
): TrainingHistoryWeekMetrics {
  let loadedSetCount = 0;
  let totalVolume = 0;
  const volumeByPattern = new Map<
    string,
    {
      movementPattern: TrainingSessionMovementVolume["movementPattern"];
      movementPatternLabel: string;
      volume: number;
    }
  >();

  for (const trainingSession of trainingSessions) {
    for (const exercise of trainingSession.exercises) {
      const exerciseSummary = summarizeExercise(exercise);

      loadedSetCount += exerciseSummary.loadedSetCount;
      totalVolume += exerciseSummary.totalVolume;
      updateMovementPatternVolume(volumeByPattern, exerciseSummary);
    }
  }

  return {
    loadedSetCount,
    totalVolume,
    volumeByMovementPattern: Array.from(volumeByPattern.values()).sort((firstRow, secondRow) =>
      firstRow.movementPatternLabel.localeCompare(secondRow.movementPatternLabel),
    ),
  };
}

function createEmptyTrainingHistoryWeekReport(
  trainingPlan: TrainingPlan,
): TrainingHistoryWeekReport {
  return {
    nextWeekEndKey: null,
    previousWeekEndKey: null,
    selectedSessions: [],
    selectedWeek: null,
    summary: {
      completedSessions: 0,
      completionTarget: trainingPlan.trainingFrequencyDaysPerWeek,
      loadedSetCount: 0,
      progressPercentage: null,
      totalVolume: 0,
    },
    volumeByMovementPattern: [],
  };
}

function getSelectedTrainingWeek({
  latestSessionDay,
  oldestSessionDay,
  selectedWeekEndKey,
}: {
  latestSessionDay: Date;
  oldestSessionDay: Date;
  selectedWeekEndKey: string | null;
}): TrainingHistoryWeek {
  const requestedWeekEnd = parseDayKey(selectedWeekEndKey) ?? latestSessionDay;
  const clampedWeekEnd = clampWeekEnd({
    latestSessionDay,
    oldestSessionDay,
    requestedWeekEnd,
  });

  return createTrainingHistoryWeek(clampedWeekEnd);
}

function getNextWeekEndKey(
  selectedWeek: TrainingHistoryWeek,
  latestSessionDay: Date,
): string | null {
  return selectedWeek.end.getTime() < latestSessionDay.getTime()
    ? toDayKey(addUtcDays(selectedWeek.end, 7))
    : null;
}

function getPreviousWeekEndKey(
  selectedWeek: TrainingHistoryWeek,
  oldestSessionDay: Date,
): string | null {
  return oldestSessionDay.getTime() < selectedWeek.start.getTime()
    ? toDayKey(addUtcDays(selectedWeek.end, -7))
    : null;
}

function createTrainingHistoryWeekSummary(
  trainingPlan: TrainingPlan,
  selectedSessions: ReadonlyArray<TrainingSession>,
  selectedMetrics: TrainingHistoryWeekMetrics,
  previousMetrics: TrainingHistoryWeekMetrics,
): TrainingHistoryWeekSummary {
  return {
    completedSessions: selectedSessions.length,
    completionTarget: trainingPlan.trainingFrequencyDaysPerWeek,
    loadedSetCount: selectedMetrics.loadedSetCount,
    progressPercentage: calculateProgressPercentage(
      selectedMetrics.totalVolume,
      previousMetrics.totalVolume,
    ),
    totalVolume: selectedMetrics.totalVolume,
  };
}

function summarizeExercise(exercise: TrainingSession["exercises"][number]) {
  let loadedSetCount = 0;
  let totalVolume = 0;

  for (const set of exercise.sets) {
    if (set.weight <= 0 || set.reps <= 0) {
      continue;
    }

    loadedSetCount += 1;
    totalVolume += set.weight * set.reps;
  }

  return {
    loadedSetCount,
    movementPattern: exercise.movementPattern,
    movementPatternLabel: formatSessionMovementPattern(exercise.movementPattern),
    totalVolume,
  };
}

function updateMovementPatternVolume(
  volumeByPattern: Map<
    string,
    {
      movementPattern: TrainingSessionMovementVolume["movementPattern"];
      movementPatternLabel: string;
      volume: number;
    }
  >,
  exerciseSummary: ReturnType<typeof summarizeExercise>,
) {
  if (exerciseSummary.totalVolume <= 0) {
    return;
  }

  const currentPattern = volumeByPattern.get(exerciseSummary.movementPattern);

  volumeByPattern.set(exerciseSummary.movementPattern, {
    movementPattern: exerciseSummary.movementPattern,
    movementPatternLabel:
      currentPattern?.movementPatternLabel ?? exerciseSummary.movementPatternLabel,
    volume: (currentPattern?.volume ?? 0) + exerciseSummary.totalVolume,
  });
}

function calculateProgressPercentage(
  selectedWeekVolume: number,
  previousWeekVolume: number,
): number | null {
  if (previousWeekVolume <= 0) {
    return null;
  }

  return Math.round(((selectedWeekVolume - previousWeekVolume) / previousWeekVolume) * 100);
}

function createTrainingHistoryWeek(end: Date): TrainingHistoryWeek {
  const start = addUtcDays(end, -6);

  return {
    end,
    endKey: toDayKey(end),
    label: formatTrainingWeekRange(start, end),
    start,
  };
}

function isSessionInWeek(
  trainingSession: TrainingSession & { completedAt: string },
  trainingHistoryWeek: TrainingHistoryWeek,
): boolean {
  const completedDay = toUtcDay(trainingSession.completedAt);

  return (
    completedDay.getTime() >= trainingHistoryWeek.start.getTime() &&
    completedDay.getTime() <= trainingHistoryWeek.end.getTime()
  );
}

function clampWeekEnd({
  latestSessionDay,
  oldestSessionDay,
  requestedWeekEnd,
}: {
  latestSessionDay: Date;
  oldestSessionDay: Date;
  requestedWeekEnd: Date;
}): Date {
  if (requestedWeekEnd.getTime() > latestSessionDay.getTime()) {
    return latestSessionDay;
  }

  if (requestedWeekEnd.getTime() < oldestSessionDay.getTime()) {
    return oldestSessionDay;
  }

  return requestedWeekEnd;
}

function getLatestSessionDay(
  trainingSessions: ReadonlyArray<TrainingSession & { completedAt: string }>,
): Date | null {
  return trainingSessions.reduce<Date | null>((latestSessionDay, trainingSession) => {
    const completedDay = toUtcDay(trainingSession.completedAt);

    if (!latestSessionDay || completedDay.getTime() > latestSessionDay.getTime()) {
      return completedDay;
    }

    return latestSessionDay;
  }, null);
}

function getOldestSessionDay(
  trainingSessions: ReadonlyArray<TrainingSession & { completedAt: string }>,
): Date | null {
  return trainingSessions.reduce<Date | null>((oldestSessionDay, trainingSession) => {
    const completedDay = toUtcDay(trainingSession.completedAt);

    if (!oldestSessionDay || completedDay.getTime() < oldestSessionDay.getTime()) {
      return completedDay;
    }

    return oldestSessionDay;
  }, null);
}

function formatTrainingWeekRange(start: Date, end: Date): string {
  const startMonth = formatMonth(start);
  const endMonth = formatMonth(end);
  const startDay = start.getUTCDate();
  const endDay = end.getUTCDate();
  const startYear = start.getUTCFullYear();
  const endYear = end.getUTCFullYear();

  if (startYear === endYear && startMonth === endMonth) {
    return `${startMonth} ${startDay}-${endDay}, ${endYear}`;
  }

  if (startYear === endYear) {
    return `${startMonth} ${startDay}-${endMonth} ${endDay}, ${endYear}`;
  }

  return `${startMonth} ${startDay}, ${startYear}-${endMonth} ${endDay}, ${endYear}`;
}

function formatMonth(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    timeZone: "UTC",
  }).format(value);
}

function parseDayKey(value: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  return toUtcDay(`${value}T00:00:00.000Z`);
}

function toDayKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function toUtcDay(value: string): Date {
  const date = new Date(value);

  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(value: Date, days: number): Date {
  const nextDate = new Date(value);

  nextDate.setUTCDate(nextDate.getUTCDate() + days);

  return nextDate;
}
