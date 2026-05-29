import Dexie, { type Table } from "dexie";
import type { Exercise, TrainingPlan, WorkoutSession } from "./training-model";

export class JustWorkoutDatabase extends Dexie {
  exercises!: Table<Exercise, string>;
  trainingPlans!: Table<TrainingPlan, string>;
  workoutSessions!: Table<WorkoutSession, string>;

  constructor() {
    super("just-workout");

    this.version(1).stores({
      exercises: "id, name, movementPattern, updatedAt, deletedAt",
      trainingPlans: "id, active, updatedAt, deletedAt",
      workoutSessions: "id, planId, templateId, performedAt, updatedAt, deletedAt",
    });
  }
}

export const db = new JustWorkoutDatabase();
