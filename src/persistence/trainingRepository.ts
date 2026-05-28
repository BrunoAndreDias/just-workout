import type { DashboardSnapshot, WorkoutSession } from "../domain/training";
import { db } from "./localDatabase";
import { createStarterExercises, createStarterPlan } from "./starterData";

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  const [plans, exercises, sessions] = await Promise.all([
    db.trainingPlans.toArray(),
    db.exercises.toArray(),
    db.workoutSessions.orderBy("performedAt").reverse().toArray(),
  ]);

  return {
    activePlan: plans.find((plan) => plan.active && plan.deletedAt === null) ?? null,
    exercises: exercises
      .filter((exercise) => exercise.deletedAt === null)
      .sort((first, second) => first.name.localeCompare(second.name)),
    recentSessions: sessions.filter((session) => session.deletedAt === null).slice(0, 8),
  };
}

export async function createStarterTrainingPlan(planName: string) {
  const plan = createStarterPlan(planName);
  const exercises = createStarterExercises();
  const timestamp = new Date().toISOString();

  await db.transaction("rw", db.exercises, db.trainingPlans, async () => {
    await db.exercises.bulkPut(exercises);

    const existingPlans = await db.trainingPlans.toArray();

    await Promise.all(
      existingPlans.map((existingPlan) =>
        db.trainingPlans.put({
          ...existingPlan,
          active: false,
          updatedAt: timestamp,
        }),
      ),
    );

    await db.trainingPlans.add(plan);
  });

  return plan;
}

export async function recordCompletedStarterWorkout() {
  const snapshot = await getDashboardSnapshot();

  if (!snapshot.activePlan) {
    throw new Error("Create a training plan before logging a workout.");
  }

  const template = snapshot.activePlan.templates[0];

  if (!template) {
    throw new Error("The active training plan has no workout templates.");
  }

  const timestamp = new Date().toISOString();
  const session: WorkoutSession = {
    id: crypto.randomUUID(),
    createdAt: timestamp,
    deletedAt: null,
    notes: "",
    performedAt: timestamp,
    planId: snapshot.activePlan.id,
    sets: template.prescriptions.flatMap((prescription) =>
      Array.from({ length: prescription.targetSets }, () => ({
        id: crypto.randomUUID(),
        load: 20,
        prescriptionId: prescription.id,
        reps: prescription.targetRepMax,
      })),
    ),
    templateId: template.id,
    updatedAt: timestamp,
  };

  await db.workoutSessions.add(session);

  return session;
}
