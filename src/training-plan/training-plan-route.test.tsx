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
    expect(screen.getByRole("button", { name: "View plan settings" })).toBeVisible();

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
