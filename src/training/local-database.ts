import Dexie, { type Table } from "dexie";
import type { PlanBlueprint } from "../plan-builder";
import type { Exercise, TrainingPlan, WorkoutSession } from "./training-model";

export class JustWorkoutDatabase extends Dexie {
  exercises!: Table<Exercise, string>;
  planBlueprints!: Table<PlanBlueprint, string>;
  trainingPlans!: Table<TrainingPlan, string>;
  workoutSessions!: Table<WorkoutSession, string>;

  constructor() {
    super("just-workout");

    this.version(1).stores({
      exercises: "id, name, movementPattern, updatedAt, deletedAt",
      trainingPlans: "id, active, updatedAt, deletedAt",
      workoutSessions: "id, planId, templateId, performedAt, updatedAt, deletedAt",
    });

    this.version(2).stores({
      exercises: "id, name, movementPattern, updatedAt, deletedAt",
      planBlueprints: "id, updatedAt",
      trainingPlans: "id, active, updatedAt, deletedAt",
      workoutSessions: "id, planId, templateId, performedAt, updatedAt, deletedAt",
    });
  }
}

export const db = new JustWorkoutDatabase();
