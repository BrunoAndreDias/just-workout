import Dexie, { type Table } from "dexie";
import type { PlanBlueprint } from "../plan-builder";
import type { TrainingPlan, TrainingSession } from "../training-plan";

class JustWorkoutDatabase extends Dexie {
  planBlueprints!: Table<PlanBlueprint, string>;
  trainingPlans!: Table<TrainingPlan, string>;
  trainingSessions!: Table<TrainingSession, string>;

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

    this.version(4).stores({
      planBlueprints: "id, updatedAt",
      trainingPlans: "id, active, sourceBlueprintId, updatedAt",
    });

    this.version(5).stores({
      planBlueprints: "id, updatedAt",
      trainingPlans: "id, active, sourceBlueprintId, updatedAt",
      trainingSessions: "id, planId, templateId, status, completedAt, updatedAt",
    });

    this.version(6).stores({
      planBlueprints: "id, updatedAt",
      trainingPlans: "id, active, sourceBlueprintId, updatedAt",
      trainingSessions: "id, planId, templateId, status, completedAt, updatedAt, sessionIntent",
    });
  }
}

export const db = new JustWorkoutDatabase();

export async function resetLocalDatabase(): Promise<void> {
  await db.delete();
  await db.open();
}
