import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../app/local-database";
import { createAppRouter } from "../app/router";
import type { PlanBlueprint } from "../plan-builder/plan-blueprint";
import { completeMainCompoundSelections } from "../plan-builder/plan-builder-test-fixtures";
import { createPresetWeeklyRepTargets } from "../plan-builder/training-volume";
import { generateTrainingPlanFromBlueprint } from "./training-plan";

describe("TrainingPlanRoute", () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
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
    expect(within(workoutPanel).getAllByText("3 × 8–12").length).toBeGreaterThan(0);
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

    expect(
      within(benchPressRow).getByLabelText(/Mark Flat Dumbbell Bench Press set 1 not done/i),
    ).toBeChecked();
    expect(screen.getByText(/1\/\d+ planned sets completed/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Complete session" }));

    expect(await screen.findByRole("heading", { name: "Session completed" })).toBeVisible();
    expect(screen.getAllByText(/Horizontal push/i).length).toBeGreaterThan(0);

    const completedSessions = await db.trainingSessions.toArray();

    expect(completedSessions).toHaveLength(1);
    expect(completedSessions[0]).toMatchObject({
      planId: "training-plan-test",
      status: "completed",
      templateId: "template-1",
      volumeByMovementPattern: [
        {
          movementPattern: "horizontal_push",
          movementPatternLabel: "Horizontal Push",
        },
      ],
    });
    expect(completedSessions[0]?.volumeByMovementPattern[0]?.volume).toBeGreaterThan(0);
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

    expect(await screen.findByRole("heading", { name: "Full Body A session" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Start training", current: "page" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Training history" })).not.toHaveAttribute(
      "aria-current",
    );
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
      screen.getByRole("row", { name: /Horizontal Push 760 kg \+260 kg Up 52%/i }),
    ).toBeVisible();
    expect(
      screen.getByRole("row", { name: /Quad Dominant 900 kg -100 kg Down 10%/i }),
    ).toBeVisible();
    expect(screen.getByRole("row", { name: /Horizontal Pull 300 kg 0 kg Same/i })).toBeVisible();
    expect(
      screen.getByRole("row", { name: /Vertical Push 200 kg \+200 kg New this week/i }),
    ).toBeVisible();
    expect(
      screen.getByRole("row", { name: /Vertical Pull 0 kg -600 kg No volume this week/i }),
    ).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Upper report" })).not.toBeInTheDocument();
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

    await user.click(screen.getByRole("button", { name: "View session Upper" }));

    expect(await screen.findByText("Flat Barbell Bench Press")).toBeVisible();
    const upperSessionDetails = screen.getByRole("region", { name: "Upper session details" });

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

    await user.click(screen.getByRole("button", { name: "View session Full Body A" }));

    const sessionDetails = await screen.findByRole("region", {
      name: "Full Body A session details",
    });

    expect(screen.getByText("No loaded sets recorded for this session.")).toBeVisible();
    expect(
      within(sessionDetails).getByRole("row", {
        name: /Pull-Ups Vertical Pull 0 loaded sets 0 kg/i,
      }),
    ).toBeVisible();
  });
});

async function seedTrainingPlan(
  blueprintOverrides: Partial<Pick<PlanBlueprint, "split" | "trainingFrequencyDaysPerWeek">> = {},
) {
  const trainingPlan = generateTrainingPlanFromBlueprint({
    blueprint: createCompleteBlueprint(blueprintOverrides),
    id: "training-plan-test",
    timestamp: "2026-06-07T10:00:00.000Z",
  });

  await db.trainingPlans.put(trainingPlan);
}

async function seedCompletedTrainingSessions() {
  await db.trainingSessions.bulkPut([
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
          movementPatternLabel: "Horizontal Push",
          volume: 400,
        },
        {
          movementPattern: "quad_dominant",
          movementPatternLabel: "Quad Dominant",
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
          sets: [{ reps: 10, setIndex: 1, weight: 60 }],
        },
      ],
      id: "session-c",
      planId: "training-plan-test",
      status: "completed",
      templateId: "template-1",
      templateLabel: "Upper",
      updatedAt: "2026-06-03T09:00:00.000Z",
      volumeByMovementPattern: [
        {
          movementPattern: "horizontal_push",
          movementPatternLabel: "Horizontal Push",
          volume: 500,
        },
        {
          movementPattern: "quad_dominant",
          movementPatternLabel: "Quad Dominant",
          volume: 1000,
        },
        {
          movementPattern: "horizontal_pull",
          movementPatternLabel: "Horizontal Pull",
          volume: 300,
        },
        {
          movementPattern: "vertical_pull",
          movementPatternLabel: "Vertical Pull",
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
          movementPatternLabel: "Horizontal Push",
          volume: 400,
        },
        {
          movementPattern: "horizontal_pull",
          movementPatternLabel: "Horizontal Pull",
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
          movementPatternLabel: "Horizontal Push",
          volume: 360,
        },
        {
          movementPattern: "quad_dominant",
          movementPatternLabel: "Quad Dominant",
          volume: 900,
        },
        {
          movementPattern: "vertical_push",
          movementPatternLabel: "Vertical Push",
          volume: 200,
        },
      ],
    },
  ]);
}

async function seedBodyweightOnlyTrainingSession() {
  await db.trainingSessions.put({
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
  });
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

function createCompleteBlueprint({
  split = "alternating-full-body-a-b",
  trainingFrequencyDaysPerWeek = 3,
}: Partial<Pick<PlanBlueprint, "split" | "trainingFrequencyDaysPerWeek">> = {}): PlanBlueprint {
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
    id: "plan-blueprint-test",
    mainCompoundRotationPools: [],
    mainCompoundSelections: completeMainCompoundSelections,
    repRanges: "balanced_hypertrophy",
    split,
    trainingFrequencyDaysPerWeek,
    trainingGoal: "build-muscle",
    updatedAt: "2026-06-07T09:00:00.000Z",
    volumePreset: "balanced",
    volumePresetSource: "user_selected",
    weeklyRepTargets: createPresetWeeklyRepTargets("balanced"),
  };
}
