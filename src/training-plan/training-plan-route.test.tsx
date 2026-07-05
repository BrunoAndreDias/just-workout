import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetLocalDatabase } from "../app/local-database";
import { createAppRouter } from "../app/router";
import type { PlanBlueprint } from "../plan-builder/plan-blueprint";
import { completeMainCompoundSelections } from "../plan-builder/plan-builder-test-fixtures";
import { createPresetWeeklyRepTargets } from "../training-taxonomy";
import type { TrainingSession } from "./index";
import { generateTrainingPlanFromBlueprint, type TrainingPlan } from "./training-plan";
import {
  getTrainingPlan,
  getTrainingSessionsForPlan,
  seedTrainingPlanData,
} from "./training-plan-repository";
import { trainingPlanService } from "./training-plan-service";

const defaultMatchMedia = window.matchMedia;
const trainingHistoryCompactLayoutQuery = "(max-width: 720px)";

describe("TrainingPlanRoute", () => {
  beforeEach(async () => {
    restoreDefaultMatchMedia();
    await resetLocalDatabase();
  });

  afterEach(() => {
    restoreDefaultMatchMedia();
    vi.restoreAllMocks();
  });

  it("renders the Compare tab as a readable template comparison without editing controls", async () => {
    const user = userEvent.setup();
    await seedTrainingPlan();

    renderTrainingPlan({ initialEntries: ["/training-plans/training-plan-test"] });

    expect(await screen.findByRole("heading", { name: "Alternating Full Body A/B" })).toBeVisible();

    await user.click(screen.getByRole("tab", { name: "Compare" }));

    const comparePanel = screen.getByRole("tabpanel", { name: "Compare" });

    const movementSection = within(comparePanel)
      .getByRole("heading", { name: "Movement patterns comparison" })
      .closest("section");

    expect(movementSection).not.toBeNull();
    expect(
      within(comparePanel).queryByRole("heading", { name: "Two sessions. Weekly balance." }),
    ).not.toBeInTheDocument();
    expect(
      within(comparePanel).queryByText(
        "Compare Full Body A and Full Body B across movement coverage, session roles, and weekly emphasis before following the weekly Training Plan.",
      ),
    ).not.toBeInTheDocument();
    expect(
      within(movementSection as HTMLElement).getByText(
        "See how Full Body A and Full Body B distribute movement patterns across the week.",
      ),
    ).toBeVisible();
    expect(within(movementSection as HTMLElement).getByText("2 sessions")).toBeVisible();
    expect(
      within(movementSection as HTMLElement).getByRole("columnheader", {
        name: "Movement pattern",
      }),
    ).toBeVisible();
    expect(
      within(movementSection as HTMLElement).getByRole("row", {
        name: /Quad Dominant Yes Yes 2 of 2 sessions/,
      }),
    ).toBeVisible();
    expect(
      within(movementSection as HTMLElement).getByRole("row", {
        name: /Calves \/ Core Yes Yes 2 of 2 sessions/,
      }),
    ).toBeVisible();

    const snapshotsSection = within(comparePanel)
      .getByRole("heading", { name: "Session snapshots" })
      .closest("section");

    expect(snapshotsSection).not.toBeNull();
    expect(
      within(snapshotsSection as HTMLElement).getByRole("heading", { name: "Full Body A" }),
    ).toBeVisible();
    expect(
      within(snapshotsSection as HTMLElement).getByRole("heading", { name: "Full Body B" }),
    ).toBeVisible();
    expect(within(snapshotsSection as HTMLElement).getAllByText("Weekly role").length).toBe(2);
    expect(within(snapshotsSection as HTMLElement).getAllByText("Key focus").length).toBe(2);
    expect(within(snapshotsSection as HTMLElement).getAllByText("Main patterns").length).toBe(2);
    expect(within(snapshotsSection as HTMLElement).getAllByText("Accessory work").length).toBe(2);
    expect(within(snapshotsSection as HTMLElement).getAllByText("Emphasis").length).toBe(2);
    expect(
      within(snapshotsSection as HTMLElement).queryByText("Flat Dumbbell Bench Press"),
    ).not.toBeInTheDocument();
    expect(
      within(snapshotsSection as HTMLElement).queryByText("Barbell Romanian Deadlifts"),
    ).not.toBeInTheDocument();
    expect(
      within(snapshotsSection as HTMLElement).queryByText("Standing Barbell Curls"),
    ).not.toBeInTheDocument();

    expect(
      within(comparePanel).getByText(
        "This split distributes upper-body, lower-body, and accessory stress across the week so each session has a distinct role.",
      ),
    ).toBeVisible();
    expect(within(comparePanel).queryByText("Key exercise differences")).not.toBeInTheDocument();
    expect(within(comparePanel).queryByText("Accessory work comparison")).not.toBeInTheDocument();
    expect(within(comparePanel).queryByText("Session emphasis")).not.toBeInTheDocument();
    expect(within(comparePanel).queryByText("Weekly balance explanation")).not.toBeInTheDocument();
    expect(within(comparePanel).queryByText("A1")).not.toBeInTheDocument();
    expect(within(comparePanel).queryByText("A2")).not.toBeInTheDocument();
    expect(within(comparePanel).queryByText("B1")).not.toBeInTheDocument();
    expect(within(comparePanel).queryByText("B2")).not.toBeInTheDocument();
    expect(within(comparePanel).queryByText("C1")).not.toBeInTheDocument();
    expect(within(comparePanel).queryByRole("button", { name: /change/i })).not.toBeInTheDocument();
    expect(within(comparePanel).queryByRole("button", { name: /swap/i })).not.toBeInTheDocument();
  });

  it("shows all three Upper / Lower / Full Body workouts in Overview and Compare", async () => {
    const user = userEvent.setup();
    await seedTrainingPlan({
      split: "upper-lower-full-body",
      trainingFrequencyDaysPerWeek: 3,
    });

    renderTrainingPlan({ initialEntries: ["/training-plans/training-plan-test"] });

    expect(await screen.findByRole("heading", { name: "Upper / Lower / Full Body" })).toBeVisible();

    const overviewPanel = screen.getByRole("tabpanel", { name: "Overview" });
    const muscleEmphasis = within(overviewPanel)
      .getByRole("heading", { name: "Workout split at a glance" })
      .closest("section");

    expect(muscleEmphasis).not.toBeNull();
    expect(
      within(muscleEmphasis as HTMLElement).getByRole("heading", { name: "Upper" }),
    ).toBeVisible();
    expect(
      within(muscleEmphasis as HTMLElement).getByRole("heading", { name: "Lower" }),
    ).toBeVisible();
    expect(
      within(muscleEmphasis as HTMLElement).getByRole("heading", { name: "Full Body A" }),
    ).toBeVisible();
    expect(within(muscleEmphasis as HTMLElement).getByText("Day 1")).toBeVisible();
    expect(within(muscleEmphasis as HTMLElement).getByText("Day 2")).toBeVisible();
    expect(within(muscleEmphasis as HTMLElement).getByText("Day 3")).toBeVisible();
    expect(
      within(muscleEmphasis as HTMLElement).getByText(
        "Repeat weekly. Rotate through Upper, Lower, and Full Body A.",
      ),
    ).toBeVisible();

    await user.click(screen.getByRole("tab", { name: "Compare" }));

    const comparePanel = screen.getByRole("tabpanel", { name: "Compare" });

    const movementSection = within(comparePanel)
      .getByRole("heading", { name: "Movement patterns comparison" })
      .closest("section");

    expect(movementSection).not.toBeNull();
    expect(
      within(comparePanel).queryByRole("heading", { name: "3 sessions. Weekly balance." }),
    ).not.toBeInTheDocument();
    expect(
      within(comparePanel).queryByText(
        "Compare Upper, Lower, and Full Body A across movement coverage, session roles, and weekly emphasis before following the weekly Training Plan.",
      ),
    ).not.toBeInTheDocument();
    expect(
      within(movementSection as HTMLElement).getByText(
        "See how Upper, Lower, and Full Body A distribute movement patterns across the week.",
      ),
    ).toBeVisible();
    expect(within(movementSection as HTMLElement).getByText("3 sessions")).toBeVisible();
    expect(
      within(movementSection as HTMLElement).getByRole("columnheader", { name: "Upper" }),
    ).toBeVisible();
    expect(
      within(movementSection as HTMLElement).getByRole("columnheader", { name: "Lower" }),
    ).toBeVisible();
    expect(
      within(movementSection as HTMLElement).getByRole("columnheader", { name: "Full Body A" }),
    ).toBeVisible();
    expect(
      within(movementSection as HTMLElement).getByRole("row", {
        name: /Horizontal Push Yes No Yes 2 of 3 sessions/,
      }),
    ).toBeVisible();
    expect(
      within(movementSection as HTMLElement).getByRole("row", {
        name: /Quad Dominant No Yes Yes 2 of 3 sessions/,
      }),
    ).toBeVisible();

    const snapshotsSection = within(comparePanel)
      .getByRole("heading", { name: "Session snapshots" })
      .closest("section");

    expect(snapshotsSection).not.toBeNull();
    expect(
      within(snapshotsSection as HTMLElement).getByRole("heading", { name: "Upper" }),
    ).toBeVisible();
    expect(
      within(snapshotsSection as HTMLElement).getByRole("heading", { name: "Lower" }),
    ).toBeVisible();
    expect(
      within(snapshotsSection as HTMLElement).getByRole("heading", { name: "Full Body A" }),
    ).toBeVisible();
    expect(within(snapshotsSection as HTMLElement).getAllByText("Weekly role").length).toBe(3);
    expect(within(snapshotsSection as HTMLElement).getAllByText("Key focus").length).toBe(3);
    expect(within(snapshotsSection as HTMLElement).getAllByText("Main patterns").length).toBe(3);
    expect(within(snapshotsSection as HTMLElement).getAllByText("Accessory work").length).toBe(3);
    expect(within(snapshotsSection as HTMLElement).getAllByText("Emphasis").length).toBe(3);
    expect(within(snapshotsSection as HTMLElement).getByText("Upper-body balance")).toBeVisible();
    expect(within(snapshotsSection as HTMLElement).getByText("Push + pull")).toBeVisible();
    expect(
      within(snapshotsSection as HTMLElement).getByText(
        "Horizontal push, vertical pull, horizontal pull",
      ),
    ).toBeVisible();
    expect(
      within(snapshotsSection as HTMLElement).getByText("Lower-body foundation"),
    ).toBeVisible();
    expect(
      within(snapshotsSection as HTMLElement).getByText("Quads + posterior chain"),
    ).toBeVisible();
    expect(
      within(snapshotsSection as HTMLElement).getByText("Quad dominant, hip/hamstring"),
    ).toBeVisible();
    expect(within(snapshotsSection as HTMLElement).getByText("Full-body bridge")).toBeVisible();
    expect(within(snapshotsSection as HTMLElement).getByText("Mixed upper + lower")).toBeVisible();
    expect(
      within(snapshotsSection as HTMLElement).getByText("Push, pull, squat, hinge"),
    ).toBeVisible();
    expect(
      within(snapshotsSection as HTMLElement).queryByText("Flat Barbell Bench Press"),
    ).not.toBeInTheDocument();
    expect(
      within(snapshotsSection as HTMLElement).queryByText("Barbell Squats"),
    ).not.toBeInTheDocument();
    expect(
      within(snapshotsSection as HTMLElement).queryByText("Standing Overhead Barbell Press"),
    ).not.toBeInTheDocument();
    expect(
      within(snapshotsSection as HTMLElement).queryByText("Cable Crunches"),
    ).not.toBeInTheDocument();
    expect(
      within(snapshotsSection as HTMLElement).queryByText("Hanging Leg Raises"),
    ).not.toBeInTheDocument();
    expect(within(comparePanel).queryByText("Key exercise differences")).not.toBeInTheDocument();
    expect(within(comparePanel).queryByText("Accessory work comparison")).not.toBeInTheDocument();
    expect(within(comparePanel).queryByText("Session emphasis")).not.toBeInTheDocument();
    expect(within(comparePanel).queryByText("Weekly balance explanation")).not.toBeInTheDocument();
    expect(within(comparePanel).queryByText("A1")).not.toBeInTheDocument();
    expect(within(comparePanel).queryByText("B1")).not.toBeInTheDocument();
    expect(within(comparePanel).queryByText("C1")).not.toBeInTheDocument();
  });

  it("presents workout templates as a read-only blueprint without editing or tracking UI", async () => {
    const user = userEvent.setup();
    await seedTrainingPlan();

    renderTrainingPlan({ initialEntries: ["/training-plans/training-plan-test"] });

    expect(await screen.findByRole("heading", { name: "Alternating Full Body A/B" })).toBeVisible();
    expect(screen.getAllByRole("button", { name: "Start next workout" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "View training history" })).toBeVisible();

    await user.click(screen.getByRole("tab", { name: "Full Body A" }));

    const workoutPanel = screen.getByRole("tabpanel", { name: "Full Body A" });

    expect(within(workoutPanel).getByRole("heading", { name: "Superset 1" })).toBeVisible();
    expect(within(workoutPanel).getByText("Flat Dumbbell Bench Press")).toBeVisible();
    expect(within(workoutPanel).getAllByText("3 × 6–8").length).toBeGreaterThan(0);
    expect(within(workoutPanel).getAllByText("3 × 8–10").length).toBeGreaterThan(0);
    expect(within(workoutPanel).getAllByText("3 × 10–15").length).toBeGreaterThan(0);
    expect(within(workoutPanel).queryByText("1–2 RIR")).not.toBeInTheDocument();
    expect(within(workoutPanel).getByText("Horizontal push")).toBeVisible();
    expect(within(workoutPanel).getAllByText("Main").length).toBeGreaterThan(0);
    expect(within(workoutPanel).queryByText("A1")).not.toBeInTheDocument();
    expect(within(workoutPanel).queryByText("B1")).not.toBeInTheDocument();

    for (const forbiddenText of [
      /change exercise/i,
      /swap exercise/i,
      /swap for today only/i,
      /replace in plan/i,
      /add to rotation pool/i,
      /workout in progress/i,
      /complete set/i,
    ]) {
      expect(within(workoutPanel).queryByText(forbiddenText)).not.toBeInTheDocument();
    }

    expect(within(workoutPanel).queryByRole("button", { name: /change/i })).not.toBeInTheDocument();
    expect(within(workoutPanel).queryByRole("button", { name: /swap/i })).not.toBeInTheDocument();
    expect(
      within(workoutPanel).queryByRole("button", { name: /complete set/i }),
    ).not.toBeInTheDocument();
    expect(within(workoutPanel).queryByRole("spinbutton")).not.toBeInTheDocument();
    expect(within(workoutPanel).queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("shows non-blocking Volume Target Notices on Overview without surfacing them during Training Sessions", async () => {
    const user = userEvent.setup();
    await seedTrainingPlan({
      weeklyRepTargets: createPresetWeeklyRepTargets("balanced").map((target) => {
        if (target.muscleGroup === "chest") {
          return { ...target, source: "custom" as const, target: 60 };
        }

        if (target.muscleGroup === "calves") {
          return { ...target, isEnabled: false, source: "custom" as const, target: 120 };
        }

        return target;
      }),
    });

    renderTrainingPlan({ initialEntries: ["/training-plans/training-plan-test"] });

    expect(await screen.findByRole("heading", { name: "Alternating Full Body A/B" })).toBeVisible();

    const overviewPanel = screen.getByRole("tabpanel", { name: "Overview" });
    const noticesSection = within(overviewPanel)
      .getByRole("heading", { name: "Volume target notices" })
      .closest("section");

    expect(noticesSection).not.toBeNull();
    expect(
      within(noticesSection as HTMLElement).getByText(
        "Chest is 12 reps below your Weekly Rep Target.",
      ),
    ).toBeVisible();
    expect(
      within(noticesSection as HTMLElement).getByText(
        "Generated top-end prescribed reps reach 48 of your 60 weekly chest reps.",
      ),
    ).toBeVisible();
    expect(within(noticesSection as HTMLElement).queryByText(/calves/i)).not.toBeInTheDocument();

    await user.click(
      screen.getAllByRole("button", { name: "Start next workout" })[0] as HTMLElement,
    );

    expect(await screen.findByRole("heading", { name: "Full Body A session" })).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Volume target notices" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Chest is 12 reps below your Weekly Rep Target."),
    ).not.toBeInTheDocument();
  });

  it("shows a calm cycle summary on the active Training Plan", async () => {
    await seedTrainingPlan();

    renderTrainingPlan({ initialEntries: ["/training-plans/training-plan-test"] });

    expect(await screen.findByRole("heading", { name: "Alternating Full Body A/B" })).toBeVisible();

    const blockSummary = getClosestSection(screen.getByRole("heading", { name: "Cycle 1" }));

    expect(within(blockSummary).getByText("Cycle 1 · Week 2 of 6")).toBeVisible();
    expect(within(blockSummary).getByText("Current focus: building consistency")).toBeVisible();
    expect(within(blockSummary).getByText("4 weeks until exercise rotation")).toBeVisible();
    expect(
      within(blockSummary).getByText(
        "After week 6, Just Workout can rotate exercises and prefill starting loads based on your previous cycle.",
      ),
    ).toBeVisible();
    expect(
      within(blockSummary).queryByRole("button", { name: "Generate next cycle" }),
    ).not.toBeInTheDocument();
  });

  it("shows the latest Training Week verdict compactly on the active Training Plan", async () => {
    const user = userEvent.setup();
    await seedTrainingPlan();
    await seedCompletedTrainingSessions([
      {
        completedAt: "2026-06-10T09:00:00.000Z",
        exerciseId: "flat-dumbbell-bench-press",
        exerciseName: "Flat Dumbbell Bench Press",
        movementPattern: "horizontal_push",
        templateId: "template-1",
        templateLabel: "Full Body A",
        weight: 100,
      },
      {
        completedAt: "2026-06-17T09:00:00.000Z",
        exerciseId: "flat-dumbbell-bench-press",
        exerciseName: "Flat Dumbbell Bench Press",
        movementPattern: "horizontal_push",
        templateId: "template-1",
        templateLabel: "Full Body A",
        weight: 110,
      },
    ]);

    renderTrainingPlan({ initialEntries: ["/training-plans/training-plan-test"] });

    const blockSummary = getClosestSection(await screen.findByRole("heading", { name: "Cycle 1" }));

    expect(within(blockSummary).getByText("Latest Training Week verdict")).toBeVisible();
    expect(within(blockSummary).getByText("Progressed")).toBeVisible();
    expect(within(blockSummary).getByText("Jun 14-20, 2026 · 1 / 3 sessions")).toBeVisible();
    expect(
      within(blockSummary).getByText("Training Week Volume Reference: 800 kg from Jun 7-13, 2026."),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: "View training history" }));

    expect(await screen.findByRole("heading", { name: "Training history" })).toBeVisible();
  });

  it("does not show the next cycle action in week 6 until every Training Week is complete", async () => {
    await seedTrainingPlan({
      split: "full-body-2-day",
      trainingBlock: {
        cycleNumber: 1,
        endDate: "2026-07-18",
        id: "training-block-1",
        planId: "training-plan-test",
        previousBlockId: null,
        startDate: "2026-06-07",
        status: "active",
        weekNumber: 6,
      },
      trainingFrequencyDaysPerWeek: 2,
    });
    await seedCompletedTrainingSessions(createIncompleteTrainingBlockSessionOverrides());

    renderTrainingPlan({ initialEntries: ["/training-plans/training-plan-test"] });

    const blockSummary = getClosestSection(await screen.findByRole("heading", { name: "Cycle 1" }));

    expect(within(blockSummary).getByText("Cycle 1 · Week 6 of 6")).toBeVisible();
    expect(
      within(blockSummary).getByText(
        "Complete each Training Week in this block to unlock exercise rotation",
      ),
    ).toBeVisible();
    expect(
      within(blockSummary).queryByRole("button", { name: "Generate next cycle" }),
    ).not.toBeInTheDocument();
    expect(within(blockSummary).queryByText("Next cycle preview")).not.toBeInTheDocument();
  });

  it("shows the next cycle action and preview summary at the end of week 6", async () => {
    const user = userEvent.setup();
    await seedTrainingPlan({
      mainCompoundRotationPools: [
        {
          exerciseIds: ["incline-dumbbell-bench-press"],
          movementPattern: "horizontal_push",
        },
      ],
      split: "full-body-2-day",
      trainingBlock: {
        cycleNumber: 1,
        endDate: "2026-07-18",
        id: "training-block-1",
        planId: "training-plan-test",
        previousBlockId: null,
        startDate: "2026-06-07",
        status: "active",
        weekNumber: 6,
      },
      trainingFrequencyDaysPerWeek: 2,
    });
    await seedCompletedTrainingSessions(createCompletedTrainingBlockSessionOverrides());

    renderTrainingPlan({ initialEntries: ["/training-plans/training-plan-test"] });

    expect(await screen.findByRole("heading", { name: "2-Day Full Body" })).toBeVisible();

    const blockSummary = getClosestSection(screen.getByRole("heading", { name: "Cycle 1" }));

    expect(within(blockSummary).getByText("Cycle 1 · Week 6 of 6")).toBeVisible();
    expect(within(blockSummary).getByText("Ready for exercise rotation")).toBeVisible();
    expect(within(blockSummary).getByRole("button", { name: "Generate next cycle" })).toBeVisible();
    expect(within(blockSummary).getByText("Next cycle preview")).toBeVisible();
    expect(within(blockSummary).getByText("20 exercises rotated")).toBeVisible();
    expect(within(blockSummary).getByText("2 exercises kept")).toBeVisible();

    await user.click(within(blockSummary).getByRole("button", { name: "Generate next cycle" }));

    expect(
      within(blockSummary).getByRole("heading", { name: "Exercise rotation preview" }),
    ).toBeVisible();
    expect(within(blockSummary).getAllByRole("listitem")).toHaveLength(22);
    expect(
      within(blockSummary).getAllByText(/Flat Barbell Bench Press.*Incline Dumbbell Bench Press/),
    ).toHaveLength(2);
    expect(within(blockSummary).getAllByText("same Movement Pattern rotation pool")).toHaveLength(
      2,
    );
    expect(within(blockSummary).getAllByText("compatible abs exercise")).toHaveLength(4);
    const suggestedLoadInput = within(blockSummary).getByLabelText(
      "Suggested starting load for Incline Dumbbell Bench Press",
    ) as HTMLInputElement;
    const benchSuggestion = suggestedLoadInput.closest("li");

    expect(benchSuggestion).not.toBeNull();
    expect(
      within(benchSuggestion as HTMLElement).getByText("Previous load: No previous load"),
    ).toBeVisible();
    expect(
      within(benchSuggestion as HTMLElement).getByText("Suggested start: No previous load"),
    ).toBeVisible();
    expect(
      within(benchSuggestion as HTMLElement).getByText("first-time exercise, start empty"),
    ).toBeVisible();
    expect(suggestedLoadInput.value).toBe("");

    await user.clear(suggestedLoadInput);
    await user.type(suggestedLoadInput, "92.5");

    expect(suggestedLoadInput).toHaveValue(92.5);
    expect(within(blockSummary).getAllByText("Edited start: 92.5 kg")).toHaveLength(2);
  });

  it("accepts the next cycle preview and stores the edited suggested load", async () => {
    const user = userEvent.setup();
    await seedTrainingPlan({
      mainCompoundRotationPools: [
        {
          exerciseIds: ["incline-dumbbell-bench-press"],
          movementPattern: "horizontal_push",
        },
      ],
      split: "full-body-2-day",
      trainingBlock: {
        cycleNumber: 1,
        endDate: "2026-07-18",
        id: "training-block-1",
        planId: "training-plan-test",
        previousBlockId: null,
        startDate: "2026-06-07",
        status: "active",
        weekNumber: 6,
      },
      trainingFrequencyDaysPerWeek: 2,
    });
    await seedCompletedTrainingSessions(createCompletedTrainingBlockSessionOverrides());

    renderTrainingPlan({ initialEntries: ["/training-plans/training-plan-test"] });

    const blockSummary = getClosestSection(await screen.findByRole("heading", { name: "Cycle 1" }));

    await user.click(within(blockSummary).getByRole("button", { name: "Generate next cycle" }));

    const suggestedLoadInput = within(blockSummary).getByLabelText(
      "Suggested starting load for Incline Dumbbell Bench Press",
    );

    await user.clear(suggestedLoadInput);
    await user.type(suggestedLoadInput, "92.5");
    await user.click(within(blockSummary).getByRole("button", { name: "Accept next cycle" }));

    expect(await screen.findByRole("heading", { name: "Cycle 2" })).toBeVisible();
    expect(screen.getByText("Cycle 2 · Week 1 of 6")).toBeVisible();

    const acceptedPlan = await getTrainingPlan("training-plan-test");
    const clonedPlan = await getTrainingPlan("training-plan-test-next");
    const completedSessions = await getTrainingSessionsForPlan("training-plan-test");

    expect(acceptedPlan).toMatchObject({
      active: true,
      startingLoadSuggestions: expect.arrayContaining([
        expect.objectContaining({
          effectiveLoad: 92.5,
          exerciseId: "incline-dumbbell-bench-press",
          kind: "first_time",
          previousLoad: null,
          suggestedLoad: null,
          reason: "first-time exercise, start empty",
          userEditedLoad: 92.5,
        }),
      ]),
      trainingBlock: {
        cycleNumber: 2,
        id: "training-block-1-next",
        previousBlockId: "training-block-1",
        weekNumber: 1,
      },
    });
    expect(clonedPlan).toBeNull();
    expect(completedSessions).toHaveLength(12);
  });

  it("starts a workout session, records lifted weight, and stores completed movement volume", async () => {
    const user = userEvent.setup();
    await seedTrainingPlan();

    renderTrainingPlan({ initialEntries: ["/training-plans/training-plan-test"] });

    expect(await screen.findByRole("heading", { name: "Alternating Full Body A/B" })).toBeVisible();

    const startNextWorkoutButton = screen.getAllByRole("button", {
      name: "Start next workout",
    })[0];

    if (!startNextWorkoutButton) {
      throw new Error("Expected Start next workout button to be visible.");
    }

    await user.click(startNextWorkoutButton);

    expect(await screen.findByRole("heading", { name: "Full Body A session" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Superset 1" })).toBeVisible();

    const firstRound = screen.getByRole("rowgroup", { name: "Round 1 superset" });
    const benchPressRow = within(firstRound).getByRole("row", {
      name: /1 Flat Dumbbell Bench Press.*Horizontal push/i,
    });

    expect(benchPressRow).toBeVisible();
    expect(
      within(firstRound).getByRole("row", {
        name: /1 Pull-Ups.*Vertical pull/i,
      }),
    ).toBeVisible();

    await user.clear(within(benchPressRow).getByLabelText("Set 1 weight"));
    await user.type(within(benchPressRow).getByLabelText("Set 1 weight"), "40");
    await user.clear(within(benchPressRow).getByLabelText("Set 1 reps"));
    await user.type(within(benchPressRow).getByLabelText("Set 1 reps"), "10");
    await user.click(
      within(benchPressRow).getByLabelText(/Mark Flat Dumbbell Bench Press set 1 done/i),
    );
    const sessionBodyweightInput = screen.getByRole("spinbutton", {
      name: "Session Bodyweight",
    });

    await user.clear(sessionBodyweightInput);
    await user.type(sessionBodyweightInput, "80");

    expect(
      within(benchPressRow).getByLabelText(/Mark Flat Dumbbell Bench Press set 1 not done/i),
    ).toBeChecked();
    expect(screen.getByText(/1\/\d+ planned sets completed/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Complete session" }));

    expect(await screen.findByRole("heading", { name: "Session completed" })).toBeVisible();
    expect(screen.getAllByText(/Horizontal push/i).length).toBeGreaterThan(0);

    const completedSessions = await getTrainingSessionsForPlan("training-plan-test");

    expect(completedSessions).toHaveLength(1);
    expect(completedSessions[0]).toMatchObject({
      planId: "training-plan-test",
      status: "completed",
      templateId: "template-1",
      volumeByMovementPattern: expect.arrayContaining([
        expect.objectContaining({
          movementPattern: "horizontal_push",
        }),
      ]),
    });
    expect(
      completedSessions[0]?.volumeByMovementPattern.find(
        (row) => row.movementPattern === "horizontal_push",
      )?.volume,
    ).toBeGreaterThan(0);
  });

  it("opens the next superset after the current superset is completed and closed", async () => {
    const user = userEvent.setup();
    await seedTrainingPlan();

    renderTrainingPlan({
      initialEntries: ["/training-plans/training-plan-test/sessions/new/template-1"],
    });

    expect(await screen.findByRole("heading", { name: "Full Body A session" })).toBeVisible();

    const firstSuperset = screen.getByRole("region", { name: "Superset 1" });
    const secondSuperset = screen.getByRole("region", { name: "Superset 2" });

    expect(
      within(firstSuperset).getByRole("button", { name: "Collapse Upper superset 1" }),
    ).toBeVisible();
    expect(
      within(secondSuperset).getByRole("button", { name: "Expand Upper superset 2" }),
    ).toBeVisible();

    for (const checkbox of within(firstSuperset).getAllByRole("checkbox")) {
      await user.click(checkbox);
    }

    expect(
      within(firstSuperset).getByRole("button", { name: "Expand Upper superset 1" }),
    ).toBeVisible();
    expect(within(firstSuperset).getByText("Complete")).toBeVisible();
    expect(within(firstSuperset).getByText(/9 sets logged/)).toBeVisible();
    expect(
      within(secondSuperset).getByRole("button", { name: "Collapse Upper superset 2" }),
    ).toBeVisible();
  });

  it("starts a session from the selected workout template tab", async () => {
    const user = userEvent.setup();
    await seedTrainingPlan();

    renderTrainingPlan({ initialEntries: ["/training-plans/training-plan-test"] });

    expect(await screen.findByRole("heading", { name: "Alternating Full Body A/B" })).toBeVisible();

    await user.click(screen.getByRole("tab", { name: "Full Body B" }));
    await user.click(screen.getByRole("button", { name: "Start Full Body B session" }));

    expect(await screen.findByRole("heading", { name: "Full Body B session" })).toBeVisible();
    const firstRound = screen.getByRole("rowgroup", { name: "Round 1 superset" });

    expect(
      within(firstRound).getByRole("row", {
        name: /1 Flat Barbell Bench Press.*Horizontal push/i,
      }),
    ).toBeVisible();
    expect(
      within(firstRound).getByRole("row", {
        name: /1 Barbell Squats.*Quad dominant/i,
      }),
    ).toBeVisible();
  });

  it("allows signed assistance only for bodyweight exercise load inputs", async () => {
    await seedTrainingPlan();

    renderTrainingPlan({
      initialEntries: ["/training-plans/training-plan-test/sessions/new/template-1"],
    });

    expect(await screen.findByRole("heading", { name: "Full Body A session" })).toBeVisible();

    const firstRound = screen.getByRole("rowgroup", { name: "Round 1 superset" });
    const benchPressRow = within(firstRound).getByRole("row", {
      name: /1 Flat Dumbbell Bench Press.*Horizontal push/i,
    });
    const pullUpsRow = within(firstRound).getByRole("row", {
      name: /1 Pull-Ups.*Vertical pull/i,
    });

    expect(within(benchPressRow).getByLabelText("Set 1 weight")).toHaveAttribute("min", "0");
    expect(within(pullUpsRow).getByLabelText("Set 1 weight")).toHaveAttribute("min", "-200");
  });

  it("prefills a next-cycle workout session with the saved suggested starting load", async () => {
    await seedGeneratedTrainingPlanWithStartingLoadSuggestion();

    renderTrainingPlan({
      initialEntries: ["/training-plans/training-plan-test-next/sessions/new/template-1"],
    });

    expect(await screen.findByRole("heading", { name: "Full Body A session" })).toBeVisible();

    for (const setIndex of [1, 2, 3]) {
      const round = screen.getByRole("rowgroup", { name: `Round ${setIndex} superset` });
      const inclineBenchRow = within(round).getByRole("row", {
        name: new RegExp(`${setIndex} Incline Dumbbell Bench Press.*Horizontal push`, "i"),
      });

      expect(within(inclineBenchRow).getByLabelText(`Set ${setIndex} weight`)).toHaveValue(92.5);
    }
  });

  it("waits for Training Session history before initializing exact-history prefills", async () => {
    await seedTrainingPlan();
    await seedCompletedTrainingSessions([
      {
        completedAt: "2026-07-12T10:00:00.000Z",
        exerciseId: "flat-dumbbell-bench-press",
        exerciseName: "Flat Dumbbell Bench Press",
        movementPattern: "horizontal_push",
        weight: 40,
      },
    ]);
    const seededSessions = await getTrainingSessionsForPlan("training-plan-test");
    let resolveTrainingSessions: (sessions: ReadonlyArray<TrainingSession>) => void = () => {};
    const pendingTrainingSessions = new Promise<ReadonlyArray<TrainingSession>>((resolve) => {
      resolveTrainingSessions = resolve;
    });

    vi.spyOn(trainingPlanService, "getTrainingSessionsForPlan").mockImplementation(
      async () => pendingTrainingSessions,
    );

    renderTrainingPlan({
      initialEntries: ["/training-plans/training-plan-test/sessions/new/template-1"],
    });

    expect(await screen.findByText("Loading Training Session...")).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Full Body A session" })).not.toBeInTheDocument();

    await act(async () => {
      resolveTrainingSessions(seededSessions);
      await pendingTrainingSessions;
    });

    expect(await screen.findByRole("heading", { name: "Full Body A session" })).toBeVisible();

    const firstRound = screen.getByRole("rowgroup", { name: "Round 1 superset" });
    const benchPressRow = within(firstRound).getByRole("row", {
      name: /1 Flat Dumbbell Bench Press.*Horizontal push/i,
    });

    expect(within(benchPressRow).getByLabelText("Set 1 weight")).toHaveValue(40);
  });

  it("dismisses the exact-history prefill note after the user edits the exercise", async () => {
    const user = userEvent.setup();
    await seedTrainingPlanWithExactHistoryStartingLoadSuggestion();

    renderTrainingPlan({
      initialEntries: ["/training-plans/training-plan-test/sessions/new/template-1"],
    });

    expect(await screen.findByRole("heading", { name: "Full Body A session" })).toBeVisible();
    expect(
      screen.getByText(
        "Flat Dumbbell Bench Press was prefilled from your last exact exercise load.",
      ),
    ).toBeVisible();

    const firstRound = screen.getByRole("rowgroup", { name: "Round 1 superset" });
    const benchPressRow = within(firstRound).getByRole("row", {
      name: /1 Flat Dumbbell Bench Press.*Horizontal push/i,
    });

    await user.clear(within(benchPressRow).getByLabelText("Set 1 weight"));
    await user.type(within(benchPressRow).getByLabelText("Set 1 weight"), "42.5");

    expect(
      screen.queryByText(
        "Flat Dumbbell Bench Press was prefilled from your last exact exercise load.",
      ),
    ).not.toBeInTheDocument();
  });

  it("dismisses the exact-history prefill note after the user edits reps", async () => {
    const user = userEvent.setup();
    await seedTrainingPlanWithExactHistoryStartingLoadSuggestion();

    renderTrainingPlan({
      initialEntries: ["/training-plans/training-plan-test/sessions/new/template-1"],
    });

    expect(await screen.findByRole("heading", { name: "Full Body A session" })).toBeVisible();
    expect(
      screen.getByText(
        "Flat Dumbbell Bench Press was prefilled from your last exact exercise load.",
      ),
    ).toBeVisible();

    const firstRound = screen.getByRole("rowgroup", { name: "Round 1 superset" });
    const benchPressRow = within(firstRound).getByRole("row", {
      name: /1 Flat Dumbbell Bench Press.*Horizontal push/i,
    });

    await user.clear(within(benchPressRow).getByLabelText("Set 1 reps"));
    await user.type(within(benchPressRow).getByLabelText("Set 1 reps"), "7");

    expect(
      screen.queryByText(
        "Flat Dumbbell Bench Press was prefilled from your last exact exercise load.",
      ),
    ).not.toBeInTheDocument();
  });

  it("dismisses the exact-history prefill note after the user completes a set", async () => {
    const user = userEvent.setup();
    await seedTrainingPlanWithExactHistoryStartingLoadSuggestion();

    renderTrainingPlan({
      initialEntries: ["/training-plans/training-plan-test/sessions/new/template-1"],
    });

    expect(await screen.findByRole("heading", { name: "Full Body A session" })).toBeVisible();
    expect(
      screen.getByText(
        "Flat Dumbbell Bench Press was prefilled from your last exact exercise load.",
      ),
    ).toBeVisible();

    const firstRound = screen.getByRole("rowgroup", { name: "Round 1 superset" });
    const benchPressRow = within(firstRound).getByRole("row", {
      name: /1 Flat Dumbbell Bench Press.*Horizontal push/i,
    });

    await user.click(
      within(benchPressRow).getByLabelText("Mark Flat Dumbbell Bench Press set 1 done"),
    );

    expect(
      screen.queryByText(
        "Flat Dumbbell Bench Press was prefilled from your last exact exercise load.",
      ),
    ).not.toBeInTheDocument();
  });

  it("opens Training Session history from the active Training Plan", async () => {
    const user = userEvent.setup();
    await seedTrainingPlan();

    renderTrainingPlan({ initialEntries: ["/training-plans/training-plan-test"] });

    expect(await screen.findByRole("heading", { name: "Alternating Full Body A/B" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "View training history" }));

    expect(await screen.findByRole("heading", { name: "Training history" })).toBeVisible();
  });

  it("starts training from the top bar outside Training Session history", async () => {
    const user = userEvent.setup();
    await seedTrainingPlan();

    renderTrainingPlan({ initialEntries: ["/training-plans/training-plan-test"] });

    expect(await screen.findByRole("heading", { name: "Alternating Full Body A/B" })).toBeVisible();

    await user.click(screen.getByRole("link", { name: "Start training" }));

    expect(await screen.findByRole("heading", { name: "Start training" })).toBeVisible();
    await user.click(screen.getByRole("link", { name: "Start Full Body A session" }));

    expect(await screen.findByRole("heading", { name: "Full Body A session" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Start training", current: "page" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Training history" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("lets Start training choose a workout template before opening the session", async () => {
    const user = userEvent.setup();
    await seedTrainingPlan({
      split: "upper-lower-full-body",
      trainingFrequencyDaysPerWeek: 3,
    });

    renderTrainingPlan({ initialEntries: ["/training-plans/training-plan-test"] });

    expect(await screen.findByRole("heading", { name: "Upper / Lower / Full Body" })).toBeVisible();

    await user.click(screen.getByRole("link", { name: "Start training" }));

    expect(await screen.findByRole("heading", { name: "Start training" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Start Upper session" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Start Lower session" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Start Full Body A session" })).toBeVisible();

    await user.click(screen.getByRole("link", { name: "Start Lower session" }));

    expect(await screen.findByRole("heading", { name: "Lower session" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Start training", current: "page" })).toBeVisible();
  });

  it("lets the Training surface save Baseline Bodyweight and update the current Training Week default", async () => {
    const user = userEvent.setup();
    await seedTrainingPlan();

    renderTrainingPlan({ initialEntries: ["/training-plans/training-plan-test/sessions/new"] });

    expect(await screen.findByRole("heading", { name: "Start training" })).toBeVisible();

    const baselineBodyweightInput = screen.getByRole("spinbutton", {
      name: "Baseline Bodyweight",
    });
    const inheritedBodyweightDefaultInput = screen.getByRole("spinbutton", {
      name: "Inherited Bodyweight Default",
    });

    await user.type(baselineBodyweightInput, "81");
    await user.click(screen.getByRole("button", { name: "Save baseline bodyweight" }));

    await waitFor(() => {
      expect(
        screen.getByRole("spinbutton", {
          name: "Inherited Bodyweight Default",
        }),
      ).toHaveValue(81);
    });

    await user.clear(inheritedBodyweightDefaultInput);
    await user.type(inheritedBodyweightDefaultInput, "82");
    await user.click(screen.getByRole("button", { name: "Save Training Week bodyweight" }));

    await waitFor(() => {
      expect(
        screen.getByRole("spinbutton", {
          name: "Inherited Bodyweight Default",
        }),
      ).toHaveValue(82);
    });
  });

  it("uses inherited Training Week bodyweight as the Session default and keeps a Per-Session override", async () => {
    const user = userEvent.setup();
    await seedTrainingPlan();
    await trainingPlanService.saveBaselineBodyweight({
      bodyweight: 81,
      planId: "training-plan-test",
    });
    await trainingPlanService.saveTrainingWeekBodyweight({
      bodyweight: 82,
      planId: "training-plan-test",
    });

    renderTrainingPlan({ initialEntries: ["/training-plans/training-plan-test/sessions/new"] });

    expect(await screen.findByRole("heading", { name: "Start training" })).toBeVisible();

    await user.click(screen.getByRole("link", { name: "Start Full Body A session" }));

    expect(await screen.findByRole("heading", { name: "Full Body A session" })).toBeVisible();

    const sessionBodyweightInput = screen.getByRole("spinbutton", {
      name: "Session Bodyweight",
    });

    expect(sessionBodyweightInput).toHaveValue(82);

    await user.clear(sessionBodyweightInput);
    await user.type(sessionBodyweightInput, "80");

    expect(screen.getByText("Stored as a Per-Session Bodyweight Override.")).toBeVisible();

    const firstRound = screen.getByRole("rowgroup", { name: "Round 1 superset" });
    const benchPressRow = within(firstRound).getByRole("row", {
      name: /1 Flat Dumbbell Bench Press.*Horizontal push/i,
    });

    await user.clear(within(benchPressRow).getByLabelText("Set 1 weight"));
    await user.type(within(benchPressRow).getByLabelText("Set 1 weight"), "40");
    await user.clear(within(benchPressRow).getByLabelText("Set 1 reps"));
    await user.type(within(benchPressRow).getByLabelText("Set 1 reps"), "10");
    await user.click(
      within(benchPressRow).getByLabelText(/Mark Flat Dumbbell Bench Press set 1 done/i),
    );
    await user.click(screen.getByRole("button", { name: "Complete session" }));

    expect(await screen.findByRole("heading", { name: "Session completed" })).toBeVisible();

    const completedSessions = await getTrainingSessionsForPlan("training-plan-test");

    expect(completedSessions[0]).toMatchObject({
      sessionBodyweight: 80,
      sessionBodyweightSource: "session_override",
    });
  });

  it("requires Session Bodyweight before completing a bodyweight Training Session", async () => {
    const user = userEvent.setup();
    await seedTrainingPlan();

    renderTrainingPlan({
      initialEntries: ["/training-plans/training-plan-test/sessions/new/template-1"],
    });

    expect(await screen.findByRole("heading", { name: "Full Body A session" })).toBeVisible();

    const firstRound = screen.getByRole("rowgroup", { name: "Round 1 superset" });
    const benchPressRow = within(firstRound).getByRole("row", {
      name: /1 Flat Dumbbell Bench Press.*Horizontal push/i,
    });

    await user.clear(within(benchPressRow).getByLabelText("Set 1 weight"));
    await user.type(within(benchPressRow).getByLabelText("Set 1 weight"), "40");
    await user.clear(within(benchPressRow).getByLabelText("Set 1 reps"));
    await user.type(within(benchPressRow).getByLabelText("Set 1 reps"), "10");
    await user.click(
      within(benchPressRow).getByLabelText(/Mark Flat Dumbbell Bench Press set 1 done/i),
    );
    await user.click(screen.getByRole("button", { name: "Complete session" }));

    expect(
      screen.getByText("Session Bodyweight is required to complete bodyweight volume."),
    ).toBeVisible();
    expect(await getTrainingSessionsForPlan("training-plan-test")).toHaveLength(0);
  });

  it("opens Training Session history from the top bar with the start action available", async () => {
    const user = userEvent.setup();
    await seedTrainingPlan();

    renderTrainingPlan({ initialEntries: ["/training-plans/training-plan-test"] });

    expect(await screen.findByRole("heading", { name: "Alternating Full Body A/B" })).toBeVisible();

    await user.click(screen.getByRole("link", { name: "Training history" }));

    expect(await screen.findByRole("heading", { name: "Training history" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Training history", current: "page" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Training Plans" })).not.toHaveAttribute(
      "aria-current",
    );
    expect(screen.getByRole("link", { name: "Start training" })).toBeVisible();
  });

  it("shows a retry action when Training history fails to load", async () => {
    const user = userEvent.setup();
    await seedTrainingPlan();
    vi.spyOn(trainingPlanService, "getTrainingPlan").mockRejectedValueOnce(
      new Error("IndexedDB unavailable"),
    );

    renderTrainingPlan({ initialEntries: ["/training-plans/training-plan-test/sessions"] });

    expect(await screen.findByText("Training history could not load.")).toBeVisible();
    expect(screen.queryByText("Training Plan not found.")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Retry loading Training history" }));

    expect(await screen.findByRole("heading", { name: "Training history" })).toBeVisible();
  });

  it("shows the latest available Training Week header and summary strip", async () => {
    const user = userEvent.setup();
    await seedTrainingPlan();
    await seedCompletedTrainingSessions();

    renderTrainingPlan({ initialEntries: ["/training-plans/training-plan-test/sessions"] });

    expect(await screen.findByRole("heading", { name: "Training history" })).toBeVisible();
    expect(
      screen.getByText(
        "Review weekly training volume, compare progress, and inspect completed sessions.",
      ),
    ).toBeVisible();
    expect(screen.queryByRole("heading", { name: "This week" })).not.toBeInTheDocument();

    const selectedTrainingWeek = screen.getByRole("region", { name: "Selected Training Week" });
    const weekSelector = screen.getByRole("group", { name: "Training Week selector" });

    expect(within(weekSelector).getByRole("button", { name: "Previous week" })).toBeEnabled();
    expect(within(weekSelector).getByText("Jun 4-10, 2026")).toBeVisible();
    expect(within(weekSelector).getByRole("button", { name: "Next week" })).toBeDisabled();

    expect(screen.getByRole("heading", { name: "Weekly movement volume" })).toBeVisible();
    expect(within(selectedTrainingWeek).getByText("Completion")).toBeVisible();
    expect(within(selectedTrainingWeek).getByText("2 / 3 sessions")).toBeVisible();
    expect(within(selectedTrainingWeek).getByText("Total volume")).toBeVisible();
    expect(within(selectedTrainingWeek).getByText("2,160 kg")).toBeVisible();
    expect(within(selectedTrainingWeek).getByText("Progress")).toBeVisible();
    expect(within(selectedTrainingWeek).getByText("-10% vs previous week")).toBeVisible();
    expect(within(selectedTrainingWeek).getByText("Loaded sets")).toBeVisible();
    expect(within(selectedTrainingWeek).getByText("5 loaded sets")).toBeVisible();
    expect(
      screen.getByRole("row", { name: /Horizontal Push 760 kg \+260 kg, up 52%/i }),
    ).toBeVisible();
    expect(
      screen.getByRole("row", { name: /Quad Dominant 900 kg -100 kg, down 10%/i }),
    ).toBeVisible();
    expect(screen.getByRole("row", { name: /Horizontal Pull 300 kg 0 kg, same/i })).toBeVisible();
    expect(
      screen.getByRole("row", {
        name: /Vertical Push 200 kg No comparison, not done last week/i,
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("row", { name: /Vertical Pull 0 kg -600 kg, no volume this week/i }),
    ).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Progress vs previous week" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("1 movement pattern increased, and 1 new pattern appeared this week."),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("No loaded sets recorded for this session.")).not.toBeInTheDocument();

    const completedSessionsSection = screen.getByRole("region", { name: "Completed sessions" });

    expect(within(completedSessionsSection).getByText("Full Body A")).toBeVisible();
    expect(within(completedSessionsSection).getByText("Jun 10, 2026")).toBeVisible();
    expect(within(completedSessionsSection).getByText("700 kg")).toBeVisible();
    expect(within(completedSessionsSection).getByText("2 loaded sets")).toBeVisible();
    expect(
      within(completedSessionsSection).getByRole("button", { name: "View session Full Body A" }),
    ).toBeVisible();
    expect(within(completedSessionsSection).getByText("Full Body B")).toBeVisible();
    expect(within(completedSessionsSection).getByText("Jun 9, 2026")).toBeVisible();
    expect(within(completedSessionsSection).getByText("1,460 kg")).toBeVisible();
    expect(within(completedSessionsSection).getByText("3 loaded sets")).toBeVisible();
    expect(
      within(completedSessionsSection).getByRole("button", { name: "View session Full Body B" }),
    ).toBeVisible();
    expect(
      within(completedSessionsSection).queryByText("Flat Dumbbell Bench Press"),
    ).not.toBeInTheDocument();
    expect(within(completedSessionsSection).queryByText("Barbell Squats")).not.toBeInTheDocument();

    expect(
      screen.queryByRole("button", { name: "Start Full Body A session" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Start Full Body B session" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start training" })).toBeVisible();
    expect(screen.queryByText("3 days/week")).not.toBeInTheDocument();

    await user.click(within(weekSelector).getByRole("button", { name: "Previous week" }));

    expect(within(weekSelector).getByText("May 28-Jun 3, 2026")).toBeVisible();
    expect(within(weekSelector).getByRole("button", { name: "Next week" })).toBeEnabled();
    expect(within(selectedTrainingWeek).getByText("1 / 3 sessions")).toBeVisible();
    expect(within(selectedTrainingWeek).getByText("2,400 kg")).toBeVisible();
    expect(within(selectedTrainingWeek).getByText("+140% vs previous week")).toBeVisible();
    expect(within(selectedTrainingWeek).getByText("4 loaded sets")).toBeVisible();
    expect(screen.getByRole("button", { name: "View session Upper" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "View session Full Body A" }),
    ).not.toBeInTheDocument();

    const upperSessionToggle = screen.getByRole("button", { name: "View session Upper" });

    await user.click(upperSessionToggle);

    expect(await screen.findByText("Flat Barbell Bench Press")).toBeVisible();
    const upperSessionDetails = screen.getByRole("region", { name: "Upper session details" });

    expect(upperSessionToggle).toHaveAttribute("aria-controls", upperSessionDetails.id);

    expect(
      within(upperSessionDetails).getByRole("row", {
        name: /Flat Barbell Bench Press Horizontal Push 1 loaded set 500 kg/i,
      }),
    ).toBeVisible();
    expect(
      within(upperSessionDetails).getByRole("row", {
        name: /Pull-Ups Vertical Pull 1 loaded set 600 kg/i,
      }),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Hide session Upper" }));

    expect(screen.queryByText("Flat Barbell Bench Press")).not.toBeInTheDocument();
    expect(screen.queryByText("Pull-Ups")).not.toBeInTheDocument();
  });

  it("shows the exact no-loaded-sets message while keeping bodyweight-only exercises visible", async () => {
    const user = userEvent.setup();
    await seedTrainingPlan();
    await seedBodyweightOnlyTrainingSession();

    renderTrainingPlan({ initialEntries: ["/training-plans/training-plan-test/sessions"] });

    expect(await screen.findByRole("heading", { name: "Training history" })).toBeVisible();
    expect(screen.queryByText("No loaded sets recorded for this session.")).not.toBeInTheDocument();
    const completedSessionsSection = screen.getByRole("region", { name: "Completed sessions" });

    expect(within(completedSessionsSection).getByText("0 loaded sets")).toBeVisible();
    expect(within(completedSessionsSection).getByText("0 kg")).toBeVisible();
    expect(within(completedSessionsSection).getByText("Partial volume")).toBeVisible();
    expect(screen.getByText("Partial volume comparison in this Training Week.")).toBeVisible();

    const fullBodySessionToggle = screen.getByRole("button", { name: "View session Full Body A" });

    await user.click(fullBodySessionToggle);

    const sessionDetails = await screen.findByRole("region", {
      name: "Full Body A session details",
    });

    expect(fullBodySessionToggle).toHaveAttribute("aria-controls", sessionDetails.id);

    expect(
      screen.getByText(
        "Partial volume comparison: Session Bodyweight missing for one or more bodyweight exercises.",
      ),
    ).toBeVisible();
    expect(
      within(sessionDetails).getByRole("row", {
        name: /Pull-Ups Vertical Pull 0 loaded sets 0 kg/i,
      }),
    ).toBeVisible();
  });

  it("shows the weekly verdict, previous-week reference, completion context, and session progression", async () => {
    await seedTrainingPlan();
    await seedCompletedTrainingSessions([
      {
        completedAt: "2026-06-06T09:00:00.000Z",
        exerciseId: "flat-dumbbell-bench-press",
        exerciseName: "Flat Dumbbell Bench Press",
        movementPattern: "horizontal_push",
        templateId: "template-1",
        templateLabel: "Full Body A",
        weight: 110,
      },
      {
        completedAt: "2026-06-05T09:00:00.000Z",
        exerciseId: "barbell-squats",
        exerciseName: "Barbell Squats",
        movementPattern: "quad_dominant",
        templateId: "template-2",
        templateLabel: "Full Body B",
        weight: 100,
      },
      {
        completedAt: "2026-05-30T09:00:00.000Z",
        exerciseId: "flat-dumbbell-bench-press",
        exerciseName: "Flat Dumbbell Bench Press",
        movementPattern: "horizontal_push",
        templateId: "template-1",
        templateLabel: "Full Body A",
        weight: 100,
      },
      {
        completedAt: "2026-05-29T09:00:00.000Z",
        exerciseId: "barbell-squats",
        exerciseName: "Barbell Squats",
        movementPattern: "quad_dominant",
        templateId: "template-2",
        templateLabel: "Full Body B",
        weight: 120,
      },
    ]);

    renderTrainingPlan({ initialEntries: ["/training-plans/training-plan-test/sessions"] });

    expect(await screen.findByRole("heading", { name: "Training history" })).toBeVisible();

    const selectedTrainingWeek = screen.getByRole("region", { name: "Selected Training Week" });
    const completedSessionsSection = screen.getByRole("region", { name: "Completed sessions" });

    expect(
      within(selectedTrainingWeek).getByRole("heading", { name: "Training Week verdict" }),
    ).toBeVisible();
    expect(within(selectedTrainingWeek).getByText("Regressed")).toBeVisible();
    expect(
      within(selectedTrainingWeek).getByText(
        "Training Week Volume Reference: 1,760 kg from May 24-30, 2026.",
      ),
    ).toBeVisible();
    expect(within(selectedTrainingWeek).getByText("1 session below target.")).toBeVisible();
    expect(
      within(completedSessionsSection).getByText("Progressed by +80 kg vs May 30, 2026."),
    ).toBeVisible();
    expect(
      within(completedSessionsSection).getByText("Regressed by -160 kg vs May 29, 2026."),
    ).toBeVisible();
  });

  it("saves a Historical Bodyweight Correction and recalculates the selected session", async () => {
    const user = userEvent.setup();
    await seedTrainingPlan();
    await seedBodyweightOnlyTrainingSession();

    renderTrainingPlan({ initialEntries: ["/training-plans/training-plan-test/sessions"] });

    expect(await screen.findByRole("heading", { name: "Training history" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "View session Full Body A" }));

    const sessionDetails = await screen.findByRole("region", {
      name: "Full Body A session details",
    });
    const historicalBodyweightCorrectionInput = within(sessionDetails).getByRole("spinbutton", {
      name: "Historical Bodyweight Correction",
    });

    await user.type(historicalBodyweightCorrectionInput, "81");
    await user.click(
      within(sessionDetails).getByRole("button", {
        name: "Save historical bodyweight correction",
      }),
    );

    await waitFor(() => {
      expect(
        within(sessionDetails).getByRole("row", {
          name: /Pull-Ups Vertical Pull 1 loaded set 972 kg/i,
        }),
      ).toBeVisible();
    });
    expect(
      screen.queryByText(
        "Partial volume comparison: Session Bodyweight missing for one or more bodyweight exercises.",
      ),
    ).not.toBeInTheDocument();

    const correctedSession = (await getTrainingSessionsForPlan("training-plan-test")).find(
      (session) => session.id === "session-bodyweight-only",
    );

    expect(correctedSession).toMatchObject({
      sessionBodyweight: 81,
      sessionBodyweightSource: "historical_correction",
      volumeByMovementPattern: [
        {
          movementPattern: "vertical_pull",
          volume: 972,
        },
      ],
    });
  });

  it("uses compact cards for weekly comparison and expanded session details on small screens", async () => {
    const user = userEvent.setup();
    mockTrainingHistoryCompactLayout(true);
    await seedTrainingPlan();
    await seedCompletedTrainingSessions();

    renderTrainingPlan({ initialEntries: ["/training-plans/training-plan-test/sessions"] });

    expect(await screen.findByRole("heading", { name: "Training history" })).toBeVisible();

    const weeklyMovementSection = getClosestSection(
      screen.getByRole("heading", { name: "Weekly movement volume" }),
    );
    const weeklyMovementCards = within(weeklyMovementSection).getAllByRole("listitem");
    const firstWeeklyMovementCard = getFirstElement(weeklyMovementCards);

    expect(within(weeklyMovementSection).queryByRole("table")).not.toBeInTheDocument();
    expect(weeklyMovementCards.length).toBeGreaterThan(0);
    expect(within(firstWeeklyMovementCard).getByText("Current volume")).toBeVisible();
    expect(within(firstWeeklyMovementCard).getByText("Compared with last week")).toBeVisible();
    expect(within(firstWeeklyMovementCard).queryByText("Change")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "View session Full Body A" }));

    const sessionDetails = await screen.findByRole("region", {
      name: "Full Body A session details",
    });
    const sessionDetailCards = within(sessionDetails).getAllByRole("listitem");
    const firstSessionDetailCard = getFirstElement(sessionDetailCards);

    expect(within(sessionDetails).queryByRole("table")).not.toBeInTheDocument();
    expect(sessionDetailCards.length).toBeGreaterThan(0);
    expect(within(firstSessionDetailCard).getByText("Exercise")).toBeVisible();
    expect(within(firstSessionDetailCard).getByText("Movement pattern")).toBeVisible();
    expect(within(firstSessionDetailCard).getByText("Loaded sets")).toBeVisible();
    expect(within(firstSessionDetailCard).getByText("Completed load volume")).toBeVisible();
  });
});

async function seedTrainingPlan(
  overrides: Partial<
    Pick<PlanBlueprint, "split" | "trainingFrequencyDaysPerWeek" | "weeklyRepTargets">
  > &
    Partial<Pick<TrainingPlan, "mainCompoundRotationPools" | "trainingBlock">> = {},
) {
  const { mainCompoundRotationPools, trainingBlock, ...blueprintOverrides } = overrides;
  const trainingPlan = generateTrainingPlanFromBlueprint({
    blueprint: createCompleteBlueprint(blueprintOverrides),
    id: "training-plan-test",
    timestamp: "2026-06-07T10:00:00.000Z",
  });

  await seedTrainingPlanData({
    trainingPlans: [
      {
        ...trainingPlan,
        ...(mainCompoundRotationPools ? { mainCompoundRotationPools } : {}),
        ...(trainingBlock ? { trainingBlock } : {}),
      },
    ],
  });
}

async function seedGeneratedTrainingPlanWithStartingLoadSuggestion() {
  const trainingPlan = generateTrainingPlanFromBlueprint({
    blueprint: createCompleteBlueprint(),
    id: "training-plan-test-next",
    timestamp: "2026-07-19T09:00:00.000Z",
  });

  await seedTrainingPlanData({
    trainingPlans: [
      {
        ...trainingPlan,
        generatedAt: "2026-07-18",
        startingLoadSuggestions: [
          {
            effectiveLoad: 92.5,
            exerciseId: "incline-dumbbell-bench-press",
            exerciseName: "Incline Dumbbell Bench Press",
            kind: "exact_previous_exercise",
            movementPattern: "horizontal_push",
            previousLoad: 92.5,
            reason: "previous exact exercise load prefill",
            suggestedLoad: 92.5,
            userEditedLoad: 92.5,
          },
        ],
        trainingBlock: {
          cycleNumber: 2,
          endDate: "2026-08-29",
          id: "training-block-2",
          planId: "training-plan-test-next",
          previousBlockId: "training-block-1",
          startDate: "2026-07-19",
          status: "active",
          weekNumber: 1,
        },
        updatedAt: "2026-07-18",
        workoutTemplates: trainingPlan.workoutTemplates.map((template) => ({
          ...template,
          supersetGroups: template.supersetGroups.map((group) => ({
            ...group,
            slots: group.slots.map((slot) =>
              slot.exerciseId === "flat-dumbbell-bench-press"
                ? {
                    ...slot,
                    exerciseId: "incline-dumbbell-bench-press",
                    exerciseName: "Incline Dumbbell Bench Press",
                  }
                : slot,
            ),
          })),
        })),
      },
    ],
  });
}

async function seedTrainingPlanWithExactHistoryStartingLoadSuggestion() {
  const trainingPlan = generateTrainingPlanFromBlueprint({
    blueprint: createCompleteBlueprint(),
    id: "training-plan-test",
    timestamp: "2026-07-19T09:00:00.000Z",
  });

  await seedTrainingPlanData({
    trainingPlans: [
      {
        ...trainingPlan,
        startingLoadSuggestions: [
          {
            effectiveLoad: 40,
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
        trainingBlock: {
          cycleNumber: 2,
          endDate: "2026-08-29",
          id: "training-block-2",
          planId: "training-plan-test",
          previousBlockId: "training-block-1",
          startDate: "2026-07-19",
          status: "active",
          weekNumber: 1,
        },
      },
    ],
  });
}

async function seedCompletedTrainingSessions(
  overrides: ReadonlyArray<{
    completedAt: string;
    exerciseId: string;
    exerciseName: string;
    movementPattern: TrainingSession["exercises"][number]["movementPattern"];
    templateId?: string;
    templateLabel?: string;
    weight: number;
  }> = [],
) {
  if (overrides.length > 0) {
    await seedTrainingPlanData({
      trainingSessions: overrides.map((entry, index) => ({
        completedAt: entry.completedAt,
        createdAt: entry.completedAt,
        exercises: [
          {
            exerciseId: entry.exerciseId,
            exerciseName: entry.exerciseName,
            movementPattern: entry.movementPattern,
            sets: [{ reps: 8, setIndex: 1, weight: entry.weight }],
          },
        ],
        id: `session-override-${index}`,
        planId: "training-plan-test",
        status: "completed" as const,
        templateId: entry.templateId ?? "template-1",
        templateLabel: entry.templateLabel ?? "Upper A",
        updatedAt: entry.completedAt,
        volumeByMovementPattern: [],
      })),
    });
    return;
  }

  await seedTrainingPlanData({
    trainingSessions: [
      {
        completedAt: "2026-05-27T09:00:00.000Z",
        createdAt: "2026-05-27T09:00:00.000Z",
        exercises: [
          {
            exerciseId: "flat-dumbbell-bench-press",
            exerciseName: "Flat Dumbbell Bench Press",
            movementPattern: "horizontal_push",
            sets: [{ reps: 10, setIndex: 1, weight: 40 }],
          },
          {
            exerciseId: "barbell-squats",
            exerciseName: "Barbell Squats",
            movementPattern: "quad_dominant",
            sets: [{ reps: 10, setIndex: 1, weight: 60 }],
          },
        ],
        id: "session-d",
        planId: "training-plan-test",
        status: "completed",
        templateId: "template-2",
        templateLabel: "Lower",
        updatedAt: "2026-05-27T09:00:00.000Z",
        volumeByMovementPattern: [
          {
            movementPattern: "horizontal_push",
            volume: 400,
          },
          {
            movementPattern: "quad_dominant",
            volume: 600,
          },
        ],
      },
      {
        completedAt: "2026-06-03T09:00:00.000Z",
        createdAt: "2026-06-03T09:00:00.000Z",
        exercises: [
          {
            exerciseId: "flat-barbell-bench-press",
            exerciseName: "Flat Barbell Bench Press",
            movementPattern: "horizontal_push",
            sets: [{ reps: 10, setIndex: 1, weight: 50 }],
          },
          {
            exerciseId: "barbell-squats",
            exerciseName: "Barbell Squats",
            movementPattern: "quad_dominant",
            sets: [{ reps: 10, setIndex: 1, weight: 100 }],
          },
          {
            exerciseId: "bent-over-barbell-rows",
            exerciseName: "Bent Over Barbell Rows",
            movementPattern: "horizontal_pull",
            sets: [{ reps: 10, setIndex: 1, weight: 30 }],
          },
          {
            exerciseId: "pull-ups",
            exerciseName: "Pull-Ups",
            movementPattern: "vertical_pull",
            sets: [{ reps: 10, setIndex: 1, weight: 0 }],
          },
        ],
        id: "session-c",
        planId: "training-plan-test",
        sessionBodyweight: 60,
        sessionBodyweightSource: "baseline",
        status: "completed",
        templateId: "template-1",
        templateLabel: "Upper",
        updatedAt: "2026-06-03T09:00:00.000Z",
        volumeByMovementPattern: [
          {
            movementPattern: "horizontal_push",
            volume: 500,
          },
          {
            movementPattern: "quad_dominant",
            volume: 1000,
          },
          {
            movementPattern: "horizontal_pull",
            volume: 300,
          },
          {
            movementPattern: "vertical_pull",
            volume: 600,
          },
        ],
      },
      {
        completedAt: "2026-06-10T09:00:00.000Z",
        createdAt: "2026-06-10T09:00:00.000Z",
        exercises: [
          {
            exerciseId: "flat-dumbbell-bench-press",
            exerciseName: "Flat Dumbbell Bench Press",
            movementPattern: "horizontal_push",
            sets: [{ reps: 10, setIndex: 1, weight: 40 }],
          },
          {
            exerciseId: "bent-over-barbell-rows",
            exerciseName: "Bent Over Barbell Rows",
            movementPattern: "horizontal_pull",
            sets: [{ reps: 10, setIndex: 1, weight: 30 }],
          },
        ],
        id: "session-a",
        planId: "training-plan-test",
        status: "completed",
        templateId: "template-1",
        templateLabel: "Full Body A",
        updatedAt: "2026-06-10T09:00:00.000Z",
        volumeByMovementPattern: [
          {
            movementPattern: "horizontal_push",
            volume: 400,
          },
          {
            movementPattern: "horizontal_pull",
            volume: 300,
          },
        ],
      },
      {
        completedAt: "2026-06-09T09:00:00.000Z",
        createdAt: "2026-06-09T09:00:00.000Z",
        exercises: [
          {
            exerciseId: "flat-barbell-bench-press",
            exerciseName: "Flat Barbell Bench Press",
            movementPattern: "horizontal_push",
            sets: [{ reps: 9, setIndex: 1, weight: 40 }],
          },
          {
            exerciseId: "barbell-squats",
            exerciseName: "Barbell Squats",
            movementPattern: "quad_dominant",
            sets: [{ reps: 10, setIndex: 1, weight: 90 }],
          },
          {
            exerciseId: "standing-overhead-barbell-press",
            exerciseName: "Standing Overhead Barbell Press",
            movementPattern: "vertical_push",
            sets: [{ reps: 10, setIndex: 1, weight: 20 }],
          },
        ],
        id: "session-b",
        planId: "training-plan-test",
        status: "completed",
        templateId: "template-2",
        templateLabel: "Full Body B",
        updatedAt: "2026-06-09T09:00:00.000Z",
        volumeByMovementPattern: [
          {
            movementPattern: "horizontal_push",
            volume: 360,
          },
          {
            movementPattern: "quad_dominant",
            volume: 900,
          },
          {
            movementPattern: "vertical_push",
            volume: 200,
          },
        ],
      },
    ],
  });
}

async function seedBodyweightOnlyTrainingSession() {
  await seedTrainingPlanData({
    trainingSessions: [
      {
        completedAt: "2026-06-10T09:00:00.000Z",
        createdAt: "2026-06-10T09:00:00.000Z",
        exercises: [
          {
            exerciseId: "pull-ups",
            exerciseName: "Pull-Ups",
            movementPattern: "vertical_pull",
            sets: [{ reps: 12, setIndex: 1, weight: 0 }],
          },
        ],
        id: "session-bodyweight-only",
        planId: "training-plan-test",
        status: "completed",
        templateId: "template-1",
        templateLabel: "Full Body A",
        updatedAt: "2026-06-10T09:00:00.000Z",
        volumeByMovementPattern: [],
      },
    ],
  });
}

function createCompletedTrainingBlockSessionOverrides() {
  return [
    {
      completedAt: "2026-06-07T10:00:00.000Z",
      exerciseId: "flat-barbell-bench-press",
      exerciseName: "Flat Barbell Bench Press",
      movementPattern: "horizontal_push" as const,
      weight: 80,
    },
    {
      completedAt: "2026-06-09T10:00:00.000Z",
      exerciseId: "flat-barbell-bench-press",
      exerciseName: "Flat Barbell Bench Press",
      movementPattern: "horizontal_push" as const,
      weight: 82.5,
    },
    {
      completedAt: "2026-06-14T10:00:00.000Z",
      exerciseId: "flat-barbell-bench-press",
      exerciseName: "Flat Barbell Bench Press",
      movementPattern: "horizontal_push" as const,
      weight: 85,
    },
    {
      completedAt: "2026-06-16T10:00:00.000Z",
      exerciseId: "flat-barbell-bench-press",
      exerciseName: "Flat Barbell Bench Press",
      movementPattern: "horizontal_push" as const,
      weight: 87.5,
    },
    {
      completedAt: "2026-06-21T10:00:00.000Z",
      exerciseId: "flat-barbell-bench-press",
      exerciseName: "Flat Barbell Bench Press",
      movementPattern: "horizontal_push" as const,
      weight: 90,
    },
    {
      completedAt: "2026-06-23T10:00:00.000Z",
      exerciseId: "flat-barbell-bench-press",
      exerciseName: "Flat Barbell Bench Press",
      movementPattern: "horizontal_push" as const,
      weight: 92.5,
    },
    {
      completedAt: "2026-06-28T10:00:00.000Z",
      exerciseId: "flat-barbell-bench-press",
      exerciseName: "Flat Barbell Bench Press",
      movementPattern: "horizontal_push" as const,
      weight: 95,
    },
    {
      completedAt: "2026-06-30T10:00:00.000Z",
      exerciseId: "flat-barbell-bench-press",
      exerciseName: "Flat Barbell Bench Press",
      movementPattern: "horizontal_push" as const,
      weight: 95,
    },
    {
      completedAt: "2026-07-05T10:00:00.000Z",
      exerciseId: "flat-barbell-bench-press",
      exerciseName: "Flat Barbell Bench Press",
      movementPattern: "horizontal_push" as const,
      weight: 97.5,
    },
    {
      completedAt: "2026-07-07T10:00:00.000Z",
      exerciseId: "flat-barbell-bench-press",
      exerciseName: "Flat Barbell Bench Press",
      movementPattern: "horizontal_push" as const,
      weight: 97.5,
    },
    {
      completedAt: "2026-07-12T10:00:00.000Z",
      exerciseId: "flat-barbell-bench-press",
      exerciseName: "Flat Barbell Bench Press",
      movementPattern: "horizontal_push" as const,
      weight: 100,
    },
    {
      completedAt: "2026-07-14T10:00:00.000Z",
      exerciseId: "flat-barbell-bench-press",
      exerciseName: "Flat Barbell Bench Press",
      movementPattern: "horizontal_push" as const,
      weight: 100,
    },
  ] satisfies Parameters<typeof seedCompletedTrainingSessions>[0];
}

function createIncompleteTrainingBlockSessionOverrides() {
  return createCompletedTrainingBlockSessionOverrides().slice(0, 10);
}

function renderTrainingPlan({ initialEntries }: { initialEntries: Array<string> }) {
  const router = createAppRouter({
    history: createMemoryHistory({
      initialEntries,
    }),
  });
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

function mockTrainingHistoryCompactLayout(isCompactLayout: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      addEventListener: () => {},
      addListener: () => {},
      dispatchEvent: () => false,
      matches: query === trainingHistoryCompactLayoutQuery ? isCompactLayout : false,
      media: query,
      onchange: null,
      removeEventListener: () => {},
      removeListener: () => {},
    }),
    writable: true,
  });
}

function restoreDefaultMatchMedia() {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: defaultMatchMedia,
    writable: true,
  });
}

function getClosestSection(element: HTMLElement): HTMLElement {
  const section = element.closest("section");

  if (!section) {
    throw new Error("Expected element to have a section ancestor.");
  }

  return section;
}

function getFirstElement<T>(elements: Array<T>): T {
  const firstElement = elements[0];

  if (!firstElement) {
    throw new Error("Expected at least one element.");
  }

  return firstElement;
}

function createCompleteBlueprint({
  split = "alternating-full-body-a-b",
  trainingFrequencyDaysPerWeek = 3,
  weeklyRepTargets = createPresetWeeklyRepTargets("balanced"),
}: Partial<
  Pick<PlanBlueprint, "split" | "trainingFrequencyDaysPerWeek" | "weeklyRepTargets">
> = {}): PlanBlueprint {
  return {
    confirmedBuilderSteps: {
      exercises: true,
      frequency: true,
      repRanges: true,
      split: true,
      volume: true,
    },
    createdAt: "2026-06-07T09:00:00.000Z",
    exerciseSelectionPreferences: {
      avoidedExercises: [],
      equipmentPreset: "full_gym",
      preferredExercises: [],
      strategy: "balanced",
    },
    equipmentPresetSource: "user_selected",
    id: "plan-blueprint-test",
    isolationExercisePreferences: [],
    mainCompoundPreferences: [],
    mainCompoundRotationPreferences: [],
    mainCompoundRotationPools: [],
    mainCompoundSelections: completeMainCompoundSelections,
    repRanges: "balanced_hypertrophy",
    split,
    trainingFrequencyDaysPerWeek,
    trainingGoal: "build-muscle",
    updatedAt: "2026-06-07T09:00:00.000Z",
    volumePreset: "balanced",
    volumePresetSource: "user_selected",
    weeklyRepTargets,
  };
}
