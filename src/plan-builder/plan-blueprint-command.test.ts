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
            {
              id: "template-1",
              label: "Upper A",
              purpose: "strength",
              supersetGroups: [
                createSupersetGroup({
                  id: "template-1-group",
                  exerciseId: "flat-barbell-bench-press",
                }),
              ],
            },
            {
              id: "template-2",
              label: "Lower A",
              purpose: "strength",
              supersetGroups: [
                createSupersetGroup({ id: "template-2-group", exerciseId: "lat-pull-downs" }),
              ],
            },
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
          {
            id: "template-2",
            label: "Lower A",
            purpose: "strength",
            supersetGroups: [
              expect.objectContaining({
                id: "template-2-group",
              }),
            ],
          },
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

  it("uses the same Superset Group draft command for projection and persistence", async () => {
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
            {
              id: "template-1",
              label: "Upper A",
              purpose: "strength",
              supersetGroups: [
                {
                  id: "group-1",
                  slots: [
                    {
                      exerciseId: "flat-barbell-bench-press",
                      exerciseName: "Flat Barbell Bench Press",
                      kind: "exercise" as const,
                      movementPattern: "horizontal_push",
                      role: "main_compound",
                      slotLabel: "A1",
                      targetMuscles: ["chest"],
                    },
                  ],
                  title: "Upper superset 1",
                  type: "superset",
                },
                {
                  id: "group-2",
                  slots: [
                    {
                      exerciseId: "lat-pull-downs",
                      exerciseName: "Lat Pull-Downs",
                      kind: "exercise" as const,
                      movementPattern: "horizontal_pull",
                      role: "secondary_compound",
                      slotLabel: "B1",
                      targetMuscles: ["back"],
                    },
                  ],
                  title: "Upper superset 2",
                  type: "superset",
                },
              ],
            },
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

    const command = planBlueprintCommandBuilders.moveTrainingPlanDraftSlotToSupersetGroup({
      sourceGroupId: "group-1",
      slotIndex: 0,
      targetGroupId: "group-2",
      targetSlotIndex: 1,
      templateId: "template-1",
      timestamp: "2026-05-30T10:35:00.000Z",
    });

    const projectedBlueprint = projectPlanBlueprintCommand({ blueprint: draftBlueprint, command });
    const persistedBlueprint = await persistPlanBlueprintCommand(command);

    expect(projectedBlueprint).toEqual(persistedBlueprint);
    expect(persistedBlueprint.trainingPlanDraft).toMatchObject({
      content: {
        workoutTemplates: [
          {
            id: "template-1",
            supersetGroups: [
              {
                id: "group-1",
                slots: [],
              },
              {
                id: "group-2",
                slots: [
                  expect.objectContaining({ exerciseId: "lat-pull-downs" }),
                  expect.objectContaining({ exerciseId: "flat-barbell-bench-press" }),
                ],
              },
            ],
          },
        ],
      },
      validation: {
        blockers: ["Strength-focused Workout Templates cannot contain empty Superset Groups."],
        warnings: [],
      },
    });
  });

  it("uses the same slot replacement draft command for projection and persistence", async () => {
    const blueprint = await getOrCreatePlanBlueprint();
    const draftBlueprint = createDraftBlueprint({
      ...blueprint,
      exerciseSelectionPreferences: {
        avoidedExercises: [],
        equipmentPreset: "full_gym",
        preferredExercises: [],
        strategy: "balanced",
      },
      workoutTemplates: [
        {
          id: "template-1",
          label: "Upper A",
          purpose: "strength",
          supersetGroups: [
            {
              id: "group-1",
              slots: [
                {
                  exerciseId: "flat-barbell-bench-press",
                  exerciseName: "Flat Barbell Bench Press",
                  kind: "exercise" as const,
                  movementPattern: "horizontal_push",
                  role: "main_compound",
                  slotLabel: "A1",
                  targetMuscles: ["chest"],
                },
              ],
              title: "Upper superset 1",
              type: "superset",
            },
          ],
        },
      ],
    });

    await persistPlanBlueprintCommand(
      planBlueprintCommandBuilders.applyResolvedPlanBlueprint({
        blueprint: draftBlueprint,
      }),
    );

    const command = planBlueprintCommandBuilders.replaceTrainingPlanDraftSlotExercise({
      exerciseId: "incline-dumbbell-bench-press",
      groupId: "group-1",
      slotIndex: 0,
      templateId: "template-1",
      timestamp: "2026-05-30T10:36:00.000Z",
    });

    const projectedBlueprint = projectPlanBlueprintCommand({ blueprint: draftBlueprint, command });
    const persistedBlueprint = await persistPlanBlueprintCommand(command);

    expect(projectedBlueprint).toEqual(persistedBlueprint);
    expect(
      persistedBlueprint.trainingPlanDraft?.content.workoutTemplates[0]?.supersetGroups[0]
        ?.slots[0],
    ).toMatchObject({
      exerciseId: "incline-dumbbell-bench-press",
      exerciseName: "Incline Dumbbell Bench Press",
    });
  });

  it("uses the same slot add draft command for projection and persistence", async () => {
    const blueprint = await getOrCreatePlanBlueprint();
    const draftBlueprint = createDraftBlueprint({
      ...blueprint,
      workoutTemplates: [
        {
          id: "template-1",
          label: "Upper A",
          purpose: "strength",
          supersetGroups: [
            createSupersetGroup({
              id: "group-1",
              exerciseId: "flat-barbell-bench-press",
            }),
          ],
        },
      ],
    });

    await persistPlanBlueprintCommand(
      planBlueprintCommandBuilders.applyResolvedPlanBlueprint({
        blueprint: draftBlueprint,
      }),
    );

    const command = planBlueprintCommandBuilders.addTrainingPlanDraftSlot({
      groupId: "group-1",
      templateId: "template-1",
      timestamp: "2026-05-30T10:37:00.000Z",
    });

    const projectedBlueprint = projectPlanBlueprintCommand({ blueprint: draftBlueprint, command });
    const persistedBlueprint = await persistPlanBlueprintCommand(command);

    expect(projectedBlueprint).toEqual(persistedBlueprint);
    expect(
      persistedBlueprint.trainingPlanDraft?.content.workoutTemplates[0]?.supersetGroups[0]?.slots.map(
        (slot) => slot.exerciseId,
      ),
    ).toEqual(["flat-barbell-bench-press", "flat-dumbbell-bench-press"]);
  });

  it("uses the same slot delete draft command for projection and persistence", async () => {
    const blueprint = await getOrCreatePlanBlueprint();
    const draftBlueprint = createDraftBlueprint({
      ...blueprint,
      workoutTemplates: [
        {
          id: "template-1",
          label: "Upper A",
          purpose: "strength",
          supersetGroups: [createTwoSlotSupersetGroup({ id: "group-1" })],
        },
      ],
    });

    await persistPlanBlueprintCommand(
      planBlueprintCommandBuilders.applyResolvedPlanBlueprint({
        blueprint: draftBlueprint,
      }),
    );

    const command = planBlueprintCommandBuilders.deleteTrainingPlanDraftSlot({
      groupId: "group-1",
      slotIndex: 1,
      templateId: "template-1",
      timestamp: "2026-05-30T10:38:00.000Z",
    });

    const projectedBlueprint = projectPlanBlueprintCommand({ blueprint: draftBlueprint, command });
    const persistedBlueprint = await persistPlanBlueprintCommand(command);

    expect(projectedBlueprint).toEqual(persistedBlueprint);
    expect(
      persistedBlueprint.trainingPlanDraft?.content.workoutTemplates[0]?.supersetGroups[0]?.slots.map(
        (slot) => slot.exerciseId,
      ),
    ).toEqual(["flat-barbell-bench-press"]);
  });

  it("uses the same slot reorder draft command for projection and persistence", async () => {
    const blueprint = await getOrCreatePlanBlueprint();
    const draftBlueprint = createDraftBlueprint({
      ...blueprint,
      workoutTemplates: [
        {
          id: "template-1",
          label: "Upper A",
          purpose: "strength",
          supersetGroups: [createTwoSlotSupersetGroup({ id: "group-1" })],
        },
      ],
    });

    await persistPlanBlueprintCommand(
      planBlueprintCommandBuilders.applyResolvedPlanBlueprint({
        blueprint: draftBlueprint,
      }),
    );

    const command = planBlueprintCommandBuilders.reorderTrainingPlanDraftSlot({
      groupId: "group-1",
      slotIndex: 1,
      targetSlotIndex: 0,
      templateId: "template-1",
      timestamp: "2026-05-30T10:39:00.000Z",
    });

    const projectedBlueprint = projectPlanBlueprintCommand({ blueprint: draftBlueprint, command });
    const persistedBlueprint = await persistPlanBlueprintCommand(command);

    expect(projectedBlueprint).toEqual(persistedBlueprint);
    expect(
      persistedBlueprint.trainingPlanDraft?.content.workoutTemplates[0]?.supersetGroups[0]?.slots.map(
        (slot) => slot.exerciseId,
      ),
    ).toEqual(["incline-dumbbell-bench-press", "flat-barbell-bench-press"]);
  });

  it("uses the command Superset Group id when adding a draft group", async () => {
    const blueprint = await getOrCreatePlanBlueprint();
    const draftBlueprint = createDraftBlueprint({
      ...blueprint,
      workoutTemplates: [
        {
          id: "template-1",
          label: "Upper A",
          purpose: "strength",
          supersetGroups: [
            createSupersetGroup({
              id: "template-1-group",
              exerciseId: "flat-barbell-bench-press",
            }),
          ],
        },
      ],
    });

    await persistPlanBlueprintCommand(
      planBlueprintCommandBuilders.applyResolvedPlanBlueprint({
        blueprint: draftBlueprint,
      }),
    );

    const command = planBlueprintCommandBuilders.addTrainingPlanDraftSupersetGroup({
      targetIndex: 1,
      templateId: "template-1",
      timestamp: "2026-05-30T10:40:00.000Z",
    });

    const projectedBlueprint = projectPlanBlueprintCommand({ blueprint: draftBlueprint, command });
    const persistedBlueprint = await persistPlanBlueprintCommand(command);

    expect(projectedBlueprint).toEqual(persistedBlueprint);
    expect(persistedBlueprint.trainingPlanDraft?.content.workoutTemplates[0]).toMatchObject({
      supersetGroups: [
        expect.objectContaining({ id: "template-1-group" }),
        {
          id: command.groupId,
          slots: [],
          title: "Superset Group 2",
          type: "superset",
        },
      ],
    });
  });

  it("keeps the last required strength Superset Group when a delete command targets it", async () => {
    const blueprint = await getOrCreatePlanBlueprint();
    const draftBlueprint = createDraftBlueprint({
      ...blueprint,
      workoutTemplates: [
        {
          id: "template-1",
          label: "Upper A",
          purpose: "strength",
          supersetGroups: [
            {
              id: "empty-group",
              slots: [],
              title: "Empty group",
              type: "superset" as const,
            },
          ],
        },
      ],
    });

    await persistPlanBlueprintCommand(
      planBlueprintCommandBuilders.applyResolvedPlanBlueprint({
        blueprint: draftBlueprint,
      }),
    );

    const command = planBlueprintCommandBuilders.deleteTrainingPlanDraftSupersetGroup({
      groupId: "empty-group",
      templateId: "template-1",
      timestamp: "2026-05-30T10:45:00.000Z",
    });

    const projectedBlueprint = projectPlanBlueprintCommand({ blueprint: draftBlueprint, command });
    const persistedBlueprint = await persistPlanBlueprintCommand(command);

    expect(projectedBlueprint).toEqual(persistedBlueprint);
    expect(persistedBlueprint.trainingPlanDraft).toMatchObject({
      content: {
        workoutTemplates: [
          {
            id: "template-1",
            supersetGroups: [
              {
                id: "empty-group",
                slots: [],
              },
            ],
          },
        ],
      },
      validation: {
        blockers: ["Strength-focused Workout Templates cannot contain empty Superset Groups."],
        warnings: [],
      },
    });
  });
});

function createDraftBlueprint({
  workoutTemplates,
  ...blueprint
}: PlanBlueprint & {
  workoutTemplates: NonNullable<PlanBlueprint["trainingPlanDraft"]>["content"]["workoutTemplates"];
}): PlanBlueprint {
  return {
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
        workoutTemplates,
      },
      validation: { blockers: [], warnings: [] },
    },
  };
}

function createSupersetGroup({ exerciseId, id }: { exerciseId: string; id: string }) {
  return {
    id,
    slots: [
      {
        exerciseId,
        exerciseName: exerciseId,
        kind: "exercise" as const,
        movementPattern: "horizontal_push" as const,
        role: "main_compound" as const,
        slotLabel: "A1",
        targetMuscles: ["chest"] as const,
      },
    ],
    title: `${id} title`,
    type: "superset" as const,
  };
}

function createTwoSlotSupersetGroup({ id }: { id: string }) {
  const group = createSupersetGroup({ exerciseId: "flat-barbell-bench-press", id });
  const slot = group.slots[0];

  if (!slot) {
    throw new Error("Expected the test Superset Group fixture to contain one slot.");
  }

  return {
    ...group,
    slots: [
      slot,
      {
        ...slot,
        exerciseId: "incline-dumbbell-bench-press",
        exerciseName: "Incline Dumbbell Bench Press",
        slotLabel: "A2",
      },
    ],
  };
}
