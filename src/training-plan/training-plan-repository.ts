import { db } from "../app/local-database";
import type { TrainingPlan } from "./training-plan";

export async function getTrainingPlan(trainingPlanId: string): Promise<TrainingPlan | null> {
  return (await db.trainingPlans.get(trainingPlanId)) ?? null;
}

export async function getTrainingPlans(): Promise<ReadonlyArray<TrainingPlan>> {
  const trainingPlans = await db.trainingPlans.toArray();

  return trainingPlans.sort((firstPlan, secondPlan) =>
    secondPlan.updatedAt.localeCompare(firstPlan.updatedAt),
  );
}

export async function saveGeneratedTrainingPlan(trainingPlan: TrainingPlan): Promise<TrainingPlan> {
  await db.transaction("rw", db.trainingPlans, async () => {
    const activeTrainingPlans = await db.trainingPlans.filter((plan) => plan.active).toArray();

    await Promise.all(
      activeTrainingPlans.map((activeTrainingPlan) =>
        db.trainingPlans.put({
          ...activeTrainingPlan,
          active: false,
          updatedAt: trainingPlan.generatedAt,
        }),
      ),
    );
    await db.trainingPlans.put(trainingPlan);
  });

  return trainingPlan;
}
