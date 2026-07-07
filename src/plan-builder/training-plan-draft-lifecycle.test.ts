import { describe, expect, it } from "vitest";
import { createDefaultPlanBlueprint, type PlanBlueprint } from "./plan-blueprint";
import {
  addTrainingPlanDraftSlot,
  addTrainingPlanDraftSupersetGroup,
  deleteTrainingPlanDraftSlot,
  markTrainingPlanDraftStale,
  moveTrainingPlanDraftSlotToSupersetGroup,
  normalizeTrainingPlanDraft,
  reorderTrainingPlanDraftSlot,
  replaceTrainingPlanDraftSlotExercise,
  replaceTrainingPlanDraftWorkoutTemplateWithCustomFocus,
} from "./training-plan-draft-lifecycle";

const testBlueprintOptions = {
  id: "blueprint-1",
  timestamp: "2026-07-07T08:20:00.000Z",
} as const;

describe("Training Plan Draft lifecycle", () => {
  it("normalizes stored draft content without Active Training Plan lifecycle fields", () => {
    const draftContent = createTestTrainingPlanDraftContent();
    const legacyWorkoutTemplate: Partial<(typeof draftContent.workoutTemplates)[number]> = {
      ...draftContent.workoutTemplates[0],
    };

    delete legacyWorkoutTemplate.purpose;

    expect(
      normalizeTrainingPlanDraft({
        content: {
          ...draftContent,
          active: true,
          generatedAt: "2026-07-07T08:21:00.000Z",
          id: "draft-legacy",
          sourceBlueprintId: "blueprint-1",
          updatedAt: "2026-07-07T08:21:00.000Z",
          workoutTemplates: [legacyWorkoutTemplate],
        },
      }),
    ).toEqual({
      content: draftContent,
      isStale: false,
      validation: {
        blockers: [],
        warnings: [],
      },
    });
  });

  it("marks Training Plan Draft as Stale Builder Output without losing draft content", () => {
    const blueprint = createTestPlanBlueprint();

    expect(markTrainingPlanDraftStale(blueprint.trainingPlanDraft)).toEqual({
      ...blueprint.trainingPlanDraft,
      isStale: true,
    });
  });

  it("preserves Stale Builder Output while applying draft-local Superset Group edits", () => {
    const blueprint = createTestPlanBlueprint({
      trainingPlanDraft: {
        content: createTestTrainingPlanDraftContent(),
        isStale: true,
        validation: {
          blockers: [],
          warnings: [],
        },
      },
    });

    const updatedBlueprint = addTrainingPlanDraftSupersetGroup({
      blueprint,
      groupId: "group-2",
      targetIndex: 1,
      templateId: "template-1",
      timestamp: "2026-07-07T08:22:00.000Z",
    });

    expect(updatedBlueprint.trainingPlanDraft).toMatchObject({
      isStale: true,
      validation: {
        blockers: ["Strength-focused Workout Templates cannot contain empty Superset Groups."],
        warnings: [],
      },
    });
  });

  it("validates custom-focus draft templates behind the module interface", () => {
    const blueprint = createTestPlanBlueprint();

    const updatedBlueprint = replaceTrainingPlanDraftWorkoutTemplateWithCustomFocus({
      blueprint,
      templateId: "template-1",
      timestamp: "2026-07-07T08:23:00.000Z",
    });

    expect(updatedBlueprint.trainingPlanDraft).toMatchObject({
      content: {
        workoutTemplates: [
          {
            label: "Upper A Cardio Focus",
            purpose: "custom-focus",
            supersetGroups: [],
          },
        ],
      },
      isStale: false,
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

  it("replaces, adds, deletes, and reorders draft slots while blocking duplicates and unavailable exercises", () => {
    const blueprint = createTestPlanBlueprint({
      trainingPlanDraft: {
        content: {
          ...createTestTrainingPlanDraftContent(),
          exerciseSelectionPreferences: {
            avoidedExercises: [{ id: "avoid-1", rawText: "Decline Dumbbell Bench Press" }],
            equipmentPreset: "full_gym",
            preferredExercises: [],
            strategy: "balanced",
          },
        },
        validation: {
          blockers: [],
          warnings: [],
        },
      },
    });

    const replacedBlueprint = replaceTrainingPlanDraftSlotExercise({
      blueprint,
      exerciseId: "incline-dumbbell-bench-press",
      groupId: "group-1",
      slotIndex: 0,
      templateId: "template-1",
      timestamp: "2026-07-07T08:24:00.000Z",
    });

    expect(
      replacedBlueprint.trainingPlanDraft?.content.workoutTemplates[0]?.supersetGroups[0]?.slots,
    ).toEqual([
      expect.objectContaining({
        exerciseId: "incline-dumbbell-bench-press",
        exerciseName: "Incline Dumbbell Bench Press",
        movementPattern: "horizontal_push",
        role: "main_compound",
        targetMuscles: ["chest"],
      }),
    ]);

    const addedBlueprint = addTrainingPlanDraftSlot({
      blueprint: replacedBlueprint,
      groupId: "group-1",
      templateId: "template-1",
      timestamp: "2026-07-07T08:25:00.000Z",
    });

    expect(
      addedBlueprint.trainingPlanDraft?.content.workoutTemplates[0]?.supersetGroups[0]?.slots.map(
        (slot) => slot.exerciseId,
      ),
    ).toEqual(["incline-dumbbell-bench-press", "flat-barbell-bench-press"]);

    const movedBlueprint = moveTrainingPlanDraftSlotToSupersetGroup({
      blueprint: {
        ...addedBlueprint,
        trainingPlanDraft: {
          ...addedBlueprint.trainingPlanDraft!,
          content: {
            ...addedBlueprint.trainingPlanDraft!.content,
            workoutTemplates: [
              {
                ...addedBlueprint.trainingPlanDraft!.content.workoutTemplates[0]!,
                supersetGroups: [
                  addedBlueprint.trainingPlanDraft!.content.workoutTemplates[0]!.supersetGroups[0]!,
                  {
                    id: "group-2",
                    slots: [
                      {
                        exerciseId: "lat-pull-downs",
                        exerciseName: "Lat Pull-Downs",
                        kind: "exercise",
                        movementPattern: "vertical_pull",
                        role: "secondary_compound",
                        slotLabel: "B1",
                        targetMuscles: ["back"],
                      },
                    ],
                    title: "Upper Superset Group 2",
                    type: "superset",
                  },
                ],
              },
            ],
          },
          validation: { blockers: [], warnings: [] },
        },
      },
      sourceGroupId: "group-1",
      slotIndex: 1,
      targetGroupId: "group-2",
      targetSlotIndex: 1,
      templateId: "template-1",
      timestamp: "2026-07-07T08:26:00.000Z",
    });

    const reorderedBlueprint = reorderTrainingPlanDraftSlot({
      blueprint: movedBlueprint,
      groupId: "group-2",
      slotIndex: 1,
      targetSlotIndex: 0,
      templateId: "template-1",
      timestamp: "2026-07-07T08:27:00.000Z",
    });

    expect(
      reorderedBlueprint.trainingPlanDraft?.content.workoutTemplates[0]?.supersetGroups[1]?.slots.map(
        (slot) => slot.exerciseId,
      ),
    ).toEqual(["flat-barbell-bench-press", "lat-pull-downs"]);

    const deletedBlueprint = deleteTrainingPlanDraftSlot({
      blueprint: reorderedBlueprint,
      groupId: "group-2",
      slotIndex: 1,
      templateId: "template-1",
      timestamp: "2026-07-07T08:28:00.000Z",
    });

    expect(
      deletedBlueprint.trainingPlanDraft?.content.workoutTemplates[0]?.supersetGroups[1]?.slots.map(
        (slot) => slot.exerciseId,
      ),
    ).toEqual(["flat-barbell-bench-press"]);

    const duplicateBlueprint = replaceTrainingPlanDraftSlotExercise({
      blueprint: deletedBlueprint,
      exerciseId: "flat-barbell-bench-press",
      groupId: "group-1",
      slotIndex: 0,
      templateId: "template-1",
      timestamp: "2026-07-07T08:29:00.000Z",
    });
    const deletedTemplate = deletedBlueprint.trainingPlanDraft!.content.workoutTemplates[0]!;
    const deletedFirstGroup = deletedTemplate.supersetGroups[0]!;
    const deletedSecondGroup = deletedTemplate.supersetGroups[1]!;
    const deletedFirstSlot = deletedFirstGroup.slots[0]!;
    const duplicateDraft = normalizeTrainingPlanDraft({
      content: {
        ...deletedBlueprint.trainingPlanDraft!.content,
        workoutTemplates: [
          {
            ...deletedTemplate,
            supersetGroups: [
              {
                ...deletedFirstGroup,
                slots: [
                  {
                    ...deletedFirstSlot,
                    exerciseId: "flat-barbell-bench-press",
                    exerciseName: "Flat Barbell Bench Press",
                  },
                ],
              },
              deletedSecondGroup,
            ],
          },
        ],
      },
    });

    const unavailableDraft = normalizeTrainingPlanDraft({
      content: {
        ...deletedBlueprint.trainingPlanDraft!.content,
        workoutTemplates: [
          {
            ...deletedTemplate,
            supersetGroups: [
              {
                ...deletedFirstGroup,
                slots: [
                  {
                    ...deletedFirstSlot,
                    exerciseId: "retired-exercise",
                    exerciseName: "Retired Exercise",
                  },
                ],
              },
              deletedSecondGroup,
            ],
          },
        ],
      },
    });

    expect(
      duplicateBlueprint.trainingPlanDraft?.content.workoutTemplates[0]?.supersetGroups[0]?.slots,
    ).toEqual(
      deletedBlueprint.trainingPlanDraft?.content.workoutTemplates[0]?.supersetGroups[0]?.slots,
    );
    expect(duplicateDraft?.validation.blockers).toContain(
      "Workout Templates cannot repeat the same exercise in more than one slot.",
    );
    expect(unavailableDraft?.validation.blockers).toContain(
      "Training Plan Draft slots must use available catalog exercises.",
    );
    expect(duplicateDraft?.validation.blockers).not.toContain(
      "Avoided exercises cannot remain in the Training Plan Draft.",
    );
  });
});

function createTestPlanBlueprint(overrides: Partial<PlanBlueprint> = {}): PlanBlueprint {
  return {
    ...createDefaultPlanBlueprint(testBlueprintOptions),
    ...overrides,
    trainingPlanDraft: overrides.trainingPlanDraft ?? {
      content: createTestTrainingPlanDraftContent(),
      validation: {
        blockers: [],
        warnings: [],
      },
    },
  };
}

function createTestTrainingPlanDraftContent(): NonNullable<
  PlanBlueprint["trainingPlanDraft"]
>["content"] {
  return {
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
                kind: "exercise",
                movementPattern: "horizontal_push",
                role: "main_compound",
                slotLabel: "A1",
                targetMuscles: ["chest"],
              },
            ],
            title: "Upper Superset Group",
            type: "superset",
          },
        ],
      },
    ],
  };
}
