import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type {
  TrainingSessionExecutionAction,
  TrainingSessionExecutionGroup,
} from "./training-session-execution";
import { TrainingSessionGroup } from "./training-session-group";

describe("TrainingSessionGroup", () => {
  it("shows one exercise row with generated set controls", () => {
    render(<TrainingSessionGroup group={createTrainingSessionGroup()} onAction={() => {}} />);

    expect(screen.getByText("4 rounds")).toBeVisible();
    expect(screen.queryByText("3 rounds")).not.toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Set 4" })).toBeVisible();
    expect(screen.getAllByRole("row")).toHaveLength(2);
    expect(
      screen
        .getByLabelText("Incline Dumbbell Bench Press set 3 weight")
        .closest(".training-session-set-cell"),
    ).not.toHaveClass("training-session-set-cell--future");
    expect(
      screen
        .getByLabelText("Incline Dumbbell Bench Press set 4 weight")
        .closest(".training-session-set-cell"),
    ).toHaveClass("training-session-set-cell--future");
    expect(
      within(screen.getByRole("row", { name: /Incline Dumbbell Bench Press/i })).getAllByRole(
        "spinbutton",
      ),
    ).toHaveLength(8);
  });

  it("captures RIR with an accessible radiogroup of effort chips", () => {
    const onAction = vi.fn<(action: TrainingSessionExecutionAction) => void>();

    render(<TrainingSessionGroup group={createTrainingSessionGroup()} onAction={onAction} />);

    const effort = screen.getByRole("radiogroup", {
      name: "Incline Dumbbell Bench Press set 1 RIR",
    });
    const radios = within(effort).getAllByRole("radio");

    expect(radios.map((radio) => radio.getAttribute("aria-label"))).toEqual([
      "0 reps in reserve",
      "1 rep in reserve",
      "2 reps in reserve",
      "3 reps in reserve (target)",
      "4 reps in reserve",
      "5 or more reps in reserve",
    ]);
    expect(
      within(effort).getByRole("radio", { name: "3 reps in reserve (target)" }).closest("label"),
    ).toHaveClass("training-session-effort__chip--target");
    expect(radios.some((radio) => (radio as HTMLInputElement).checked)).toBe(false);

    fireEvent.click(within(effort).getByRole("radio", { name: "2 reps in reserve" }));

    expect(onAction).toHaveBeenCalledWith({
      setId: "group-1-bench-set-1",
      type: "change-set-rir",
      value: "2",
    });
  });

  it("clears RIR when the selected effort chip is tapped again", () => {
    const onAction = vi.fn<(action: TrainingSessionExecutionAction) => void>();

    render(
      <TrainingSessionGroup
        group={createTrainingSessionGroup({ setOneRir: "2" })}
        onAction={onAction}
      />,
    );

    const effort = screen.getByRole("radiogroup", {
      name: "Incline Dumbbell Bench Press set 1 RIR",
    });
    const selected = within(effort).getByRole("radio", { name: "2 reps in reserve" });

    expect(selected).toBeChecked();

    fireEvent.click(selected);

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onAction).toHaveBeenCalledWith({
      setId: "group-1-bench-set-1",
      type: "change-set-rir",
      value: "",
    });
  });

  it("moves between effort chips with the arrow keys", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn<(action: TrainingSessionExecutionAction) => void>();

    render(
      <TrainingSessionGroup
        group={createTrainingSessionGroup({ setOneRir: "2" })}
        onAction={onAction}
      />,
    );

    within(screen.getByRole("radiogroup", { name: "Incline Dumbbell Bench Press set 1 RIR" }))
      .getByRole("radio", { name: "2 reps in reserve" })
      .focus();
    await user.keyboard("{ArrowRight}");

    expect(onAction).toHaveBeenLastCalledWith({
      setId: "group-1-bench-set-1",
      type: "change-set-rir",
      value: "3",
    });
    expect(onAction).not.toHaveBeenCalledWith(expect.objectContaining({ value: "" }));
  });

  it("selects the open-ended chip for RIR values above its range", () => {
    render(
      <TrainingSessionGroup
        group={createTrainingSessionGroup({ setOneRir: "7" })}
        onAction={() => {}}
      />,
    );

    expect(
      within(
        screen.getByRole("radiogroup", { name: "Incline Dumbbell Bench Press set 1 RIR" }),
      ).getByRole("radio", { name: "5 or more reps in reserve" }),
    ).toBeChecked();
  });
});

function createTrainingSessionGroup({
  setOneRir = "",
}: {
  setOneRir?: string;
} = {}): TrainingSessionExecutionGroup {
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
      createTrainingSessionRound(1, setOneRir),
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
  rir = "",
): TrainingSessionExecutionGroup["rounds"][number] {
  return {
    roundIndex,
    rows: [
      {
        aimLabel: null,
        done: false,
        doneLabel: `Mark Incline Dumbbell Bench Press set ${roundIndex} done`,
        exerciseName: "Incline Dumbbell Bench Press",
        inputId: `group-1-bench-set-${roundIndex}`,
        movementPatternLabel: "Horizontal push",
        prescriptionLabel: "4 x 6-8",
        previousSetLabel: "-",
        reps: "6",
        rir,
        setId: `group-1-bench-set-${roundIndex}`,
        setIndex: roundIndex,
        targetRir: "3",
        weight: "",
        weightInputMin: "0",
      },
    ],
  };
}
