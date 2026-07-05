import type { MovementPatternId } from "../training-taxonomy";
import {
  type CompletedLoadVolumeMovementRow,
  calculateVolumeByMovementPattern,
} from "./completed-load-volume";
import type { TrainingPlan, WorkoutTemplate } from "./training-plan";

export type TrainingSessionSetEntry = {
  /** False when a draft set was not completed; absent for legacy completed set entries. */
  done?: boolean;
  reps: number;
  setIndex: number;
  weight: number;
};

export type TrainingSessionExerciseEntry = {
  exerciseId: string;
  exerciseName: string;
  movementPattern: MovementPatternId;
  sets: ReadonlyArray<TrainingSessionSetEntry>;
};

export type TrainingSessionMovementVolume = CompletedLoadVolumeMovementRow;

export type TrainingSessionBodyweightSource =
  | "baseline"
  | "historical_correction"
  | "inherited_weekly"
  | "session_override";

/** Bodyweight value and provenance captured for a completed Training Session. */
export type TrainingSessionBodyweight = {
  bodyweight: number;
  source: TrainingSessionBodyweightSource;
};

export type TrainingSession = {
  completedAt: string | null;
  createdAt: string;
  exercises: ReadonlyArray<TrainingSessionExerciseEntry>;
  id: string;
  planId: string;
  sessionBodyweight?: number | null;
  sessionBodyweightSource?: TrainingSessionBodyweightSource | null;
  status: "completed";
  templateId: string;
  templateLabel: string;
  /** Active Training Block cycle when the session was completed; null for legacy sessions without block metadata. */
  trainingBlockCycleNumber?: number | null;
  /** Active Training Block id when the session was completed; null for legacy sessions without block metadata. */
  trainingBlockId?: string | null;
  /** Active Training Block week when the session was completed; null for legacy sessions without block metadata. */
  trainingBlockWeekNumber?: number | null;
  updatedAt: string;
  volumeByMovementPattern: ReadonlyArray<TrainingSessionMovementVolume>;
};

export type CompleteTrainingSessionInput = {
  entries: ReadonlyArray<TrainingSessionExerciseEntry>;
  id: string;
  plan: TrainingPlan;
  sessionBodyweight?: TrainingSessionBodyweight | null;
  template: WorkoutTemplate;
  timestamp: string;
};

export function createCompletedTrainingSession({
  entries,
  id,
  plan,
  sessionBodyweight = null,
  template,
  timestamp,
}: CompleteTrainingSessionInput): TrainingSession {
  const bodyweight = normalizeCompletedTrainingSessionBodyweight(sessionBodyweight);

  return {
    completedAt: timestamp,
    createdAt: timestamp,
    exercises: entries,
    id,
    planId: plan.id,
    sessionBodyweight: bodyweight?.bodyweight ?? null,
    sessionBodyweightSource: bodyweight?.source ?? null,
    status: "completed",
    templateId: template.id,
    templateLabel: template.label,
    trainingBlockCycleNumber: plan.trainingBlock?.cycleNumber ?? null,
    trainingBlockId: plan.trainingBlock?.id ?? null,
    trainingBlockWeekNumber: plan.trainingBlock?.weekNumber ?? null,
    updatedAt: timestamp,
    volumeByMovementPattern: calculateVolumeByMovementPattern(entries, {
      sessionBodyweight: bodyweight?.bodyweight ?? null,
    }),
  };
}

function normalizeCompletedTrainingSessionBodyweight(
  sessionBodyweight: TrainingSessionBodyweight | null,
): TrainingSessionBodyweight | null {
  if (sessionBodyweight === null) {
    return null;
  }

  if (
    typeof sessionBodyweight !== "object" ||
    !Number.isFinite(sessionBodyweight.bodyweight) ||
    sessionBodyweight.bodyweight <= 0 ||
    !sessionBodyweight.source
  ) {
    throw new Error("Session Bodyweight must include a positive bodyweight and source.");
  }

  return sessionBodyweight;
}
