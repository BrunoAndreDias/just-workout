import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CompletedSessionsSection } from "./completed-sessions-section";
import { buildTrainingHistoryWeekReport } from "./training-history-week";
import type { TrainingPlan } from "./training-plan";
import type { TrainingSession } from "./training-session";

describe("CompletedSessionsSection", () => {
  it.each([
    false,
    true,
  ])("shows each done set next to its Session Target (compact layout: %s)", (isCompactLayout) => {
    const session = createReport().selectedSessions[0];

    if (!session) {
      throw new Error("Expected a selected session report.");
    }

    render(
      <CompletedSessionsSection
        isCompactLayout={isCompactLayout}
        onSaveHistoricalBodyweightCorrection={async () => {}}
        onToggleSession={() => {}}
        selectedSession={session}
        selectedSessions={[session]}
      />,
    );

    const targets = screen.getByRole("region", { name: "Session Targets vs actual" });

    expect(within(targets).getByText("Hit 1 of 2 targets")).toBeVisible();

    const bench = within(targets).getByRole("list", { name: "Flat Barbell Bench Press sets" });
    const [firstSet, secondSet] = within(bench).getAllByRole("listitem");

    expect(firstSet).toHaveTextContent("Set 1");
    expect(firstSet).toHaveTextContent("60 kg × 8 · 3 RIR");
    expect(firstSet).toHaveTextContent("Target 60 kg × 8 · 4 RIR");
    expect(firstSet).toHaveTextContent("Hit");
    expect(secondSet).toHaveTextContent("Missed");
  });

  it("leaves out the target line for legacy sets logged before targets were stored", () => {
    const session = createReport([{ reps: 10, setIndex: 1, weight: 50 }]).selectedSessions[0];

    if (!session) {
      throw new Error("Expected a selected session report.");
    }

    render(
      <CompletedSessionsSection
        isCompactLayout={false}
        onSaveHistoricalBodyweightCorrection={async () => {}}
        onToggleSession={() => {}}
        selectedSession={session}
        selectedSessions={[session]}
      />,
    );

    const targets = screen.getByRole("region", { name: "Session Targets vs actual" });

    expect(within(targets).getByText("50 kg × 10")).toBeVisible();
    expect(within(targets).queryByText(/^Target /)).toBeNull();
    expect(within(targets).queryByText(/^Hit \d+ of/)).toBeNull();
  });
});

function createReport(
  sets: TrainingSession["exercises"][number]["sets"] = [
    {
      done: true,
      reps: 8,
      rir: 3,
      setIndex: 1,
      target: { reps: 8, rir: 4, weight: 60 },
      weight: 60,
    },
    {
      done: true,
      reps: 6,
      rir: null,
      setIndex: 2,
      target: { reps: 8, rir: 4, weight: 60 },
      weight: 60,
    },
  ],
) {
  const completedAt = "2026-06-06T09:00:00.000Z";
  const trainingPlan: TrainingPlan = {
    active: true,
    generatedAt: "2026-06-01T09:00:00.000Z",
    id: "training-plan-test",
    mainCompoundRotationPools: [],
    repRangeStyle: "balanced_hypertrophy",
    sourceBlueprintId: "plan-blueprint-test",
    split: "Rotating Upper/Lower",
    trainingBlockWeeks: 6,
    trainingFrequencyDaysPerWeek: 3,
    trainingGoal: "build-muscle",
    updatedAt: "2026-06-01T09:00:00.000Z",
    weeklyRepTargets: [],
    workoutTemplates: [],
  };

  return buildTrainingHistoryWeekReport({
    selectedWeekEndKey: null,
    trainingPlan,
    trainingSessions: [
      {
        completedAt,
        createdAt: completedAt,
        exercises: [
          {
            exerciseId: "bench",
            exerciseName: "Flat Barbell Bench Press",
            movementPattern: "horizontal_push",
            sets,
          },
        ],
        id: "session-1",
        planId: trainingPlan.id,
        status: "completed",
        templateId: "upper-a",
        templateLabel: "Upper A",
        updatedAt: completedAt,
        volumeByMovementPattern: [],
      },
    ],
  });
}
