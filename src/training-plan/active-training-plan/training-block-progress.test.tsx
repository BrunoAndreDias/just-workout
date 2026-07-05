import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { NextTrainingBlockTransitionWorkflow } from "../index";
import { TrainingBlockProgress } from "./training-block-progress";

describe("TrainingBlockProgress", () => {
  it("shows editable load prefill details for kept exercises in the transition preview", async () => {
    const user = userEvent.setup();

    render(
      <TrainingBlockProgress
        blockProgressPercent={100}
        blockWeek={6}
        nextTrainingBlockTransition={createTransitionWithKeptExercise()}
        trainingBlockWeeks={6}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Generate next cycle" }));

    const keptExercise = screen
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

function createTransitionWithKeptExercise(): NextTrainingBlockTransitionWorkflow {
  return {
    editLoadSuggestion: ({ suggestions }) => suggestions,
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
      nextTrainingPlan: {} as NextTrainingBlockTransitionWorkflow["preview"]["nextTrainingPlan"],
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
  };
}
