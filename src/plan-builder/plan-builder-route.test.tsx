import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { resetLocalDatabase } from "../app/local-database";
import { createAppRouter } from "../app/router";
import { getActiveTrainingPlans } from "../training-plan/training-plan-repository";
import { planBuilderPaths } from "./plan-builder-paths";
import { savePlanBlueprint } from "./plan-builder-repository";
import { planBuilderService } from "./plan-builder-service";
import { completeMainCompoundSelections } from "./plan-builder-test-fixtures";

const legacyPlanBuilderStepPaths = [
  "/plan-builder/overview",
  "/plan-builder/frequency",
  "/plan-builder/rep-ranges",
  "/plan-builder/volume",
  "/plan-builder/exercises",
  "/plan-builder/generate",
] as const;

describe("Plan Builder canonical route", () => {
  beforeEach(async () => {
    await resetLocalDatabase();
  });

  it("routes / into the canonical plan builder workspace and shows a single Plan Builder nav entry", async () => {
    const { router } = renderPlanBuilder({ initialEntries: ["/"] });

    expect(await screen.findByRole("heading", { name: /^plan builder$/i })).toBeVisible();

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(planBuilderPaths.entry);
    });

    expect(screen.getByText("Open any builder section from one focused workspace.")).toBeVisible();
    expect(await screen.findByRole("navigation", { name: /primary/i })).toBeVisible();
    expect(screen.getByRole("link", { name: /^plan builder$/i })).toBeVisible();
    expect(screen.queryByRole("link", { name: /builder overview/i })).not.toBeInTheDocument();
  });

  it("removes legacy Plan Builder step URLs from the app route table", () => {
    const router = createAppRouter();

    expect(router.routesByPath).toHaveProperty(planBuilderPaths.entry);

    for (const legacyPath of legacyPlanBuilderStepPaths) {
      expect(router.routesByPath).not.toHaveProperty(legacyPath);
    }
  });

  it("opens each Plan Builder section from the unified workspace without prior confirmation", async () => {
    const user = userEvent.setup();

    renderPlanBuilder({ initialEntries: [planBuilderPaths.entry] });

    const exercisesCard = await getOnePageSectionButton("Exercises");

    await user.click(await getOnePageSectionButton("Training schedule"));
    expect(
      await screen.findByRole("heading", {
        name: /how many days can you train per week\?/i,
      }),
    ).toBeVisible();

    await user.click(await getOnePageSectionButton("Rep ranges"));
    expect(
      await screen.findByRole("radio", {
        name: /balanced hypertrophy/i,
      }),
    ).toBeChecked();

    await user.click(await getOnePageSectionButton("Volume"));
    expect(await screen.findByRole("group", { name: /volume preset/i })).toBeVisible();

    await user.click(exercisesCard);
    expect(await screen.findByText("Horizontal push")).toBeVisible();
    expect(screen.getByText("Hip/hamstring dominant")).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Exercises needs setup" })).toBeNull();

    await user.click(await getOnePageSectionButton("Generate"));
    expect(await screen.findByRole("heading", { name: /generate training plan/i })).toBeVisible();
  });

  it("opens Exercises immediately from a brand-new Plan Builder", async () => {
    const user = userEvent.setup();

    renderPlanBuilder({ initialEntries: [planBuilderPaths.entry] });

    await user.click(await getOnePageSectionButton("Exercises"));

    expect(await screen.findByText("Horizontal push")).toBeVisible();
    expect(screen.getByText("Horizontal pull")).toBeVisible();
    expect(screen.getByText("Vertical push")).toBeVisible();
    expect(screen.getByText("Vertical pull")).toBeVisible();
    expect(screen.getByText("Quad dominant")).toBeVisible();
    expect(screen.getByText("Hip/hamstring dominant")).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Exercises needs setup" })).toBeNull();
  });

  it("captures ranked Main Compound Preferences from Exercises and keeps them when returning", async () => {
    const user = userEvent.setup();

    renderPlanBuilder({ initialEntries: [planBuilderPaths.entry] });

    await user.click(await getOnePageSectionButton("Exercises"));

    const horizontalPushRow = await getMainCompoundPreferenceRow("Horizontal push");

    await user.click(within(horizontalPushRow).getByRole("button", { name: /rank preferences/i }));

    const picker = await screen.findByRole("dialog", {
      name: /rank your horizontal push preferences/i,
    });

    await user.click(within(picker).getByText("Flat Barbell Bench Press"));
    await user.click(within(picker).getByText("Incline Dumbbell Bench Press"));
    await user.click(
      within(picker).getByRole("button", { name: /move incline dumbbell bench press up/i }),
    );
    await user.click(
      within(picker).getByRole("button", { name: /close main compound preferences picker/i }),
    );

    expect(within(horizontalPushRow).getByText("Incline Dumbbell Bench Press")).toBeVisible();
    expect(within(horizontalPushRow).getByText("1. Incline Dumbbell Bench Press")).toBeVisible();
    expect(within(horizontalPushRow).getByText("2. Flat Barbell Bench Press")).toBeVisible();

    await user.click(await getOnePageSectionButton("Training schedule"));
    expect(
      await screen.findByRole("heading", {
        name: /how many days can you train per week\?/i,
      }),
    ).toBeVisible();

    await user.click(await getOnePageSectionButton("Exercises"));

    const reopenedHorizontalPushRow = await getMainCompoundPreferenceRow("Horizontal push");

    expect(
      within(reopenedHorizontalPushRow).getByText("Incline Dumbbell Bench Press"),
    ).toBeVisible();
    expect(
      within(reopenedHorizontalPushRow).getByText("1. Incline Dumbbell Bench Press"),
    ).toBeVisible();
    expect(
      within(reopenedHorizontalPushRow).getByText("2. Flat Barbell Bench Press"),
    ).toBeVisible();
  });

  it("preserves ranked Main Compound Preferences after changing schedule, split, rep ranges, and volume", async () => {
    const user = userEvent.setup();

    renderPlanBuilder({ initialEntries: [planBuilderPaths.entry] });

    await user.click(await getOnePageSectionButton("Exercises"));

    const horizontalPushRow = await getMainCompoundPreferenceRow("Horizontal push");

    await user.click(within(horizontalPushRow).getByRole("button", { name: /rank preferences/i }));

    const picker = await screen.findByRole("dialog", {
      name: /rank your horizontal push preferences/i,
    });

    await user.click(within(picker).getByText("Flat Barbell Bench Press"));
    await user.click(within(picker).getByText("Incline Dumbbell Bench Press"));
    await user.click(
      within(picker).getByRole("button", { name: /move incline dumbbell bench press up/i }),
    );
    await user.click(
      within(picker).getByRole("button", { name: /close main compound preferences picker/i }),
    );

    await user.click(await getOnePageSectionButton("Training schedule"));
    await user.click(screen.getByRole("radio", { name: /4 days per week/i }));
    await waitFor(() => {
      expect(screen.getByRole("radio", { name: /4 days per week/i })).toBeChecked();
    });

    await user.click(screen.getByRole("radio", { name: /rotating push\/pull\/legs/i }));
    await waitFor(() => {
      expect(screen.getByRole("radio", { name: /rotating push\/pull\/legs/i })).toBeChecked();
    });

    await user.click(await getOnePageSectionButton("Rep ranges"));
    await user.click(screen.getByRole("radio", { name: /controlled higher reps/i }));
    await waitFor(() => {
      expect(screen.getByRole("radio", { name: /controlled higher reps/i })).toBeChecked();
    });

    await user.click(await getOnePageSectionButton("Volume"));
    await user.click(screen.getByRole("radio", { name: /higher volume/i }));
    await waitFor(() => {
      expect(screen.getByRole("radio", { name: /higher volume/i })).toBeChecked();
    });

    await user.click(await getOnePageSectionButton("Exercises"));

    const reopenedHorizontalPushRow = await getMainCompoundPreferenceRow("Horizontal push");

    expect(
      within(reopenedHorizontalPushRow).getByText("1. Incline Dumbbell Bench Press"),
    ).toBeVisible();
    expect(
      within(reopenedHorizontalPushRow).getByText("2. Flat Barbell Bench Press"),
    ).toBeVisible();
  });

  it("persists ranked Main Compound Preferences after upstream edits and reopening Plan Builder", async () => {
    const user = userEvent.setup();
    const firstRender = renderPlanBuilder({ initialEntries: [planBuilderPaths.entry] });

    await user.click(await getOnePageSectionButton("Exercises"));

    const horizontalPushRow = await getMainCompoundPreferenceRow("Horizontal push");

    await user.click(within(horizontalPushRow).getByRole("button", { name: /rank preferences/i }));

    const picker = await screen.findByRole("dialog", {
      name: /rank your horizontal push preferences/i,
    });

    await user.click(within(picker).getByText("Flat Barbell Bench Press"));
    await user.click(within(picker).getByText("Incline Dumbbell Bench Press"));
    await user.click(
      within(picker).getByRole("button", { name: /move incline dumbbell bench press up/i }),
    );
    await user.click(
      within(picker).getByRole("button", { name: /close main compound preferences picker/i }),
    );

    await user.click(await getOnePageSectionButton("Training schedule"));
    await user.click(screen.getByRole("radio", { name: /4 days per week/i }));
    await waitFor(() => {
      expect(screen.getByRole("radio", { name: /4 days per week/i })).toBeChecked();
    });

    await user.click(screen.getByRole("radio", { name: /rotating push\/pull\/legs/i }));
    await waitFor(() => {
      expect(screen.getByRole("radio", { name: /rotating push\/pull\/legs/i })).toBeChecked();
    });

    await user.click(await getOnePageSectionButton("Rep ranges"));
    await user.click(screen.getByRole("radio", { name: /controlled higher reps/i }));
    await waitFor(() => {
      expect(screen.getByRole("radio", { name: /controlled higher reps/i })).toBeChecked();
    });

    await user.click(await getOnePageSectionButton("Volume"));
    await user.click(screen.getByRole("radio", { name: /higher volume/i }));
    await waitFor(() => {
      expect(screen.getByRole("radio", { name: /higher volume/i })).toBeChecked();
    });

    firstRender.unmount();

    renderPlanBuilder({ initialEntries: [planBuilderPaths.entry] });

    await user.click(await getOnePageSectionButton("Exercises"));

    const reopenedHorizontalPushRow = await getMainCompoundPreferenceRow("Horizontal push");

    expect(
      within(reopenedHorizontalPushRow).getByText("1. Incline Dumbbell Bench Press"),
    ).toBeVisible();
    expect(
      within(reopenedHorizontalPushRow).getByText("2. Flat Barbell Bench Press"),
    ).toBeVisible();
    expect(await planBuilderService.getOrCreatePlanBlueprint()).toMatchObject({
      mainCompoundPreferences: [
        {
          exerciseIds: ["incline-dumbbell-bench-press", "flat-barbell-bench-press"],
          movementPattern: "horizontal_push",
        },
      ],
      repRanges: "controlled_higher_reps",
      split: "rotating-push-pull-legs",
      trainingFrequencyDaysPerWeek: 4,
      volumePreset: "higher_volume",
    });
  });

  it("keeps Plan Builder navigation inside /plan-builder when moving backward from Generate", async () => {
    const user = userEvent.setup();
    const { router } = renderPlanBuilder({ initialEntries: [planBuilderPaths.entry] });

    await user.click(await getOnePageSectionButton("Generate"));
    expect(await screen.findByRole("heading", { name: /generate training plan/i })).toBeVisible();

    await user.click(screen.getByRole("button", { name: /back to exercises/i }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(planBuilderPaths.entry);
    });
    expect(await screen.findByText("Horizontal push")).toBeVisible();
  });

  it("prompts before generating when Recommended Defaults are needed and cancels without persisting them", async () => {
    const user = userEvent.setup();
    const blueprint = await planBuilderService.getOrCreatePlanBlueprint();

    await savePlanBlueprint({
      ...blueprint,
      mainCompoundSelections: completeMainCompoundSelections,
    });

    const { router } = renderPlanBuilder({ initialEntries: [planBuilderPaths.entry] });

    await user.click(await getOnePageSectionButton("Generate"));
    await user.click(screen.getByRole("button", { name: /^generate training plan$/i }));

    const confirmation = await screen.findByRole("dialog", {
      name: /default generation confirmation/i,
    });

    expect(
      within(confirmation).getByText(
        "Just Workout will apply these Recommended Defaults before generation continues.",
      ),
    ).toBeVisible();

    await user.click(within(confirmation).getByRole("button", { name: /^cancel$/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /default generation confirmation/i })).toBeNull();
    });
    expect(router.state.location.pathname).toBe(planBuilderPaths.entry);
    expect(await getActiveTrainingPlans()).toHaveLength(0);
    expect(await planBuilderService.getOrCreatePlanBlueprint()).toMatchObject({
      equipmentPresetSource: null,
      repRanges: null,
      split: null,
      volumePreset: null,
    });
  });

  it("accepts fully defaulted Recommended Defaults before generating and persists them into the Plan Blueprint", async () => {
    const user = userEvent.setup();
    const { router } = renderPlanBuilder({ initialEntries: [planBuilderPaths.entry] });

    await user.click(await getOnePageSectionButton("Generate"));
    await user.click(screen.getByRole("button", { name: /^generate training plan$/i }));

    const confirmation = await screen.findByRole("dialog", {
      name: /default generation confirmation/i,
    });

    expect(within(confirmation).getByText("3-Day Full Body")).toBeVisible();
    expect(within(confirmation).getByText("Balanced hypertrophy")).toBeVisible();
    expect(within(confirmation).getByText("Balanced volume preset")).toBeVisible();
    expect(within(confirmation).getByText("Full gym equipment preset")).toBeVisible();

    await user.click(
      within(confirmation).getByRole("button", { name: /^generate with recommended defaults$/i }),
    );

    await waitFor(() => {
      expect(router.state.location.pathname).toMatch(/^\/training-plans\/[^/]+$/);
    });
    expect(await screen.findByRole("heading", { name: "3-Day Full Body" })).toBeVisible();
    expect(await getActiveTrainingPlans()).toHaveLength(1);
    expect(await planBuilderService.getOrCreatePlanBlueprint()).toMatchObject({
      equipmentPresetSource: "user_selected",
      mainCompoundSelections: completeMainCompoundSelections,
      repRanges: "balanced_hypertrophy",
      split: "full-body-3-day",
      volumePreset: "balanced",
    });
  });
});

function renderPlanBuilder({
  initialEntries = [planBuilderPaths.entry],
}: {
  initialEntries?: Array<string>;
} = {}) {
  const router = createAppRouter({
    history: createMemoryHistory({
      initialEntries,
    }),
  });
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false,
      },
      queries: {
        retry: false,
      },
    },
  });

  return {
    router,
    ...render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    ),
  };
}

async function getOnePageSectionButton(title: string) {
  const label = await screen.findByText(title);
  const button = label.closest("button");

  if (!button) {
    throw new Error(`Expected a one-page section button for "${title}".`);
  }

  return button;
}

async function getMainCompoundPreferenceRow(title: string) {
  const label = await screen.findByText(title);
  const row = label.closest("li");

  if (!row) {
    throw new Error(`Expected a Main Compound Preference row for "${title}".`);
  }

  return row;
}
