import { z } from "zod";
import { db } from "./local-database";

const syncMetadataSchema = z.object({
  createdAt: z.string(),
  deletedAt: z.string().nullable(),
  updatedAt: z.string(),
});

const exerciseSchema = syncMetadataSchema.extend({
  equipment: z.string(),
  id: z.string(),
  movementPattern: z.enum([
    "squat",
    "hinge",
    "horizontal-push",
    "horizontal-pull",
    "vertical-push",
    "vertical-pull",
    "isolation",
    "carry",
    "core",
  ]),
  name: z.string(),
});

const prescriptionSchema = z.object({
  exerciseId: z.string(),
  id: z.string(),
  loadStep: z.number(),
  targetRepMax: z.number(),
  targetRepMin: z.number(),
  targetSets: z.number(),
});

const workoutTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  prescriptions: z.array(prescriptionSchema),
});

const trainingPlanSchema = syncMetadataSchema.extend({
  active: z.boolean(),
  id: z.string(),
  loadUnit: z.enum(["kg", "lb"]),
  name: z.string(),
  templates: z.array(workoutTemplateSchema),
});

const performedSetSchema = z.object({
  id: z.string(),
  load: z.number(),
  prescriptionId: z.string(),
  reps: z.number(),
});

const workoutSessionSchema = syncMetadataSchema.extend({
  id: z.string(),
  notes: z.string(),
  performedAt: z.string(),
  planId: z.string(),
  sets: z.array(performedSetSchema),
  templateId: z.string(),
});

const backupSchema = z.object({
  data: z.object({
    exercises: z.array(exerciseSchema),
    trainingPlans: z.array(trainingPlanSchema),
    workoutSessions: z.array(workoutSessionSchema),
  }),
  exportedAt: z.string(),
  schemaVersion: z.literal(1),
});

export type JustWorkoutBackup = z.infer<typeof backupSchema>;

export function validateBackup(value: unknown): JustWorkoutBackup {
  return backupSchema.parse(value);
}

export async function createBackup(): Promise<JustWorkoutBackup> {
  const [exercises, trainingPlans, workoutSessions] = await Promise.all([
    db.exercises.toArray(),
    db.trainingPlans.toArray(),
    db.workoutSessions.toArray(),
  ]);

  return {
    data: {
      exercises,
      trainingPlans,
      workoutSessions,
    },
    exportedAt: new Date().toISOString(),
    schemaVersion: 1,
  };
}

export async function restoreBackup(backup: JustWorkoutBackup) {
  await db.transaction("rw", db.exercises, db.trainingPlans, db.workoutSessions, async () => {
    await db.exercises.clear();
    await db.trainingPlans.clear();
    await db.workoutSessions.clear();

    await db.exercises.bulkPut(backup.data.exercises);
    await db.trainingPlans.bulkPut(backup.data.trainingPlans);
    await db.workoutSessions.bulkPut(backup.data.workoutSessions);
  });
}
