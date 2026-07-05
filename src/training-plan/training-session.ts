import type { MovementPatternId } from "../training-taxonomy";
import {
  type CompletedLoadVolumeMovementRow,
  calculateVolumeByMovementPattern,
} from "./completed-load-volume";
import type { TrainingPlan, WorkoutTemplate } from "./training-plan";

export type TrainingSessionSetEntry = {
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
  sessionBodyweight?: number | null;
  sessionBodyweightSource?: TrainingSessionBodyweightSource | null;
  template: WorkoutTemplate;
  timestamp: string;
};

export function createCompletedTrainingSession({
  entries,
  id,
  plan,
  sessionBodyweight = null,
  sessionBodyweightSource = null,
  template,
  timestamp,
}: CompleteTrainingSessionInput): TrainingSession {
  return {
    completedAt: timestamp,
    createdAt: timestamp,
    exercises: entries,
    id,
    planId: plan.id,
    sessionBodyweight,
    sessionBodyweightSource,
    status: "completed",
    templateId: template.id,
    templateLabel: template.label,
    trainingBlockCycleNumber: plan.trainingBlock?.cycleNumber ?? null,
    trainingBlockId: plan.trainingBlock?.id ?? null,
    trainingBlockWeekNumber: plan.trainingBlock?.weekNumber ?? null,
    updatedAt: timestamp,
    volumeByMovementPattern: calculateVolumeByMovementPattern(entries, { sessionBodyweight }),
  };
}
