import { describe, expect, it } from "vitest";
import { createDefaultPlanBlueprint, type PlanBlueprint } from "./plan-blueprint";
import {
  addTrainingPlanDraftSupersetGroup,
  markTrainingPlanDraftStale,
  normalizeTrainingPlanDraft,
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
