import { db } from "../app/local-database";
import type { TrainingPlan } from "./training-plan";
import type { TrainingSession } from "./training-session";

type SeedTrainingPlanDataOptions = {
  deactivateActivePlansAt?: string;
  trainingPlans?: ReadonlyArray<TrainingPlan>;
  trainingSessions?: ReadonlyArray<TrainingSession>;
};

export async function getTrainingPlan(trainingPlanId: string): Promise<TrainingPlan | null> {
  return (await db.trainingPlans.get(trainingPlanId)) ?? null;
}

export async function getTrainingPlans(): Promise<ReadonlyArray<TrainingPlan>> {
  const trainingPlans = await db.trainingPlans.toArray();

  return sortTrainingPlansByMostRecentlyUpdated(trainingPlans);
}

export async function getActiveTrainingPlans(): Promise<ReadonlyArray<TrainingPlan>> {
  const trainingPlans = await db.trainingPlans.filter((plan) => plan.active).toArray();

  return sortTrainingPlansByMostRecentlyUpdated(trainingPlans);
}

export async function getTrainingSessionsForPlan(
  trainingPlanId: string,
): Promise<ReadonlyArray<TrainingSession>> {
  const trainingSessions = await db.trainingSessions
    .where("planId")
    .equals(trainingPlanId)
    .toArray();

  return sortTrainingSessionsByMostRecentlyUpdated(trainingSessions);
}

export async function saveGeneratedTrainingPlan(trainingPlan: TrainingPlan): Promise<TrainingPlan> {
  await db.transaction("rw", db.trainingPlans, async () => {
    await deactivateActiveTrainingPlans(trainingPlan.generatedAt);
    await db.trainingPlans.put(trainingPlan);
  });

  return trainingPlan;
}

export async function seedTrainingPlanData({
  deactivateActivePlansAt,
  trainingPlans = [],
  trainingSessions = [],
}: SeedTrainingPlanDataOptions): Promise<void> {
  await db.transaction("rw", db.trainingPlans, db.trainingSessions, async () => {
    if (deactivateActivePlansAt) {
      await deactivateActiveTrainingPlans(deactivateActivePlansAt);
    }

    if (trainingPlans.length > 0) {
      await db.trainingPlans.bulkPut([...trainingPlans]);
    }

    if (trainingSessions.length > 0) {
      await db.trainingSessions.bulkPut([...trainingSessions]);
    }
  });
}

export async function saveCompletedTrainingSession(
  trainingSession: TrainingSession,
): Promise<TrainingSession> {
  await db.trainingSessions.put(trainingSession);

  return trainingSession;
}

async function deactivateActiveTrainingPlans(updatedAt: string): Promise<void> {
  const activeTrainingPlans = await db.trainingPlans.filter((plan) => plan.active).toArray();

  await Promise.all(
    activeTrainingPlans.map((activeTrainingPlan) =>
      db.trainingPlans.put({
        ...activeTrainingPlan,
        active: false,
        updatedAt,
      }),
    ),
  );
}

function sortTrainingPlansByMostRecentlyUpdated(
  trainingPlans: Array<TrainingPlan>,
): ReadonlyArray<TrainingPlan> {
  return trainingPlans.sort((firstPlan, secondPlan) =>
    secondPlan.updatedAt.localeCompare(firstPlan.updatedAt),
  );
}

function sortTrainingSessionsByMostRecentlyUpdated(
  trainingSessions: Array<TrainingSession>,
): ReadonlyArray<TrainingSession> {
  return trainingSessions.sort((firstSession, secondSession) =>
    secondSession.updatedAt.localeCompare(firstSession.updatedAt),
  );
}
