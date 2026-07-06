import { db } from "../app/local-database";
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

/** Applies an update to the latest Plan Blueprint inside one write transaction. */
export async function updateCurrentPlanBlueprint(
  updateBlueprint: (blueprint: PlanBlueprint | null) => PlanBlueprint,
): Promise<PlanBlueprint> {
  let updatedBlueprint: PlanBlueprint | null = null;

  await db.transaction("rw", db.planBlueprints, async () => {
    const currentBlueprint =
      (await db.planBlueprints.orderBy("updatedAt").reverse().first()) ?? null;
    updatedBlueprint = updateBlueprint(currentBlueprint);

    await db.planBlueprints.clear();
    await db.planBlueprints.put(updatedBlueprint);
  });

  if (!updatedBlueprint) {
    throw new Error("Expected Plan Blueprint update to produce a Plan Blueprint.");
  }

  return updatedBlueprint;
}
