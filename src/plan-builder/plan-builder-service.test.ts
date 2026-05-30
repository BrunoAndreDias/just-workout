import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../training/local-database";
import { createStarterPlan } from "../training/starter-data";
import { planBuilderService } from "./plan-builder-service";

describe("planBuilderService", () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it("creates a blueprint once and resumes it on the next entry", async () => {
    const firstBlueprint = await planBuilderService.getOrCreatePlanBlueprint();
    const resumedBlueprint = await planBuilderService.getOrCreatePlanBlueprint();

    expect(firstBlueprint).toEqual(resumedBlueprint);
    expect(await db.planBlueprints.toArray()).toEqual([firstBlueprint]);
  });

  it("does not mutate the active training plan while creating a blueprint", async () => {
    const activePlan = createStarterPlan("Current Active Plan");

    await db.trainingPlans.add(activePlan);

    await planBuilderService.getOrCreatePlanBlueprint();

    expect(await db.trainingPlans.toArray()).toEqual([activePlan]);
  });
});
