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

  it("uses the same draft Workout Template command for projection and persistence", async () => {
    const blueprint = await getOrCreatePlanBlueprint();
    const draftBlueprint: PlanBlueprint = {
      ...blueprint,
      trainingPlanDraft: {
        content: {
          mainCompoundRotationPools: [],
          repRangeStyle: "balanced_hypertrophy",
          split: "3-Day Full Body",
          trainingBlockWeeks: 6,
          trainingFrequencyDaysPerWeek: 3,
          trainingGoal: "build-muscle",
          weeklyRepTargets: [],
          workoutTemplates: [
            { id: "template-1", label: "Upper A", purpose: "strength", supersetGroups: [] },
            { id: "template-2", label: "Lower A", purpose: "strength", supersetGroups: [] },
          ],
        },
        validation: { blockers: [], warnings: [] },
      },
    };

    await persistPlanBlueprintCommand(
      planBlueprintCommandBuilders.applyResolvedPlanBlueprint({
        blueprint: draftBlueprint,
      }),
    );

    const command =
      planBlueprintCommandBuilders.replaceTrainingPlanDraftWorkoutTemplateWithCustomFocus({
        templateId: "template-1",
        timestamp: "2026-05-30T10:30:00.000Z",
      });

    const projectedBlueprint = projectPlanBlueprintCommand({ blueprint: draftBlueprint, command });
    const persistedBlueprint = await persistPlanBlueprintCommand(command);

    expect(projectedBlueprint).toEqual(persistedBlueprint);
    expect(persistedBlueprint.trainingPlanDraft).toMatchObject({
      content: {
        workoutTemplates: [
          {
            id: "template-1",
            label: "Upper A Cardio Focus",
            purpose: "custom-focus",
            supersetGroups: [],
          },
          { id: "template-2", label: "Lower A", purpose: "strength", supersetGroups: [] },
        ],
      },
      validation: {
        blockers: [],
        warnings: [
          expect.objectContaining({
            kind: "custom_focus_reduces_strength_coverage",
          }),
        ],
      },
    });
  });
});
