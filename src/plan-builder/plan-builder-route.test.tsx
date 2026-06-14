import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../app/local-database";
import { createAppRouter } from "../app/router";
import { planBuilderPaths } from "./plan-builder-paths";
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
    await db.delete();
    await db.open();
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
    expect(await screen.findByRole("heading", { name: "Exercises needs setup" })).toBeVisible();
    expect(
      screen.getByText("Choose a compatible split and weekly volume before selecting exercises."),
    ).toBeVisible();

    await user.click(await getOnePageSectionButton("Generate"));
    expect(await screen.findByRole("heading", { name: /generate training plan/i })).toBeVisible();
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
    expect(await screen.findByRole("heading", { name: "Exercises needs setup" })).toBeVisible();
  });

  it("prompts before generating when Recommended Defaults are needed and cancels without persisting them", async () => {
    const user = userEvent.setup();
    const blueprint = await planBuilderService.getOrCreatePlanBlueprint();

    await db.planBlueprints.put({
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
    expect(await db.trainingPlans.filter((plan) => plan.active).count()).toBe(0);
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
    expect(await db.trainingPlans.filter((plan) => plan.active).count()).toBe(1);
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
