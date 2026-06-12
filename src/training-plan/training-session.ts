import type { MovementPatternId } from "../plan-builder/exercise-catalog";
import { formatMovementPattern } from "./active-training-plan/active-training-plan-read-model";
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

export type TrainingSessionMovementVolume = {
  movementPattern: MovementPatternId;
  movementPatternLabel: string;
  volume: number;
};

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

export function calculateVolumeByMovementPattern(
  entries: ReadonlyArray<TrainingSessionExerciseEntry>,
): TrainingSessionMovementVolume[] {
  const volumeByPattern = new Map<MovementPatternId, number>();

  for (const entry of entries) {
    const exerciseVolume = entry.sets.reduce((total, set) => total + set.weight * set.reps, 0);

    if (exerciseVolume <= 0) {
      continue;
    }

    volumeByPattern.set(
      entry.movementPattern,
      (volumeByPattern.get(entry.movementPattern) ?? 0) + exerciseVolume,
    );
  }

  return Array.from(volumeByPattern.entries()).map(([movementPattern, volume]) => ({
    movementPattern,
    movementPatternLabel: formatSessionMovementPattern(movementPattern),
    volume,
  }));
}

export function formatSessionMovementPattern(movementPattern: MovementPatternId): string {
  return formatMovementPattern(movementPattern).replace(/\b\w/g, (letter) => letter.toUpperCase());
}
