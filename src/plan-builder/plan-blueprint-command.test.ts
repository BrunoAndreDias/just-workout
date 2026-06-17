import { beforeEach, describe, expect, it } from "vitest";
import { resetLocalDatabase } from "../app/local-database";
import type { PlanBlueprint } from "./plan-blueprint";
import {
  getOrCreatePlanBlueprint,
  persistPlanBlueprintCommand,
  planBlueprintCommandBuilders,
  projectPlanBlueprintCommand,
} from "./plan-blueprint-command";
import { getCurrentPlanBlueprint } from "./plan-builder-repository";

describe("plan blueprint command", () => {
  beforeEach(async () => {
    await resetLocalDatabase();
  });

  it("uses the same Plan Blueprint transition command for projection and persistence", async () => {
    const blueprint = await getOrCreatePlanBlueprint();
    const command = planBlueprintCommandBuilders.updateTrainingFrequency({
      timestamp: "2026-05-30T10:15:00.000Z",
      trainingFrequencyDaysPerWeek: 5,
    });

    const projectedBlueprint = projectPlanBlueprintCommand({ blueprint, command });
    const persistedBlueprint = await persistPlanBlueprintCommand(command);

    expect(persistedBlueprint).toEqual(projectedBlueprint);
    expect(await getCurrentPlanBlueprint()).toEqual(projectedBlueprint);
  });

  it("uses the same resolved Plan Blueprint command for projection and persistence", async () => {
    const blueprint = await getOrCreatePlanBlueprint();
    const resolvedBlueprint: PlanBlueprint = {
      ...blueprint,
      confirmedBuilderSteps: {
        ...blueprint.confirmedBuilderSteps,
        frequency: true,
        repRanges: true,
        split: true,
      },
      repRanges: "balanced_hypertrophy",
      split: "upper-lower-full-body",
      updatedAt: "2026-05-30T10:20:00.000Z",
    };
    const command = planBlueprintCommandBuilders.applyResolvedPlanBlueprint({
      blueprint: resolvedBlueprint,
    });

    const projectedBlueprint = projectPlanBlueprintCommand({ blueprint, command });
    const persistedBlueprint = await persistPlanBlueprintCommand(command);

    expect(projectedBlueprint).toEqual(resolvedBlueprint);
    expect(persistedBlueprint).toEqual(resolvedBlueprint);
    expect(await getCurrentPlanBlueprint()).toEqual(resolvedBlueprint);
  });
});
