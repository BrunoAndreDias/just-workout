import { db } from "../training/local-database";
import type { PlanBlueprint } from "./plan-blueprint";

export async function getCurrentPlanBlueprint(): Promise<PlanBlueprint | null> {
  return (await db.planBlueprints.orderBy("updatedAt").reverse().first()) ?? null;
}

export async function savePlanBlueprint(blueprint: PlanBlueprint) {
  await db.transaction("rw", db.planBlueprints, async () => {
    await db.planBlueprints.clear();
    await db.planBlueprints.put(blueprint);
  });

  return blueprint;
}
