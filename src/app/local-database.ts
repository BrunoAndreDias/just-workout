import Dexie, { type Table } from "dexie";
import type { PlanBlueprint } from "../plan-builder";

export class JustWorkoutDatabase extends Dexie {
  planBlueprints!: Table<PlanBlueprint, string>;

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

    this.version(3).stores({
      exercises: null,
      planBlueprints: "id, updatedAt",
      trainingPlans: null,
      workoutSessions: null,
    });
  }
}

export const db = new JustWorkoutDatabase();
