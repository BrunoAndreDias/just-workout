import { describe, expect, it } from "vitest";
import { getTrainingSplit } from "../../training-split";
import { getCompactWeeklyLayout } from "./training-frequency-weekly-layout";

function getTrainingDays(layout: ReturnType<typeof getCompactWeeklyLayout>) {
  return layout.days
    .filter((day) => !day.isRestDay)
    .map((day) => `${day.dayLabel} ${day.sessionLabel}`);
}

describe("compact weekly layout", () => {
  it("keeps fixed-week split layouts and derives the helper text from training days", () => {
    const layout = getCompactWeeklyLayout(getTrainingSplit("upper-lower-4-day"), 4);

    expect(getTrainingDays(layout)).toEqual(["Mon Upper", "Tue Lower", "Thu Upper", "Fri Lower"]);
    expect(layout.helperText).toBe(
      "Training on Mon, Tue, Thu and Fri with recovery days between sessions.",
    );
    expect(layout.cycleNote).toBeNull();
  });

  it("describes a three-day full-body week on Mon, Wed and Fri", () => {
    const layout = getCompactWeeklyLayout(getTrainingSplit("full-body-3-day"), 3);

    expect(layout.helperText).toBe(
      "Training on Mon, Wed and Fri with recovery days between sessions.",
    );
    expect(layout.days).toHaveLength(7);
  });

  it("places Rotating Upper/Lower on Mon/Wed/Fri for 3 days and notes the cycle carry-over", () => {
    const layout = getCompactWeeklyLayout(getTrainingSplit("rotating-upper-lower"), 3);

    expect(getTrainingDays(layout)).toEqual(["Mon Upper A", "Wed Lower A", "Fri Upper B"]);
    expect(layout.helperText).toBe(
      "Training on Mon, Wed and Fri with recovery days between sessions.",
    );
    expect(layout.cycleNote).toBe(
      "The cycle carries over to the next week: week 1 Upper A / Lower A / Upper B, week 2 Lower B / Upper A / Lower A.",
    );
  });

  it("places Rotating Upper/Lower on Mon/Tue/Wed/Fri/Sat for 5 days by continuing the cycle", () => {
    const layout = getCompactWeeklyLayout(getTrainingSplit("rotating-upper-lower"), 5);

    expect(getTrainingDays(layout)).toEqual([
      "Mon Upper A",
      "Tue Lower A",
      "Wed Upper B",
      "Fri Lower B",
      "Sat Upper A",
    ]);
    expect(layout.helperText).toBe(
      "Training on Mon, Tue, Wed, Fri and Sat with recovery days between sessions.",
    );
    expect(layout.cycleNote).toContain("week 2 Lower A / Upper B / Lower B / Upper A / Lower A");
  });

  it("uses the selected frequency for Rotating Push/Pull/Legs", () => {
    expect(
      getTrainingDays(getCompactWeeklyLayout(getTrainingSplit("rotating-push-pull-legs"), 4)),
    ).toEqual(["Mon Push A", "Tue Pull A", "Thu Legs A", "Fri Push B"]);
    expect(getCompactWeeklyLayout(getTrainingSplit("rotating-push-pull-legs"), 4).cycleNote).toBe(
      "The cycle carries over to the next week: week 1 Push A / Pull A / Legs A / Push B, week 2 Pull B / Legs B / Push A / Pull A.",
    );
  });
});

describe("training session families", () => {
  it("colours sessions by the kind of work they hold", () => {
    const layout = getCompactWeeklyLayout(getTrainingSplit("rotating-push-pull-legs"), 4);

    expect(layout.days.map((day) => day.sessionFamily)).toEqual([
      "push",
      "pull",
      null,
      "legs",
      "push",
      null,
      null,
    ]);
    expect(layout.cycleWeeks).toEqual([
      ["Push A", "Pull A", "Legs A", "Push B"],
      ["Pull B", "Legs B", "Push A", "Pull A"],
    ]);
  });

  it("treats full-body templates as one family", () => {
    const layout = getCompactWeeklyLayout(getTrainingSplit("alternating-full-body-a-b"), 3);

    expect(layout.days.filter((day) => !day.isRestDay).map((day) => day.sessionFamily)).toEqual([
      "full-body",
      "full-body",
      "full-body",
    ]);
    expect(layout.cycleWeeks).toBeNull();
  });
});
