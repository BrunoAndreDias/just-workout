import { describe, expect, it } from "vitest";
import { createDefaultPlanBlueprint, type PlanBlueprint } from "./plan-blueprint";
import {
  addTrainingPlanDraftSlot,
  addTrainingPlanDraftSupersetGroup,
  deleteTrainingPlanDraftSlot,
  markTrainingPlanDraftStale,
  normalizeTrainingPlanDraft,
  reorderTrainingPlanDraftSlot,
  replaceTrainingPlanDraftSlotExercise,
  replaceTrainingPlanDraftWorkoutTemplateWithCustomFocus,
  updateTrainingPlanDraftSlotTrainingPrescription,
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

  it("replaces a draft slot with compatible catalog exercise data", () => {
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

    const updatedBlueprint = replaceTrainingPlanDraftSlotExercise({
      blueprint,
      exerciseId: "incline-dumbbell-bench-press",
      groupId: "group-1",
      slotIndex: 0,
      templateId: "template-1",
      timestamp: "2026-07-07T08:24:00.000Z",
    });

    expect(
      updatedBlueprint.trainingPlanDraft?.content.workoutTemplates[0]?.supersetGroups[0]?.slots,
    ).toEqual([
      expect.objectContaining({
        exerciseId: "incline-dumbbell-bench-press",
        exerciseName: "Incline Dumbbell Bench Press",
        movementPattern: "horizontal_push",
        role: "main_compound",
        targetMuscles: ["chest"],
      }),
    ]);
  });

  it("adds a compatible draft slot while skipping avoided candidates", () => {
    const blueprint = createTestPlanBlueprint({
      trainingPlanDraft: {
        content: {
          ...createTestTrainingPlanDraftContent(),
          exerciseSelectionPreferences: {
            avoidedExercises: [{ id: "avoid-1", rawText: "Flat Dumbbell Bench Press" }],
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

    const updatedBlueprint = addTrainingPlanDraftSlot({
      blueprint,
      groupId: "group-1",
      templateId: "template-1",
      timestamp: "2026-07-07T08:25:00.000Z",
    });

    expect(
      updatedBlueprint.trainingPlanDraft?.content.workoutTemplates[0]?.supersetGroups[0]?.slots.map(
        (slot) => slot.exerciseId,
      ),
    ).toEqual(["flat-barbell-bench-press", "incline-barbell-bench-press"]);
  });

  it("deletes a draft slot when the group remains non-empty", () => {
    const blueprint = createTestPlanBlueprint({
      trainingPlanDraft: {
        content: createTwoSlotDraftContent(),
        validation: {
          blockers: [],
          warnings: [],
        },
      },
    });

    const updatedBlueprint = deleteTrainingPlanDraftSlot({
      blueprint,
      groupId: "group-1",
      slotIndex: 1,
      templateId: "template-1",
      timestamp: "2026-07-07T08:28:00.000Z",
    });

    expect(
      updatedBlueprint.trainingPlanDraft?.content.workoutTemplates[0]?.supersetGroups[0]?.slots.map(
        (slot) => slot.exerciseId,
      ),
    ).toEqual(["flat-barbell-bench-press"]);
  });

  it("reorders draft slots inside one Superset Group", () => {
    const blueprint = createTestPlanBlueprint({
      trainingPlanDraft: {
        content: createTwoSlotDraftContent(),
        validation: {
          blockers: [],
          warnings: [],
        },
      },
    });

    const updatedBlueprint = reorderTrainingPlanDraftSlot({
      blueprint,
      groupId: "group-1",
      slotIndex: 1,
      targetSlotIndex: 0,
      templateId: "template-1",
      timestamp: "2026-07-07T08:27:00.000Z",
    });

    expect(
      updatedBlueprint.trainingPlanDraft?.content.workoutTemplates[0]?.supersetGroups[0]?.slots.map(
        (slot) => slot.exerciseId,
      ),
    ).toEqual(["incline-dumbbell-bench-press", "flat-barbell-bench-press"]);
  });

  it("keeps the existing slot when replacement would duplicate another slot in the template", () => {
    const blueprint = createTestPlanBlueprint({
      trainingPlanDraft: {
        content: createTwoGroupDraftContent(),
        validation: {
          blockers: [],
          warnings: [],
        },
      },
    });

    const updatedBlueprint = replaceTrainingPlanDraftSlotExercise({
      blueprint,
      exerciseId: "flat-barbell-bench-press",
      groupId: "group-1",
      slotIndex: 0,
      templateId: "template-1",
      timestamp: "2026-07-07T08:29:00.000Z",
    });

    expect(
      updatedBlueprint.trainingPlanDraft?.content.workoutTemplates[0]?.supersetGroups[0]?.slots[0],
    ).toMatchObject({
      exerciseId: "incline-dumbbell-bench-press",
      exerciseName: "Incline Dumbbell Bench Press",
    });
  });

  it("validates duplicate draft exercises within a Workout Template regardless of slot role", () => {
    const { content: draftContent, group, slot, template } = getFirstDraftSlotFixture();

    const draft = normalizeTrainingPlanDraft({
      content: {
        ...draftContent,
        workoutTemplates: [
          {
            ...template,
            supersetGroups: [
              {
                ...group,
                slots: [slot, { ...slot, role: "secondary_compound", slotLabel: "A2" }],
              },
            ],
          },
        ],
      },
    });

    expect(draft?.validation.blockers).toContain(
      "Workout Templates cannot repeat the same exercise in more than one slot.",
    );
  });

  it("validates unavailable draft slot exercises", () => {
    const { content: draftContent, group, slot, template } = getFirstDraftSlotFixture();

    const draft = normalizeTrainingPlanDraft({
      content: {
        ...draftContent,
        workoutTemplates: [
          {
            ...template,
            supersetGroups: [
              {
                ...group,
                slots: [
                  {
                    ...slot,
                    exerciseId: "retired-exercise",
                    exerciseName: "Retired Exercise",
                  },
                ],
              },
            ],
          },
        ],
      },
    });

    expect(draft?.validation.blockers).toContain(
      "Training Plan Draft slots must use available catalog exercises.",
    );
  });

  it("updates a draft slot Training Prescription and surfaces Weekly Rep Target drift warnings", () => {
    const blueprint = createTestPlanBlueprint({
      trainingPlanDraft: {
        content: {
          ...createTestTrainingPlanDraftContent(),
          weeklyRepTargets: [
            { isEnabled: true, muscleGroup: "chest", source: "custom", target: 30 },
          ],
        },
        isStale: false,
        validation: { blockers: [], warnings: [] },
      },
    });

    const updatedBlueprint = updateTrainingPlanDraftSlotTrainingPrescription({
      blueprint,
      groupId: "group-1",
      repTargetMax: 1,
      repTargetMin: 1,
      setCount: 1,
      slotIndex: 0,
      templateId: "template-1",
      timestamp: "2026-07-07T08:30:00.000Z",
    });

    expect(
      updatedBlueprint.trainingPlanDraft?.content.workoutTemplates[0]?.supersetGroups[0]?.slots[0]
        ?.trainingPrescription,
    ).toEqual({
      repRange: { max: 1, min: 1 },
      setCount: 1,
    });
    expect(updatedBlueprint.trainingPlanDraft?.validation.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "weekly_rep_target_drift",
          message: expect.stringMatching(/Chest is .* reps below your Weekly Rep Target\./),
        }),
      ]),
    );
  });

  it("blocks invalid draft Training Prescriptions", () => {
    const draftContent = createTestTrainingPlanDraftContent();
    const template = draftContent.workoutTemplates[0];
    const group = template?.supersetGroups[0];
    const slot = group?.slots[0];

    if (!template || !group || !slot) {
      throw new Error("Expected a draft slot fixture.");
    }

    const draft = normalizeTrainingPlanDraft({
      content: {
        ...draftContent,
        workoutTemplates: [
          {
            ...template,
            supersetGroups: [
              {
                ...group,
                slots: [
                  {
                    ...slot,
                    trainingPrescription: {
                      repRange: { max: 7, min: 8 },
                      setCount: 0,
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    });

    expect(draft?.validation.blockers).toContain(
      "Training Prescriptions must use positive integer set counts and rep targets, with the minimum less than or equal to the maximum.",
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

function createTwoSlotDraftContent(): NonNullable<PlanBlueprint["trainingPlanDraft"]>["content"] {
  const { content, group, slot, template } = getFirstDraftSlotFixture();

  return {
    ...content,
    workoutTemplates: [
      {
        ...template,
        supersetGroups: [
          {
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
          },
        ],
      },
    ],
  };
}

function createTwoGroupDraftContent(): NonNullable<PlanBlueprint["trainingPlanDraft"]>["content"] {
  const { content, group, slot, template } = getFirstDraftSlotFixture();

  return {
    ...content,
    workoutTemplates: [
      {
        ...template,
        supersetGroups: [
          {
            ...group,
            slots: [
              {
                ...slot,
                exerciseId: "incline-dumbbell-bench-press",
                exerciseName: "Incline Dumbbell Bench Press",
              },
            ],
          },
          {
            id: "group-2",
            slots: [slot],
            title: "Upper Superset Group 2",
            type: "superset",
          },
        ],
      },
    ],
  };
}

function getFirstDraftSlotFixture() {
  const content = createTestTrainingPlanDraftContent();
  const template = content.workoutTemplates[0];
  const group = template?.supersetGroups[0];
  const slot = group?.slots[0];

  if (!template || !group || !slot) {
    throw new Error("Expected the test draft fixture to contain one template, group, and slot.");
  }

  return { content, group, slot, template };
}
