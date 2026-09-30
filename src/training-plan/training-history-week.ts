import { hasBodyweightLoadExercise } from "./bodyweight-load";
import {
  type CompletedLoadVolumeMovementRow,
  summarizeCompletedLoadVolume,
} from "./completed-load-volume";
import type { TrainingPlan } from "./training-plan";
import {
  formatMovementPatternVolumeLabel,
  type PresentedCompletedLoadVolumeExerciseReport,
  type PresentedCompletedLoadVolumeMovementRow,
  presentCompletedLoadVolumeSummary,
} from "./training-plan-presentation";
import type { TrainingSession } from "./training-session";
import { getTrainingSessionIntent } from "./training-session-sequencing";
import {
  compareTrainingSessionTargets,
  summarizeTrainingSessionTargets,
  type TrainingSessionExerciseTargetComparison,
  type TrainingSessionTargetSummary,
} from "./training-session-target-comparison";
import { addUtcDays, toDayKey, toUtcDay } from "./training-week-date";
import { formatTrainingWeekRangeLabel } from "./training-week-range-label";

type TrainingHistoryWeek = {
  end: Date;
  endKey: string;
  label: string;
  start: Date;
};

type TrainingHistoryWeekMetrics = {
  hasPartialVolume: boolean;
  loadedSetCount: number;
  totalVolume: number;
  volumeByMovementPattern: PresentedCompletedLoadVolumeMovementRow[];
};

type CompletedTrainingSession = TrainingSession & { completedAt: string };

type TrainingHistorySessionDateRange = {
  latestSessionDay: Date;
  oldestSessionDay: Date;
};

type TrainingSessionMovementPattern = CompletedLoadVolumeMovementRow["movementPattern"];

type MovementPatternGroupVolume = {
  hasRows: boolean;
  totalVolume: number;
};

export type TrainingHistorySessionExerciseReport = PresentedCompletedLoadVolumeExerciseReport;

export type TrainingHistorySessionReport = {
  completedAt: string;
  completedLoadVolume: number;
  exercises: ReadonlyArray<TrainingHistorySessionExerciseReport>;
  hasBodyweightExercises: boolean;
  hasPartialVolume: boolean;
  id: string;
  loadedSetCount: number;
  sessionIntent: "extra" | "planned";
  sessionBodyweight: number | null;
  /** Done sets next to the Session Target each was logged against. */
  targetComparisons: ReadonlyArray<TrainingSessionExerciseTargetComparison>;
  targetSummary: TrainingSessionTargetSummary;
  templateId: string;
  templateLabel: string;
  volumeProgression: TrainingHistorySessionVolumeProgression;
};

/**
 * Total-volume comparison result for a Training Week or comparable Training Session.
 */
export type TrainingWeekProgressVerdict =
  | "not_comparable"
  | "progressed"
  | "regressed"
  | "unchanged";

/**
 * Describes how a selected Training Week's completed session count relates to the plan target.
 */
export type TrainingWeekCompletionContext = {
  /** Completed sessions minus the plan's weekly session target. */
  deltaSessions: number;
  /** Whether the selected week is below, at, or above the plan's weekly session target. */
  status: "above_target" | "below_target" | "met_target";
};

/**
 * Volume comparison against the previous completed session for the same Workout Template.
 */
export type TrainingHistorySessionVolumeProgression = {
  /** Current session volume minus previous comparable session volume, or null when unavailable. */
  deltaVolume: number | null;
  /** Completion timestamp for the previous comparable session, when one exists. */
  previousComparableCompletedAt: string | null;
  /** Completed Load Volume for the previous comparable session, when one exists. */
  previousComparableVolume: number | null;
  /** Progress verdict for this session-level comparison. */
  verdict: TrainingWeekProgressVerdict;
};

/**
 * Informational previous-week volume reference used by compact and detailed progress views.
 */
export type TrainingWeekVolumeReference = {
  /** Whether the referenced week contains partial volume from unknown bodyweight loads. */
  hasPartialVolume: boolean;
  /** Total known Completed Load Volume for the referenced Training Week. */
  totalVolume: number;
  /** Human-readable UTC date range label for the referenced Training Week. */
  weekLabel: string;
};

export type TrainingHistoryWeekSummary = {
  completedSessions: number;
  completionContext: TrainingWeekCompletionContext;
  completionTarget: number;
  hasPartialVolume: boolean;
  loadedSetCount: number;
  progressPercentage: number | null;
  progressVerdict: TrainingWeekProgressVerdict;
  previousWeekVolumeReference: TrainingWeekVolumeReference | null;
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
  const selectedSessionReports = addTrainingSessionProgression({
    completedSessions,
    trainingSessions,
    selectedSessionReports: selectedTrainingSessions.map(createTrainingHistorySessionReport),
  });
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
      previousSessions.length,
      previousWeek,
      selectedSessionReports,
      selectedMetrics,
      previousMetrics,
    ),
  };
}

function summarizeTrainingSessionReports(
  sessionReports: ReadonlyArray<TrainingHistorySessionReport>,
): TrainingHistoryWeekMetrics {
  let hasPartialVolume = false;
  let loadedSetCount = 0;
  let totalVolume = 0;
  const volumeByPattern = new Map<
    TrainingSessionMovementPattern,
    PresentedCompletedLoadVolumeMovementRow
  >();

  for (const sessionReport of sessionReports) {
    hasPartialVolume = hasPartialVolume || sessionReport.hasPartialVolume;

    for (const exerciseReport of sessionReport.exercises) {
      loadedSetCount += exerciseReport.loadedSetCount;
      totalVolume += exerciseReport.completedLoadVolume;
      updateMovementPatternVolume(volumeByPattern, exerciseReport);
    }
  }

  return {
    hasPartialVolume,
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
      completionContext: createTrainingWeekCompletionContext({
        completedSessions: 0,
        completionTarget: trainingPlan.trainingFrequencyDaysPerWeek,
      }),
      completionTarget: trainingPlan.trainingFrequencyDaysPerWeek,
      hasPartialVolume: false,
      loadedSetCount: 0,
      progressPercentage: null,
      progressVerdict: "not_comparable",
      previousWeekVolumeReference: null,
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
  previousWeekSessions: number,
  previousWeek: TrainingHistoryWeek,
  selectedSessions: ReadonlyArray<TrainingHistorySessionReport>,
  selectedMetrics: TrainingHistoryWeekMetrics,
  previousMetrics: TrainingHistoryWeekMetrics,
): TrainingHistoryWeekSummary {
  return {
    completedSessions: selectedSessions.length,
    completionContext: createTrainingWeekCompletionContext({
      completedSessions: selectedSessions.length,
      completionTarget: trainingPlan.trainingFrequencyDaysPerWeek,
    }),
    completionTarget: trainingPlan.trainingFrequencyDaysPerWeek,
    hasPartialVolume: selectedMetrics.hasPartialVolume,
    loadedSetCount: selectedMetrics.loadedSetCount,
    progressPercentage: calculateProgressPercentage(
      selectedMetrics.totalVolume,
      previousMetrics.totalVolume,
    ),
    progressVerdict: calculateProgressVerdict({
      previousMetrics,
      selectedMetrics,
    }),
    previousWeekVolumeReference: createTrainingWeekVolumeReference({
      previousMetrics,
      previousWeek:
        previousWeekSessions > 0 || previousMetrics.hasPartialVolume ? previousWeek : null,
      previousWeekSessions,
    }),
    totalVolume: selectedMetrics.totalVolume,
  };
}

function createTrainingWeekCompletionContext({
  completedSessions,
  completionTarget,
}: {
  completedSessions: number;
  completionTarget: number;
}): TrainingWeekCompletionContext {
  const deltaSessions = completedSessions - completionTarget;

  if (deltaSessions === 0) {
    return {
      deltaSessions,
      status: "met_target",
    };
  }

  return {
    deltaSessions,
    status: deltaSessions > 0 ? "above_target" : "below_target",
  };
}

function calculateProgressVerdict({
  previousMetrics,
  selectedMetrics,
}: {
  previousMetrics: TrainingHistoryWeekMetrics;
  selectedMetrics: TrainingHistoryWeekMetrics;
}): TrainingWeekProgressVerdict {
  if (
    previousMetrics.totalVolume <= 0 ||
    previousMetrics.hasPartialVolume ||
    selectedMetrics.hasPartialVolume
  ) {
    return "not_comparable";
  }

  if (selectedMetrics.totalVolume === previousMetrics.totalVolume) {
    return "unchanged";
  }

  return selectedMetrics.totalVolume > previousMetrics.totalVolume ? "progressed" : "regressed";
}

function createTrainingWeekVolumeReference({
  previousMetrics,
  previousWeek,
  previousWeekSessions,
}: {
  previousMetrics: TrainingHistoryWeekMetrics;
  previousWeek: TrainingHistoryWeek | null;
  previousWeekSessions: number;
}): TrainingWeekVolumeReference | null {
  if (
    !previousWeek ||
    (previousWeekSessions === 0 &&
      previousMetrics.totalVolume <= 0 &&
      previousMetrics.hasPartialVolume === false)
  ) {
    return null;
  }

  return {
    hasPartialVolume: previousMetrics.hasPartialVolume,
    totalVolume: previousMetrics.totalVolume,
    weekLabel: previousWeek.label,
  };
}

function createMovementPatternComparisons(
  selectedWeekVolumes: ReadonlyArray<PresentedCompletedLoadVolumeMovementRow>,
  previousWeekVolumes: ReadonlyArray<PresentedCompletedLoadVolumeMovementRow>,
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
  rows: ReadonlyArray<PresentedCompletedLoadVolumeMovementRow>,
): Map<TrainingSessionMovementPattern, PresentedCompletedLoadVolumeMovementRow> {
  return new Map(rows.map((row) => [row.movementPattern, row] as const));
}

function getMaxMovementPatternVolume(
  rows: ReadonlyArray<PresentedCompletedLoadVolumeMovementRow>,
): number {
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
  previousRow: PresentedCompletedLoadVolumeMovementRow | undefined;
  selectedRow: PresentedCompletedLoadVolumeMovementRow | undefined;
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
      selectedRow?.movementPatternLabel ??
      previousRow?.movementPatternLabel ??
      formatMovementPatternVolumeLabel(movementPattern),
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
  const completedLoadVolume = presentCompletedLoadVolumeSummary(
    summarizeCompletedLoadVolume(trainingSession.exercises, {
      sessionBodyweight: trainingSession.sessionBodyweight,
    }),
  );
  const targetComparisons = compareTrainingSessionTargets(trainingSession.exercises);

  return {
    completedAt: trainingSession.completedAt,
    completedLoadVolume: completedLoadVolume.totalVolume,
    exercises: completedLoadVolume.exercises,
    hasBodyweightExercises: hasBodyweightLoadExercise(trainingSession.exercises),
    hasPartialVolume: completedLoadVolume.hasPartialVolume,
    id: trainingSession.id,
    loadedSetCount: completedLoadVolume.loadedSetCount,
    sessionIntent: getTrainingSessionIntent(trainingSession),
    sessionBodyweight: trainingSession.sessionBodyweight ?? null,
    targetComparisons,
    targetSummary: summarizeTrainingSessionTargets(targetComparisons),
    templateId: trainingSession.templateId,
    templateLabel: trainingSession.templateLabel,
    volumeProgression: {
      deltaVolume: null,
      previousComparableCompletedAt: null,
      previousComparableVolume: null,
      verdict: "not_comparable",
    },
  };
}

function addTrainingSessionProgression({
  completedSessions,
  selectedSessionReports,
  trainingSessions,
}: {
  completedSessions: ReadonlyArray<CompletedTrainingSession>;
  selectedSessionReports: ReadonlyArray<TrainingHistorySessionReport>;
  trainingSessions: ReadonlyArray<TrainingSession>;
}): ReadonlyArray<TrainingHistorySessionReport> {
  const volumeProgressionBySessionId = getVolumeProgressionBySessionId({
    completedSessions,
    trainingSessions,
  });

  return selectedSessionReports.map((sessionReport) => ({
    ...sessionReport,
    volumeProgression:
      volumeProgressionBySessionId.get(sessionReport.id) ?? sessionReport.volumeProgression,
  }));
}

// Progression spans the whole history, so switching weeks reuses it for the same session list.
const volumeProgressionBySessionIdCache = new WeakMap<
  ReadonlyArray<TrainingSession>,
  ReadonlyMap<string, TrainingHistorySessionVolumeProgression>
>();

function getVolumeProgressionBySessionId({
  completedSessions,
  trainingSessions,
}: {
  completedSessions: ReadonlyArray<CompletedTrainingSession>;
  trainingSessions: ReadonlyArray<TrainingSession>;
}): ReadonlyMap<string, TrainingHistorySessionVolumeProgression> {
  const cachedProgression = volumeProgressionBySessionIdCache.get(trainingSessions);

  if (cachedProgression) {
    return cachedProgression;
  }

  const previousComparableSessionByTemplateId = new Map<string, TrainingHistorySessionReport>();
  const volumeProgressionBySessionId = new Map<string, TrainingHistorySessionVolumeProgression>();
  const sessionReports = completedSessions
    .slice()
    .sort((firstSession, secondSession) =>
      firstSession.completedAt.localeCompare(secondSession.completedAt),
    )
    .map(createTrainingHistorySessionReport);

  for (const sessionReport of sessionReports) {
    const comparableSessionKey = getComparableTrainingSessionKey(sessionReport);
    const previousComparableSession =
      previousComparableSessionByTemplateId.get(comparableSessionKey);

    volumeProgressionBySessionId.set(
      sessionReport.id,
      createTrainingHistorySessionVolumeProgression({
        previousComparableSession,
        sessionReport,
      }),
    );
    previousComparableSessionByTemplateId.set(comparableSessionKey, sessionReport);
  }

  volumeProgressionBySessionIdCache.set(trainingSessions, volumeProgressionBySessionId);

  return volumeProgressionBySessionId;
}

function getComparableTrainingSessionKey(sessionReport: TrainingHistorySessionReport): string {
  return sessionReport.templateId;
}

function createTrainingHistorySessionVolumeProgression({
  previousComparableSession,
  sessionReport,
}: {
  previousComparableSession: TrainingHistorySessionReport | undefined;
  sessionReport: TrainingHistorySessionReport;
}): TrainingHistorySessionVolumeProgression {
  if (!canCompareTrainingHistorySessionVolume(previousComparableSession, sessionReport)) {
    return createNotComparableTrainingHistorySessionVolumeProgression(previousComparableSession);
  }

  const deltaVolume =
    sessionReport.completedLoadVolume - previousComparableSession.completedLoadVolume;

  return {
    deltaVolume,
    previousComparableCompletedAt: previousComparableSession.completedAt,
    previousComparableVolume: previousComparableSession.completedLoadVolume,
    verdict: getTrainingHistorySessionProgressVerdict(deltaVolume),
  };
}

function canCompareTrainingHistorySessionVolume(
  previousComparableSession: TrainingHistorySessionReport | undefined,
  sessionReport: TrainingHistorySessionReport,
): previousComparableSession is TrainingHistorySessionReport {
  return Boolean(
    previousComparableSession &&
      previousComparableSession.completedLoadVolume > 0 &&
      previousComparableSession.hasPartialVolume === false &&
      sessionReport.hasPartialVolume === false,
  );
}

function createNotComparableTrainingHistorySessionVolumeProgression(
  previousComparableSession: TrainingHistorySessionReport | undefined,
): TrainingHistorySessionVolumeProgression {
  return {
    deltaVolume: null,
    previousComparableCompletedAt: previousComparableSession?.completedAt ?? null,
    previousComparableVolume: previousComparableSession?.completedLoadVolume ?? null,
    verdict: "not_comparable",
  };
}

function getTrainingHistorySessionProgressVerdict(
  deltaVolume: number,
): Exclude<TrainingWeekProgressVerdict, "not_comparable"> {
  if (deltaVolume === 0) {
    return "unchanged";
  }

  return deltaVolume > 0 ? "progressed" : "regressed";
}

function updateMovementPatternVolume(
  volumeByPattern: Map<TrainingSessionMovementPattern, PresentedCompletedLoadVolumeMovementRow>,
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
    label: formatTrainingWeekRangeLabel(start, end),
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
  return trainingSession.completedAt !== null && isValidDateString(trainingSession.completedAt);
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

function parseDayKey(value: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const parsedDay = toUtcDay(`${value}T00:00:00.000Z`);

  return isValidDate(parsedDay) ? parsedDay : null;
}

function isValidDateString(value: string): boolean {
  return isValidDate(new Date(value));
}

function isValidDate(value: Date): boolean {
  return !Number.isNaN(value.getTime());
}
