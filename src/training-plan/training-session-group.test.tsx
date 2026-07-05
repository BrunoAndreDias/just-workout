import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TrainingSessionExecutionGroup } from "./training-session-execution";
import { TrainingSessionGroup } from "./training-session-group";

describe("TrainingSessionGroup", () => {
  it("shows the generated round count instead of a hard-coded summary", () => {
    render(<TrainingSessionGroup group={createTrainingSessionGroup()} onAction={() => {}} />);

    expect(screen.getByText("4 rounds")).toBeVisible();
    expect(screen.queryByText("3 rounds")).not.toBeInTheDocument();
    expect(
      within(screen.getByRole("rowgroup", { name: "Round 3 superset" })).getByRole("row"),
    ).not.toHaveClass("training-session-exercise-row--future");
    expect(
      within(screen.getByRole("rowgroup", { name: "Round 4 superset" })).getByRole("row"),
    ).toHaveClass("training-session-exercise-row--future");
  });
});

function createTrainingSessionGroup(): TrainingSessionExecutionGroup {
  return {
    accessibleTitle: "Superset 1",
    groupId: "group-1",
    isOpen: true,
    now: {
      exerciseName: "Incline Dumbbell Bench Press",
      movementPatternLabel: "Horizontal push",
      prescriptionLabel: "4 x 6-8",
      roleLabel: "Main",
      setLabel: "Set 1 of 4",
      targetRirLabel: "Target 3 RIR",
      targetRepsLabel: "Target 6-8 reps",
    },
    rounds: [
      createTrainingSessionRound(1),
      createTrainingSessionRound(2),
      createTrainingSessionRound(3),
      createTrainingSessionRound(4),
    ],
    summary: {
      completedSetCount: 0,
      exerciseCount: 2,
      isComplete: false,
      plannedSetCount: 8,
    },
    title: "Upper Superset 1",
  };
}

function createTrainingSessionRound(
  roundIndex: number,
): TrainingSessionExecutionGroup["rounds"][number] {
  return {
    roundIndex,
    rows: [
      {
        done: false,
        doneLabel: `Mark Incline Dumbbell Bench Press set ${roundIndex} done`,
        exerciseName: "Incline Dumbbell Bench Press",
        inputId: `group-1-bench-set-${roundIndex}`,
        movementPatternLabel: "Horizontal push",
        prescriptionLabel: "4 x 6-8",
        previousSetLabel: "-",
        reps: "6",
        rir: "",
        setId: `group-1-bench-set-${roundIndex}`,
        setIndex: roundIndex,
        targetRir: "3",
        weight: "",
        weightInputMin: "0",
      },
    ],
  };
}
