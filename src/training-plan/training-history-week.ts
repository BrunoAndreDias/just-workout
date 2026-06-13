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

type TrainingHistorySessionTotals = {
  completedLoadVolume: number;
  loadedSetCount: number;
};

type TrainingSessionExercise = TrainingSession["exercises"][number];
type TrainingSessionMovementPattern = TrainingSessionMovementVolume["movementPattern"];

type MovementPatternGroupVolume = {
  hasRows: boolean;
  totalVolume: number;
};

export type TrainingHistorySessionExerciseReport = {
  completedLoadVolume: number;
  exerciseId: string;
  exerciseName: string;
  loadedSetCount: number;
  movementPattern: TrainingSessionMovementPattern;
  movementPatternLabel: string;
};

export type TrainingHistorySessionReport = {
  completedAt: string;
  completedLoadVolume: number;
  exercises: ReadonlyArray<TrainingHistorySessionExerciseReport>;
  id: string;
  loadedSetCount: number;
  templateLabel: string;
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
  selectedSessions: ReadonlyArray<TrainingHistorySessionReport>;
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
  const selectedTrainingSessions = completedSessions.filter((session) =>
    isSessionInWeek(session, selectedWeek),
  );
  const previousSessions = completedSessions.filter((session) =>
    isSessionInWeek(session, previousWeek),
  );
  const selectedSessionReports = selectedTrainingSessions.map(createTrainingHistorySessionReport);
  const previousSessionReports = previousSessions.map(createTrainingHistorySessionReport);
  const selectedMetrics = summarizeTrainingSessionReports(selectedSessionReports);
  const previousMetrics = summarizeTrainingSessionReports(previousSessionReports);
  const movementPatternComparisons = createMovementPatternComparisons(
    selectedMetrics.volumeByMovementPattern,
    previousMetrics.volumeByMovementPattern,
  );

  return {
    movementPatternComparisons,
    nextWeekEndKey: getNextWeekEndKey(selectedWeek, dateRange.latestSessionDay),
    previousWeekEndKey: getPreviousWeekEndKey(selectedWeek, dateRange.oldestSessionDay),
    progressInsights: createTrainingHistoryProgressInsights(movementPatternComparisons),
    selectedSessions: selectedSessionReports,
    selectedWeek,
    summary: createTrainingHistoryWeekSummary(
      trainingPlan,
      selectedSessionReports,
      selectedMetrics,
      previousMetrics,
    ),
  };
}

function summarizeTrainingSessionReports(
  sessionReports: ReadonlyArray<TrainingHistorySessionReport>,
): TrainingHistoryWeekMetrics {
  let loadedSetCount = 0;
  let totalVolume = 0;
  const volumeByPattern = new Map<TrainingSessionMovementPattern, TrainingSessionMovementVolume>();

  for (const sessionReport of sessionReports) {
    for (const exerciseReport of sessionReport.exercises) {
      loadedSetCount += exerciseReport.loadedSetCount;
      totalVolume += exerciseReport.completedLoadVolume;
      updateMovementPatternVolume(volumeByPattern, exerciseReport);
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
    progressInsights: createTrainingHistoryProgressInsights([]),
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
  selectedSessions: ReadonlyArray<TrainingHistorySessionReport>,
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
  let bestProgress: TrainingHistoryMovementPatternComparison | null = null;
  let increasedMovementPatternCount = 0;
  let needsAttention: TrainingHistoryMovementPatternComparison | null = null;
  let newMovementPatternCount = 0;

  for (const row of rows) {
    if (row.change === "increase") {
      increasedMovementPatternCount += 1;
    }

    if (row.change === "new") {
      newMovementPatternCount += 1;
    }

    if (isBetterProgressRow(row, bestProgress)) {
      bestProgress = row;
    }

    if (isHigherPriorityAttentionRow(row, needsAttention)) {
      needsAttention = row;
    }
  }

  return {
    bestProgress,
    increasedMovementPatternCount,
    needsAttention,
    newMovementPatternCount,
    pushPullBalance: createPushPullBalanceInsight(rows),
  };
}

function isBetterProgressRow(
  row: TrainingHistoryMovementPatternComparison,
  currentBest: TrainingHistoryMovementPatternComparison | null,
): boolean {
  return row.deltaVolume > 0 && (!currentBest || compareProgressRows(row, currentBest) < 0);
}

function isHigherPriorityAttentionRow(
  row: TrainingHistoryMovementPatternComparison,
  currentPriority: TrainingHistoryMovementPatternComparison | null,
): boolean {
  return (
    row.deltaVolume < 0 && (!currentPriority || compareAttentionRows(row, currentPriority) < 0)
  );
}

function compareProgressRows(
  firstRow: TrainingHistoryMovementPatternComparison,
  secondRow: TrainingHistoryMovementPatternComparison,
): number {
  return (
    secondRow.deltaVolume - firstRow.deltaVolume ||
    secondRow.currentVolume - firstRow.currentVolume ||
    firstRow.movementPatternLabel.localeCompare(secondRow.movementPatternLabel)
  );
}

function compareAttentionRows(
  firstRow: TrainingHistoryMovementPatternComparison,
  secondRow: TrainingHistoryMovementPatternComparison,
): number {
  return (
    firstRow.deltaVolume - secondRow.deltaVolume ||
    secondRow.previousVolume - firstRow.previousVolume ||
    firstRow.movementPatternLabel.localeCompare(secondRow.movementPatternLabel)
  );
}

function createPushPullBalanceInsight(
  rows: ReadonlyArray<TrainingHistoryMovementPatternComparison>,
): TrainingHistoryPushPullBalanceInsight | null {
  const pushGroup = sumCurrentVolumeForMovementPatterns(rows, pushMovementPatterns);
  const pullGroup = sumCurrentVolumeForMovementPatterns(rows, pullMovementPatterns);

  if (!pushGroup.hasRows || !pullGroup.hasRows) {
    return null;
  }

  const pushVolume = pushGroup.totalVolume;
  const pullVolume = pullGroup.totalVolume;

  if (pushVolume <= 0 && pullVolume <= 0) {
    return null;
  }

  return {
    deltaVolume: Math.abs(pushVolume - pullVolume),
    leadingPatternGroup: resolveLeadingPushPullPatternGroup(pushVolume, pullVolume),
    pullVolume,
    pushVolume,
  };
}

function sumCurrentVolumeForMovementPatterns(
  rows: ReadonlyArray<TrainingHistoryMovementPatternComparison>,
  movementPatterns: ReadonlySet<TrainingSessionMovementPattern>,
): MovementPatternGroupVolume {
  let hasRows = false;
  let totalVolume = 0;

  for (const row of rows) {
    if (!movementPatterns.has(row.movementPattern)) {
      continue;
    }

    hasRows = true;
    totalVolume += row.currentVolume;
  }

  return { hasRows, totalVolume };
}

function resolveLeadingPushPullPatternGroup(
  pushVolume: number,
  pullVolume: number,
): TrainingHistoryPushPullBalanceInsight["leadingPatternGroup"] {
  if (pushVolume === pullVolume) {
    return "even";
  }

  return pushVolume > pullVolume ? "push" : "pull";
}

function createTrainingHistorySessionReport(
  trainingSession: CompletedTrainingSession,
): TrainingHistorySessionReport {
  const exercises = trainingSession.exercises.map(createTrainingHistorySessionExerciseReport);
  const totals = sumTrainingHistorySessionExercises(exercises);

  return {
    completedAt: trainingSession.completedAt,
    completedLoadVolume: totals.completedLoadVolume,
    exercises,
    id: trainingSession.id,
    loadedSetCount: totals.loadedSetCount,
    templateLabel: trainingSession.templateLabel,
  };
}

function createTrainingHistorySessionExerciseReport(
  exercise: TrainingSessionExercise,
): TrainingHistorySessionExerciseReport {
  let completedLoadVolume = 0;
  let loadedSetCount = 0;

  for (const set of exercise.sets) {
    if (set.weight <= 0 || set.reps <= 0) {
      continue;
    }

    completedLoadVolume += set.weight * set.reps;
    loadedSetCount += 1;
  }

  return {
    completedLoadVolume,
    exerciseId: exercise.exerciseId,
    exerciseName: exercise.exerciseName,
    loadedSetCount,
    movementPattern: exercise.movementPattern,
    movementPatternLabel: formatSessionMovementPattern(exercise.movementPattern),
  };
}

function sumTrainingHistorySessionExercises(
  exercises: ReadonlyArray<TrainingHistorySessionExerciseReport>,
): TrainingHistorySessionTotals {
  let completedLoadVolume = 0;
  let loadedSetCount = 0;

  for (const exercise of exercises) {
    completedLoadVolume += exercise.completedLoadVolume;
    loadedSetCount += exercise.loadedSetCount;
  }

  return { completedLoadVolume, loadedSetCount };
}

function updateMovementPatternVolume(
  volumeByPattern: Map<TrainingSessionMovementPattern, TrainingSessionMovementVolume>,
  exerciseReport: TrainingHistorySessionExerciseReport,
) {
  if (exerciseReport.completedLoadVolume <= 0) {
    return;
  }

  const currentPattern = volumeByPattern.get(exerciseReport.movementPattern);

  volumeByPattern.set(exerciseReport.movementPattern, {
    movementPattern: exerciseReport.movementPattern,
    movementPatternLabel:
      currentPattern?.movementPatternLabel ?? exerciseReport.movementPatternLabel,
    volume: (currentPattern?.volume ?? 0) + exerciseReport.completedLoadVolume,
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
