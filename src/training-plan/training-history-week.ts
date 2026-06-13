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

type CompletedTrainingSession = TrainingSession & { completedAt: string };

type TrainingHistorySessionDateRange = {
  latestSessionDay: Date;
  oldestSessionDay: Date;
};

type TrainingSessionExercise = TrainingSession["exercises"][number];
type TrainingSessionMovementPattern = TrainingSessionMovementVolume["movementPattern"];

type TrainingSessionExerciseSummary = {
  loadedSetCount: number;
  movementPattern: TrainingSessionMovementPattern;
  movementPatternLabel: string;
  totalVolume: number;
};

export type TrainingHistoryWeekSummary = {
  completedSessions: number;
  completionTarget: number;
  loadedSetCount: number;
  progressPercentage: number | null;
  totalVolume: number;
};

export type TrainingHistoryMovementPatternComparison = {
  change: "decrease" | "dropped" | "increase" | "new" | "same";
  changePercentage: number | null;
  currentVolume: number;
  deltaVolume: number;
  movementPattern: TrainingSessionMovementPattern;
  movementPatternLabel: string;
  previousVolume: number;
  relativeVolumePercentage: number;
};

export type TrainingHistoryPushPullBalanceInsight = {
  deltaVolume: number;
  leadingPatternGroup: "even" | "pull" | "push";
  pullVolume: number;
  pushVolume: number;
};

export type TrainingHistoryProgressInsights = {
  bestProgress: TrainingHistoryMovementPatternComparison | null;
  increasedMovementPatternCount: number;
  needsAttention: TrainingHistoryMovementPatternComparison | null;
  newMovementPatternCount: number;
  pushPullBalance: TrainingHistoryPushPullBalanceInsight | null;
};

export type TrainingHistoryWeekReport = {
  movementPatternComparisons: ReadonlyArray<TrainingHistoryMovementPatternComparison>;
  nextWeekEndKey: string | null;
  previousWeekEndKey: string | null;
  progressInsights: TrainingHistoryProgressInsights;
  selectedSessions: ReadonlyArray<TrainingSession>;
  selectedWeek: TrainingHistoryWeek | null;
  summary: TrainingHistoryWeekSummary;
};

const pushMovementPatterns = new Set<TrainingSessionMovementPattern>([
  "horizontal_push",
  "vertical_push",
]);

const pullMovementPatterns = new Set<TrainingSessionMovementPattern>([
  "horizontal_pull",
  "vertical_pull",
]);

export function buildTrainingHistoryWeekReport({
  selectedWeekEndKey,
  trainingPlan,
  trainingSessions,
}: {
  selectedWeekEndKey: string | null;
  trainingPlan: TrainingPlan;
  trainingSessions: ReadonlyArray<TrainingSession>;
}): TrainingHistoryWeekReport {
  const completedSessions = trainingSessions.filter(isCompletedTrainingSession);
  const dateRange = getCompletedSessionDateRange(completedSessions);

  if (!dateRange) {
    return createEmptyTrainingHistoryWeekReport(trainingPlan);
  }

  const selectedWeek = getSelectedTrainingWeek({
    latestSessionDay: dateRange.latestSessionDay,
    oldestSessionDay: dateRange.oldestSessionDay,
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
  const movementPatternComparisons = createMovementPatternComparisons(
    selectedMetrics.volumeByMovementPattern,
    previousMetrics.volumeByMovementPattern,
  );

  return {
    movementPatternComparisons,
    nextWeekEndKey: getNextWeekEndKey(selectedWeek, dateRange.latestSessionDay),
    previousWeekEndKey: getPreviousWeekEndKey(selectedWeek, dateRange.oldestSessionDay),
    progressInsights: createTrainingHistoryProgressInsights(movementPatternComparisons),
    selectedSessions,
    selectedWeek,
    summary: createTrainingHistoryWeekSummary(
      trainingPlan,
      selectedSessions,
      selectedMetrics,
      previousMetrics,
    ),
  };
}

function summarizeTrainingSessions(
  trainingSessions: ReadonlyArray<TrainingSession>,
): TrainingHistoryWeekMetrics {
  let loadedSetCount = 0;
  let totalVolume = 0;
  const volumeByPattern = new Map<TrainingSessionMovementPattern, TrainingSessionMovementVolume>();

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
    movementPatternComparisons: [],
    nextWeekEndKey: null,
    previousWeekEndKey: null,
    progressInsights: createEmptyTrainingHistoryProgressInsights(),
    selectedSessions: [],
    selectedWeek: null,
    summary: {
      completedSessions: 0,
      completionTarget: trainingPlan.trainingFrequencyDaysPerWeek,
      loadedSetCount: 0,
      progressPercentage: null,
      totalVolume: 0,
    },
  };
}

function createEmptyTrainingHistoryProgressInsights(): TrainingHistoryProgressInsights {
  return {
    bestProgress: null,
    increasedMovementPatternCount: 0,
    needsAttention: null,
    newMovementPatternCount: 0,
    pushPullBalance: null,
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

function createMovementPatternComparisons(
  selectedWeekVolumes: ReadonlyArray<TrainingSessionMovementVolume>,
  previousWeekVolumes: ReadonlyArray<TrainingSessionMovementVolume>,
): ReadonlyArray<TrainingHistoryMovementPatternComparison> {
  const selectedVolumeByPattern = createVolumeByPatternIndex(selectedWeekVolumes);
  const previousVolumeByPattern = createVolumeByPatternIndex(previousWeekVolumes);
  const movementPatterns = new Set([
    ...selectedVolumeByPattern.keys(),
    ...previousVolumeByPattern.keys(),
  ]);
  const maxCurrentVolume = getMaxMovementPatternVolume(selectedWeekVolumes);

  return Array.from(movementPatterns)
    .map((movementPattern) =>
      createMovementPatternComparison({
        maxCurrentVolume,
        movementPattern,
        previousRow: previousVolumeByPattern.get(movementPattern),
        selectedRow: selectedVolumeByPattern.get(movementPattern),
      }),
    )
    .sort(compareMovementPatternComparisons);
}

function createVolumeByPatternIndex(
  rows: ReadonlyArray<TrainingSessionMovementVolume>,
): Map<TrainingSessionMovementPattern, TrainingSessionMovementVolume> {
  return new Map(rows.map((row) => [row.movementPattern, row] as const));
}

function getMaxMovementPatternVolume(rows: ReadonlyArray<TrainingSessionMovementVolume>): number {
  return Math.max(0, ...rows.map((row) => row.volume));
}

function createMovementPatternComparison({
  maxCurrentVolume,
  movementPattern,
  previousRow,
  selectedRow,
}: {
  maxCurrentVolume: number;
  movementPattern: TrainingSessionMovementPattern;
  previousRow: TrainingSessionMovementVolume | undefined;
  selectedRow: TrainingSessionMovementVolume | undefined;
}): TrainingHistoryMovementPatternComparison {
  const currentVolume = selectedRow?.volume ?? 0;
  const previousVolume = previousRow?.volume ?? 0;

  return {
    change: resolveMovementPatternChange(currentVolume, previousVolume),
    changePercentage: calculateProgressPercentage(currentVolume, previousVolume),
    currentVolume,
    deltaVolume: currentVolume - previousVolume,
    movementPattern,
    movementPatternLabel:
      selectedRow?.movementPatternLabel ?? previousRow?.movementPatternLabel ?? "",
    previousVolume,
    relativeVolumePercentage: calculateRelativeVolumePercentage(currentVolume, maxCurrentVolume),
  };
}

function calculateRelativeVolumePercentage(
  currentVolume: number,
  maxCurrentVolume: number,
): number {
  if (maxCurrentVolume <= 0) {
    return 0;
  }

  return Math.round((currentVolume / maxCurrentVolume) * 100);
}

function compareMovementPatternComparisons(
  firstRow: TrainingHistoryMovementPatternComparison,
  secondRow: TrainingHistoryMovementPatternComparison,
): number {
  return (
    secondRow.currentVolume - firstRow.currentVolume ||
    secondRow.previousVolume - firstRow.previousVolume ||
    firstRow.movementPatternLabel.localeCompare(secondRow.movementPatternLabel)
  );
}

function createTrainingHistoryProgressInsights(
  rows: ReadonlyArray<TrainingHistoryMovementPatternComparison>,
): TrainingHistoryProgressInsights {
  const bestProgress = getBestProgress(rows);
  const needsAttention = getNeedsAttention(rows);

  return {
    bestProgress,
    increasedMovementPatternCount: rows.filter((row) => row.change === "increase").length,
    needsAttention,
    newMovementPatternCount: rows.filter((row) => row.change === "new").length,
    pushPullBalance: createPushPullBalanceInsight(rows),
  };
}

function getBestProgress(
  rows: ReadonlyArray<TrainingHistoryMovementPatternComparison>,
): TrainingHistoryMovementPatternComparison | null {
  const progressRows = rows.filter((row) => row.deltaVolume > 0);

  if (progressRows.length === 0) {
    return null;
  }

  const [bestProgress] = [...progressRows].sort(
    (firstRow, secondRow) =>
      secondRow.deltaVolume - firstRow.deltaVolume ||
      secondRow.currentVolume - firstRow.currentVolume ||
      firstRow.movementPatternLabel.localeCompare(secondRow.movementPatternLabel),
  );

  return bestProgress ?? null;
}

function getNeedsAttention(
  rows: ReadonlyArray<TrainingHistoryMovementPatternComparison>,
): TrainingHistoryMovementPatternComparison | null {
  const regressionRows = rows.filter((row) => row.deltaVolume < 0);

  if (regressionRows.length === 0) {
    return null;
  }

  const [needsAttention] = [...regressionRows].sort(
    (firstRow, secondRow) =>
      firstRow.deltaVolume - secondRow.deltaVolume ||
      secondRow.previousVolume - firstRow.previousVolume ||
      firstRow.movementPatternLabel.localeCompare(secondRow.movementPatternLabel),
  );

  return needsAttention ?? null;
}

function createPushPullBalanceInsight(
  rows: ReadonlyArray<TrainingHistoryMovementPatternComparison>,
): TrainingHistoryPushPullBalanceInsight | null {
  const pushRows = rows.filter((row) => pushMovementPatterns.has(row.movementPattern));
  const pullRows = rows.filter((row) => pullMovementPatterns.has(row.movementPattern));

  if (pushRows.length === 0 || pullRows.length === 0) {
    return null;
  }

  const pushVolume = pushRows.reduce((total, row) => total + row.currentVolume, 0);
  const pullVolume = pullRows.reduce((total, row) => total + row.currentVolume, 0);

  if (pushVolume <= 0 && pullVolume <= 0) {
    return null;
  }

  if (pushVolume === pullVolume) {
    return {
      deltaVolume: 0,
      leadingPatternGroup: "even",
      pullVolume,
      pushVolume,
    };
  }

  return {
    deltaVolume: Math.abs(pushVolume - pullVolume),
    leadingPatternGroup: pushVolume > pullVolume ? "push" : "pull",
    pullVolume,
    pushVolume,
  };
}

function summarizeExercise(exercise: TrainingSessionExercise): TrainingSessionExerciseSummary {
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
  volumeByPattern: Map<TrainingSessionMovementPattern, TrainingSessionMovementVolume>,
  exerciseSummary: TrainingSessionExerciseSummary,
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

function resolveMovementPatternChange(
  currentVolume: number,
  previousVolume: number,
): TrainingHistoryMovementPatternComparison["change"] {
  if (previousVolume <= 0) {
    return "new";
  }

  if (currentVolume <= 0) {
    return "dropped";
  }

  if (currentVolume === previousVolume) {
    return "same";
  }

  return currentVolume > previousVolume ? "increase" : "decrease";
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
  trainingSession: CompletedTrainingSession,
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

function isCompletedTrainingSession(
  trainingSession: TrainingSession,
): trainingSession is CompletedTrainingSession {
  return trainingSession.completedAt !== null;
}

function getCompletedSessionDateRange(
  trainingSessions: ReadonlyArray<CompletedTrainingSession>,
): TrainingHistorySessionDateRange | null {
  let latestSessionDay: Date | null = null;
  let oldestSessionDay: Date | null = null;

  for (const trainingSession of trainingSessions) {
    const completedDay = toUtcDay(trainingSession.completedAt);

    if (!latestSessionDay || completedDay.getTime() > latestSessionDay.getTime()) {
      latestSessionDay = completedDay;
    }

    if (!oldestSessionDay || completedDay.getTime() < oldestSessionDay.getTime()) {
      oldestSessionDay = completedDay;
    }
  }

  if (!latestSessionDay || !oldestSessionDay) {
    return null;
  }

  return { latestSessionDay, oldestSessionDay };
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
