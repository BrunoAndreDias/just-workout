import { parsePositiveBodyweight } from "./bodyweight-input";
import { hasBodyweightLoadExercise } from "./bodyweight-load";
import { calculateVolumeByMovementPattern } from "./completed-load-volume";
import {
  getCurrentTrainingWeek,
  isSessionInTrainingWeek,
  type TrainingWeekRange,
} from "./training-block-calendar";
import type { TrainingPlan, WorkoutTemplate } from "./training-plan";
import type {
  TrainingSession,
  TrainingSessionBodyweight,
  TrainingSessionBodyweightSource,
} from "./training-session";

/** Bodyweight saved for a specific Training Week inheritance window. */
export type TrainingWeekBodyweightUpdate = TrainingWeekRange & {
  bodyweight: number;
  updatedAt: string;
};

/** Bodyweight value resolved for a Training Week, including its inheritance source. */
export type ResolvedTrainingWeekBodyweight = TrainingWeekRange & {
  bodyweight: number | null;
  source: Extract<TrainingSessionBodyweightSource, "baseline" | "inherited_weekly"> | null;
};

/** Editable Session Bodyweight for one Training Session before it is completed. */
export type SessionBodyweightField = {
  error: string | null;
  input: string;
  required: boolean;
  source: TrainingSessionBodyweightSource | null;
};

type SessionBodyweightTemplate = Pick<WorkoutTemplate, "supersetGroups">;

const MISSING_SESSION_BODYWEIGHT_ERROR =
  "Session Bodyweight is required to complete bodyweight volume.";

/** Checks whether any of the Workout Templates contains a bodyweight exercise. */
export function requiresSessionBodyweight(
  templates: SessionBodyweightTemplate | ReadonlyArray<SessionBodyweightTemplate>,
): boolean {
  const templateList: ReadonlyArray<SessionBodyweightTemplate> = Array.isArray(templates)
    ? templates
    : [templates as SessionBodyweightTemplate];

  return hasBodyweightLoadExercise(
    templateList.flatMap((template) => template.supersetGroups.flatMap((group) => group.slots)),
  );
}

/**
 * Resolves the Inherited Bodyweight Default for the Training Week containing the reference date:
 * that week's Weekly Bodyweight Update, then the latest earlier update, then Baseline Bodyweight.
 */
export function resolveTrainingWeekBodyweight({
  referenceDate,
  trainingPlan,
}: {
  referenceDate: string;
  trainingPlan: TrainingPlan;
}): ResolvedTrainingWeekBodyweight {
  const { weekEnd, weekStart } = getCurrentTrainingWeek(trainingPlan, new Date(referenceDate));
  const currentWeek = { weekEnd, weekStart };
  const latestWeeklyUpdate = (trainingPlan.weeklyBodyweightUpdates ?? [])
    .filter((update) => update.weekStart <= weekStart)
    .sort((firstUpdate, secondUpdate) =>
      secondUpdate.weekStart.localeCompare(firstUpdate.weekStart),
    )[0];

  if (latestWeeklyUpdate) {
    return {
      bodyweight: latestWeeklyUpdate.bodyweight,
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

/** Starts the Session Bodyweight field from the Training Week's Inherited Bodyweight Default. */
export function initSessionBodyweightField({
  referenceDate,
  trainingPlan,
  workoutTemplate,
}: {
  referenceDate: string;
  trainingPlan: TrainingPlan | null | undefined;
  workoutTemplate: WorkoutTemplate | null;
}): SessionBodyweightField {
  if (!trainingPlan || !workoutTemplate || !requiresSessionBodyweight(workoutTemplate)) {
    return { error: null, input: "", required: false, source: null };
  }

  const resolved = resolveTrainingWeekBodyweight({ referenceDate, trainingPlan });

  return {
    error: null,
    input: resolved.bodyweight?.toString() ?? "",
    required: true,
    source: resolved.source,
  };
}

/** Records a user edit, which turns the value into a Per-Session Bodyweight Override. */
export function editSessionBodyweightField(
  field: SessionBodyweightField,
  input: string,
): SessionBodyweightField {
  return { ...field, error: null, input, source: "session_override" };
}

/** Validates the field for completion and returns the Session Bodyweight to store, if any. */
export function completeSessionBodyweightField(
  field: SessionBodyweightField,
):
  | { field: SessionBodyweightField; ok: true; sessionBodyweight: TrainingSessionBodyweight | null }
  | { field: SessionBodyweightField; ok: false } {
  if (!field.required) {
    return { field: { ...field, error: null }, ok: true, sessionBodyweight: null };
  }

  const bodyweight = parsePositiveBodyweight(field.input);

  if (bodyweight === null) {
    return { field: { ...field, error: MISSING_SESSION_BODYWEIGHT_ERROR }, ok: false };
  }

  return {
    field: { ...field, error: null },
    ok: true,
    sessionBodyweight: { bodyweight, source: field.source ?? "session_override" },
  };
}

/**
 * Saves a Weekly Bodyweight Update and rewrites completed sessions in that Training Week that
 * inherited their bodyweight. Per-Session Overrides and Historical Corrections are preserved.
 */
export function applyWeeklyBodyweightUpdate({
  bodyweight,
  referenceDate,
  sessions,
  timestamp,
  trainingPlan,
}: {
  bodyweight: number;
  referenceDate: string;
  sessions: ReadonlyArray<TrainingSession>;
  timestamp: string;
  trainingPlan: TrainingPlan;
}): { changedSessions: ReadonlyArray<TrainingSession>; trainingPlan: TrainingPlan } {
  const weekRange = getCurrentTrainingWeek(trainingPlan, new Date(referenceDate));

  return {
    changedSessions: sessions
      .filter(
        (trainingSession) =>
          isSessionInTrainingWeek(trainingSession, weekRange) &&
          isInheritedSessionBodyweightSource(trainingSession.sessionBodyweightSource),
      )
      .map((trainingSession) =>
        updateTrainingSessionBodyweight({
          bodyweight,
          source: "inherited_weekly",
          timestamp,
          trainingSession,
        }),
      ),
    trainingPlan: {
      ...trainingPlan,
      updatedAt: timestamp,
      weeklyBodyweightUpdates: upsertTrainingWeekBodyweightUpdate({
        bodyweight,
        timestamp,
        weekRange,
        weeklyBodyweightUpdates: trainingPlan.weeklyBodyweightUpdates ?? [],
      }),
    },
  };
}

/** Applies a bodyweight value to a Training Session and recalculates its movement volume. */
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

/**
 * Explains where a bodyweight value came from. "session" describes a Training Session's
 * Session Bodyweight; "week" describes the Training Week's Inherited Bodyweight Default.
 */
export function describeBodyweightSource(
  source: TrainingSessionBodyweightSource | null,
  context: "session" | "week",
): string {
  switch (source) {
    case "baseline":
      return "Inherited from Baseline Bodyweight.";
    case "inherited_weekly":
      return context === "week"
        ? "Inherited from the last saved Training Week bodyweight."
        : "Inherited from the current Training Week bodyweight.";
    case "session_override":
      return "Stored as a Per-Session Bodyweight Override.";
    case "historical_correction":
      return "Stored as a Historical Bodyweight Correction.";
    default:
      return context === "week"
        ? "Set a Baseline Bodyweight first."
        : "Required before completing bodyweight volume.";
  }
}

function isInheritedSessionBodyweightSource(
  source: TrainingSessionBodyweightSource | null | undefined,
): boolean {
  return source === "baseline" || source === "inherited_weekly";
}

function upsertTrainingWeekBodyweightUpdate({
  bodyweight,
  timestamp,
  weekRange,
  weeklyBodyweightUpdates,
}: {
  bodyweight: number;
  timestamp: string;
  weekRange: TrainingWeekRange;
  weeklyBodyweightUpdates: ReadonlyArray<TrainingWeekBodyweightUpdate>;
}): ReadonlyArray<TrainingWeekBodyweightUpdate> {
  const otherUpdates = weeklyBodyweightUpdates.filter(
    (update) => update.weekEnd !== weekRange.weekEnd || update.weekStart !== weekRange.weekStart,
  );

  return [
    ...otherUpdates,
    {
      bodyweight,
      updatedAt: timestamp,
      weekEnd: weekRange.weekEnd,
      weekStart: weekRange.weekStart,
    },
  ].sort((firstUpdate, secondUpdate) =>
    firstUpdate.weekStart.localeCompare(secondUpdate.weekStart),
  );
}
