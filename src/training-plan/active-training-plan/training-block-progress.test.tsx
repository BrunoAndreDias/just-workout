import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { NextTrainingBlockTransitionWorkflow } from "../index";
import { TrainingBlockProgress } from "./training-block-progress";

type ReviewTrainingBlockTransitionWorkflow = Extract<
  NextTrainingBlockTransitionWorkflow,
  { kind: "review" }
>;

describe("TrainingBlockProgress", () => {
  it("shows editable load prefill details for kept exercises in the transition preview", async () => {
    const user = userEvent.setup();

    render(
      <TrainingBlockProgress
        blockProgressPercent={100}
        blockWeek={6}
        nextTrainingBlockTransition={createTransitionWithKeptExercise()}
        onOpenTrainingHistory={() => {}}
        trainingSessions={[]}
        trainingWeekProgress={{
          caveat: null,
          detail: "1 of 1 workouts completed",
          kind: "current_week",
          support: "Keep logging sessions to stay on track for this week.",
          title: "Training Week progress",
          value: "100%",
          valueLabel: "Known volume",
        }}
        trainingBlockWeeks={6}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Review next Training Block" }));

    const prefillSection = screen.getByRole("region", {
      name: "Previous Exercise Load Prefill",
    });
    const keptExercise = within(prefillSection)
      .getByText("Flat Dumbbell Bench Press")
      .closest("li") as HTMLElement | null;

    expect(keptExercise).not.toBeNull();
    expect(within(keptExercise as HTMLElement).getByText("Previous load: 40 kg")).toBeVisible();
    expect(within(keptExercise as HTMLElement).getByText("Suggested start: 40 kg")).toBeVisible();
    expect(
      within(keptExercise as HTMLElement).getByText("previous exact exercise load prefill"),
    ).toBeVisible();
    expect(
      within(keptExercise as HTMLElement).getByLabelText(
        "Suggested starting load for Flat Dumbbell Bench Press",
      ),
    ).toHaveValue(40);
  });
});

function createTransitionWithKeptExercise(): ReviewTrainingBlockTransitionWorkflow {
  return {
    editLoadSuggestion: ({ suggestions }) => suggestions,
    kind: "review",
    preview: {
      loadSuggestions: [
        {
          exerciseId: "flat-dumbbell-bench-press",
          exerciseName: "Flat Dumbbell Bench Press",
          kind: "exact_previous_exercise",
          movementPattern: "horizontal_push",
          previousLoad: 40,
          reason: "previous exact exercise load prefill",
          suggestedLoad: 40,
          userEditedLoad: null,
        },
      ],
      nextTrainingPlan: createNextTrainingPlanStub(),
      rotation: {
        kept: [
          {
            exerciseId: "flat-dumbbell-bench-press",
            exerciseName: "Flat Dumbbell Bench Press",
            groupId: "group-1",
            movementPattern: "horizontal_push",
            reason: "kept exercise",
            role: "main_compound",
            slotIndex: 0,
            slotLabel: "Horizontal push",
            templateId: "template-1",
            templateLabel: "Full Body A",
          },
        ],
        requiredMovementCoverage: {
          isPreserved: true,
          missingPatterns: [],
        },
        rotated: [],
      },
      trainingBlock: {
        cycleNumber: 2,
        endDate: "2026-08-29",
        id: "training-block-2",
        planId: "training-plan-1",
        previousBlockId: "training-block-1",
        startDate: "2026-07-19",
        status: "upcoming",
        weekNumber: 1,
      },
      weeklyIntensityTargets: [],
    },
    skipRotationPreview: {
      loadSuggestions: [
        {
          exerciseId: "flat-dumbbell-bench-press",
          exerciseName: "Flat Dumbbell Bench Press",
          kind: "exact_previous_exercise",
          movementPattern: "horizontal_push",
          previousLoad: 40,
          reason: "previous exact exercise load prefill",
          suggestedLoad: 40,
          userEditedLoad: null,
        },
      ],
      nextTrainingPlan: createNextTrainingPlanStub(),
      rotation: {
        kept: [
          {
            exerciseId: "flat-dumbbell-bench-press",
            exerciseName: "Flat Dumbbell Bench Press",
            groupId: "group-1",
            movementPattern: "horizontal_push",
            reason: "kept current exercise after skipping the rotation proposal",
            role: "main_compound",
            slotIndex: 0,
            slotLabel: "Horizontal push",
            templateId: "template-1",
            templateLabel: "Full Body A",
          },
        ],
        requiredMovementCoverage: {
          isPreserved: true,
          missingPatterns: [],
        },
        rotated: [],
      },
      trainingBlock: {
        cycleNumber: 2,
        endDate: "2026-08-29",
        id: "training-block-2",
        planId: "training-plan-1",
        previousBlockId: "training-block-1",
        startDate: "2026-07-19",
        status: "upcoming",
        weekNumber: 1,
      },
      weeklyIntensityTargets: [],
    },
  };
}

function createNextTrainingPlanStub(): ReviewTrainingBlockTransitionWorkflow["preview"]["nextTrainingPlan"] {
  return {
    active: true,
    exerciseSelectionPreferences: {
      avoidedExercises: [],
      equipmentPreset: "full_gym",
      preferredExercises: [],
      strategy: "balanced",
    },
    generatedAt: "2026-07-19T09:00:00.000Z",
    id: "training-plan-1",
    isolationExercisePreferences: [],
    mainCompoundRotationPools: [],
    repRangeStyle: "balanced_hypertrophy",
    sourceBlueprintId: "plan-blueprint-1",
    split: "Full Body A",
    trainingBlock: {
      cycleNumber: 2,
      endDate: "2026-08-29",
      id: "training-block-2",
      planId: "training-plan-1",
      previousBlockId: "training-block-1",
      startDate: "2026-07-19",
      status: "upcoming",
      weekNumber: 1,
    },
    trainingBlockWeeks: 6,
    trainingFrequencyDaysPerWeek: 2,
    trainingGoal: "build-muscle",
    updatedAt: "2026-07-19T09:00:00.000Z",
    weeklyRepTargets: [],
    workoutTemplates: [
      {
        id: "template-1",
        label: "Full Body A",
        supersetGroups: [
          {
            id: "group-1",
            slots: [
              {
                exerciseId: "flat-dumbbell-bench-press",
                exerciseName: "Flat Dumbbell Bench Press",
                kind: "exercise",
                movementPattern: "horizontal_push",
                role: "main_compound",
                slotLabel: "Horizontal push",
                targetMuscles: ["chest"],
              },
            ],
            title: "Superset 1",
            type: "superset",
          },
        ],
      },
    ],
  };
}
