import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../training/local-database";
import { createStarterPlan } from "../training/starter-data";
import type { RepRangeStyleId } from "./plan-blueprint";
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

  it("persists a changed training frequency for the next resume", async () => {
    const initialBlueprint = await planBuilderService.getOrCreatePlanBlueprint();

    const updatedBlueprint = await planBuilderService.updateTrainingFrequency({
      timestamp: "2026-05-30T10:15:00.000Z",
      trainingFrequencyDaysPerWeek: 5,
    });
    const resumedBlueprint = await planBuilderService.getOrCreatePlanBlueprint();

    expect(updatedBlueprint).toEqual({
      ...initialBlueprint,
      trainingFrequencyDaysPerWeek: 5,
      updatedAt: "2026-05-30T10:15:00.000Z",
    });
    expect(resumedBlueprint).toEqual(updatedBlueprint);
  });

  it("persists a selected Training Split for the next resume", async () => {
    const initialBlueprint = await planBuilderService.getOrCreatePlanBlueprint();

    const updatedBlueprint = await planBuilderService.updateTrainingSplit({
      split: "upper-lower-full-body",
      timestamp: "2026-05-30T10:20:00.000Z",
    });
    const resumedBlueprint = await planBuilderService.getOrCreatePlanBlueprint();

    expect(updatedBlueprint).toEqual({
      ...initialBlueprint,
      split: "upper-lower-full-body",
      updatedAt: "2026-05-30T10:20:00.000Z",
    });
    expect(resumedBlueprint).toEqual(updatedBlueprint);
  });

  it("persists a selected Rep Range Style for the next resume", async () => {
    const initialBlueprint = await planBuilderService.getOrCreatePlanBlueprint();

    const updatedBlueprint = await planBuilderService.updateRepRangeStyle({
      repRangeStyle: "strength_leaning",
      timestamp: "2026-05-30T10:22:00.000Z",
    });
    const resumedBlueprint = await planBuilderService.getOrCreatePlanBlueprint();

    expect(updatedBlueprint).toEqual({
      ...initialBlueprint,
      repRanges: "strength_leaning",
      updatedAt: "2026-05-30T10:22:00.000Z",
    });
    expect(resumedBlueprint).toEqual(updatedBlueprint);
  });

  it("clears an incompatible selected Training Split when the training frequency changes", async () => {
    await planBuilderService.updateTrainingSplit({
      timestamp: "2026-05-30T10:20:00.000Z",
      trainingSplitId: "upper-lower-full-body",
    });

    const updatedBlueprint = await planBuilderService.updateTrainingFrequency({
      timestamp: "2026-05-30T10:25:00.000Z",
      trainingFrequencyDaysPerWeek: 5,
    });
    const resumedBlueprint = await planBuilderService.getOrCreatePlanBlueprint();

    expect(updatedBlueprint).toMatchObject({
      split: null,
      trainingFrequencyDaysPerWeek: 5,
      trainingGoal: "build-muscle",
      updatedAt: "2026-05-30T10:25:00.000Z",
    });
    expect(resumedBlueprint).toEqual(updatedBlueprint);
  });

  it("preserves a saved Rep Range Style when earlier builder choices change", async () => {
    await planBuilderService.updateRepRangeStyle({
      repRangeStyle: "controlled_higher_reps",
      timestamp: "2026-05-30T10:18:00.000Z",
    });

    const blueprintWithSplit = await planBuilderService.updateTrainingSplit({
      split: "upper-lower-full-body",
      timestamp: "2026-05-30T10:20:00.000Z",
    });
    const blueprintWithNewFrequency = await planBuilderService.updateTrainingFrequency({
      timestamp: "2026-05-30T10:25:00.000Z",
      trainingFrequencyDaysPerWeek: 5,
    });

    expect(blueprintWithSplit).toMatchObject({
      repRanges: "controlled_higher_reps",
      split: "upper-lower-full-body",
    });
    expect(blueprintWithNewFrequency).toMatchObject({
      repRanges: "controlled_higher_reps",
      split: null,
      trainingFrequencyDaysPerWeek: 5,
    });
  });

  it("rejects invalid Rep Range Style values without overwriting the saved blueprint", async () => {
    const savedBlueprint = await planBuilderService.updateRepRangeStyle({
      repRangeStyle: "balanced_hypertrophy",
      timestamp: "2026-05-30T10:18:00.000Z",
    });

    await expect(
      planBuilderService.updateRepRangeStyle({
        repRangeStyle: "powerbuilding" as RepRangeStyleId,
        timestamp: "2026-05-30T10:19:00.000Z",
      }),
    ).rejects.toThrow('Unknown Rep Range Style "powerbuilding".');
    expect(await planBuilderService.getOrCreatePlanBlueprint()).toEqual(savedBlueprint);
  });

  it("does not mutate the active training plan while selecting a training split", async () => {
    const activePlan = createStarterPlan("Current Active Plan");

    await db.trainingPlans.add(activePlan);

    await planBuilderService.updateTrainingSplit({
      timestamp: "2026-05-30T10:20:00.000Z",
      trainingSplitId: "upper-lower-full-body",
    });

    expect(await db.trainingPlans.toArray()).toEqual([activePlan]);
  });
});
