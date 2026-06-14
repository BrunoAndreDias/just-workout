import type { MovementPatternId } from "../plan-builder/exercise-catalog";
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

export type TrainingSession = {
  completedAt: string | null;
  createdAt: string;
  exercises: ReadonlyArray<TrainingSessionExerciseEntry>;
  id: string;
  planId: string;
  status: "completed";
  templateId: string;
  templateLabel: string;
  updatedAt: string;
  volumeByMovementPattern: ReadonlyArray<TrainingSessionMovementVolume>;
};

export type CompleteTrainingSessionInput = {
  entries: ReadonlyArray<TrainingSessionExerciseEntry>;
  id: string;
  plan: TrainingPlan;
  template: WorkoutTemplate;
  timestamp: string;
};

export function createCompletedTrainingSession({
  entries,
  id,
  plan,
  template,
  timestamp,
}: CompleteTrainingSessionInput): TrainingSession {
  return {
    completedAt: timestamp,
    createdAt: timestamp,
    exercises: entries,
    id,
    planId: plan.id,
    status: "completed",
    templateId: template.id,
    templateLabel: template.label,
    updatedAt: timestamp,
    volumeByMovementPattern: calculateVolumeByMovementPattern(entries),
  };
}
