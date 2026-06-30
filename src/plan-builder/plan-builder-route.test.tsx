import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, it } from "vitest";
import { resetLocalDatabase } from "../app/local-database";
import { createAppRouter } from "../app/router";
import { getActiveTrainingPlans } from "../training-plan/training-plan-repository";
import { createPresetWeeklyRepTargets } from "../training-taxonomy";
import { planBuilderPaths } from "./plan-builder-paths";
import { savePlanBlueprint } from "./plan-builder-repository";
import { planBuilderService } from "./plan-builder-service";
import { completeMainCompoundSelections } from "./plan-builder-test-fixtures";

type PlanBuilderTestUser = ReturnType<typeof userEvent.setup>;

const legacyPlanBuilderStepPaths = [
  "/plan-builder/overview",
  "/plan-builder/frequency",
  "/plan-builder/rep-ranges",
  "/plan-builder/volume",
  "/plan-builder/exercises",
  "/plan-builder/generate",
] as const;

const upstreamPlanBuilderOptions = {
  repRanges: "controlled_higher_reps",
  split: "rotating-push-pull-legs",
  trainingFrequencyDaysPerWeek: 4,
  volumePreset: "higher_volume",
} as const;

describe("Plan Builder canonical route", () => {
  beforeEach(async () => {
    await resetLocalDatabase();
  });

  it("routes / into the canonical plan builder workspace and shows a single Plan Builder nav entry", async () => {
    const { router } = renderPlanBuilder({ initialEntries: ["/"] });

    expect(await screen.findByRole("heading", { name: /^plan builder$/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(planBuilderPaths.entry);
    });

    expect(screen.getByText("Plan Blueprint sections")).toBeVisible();
    expect(await screen.findByRole("navigation", { name: /primary/i })).toBeVisible();
    expect(
      await screen.findByRole("navigation", { name: /plan blueprint sections/i }),
    ).toBeVisible();
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
    await expectExercisesBucketsVisible();
    expect(screen.queryByRole("heading", { name: "Exercises needs setup" })).toBeNull();

    await user.click(await getOnePageSectionButton("Generate"));
    expect(await screen.findByRole("heading", { name: /generate training plan/i })).toBeVisible();
  });

  it("opens Exercises immediately from a brand-new Plan Builder", async () => {
    const user = userEvent.setup();

    renderPlanBuilder({ initialEntries: [planBuilderPaths.entry] });

    await user.click(await getOnePageSectionButton("Exercises"));

    await expectExercisesBucketsVisible();
    expect(screen.queryByRole("heading", { name: "Exercises needs setup" })).toBeNull();
  });

  it("captures ranked Main Compound Preferences from Exercises and keeps them when returning", async () => {
    const user = userEvent.setup();

    renderPlanBuilder({ initialEntries: [planBuilderPaths.entry] });

    const horizontalPushRow = await rankHorizontalPushPreferences(user);

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

  it("captures ranked Isolation Exercise Preferences from Exercises and keeps them when returning", async () => {
    const user = userEvent.setup();

    renderPlanBuilder({ initialEntries: [planBuilderPaths.entry] });

    const bicepsRow = await rankBicepsIsolationPreferences(user);

    expect(within(bicepsRow).getByText("Incline Dumbbell Curls")).toBeVisible();
    expect(within(bicepsRow).getByText("1. Incline Dumbbell Curls")).toBeVisible();
    expect(within(bicepsRow).getByText("2. Standing Barbell Curls")).toBeVisible();

    await user.click(await getOnePageSectionButton("Training schedule"));
    expect(
      await screen.findByRole("heading", {
        name: /how many days can you train per week\?/i,
      }),
    ).toBeVisible();

    await user.click(await getOnePageSectionButton("Exercises"));

    const reopenedBicepsRow = await getIsolationPreferenceRow("Biceps");

    expect(within(reopenedBicepsRow).getByText("Incline Dumbbell Curls")).toBeVisible();
    expect(within(reopenedBicepsRow).getByText("1. Incline Dumbbell Curls")).toBeVisible();
    expect(within(reopenedBicepsRow).getByText("2. Standing Barbell Curls")).toBeVisible();
  });

  it("persists ranked Isolation Exercise Preferences after upstream edits and reopening Plan Builder", async () => {
    const user = userEvent.setup();
    const firstRender = renderPlanBuilder({ initialEntries: [planBuilderPaths.entry] });

    await rankBicepsIsolationPreferences(user);
    await chooseUpstreamPlanBuilderOptions(user);

    firstRender.unmount();

    renderPlanBuilder({ initialEntries: [planBuilderPaths.entry] });

    await user.click(await getOnePageSectionButton("Exercises"));

    const reopenedBicepsRow = await getIsolationPreferenceRow("Biceps");

    expect(within(reopenedBicepsRow).getByText("1. Incline Dumbbell Curls")).toBeVisible();
    expect(within(reopenedBicepsRow).getByText("2. Standing Barbell Curls")).toBeVisible();
    expect(await planBuilderService.getOrCreatePlanBlueprint()).toMatchObject({
      isolationExercisePreferences: [
        {
          exerciseIds: ["incline-dumbbell-curls", "standing-barbell-curls"],
          primaryMuscleGroup: "biceps",
        },
      ],
      ...upstreamPlanBuilderOptions,
    });
  });

  it("preserves ranked Main Compound Preferences after changing schedule, split, rep ranges, and volume", async () => {
    const user = userEvent.setup();

    renderPlanBuilder({ initialEntries: [planBuilderPaths.entry] });

    await rankHorizontalPushPreferences(user);
    await chooseUpstreamPlanBuilderOptions(user);

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

    await rankHorizontalPushPreferences(user);
    await chooseUpstreamPlanBuilderOptions(user);

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
      ...upstreamPlanBuilderOptions,
    });
  });

  it("persists ranked Main Compound Rotation Preferences after upstream edits and reopening Plan Builder", async () => {
    const user = userEvent.setup();
    const firstRender = renderPlanBuilder({ initialEntries: [planBuilderPaths.entry] });

    await rankHorizontalPushRotationPreferences(user);
    await chooseUpstreamPlanBuilderOptions(user);

    firstRender.unmount();

    renderPlanBuilder({ initialEntries: [planBuilderPaths.entry] });

    await user.click(await getOnePageSectionButton("Exercises"));

    const reopenedHorizontalPushRow = await getMainCompoundRotationPreferenceRow("Horizontal push");

    expect(
      within(reopenedHorizontalPushRow).getByText("1. Incline Barbell Bench Press"),
    ).toBeVisible();
    expect(
      within(reopenedHorizontalPushRow).getByText("2. Flat Dumbbell Bench Press"),
    ).toBeVisible();
    expect(await planBuilderService.getOrCreatePlanBlueprint()).toMatchObject({
      mainCompoundRotationPreferences: [
        {
          exerciseIds: ["incline-barbell-bench-press", "flat-dumbbell-bench-press"],
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

    await user.click(await getOnePageSectionButton("Exercises"));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(planBuilderPaths.entry);
    });
    await expectExercisesBucketsVisible();
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

  it("shows a blocking generation message when avoided exercises remove every valid option for a required Movement Pattern", async () => {
    const user = userEvent.setup();
    const blueprint = await planBuilderService.getOrCreatePlanBlueprint();

    await savePlanBlueprint({
      ...blueprint,
      equipmentPresetSource: "user_selected",
      exerciseSelectionPreferences: {
        avoidedExercises: [
          { id: "avoided-1", rawText: "Flat Barbell Bench Press" },
          { id: "avoided-2", rawText: "Flat Dumbbell Bench Press" },
          { id: "avoided-3", rawText: "Incline Barbell Bench Press" },
          { id: "avoided-4", rawText: "Incline Dumbbell Bench Press" },
          { id: "avoided-5", rawText: "Decline Barbell Bench Press" },
          { id: "avoided-6", rawText: "Decline Dumbbell Bench Press" },
          { id: "avoided-7", rawText: "Flat Chest Press Machine" },
          { id: "avoided-8", rawText: "Incline Chest Press Machine" },
          { id: "avoided-9", rawText: "Decline Chest Press Machine" },
          { id: "avoided-10", rawText: "Dips (Parallel Bars, Slight Forward Lean)" },
          { id: "avoided-11", rawText: "Push-Ups" },
          { id: "avoided-12", rawText: "Dips (Elbows Close, No Forward Lean)" },
          { id: "avoided-13", rawText: "Flat Close Grip Bench Press" },
          { id: "avoided-14", rawText: "Decline Close Grip Bench Press" },
          { id: "avoided-15", rawText: "Close Grip Push-Ups" },
          { id: "avoided-16", rawText: "Bench Dips" },
        ],
        equipmentPreset: "full_gym",
        preferredExercises: [],
        strategy: "balanced",
      },
      mainCompoundSelections: completeMainCompoundSelections,
      repRanges: "balanced_hypertrophy",
      split: "full-body-3-day",
      volumePreset: "balanced",
      volumePresetSource: "user_selected",
      weeklyRepTargets: createPresetWeeklyRepTargets("balanced"),
    });

    renderPlanBuilder({ initialEntries: [planBuilderPaths.entry] });

    await user.click(await getOnePageSectionButton("Generate"));

    expect(await screen.findByText("Generation is blocked.")).toBeVisible();
    expect(
      screen.getByText(
        "Horizontal Push has no valid non-avoided exercise. Remove an avoidance or choose another valid exercise for that Movement Pattern.",
      ),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: /^generate training plan$/i })).toBeDisabled();
    expect(await getActiveTrainingPlans()).toHaveLength(0);
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
  const navigation = await screen.findByRole("navigation", {
    name: /plan blueprint sections/i,
  });
  const sectionTitle = await within(navigation).findByText(title, {
    selector: ".plan-builder-one-page__section-title-full",
  });
  const button = sectionTitle.closest("button");

  if (!button) {
    throw new Error(`Expected a one-page section button for "${title}".`);
  }

  return button;
}

async function expectExercisesBucketsVisible() {
  expect((await screen.findAllByText("Horizontal push")).length).toBeGreaterThan(0);
  expect(screen.getAllByText("Horizontal pull").length).toBeGreaterThan(0);
  expect(screen.getAllByText("Vertical push").length).toBeGreaterThan(0);
  expect(screen.getAllByText("Vertical pull").length).toBeGreaterThan(0);
  expect(screen.getAllByText("Quad dominant").length).toBeGreaterThan(0);
  expect(screen.getAllByText("Hip/hamstring dominant").length).toBeGreaterThan(0);
}

async function getMainCompoundPreferenceRow(title: string) {
  const rows = await screen.findAllByText(title);
  const label = rows[0];

  if (!label) {
    throw new Error(`Expected a Main Compound Preference row for "${title}".`);
  }

  const row = label.closest("li");

  if (!row) {
    throw new Error(`Expected a Main Compound Preference row for "${title}".`);
  }

  return row;
}

async function getMainCompoundRotationPreferenceRow(title: string) {
  const label = await screen.findByRole("heading", {
    name: "Main compound rotation preference buckets",
  });
  const section = label.closest("section");

  if (!section) {
    throw new Error("Expected a Main Compound Rotation Preference section.");
  }

  const rowLabel = await within(section).findByText(title);
  const row = rowLabel.closest("li");

  if (!row) {
    throw new Error(`Expected a Main Compound Rotation Preference row for "${title}".`);
  }

  return row;
}

async function getIsolationPreferenceRow(title: string) {
  const label = await screen.findByText(title);
  const row = label.closest("li");

  if (!row) {
    throw new Error(`Expected an Isolation Exercise Preference row for "${title}".`);
  }

  return row;
}

async function rankHorizontalPushPreferences(user: PlanBuilderTestUser) {
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

  return horizontalPushRow;
}

async function rankHorizontalPushRotationPreferences(user: PlanBuilderTestUser) {
  await user.click(await getOnePageSectionButton("Exercises"));

  const horizontalPushRow = await getMainCompoundRotationPreferenceRow("Horizontal push");

  await user.click(
    within(horizontalPushRow).getByRole("button", { name: /rank rotation preferences/i }),
  );

  const picker = await screen.findByRole("dialog", {
    name: /rank your horizontal push rotation preferences/i,
  });

  await user.click(within(picker).getByText("Flat Dumbbell Bench Press"));
  await user.click(within(picker).getByText("Incline Barbell Bench Press"));
  await user.click(
    within(picker).getByRole("button", { name: /move incline barbell bench press up/i }),
  );
  await user.click(
    within(picker).getByRole("button", {
      name: /close main compound rotation preferences picker/i,
    }),
  );

  return horizontalPushRow;
}

async function rankBicepsIsolationPreferences(user: PlanBuilderTestUser) {
  await user.click(await getOnePageSectionButton("Exercises"));

  const bicepsRow = await getIsolationPreferenceRow("Biceps");

  await user.click(within(bicepsRow).getByRole("button", { name: /rank preferences/i }));

  const picker = await screen.findByRole("dialog", {
    name: /rank your biceps preferences/i,
  });

  await user.click(within(picker).getByText("Standing Barbell Curls"));
  await user.click(within(picker).getByText("Incline Dumbbell Curls"));
  await user.click(within(picker).getByRole("button", { name: /move incline dumbbell curls up/i }));
  await user.click(
    within(picker).getByRole("button", { name: /close isolation exercise preferences picker/i }),
  );

  return bicepsRow;
}

async function chooseUpstreamPlanBuilderOptions(user: PlanBuilderTestUser) {
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
}
