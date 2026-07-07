import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, it, vi } from "vitest";
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

const unconfirmedExerciseDefaultsOverviewCopy =
  "Exercise Selection Preferences and Weekly Movement Coverage can use Recommended Defaults";

const confirmedExerciseDefaultsOverviewCopy =
  "Exercise Selection Preferences and Weekly Movement Coverage can still use Recommended Defaults";

const generateStepPreferenceMappingCopy =
  "The Generate Step turns your Exercises Step preferences into final Main Compound Selections, Main Compound Rotation Pools, and generated accessory choices.";

const defaultGenerationPreferenceMappingCopy =
  "The Generate Step will turn your Exercises Step preferences into final Main Compound Selections, Main Compound Rotation Pools, and generated accessory choices.";

describe("Plan Builder canonical route", () => {
  beforeEach(async () => {
    await resetLocalDatabase();
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

  it("resets viewport scroll when entering a Plan Builder section", async () => {
    const user = userEvent.setup();
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});

    renderPlanBuilder({ initialEntries: [planBuilderPaths.entry] });

    scrollTo.mockClear();

    await user.click(await getOnePageSectionButton("Training schedule"));

    expect(scrollTo).toHaveBeenCalledWith({ behavior: "auto", left: 0, top: 0 });
  });

  it("opens Exercises immediately from a brand-new Plan Builder", async () => {
    const user = userEvent.setup();

    renderPlanBuilder({ initialEntries: [planBuilderPaths.entry] });

    await user.click(await getOnePageSectionButton("Exercises"));

    await expectExercisesBucketsVisible();
    expect(screen.queryByRole("heading", { name: "Exercises needs setup" })).toBeNull();
    expect(screen.queryByRole("button", { name: /continue to generate/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /back to volume/i })).toBeNull();
  });

  it("summarizes Exercises Step preference progress in the overview card", async () => {
    const user = userEvent.setup();

    renderPlanBuilder({ initialEntries: [planBuilderPaths.entry] });

    const exercisesCard = await getOnePageSectionButton("Exercises");

    expect(
      await within(exercisesCard).findByText("Exercises Step preference progress"),
    ).toBeVisible();
    expect(
      await within(exercisesCard).findByText("0 Main Compound Preferences buckets ranked"),
    ).toBeVisible();
    expect(
      await within(exercisesCard).findByText("0 Main Compound Rotation Preferences buckets ranked"),
    ).toBeVisible();
    expect(
      await within(exercisesCard).findByText("0 Isolation Exercise Preferences buckets ranked"),
    ).toBeVisible();
    expect(
      await within(exercisesCard).findByText(unconfirmedExerciseDefaultsOverviewCopy),
    ).toBeVisible();

    await rankHorizontalPushPreferences(user);
    await rankHorizontalPushRotationPreferences(user);
    await rankBicepsIsolationPreferences(user);

    expect(
      within(exercisesCard).getByText("1 Main Compound Preferences bucket ranked"),
    ).toBeVisible();
    expect(
      within(exercisesCard).getByText("1 Main Compound Rotation Preferences bucket ranked"),
    ).toBeVisible();
    expect(
      within(exercisesCard).getByText("1 Isolation Exercise Preferences bucket ranked"),
    ).toBeVisible();
  });

  it("shows confirmed Exercises default language in the overview and Generate Step review copy", async () => {
    const user = userEvent.setup();
    const blueprint = await planBuilderService.getOrCreatePlanBlueprint();

    await savePlanBlueprint({
      ...blueprint,
      confirmedBuilderSteps: {
        ...blueprint.confirmedBuilderSteps,
        exercises: true,
      },
    });

    renderPlanBuilder({ initialEntries: [planBuilderPaths.entry] });

    const exercisesCard = await getOnePageSectionButton("Exercises");

    expect(
      await within(exercisesCard).findByText(confirmedExerciseDefaultsOverviewCopy),
    ).toBeVisible();

    await user.click(await getOnePageSectionButton("Generate"));

    expect(
      await screen.findByText(generateStepPreferenceMappingCopy, { exact: false }),
    ).toBeVisible();
  });

  it("captures ranked Main Compound Preferences from Exercises and keeps them when returning", async () => {
    const user = userEvent.setup();

    renderPlanBuilder({ initialEntries: [planBuilderPaths.entry] });

    const horizontalPushRow = await rankHorizontalPushPreferences(user);

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
      within(reopenedHorizontalPushRow).getByText("1. Incline Dumbbell Bench Press"),
    ).toBeVisible();
    expect(
      within(reopenedHorizontalPushRow).getByText("2. Flat Barbell Bench Press"),
    ).toBeVisible();
  });

  it("stages compound dropdown choices until the add button is clicked", async () => {
    const user = userEvent.setup();

    renderPlanBuilder({ initialEntries: [planBuilderPaths.entry] });

    await openExercisesSection(user);

    const horizontalPushRow = await getMainCompoundPreferenceRow("Horizontal push");

    await selectExerciseDropdownOption(
      user,
      horizontalPushRow,
      /choose horizontal push exercise/i,
      "incline-dumbbell-bench-press",
    );

    expect(await planBuilderService.getOrCreatePlanBlueprint()).toMatchObject({
      mainCompoundPreferences: [],
      mainCompoundRotationPreferences: [],
    });

    await user.click(
      within(horizontalPushRow).getByRole("button", {
        name: /add another horizontal push exercise/i,
      }),
    );

    await waitFor(async () => {
      expect(await planBuilderService.getOrCreatePlanBlueprint()).toMatchObject({
        mainCompoundPreferences: [
          {
            exerciseIds: ["incline-dumbbell-bench-press"],
            movementPattern: "horizontal_push",
          },
        ],
        mainCompoundRotationPreferences: [],
      });
    });

    await expectAddedExerciseRemovedAndNextSelected(
      user,
      horizontalPushRow,
      /choose horizontal push exercise/i,
      "incline-dumbbell-bench-press",
      "Decline Barbell Bench Press",
    );

    const horizontalPushRotationRow = await getVisibleMainCompoundRotationRow("Horizontal push");

    await selectExerciseDropdownOption(
      user,
      horizontalPushRotationRow,
      /choose horizontal push rotation exercise/i,
      "incline-barbell-bench-press",
    );

    expect(await planBuilderService.getOrCreatePlanBlueprint()).toMatchObject({
      mainCompoundRotationPreferences: [],
    });

    await user.click(
      within(horizontalPushRotationRow).getByRole("button", {
        name: /add another horizontal push rotation exercise/i,
      }),
    );

    await waitFor(async () => {
      expect(await planBuilderService.getOrCreatePlanBlueprint()).toMatchObject({
        mainCompoundRotationPreferences: [
          {
            exerciseIds: ["incline-barbell-bench-press"],
            movementPattern: "horizontal_push",
          },
        ],
      });
    });

    await expectAddedExerciseRemovedAndNextSelected(
      user,
      horizontalPushRotationRow,
      /choose horizontal push rotation exercise/i,
      "incline-barbell-bench-press",
      "Incline Dumbbell Bench Press",
    );
  });

  it("opens a clean Horizontal Push ranking drawer for existing preferences only", async () => {
    const user = userEvent.setup();
    const blueprint = await planBuilderService.getOrCreatePlanBlueprint();

    await savePlanBlueprint({
      ...blueprint,
      mainCompoundPreferences: [
        {
          exerciseIds: [
            "decline-chest-press-machine",
            "incline-dumbbell-bench-press",
            "flat-barbell-bench-press",
            "flat-dumbbell-bench-press",
            "incline-barbell-bench-press",
          ],
          movementPattern: "horizontal_push",
        },
      ],
    });

    renderPlanBuilder({ initialEntries: [planBuilderPaths.entry] });

    await openExercisesSection(user);
    const horizontalPushRow = await getMainCompoundPreferenceRow("Horizontal push");

    await user.click(within(horizontalPushRow).getByRole("button", { name: /rank preferences/i }));

    const drawer = await screen.findByRole("dialog", {
      name: /rank horizontal push preferences/i,
    });

    expect(within(drawer).getByText("Drag exercises to change priority.")).toBeVisible();
    expect(within(drawer).getByText("5 ranked")).toBeVisible();
    expect(within(drawer).getByText("#1")).toBeVisible();
    expect(within(drawer).getByText("Decline Chest Press Machine")).toBeVisible();
    expect(within(drawer).getByText("#5")).toBeVisible();
    expect(within(drawer).getByText("Incline Barbell Bench Press")).toBeVisible();
    expect(within(drawer).queryByRole("searchbox")).toBeNull();
    expect(within(drawer).queryByText(/available exercises/i)).toBeNull();
    expect(within(drawer).queryByText("Dips (Parallel Bars, Slight Forward Lean)")).toBeNull();
    expect(within(drawer).queryByRole("button", { name: /move .* up/i })).toBeNull();
    expect(within(drawer).queryByRole("button", { name: /move .* down/i })).toBeNull();
  });

  it("cancels Horizontal Push ranking changes without saving", async () => {
    const user = userEvent.setup();
    const blueprint = await planBuilderService.getOrCreatePlanBlueprint();

    await savePlanBlueprint({
      ...blueprint,
      mainCompoundPreferences: [
        {
          exerciseIds: ["flat-barbell-bench-press", "incline-dumbbell-bench-press"],
          movementPattern: "horizontal_push",
        },
      ],
    });

    renderPlanBuilder({ initialEntries: [planBuilderPaths.entry] });

    await openExercisesSection(user);
    const horizontalPushRow = await getMainCompoundPreferenceRow("Horizontal push");

    await user.click(within(horizontalPushRow).getByRole("button", { name: /rank preferences/i }));

    const drawer = await screen.findByRole("dialog", {
      name: /rank horizontal push preferences/i,
    });

    await user.click(
      within(drawer).getByRole("button", {
        name: /drag incline dumbbell bench press to reorder/i,
      }),
    );
    await user.keyboard("{Alt>}{ArrowUp}{/Alt}");
    expect(within(drawer).getByText("#1").nextSibling?.textContent).toBe(
      "Incline Dumbbell Bench Press",
    );

    await user.click(within(drawer).getByRole("button", { name: /^cancel$/i }));

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: /rank horizontal push preferences/i }),
      ).toBeNull();
    });
    expect(await planBuilderService.getOrCreatePlanBlueprint()).toMatchObject({
      mainCompoundPreferences: [
        {
          exerciseIds: ["flat-barbell-bench-press", "incline-dumbbell-bench-press"],
          movementPattern: "horizontal_push",
        },
      ],
    });
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

  it("accepts fully defaulted Recommended Defaults before generating a Training Plan Draft and persists them into the Plan Blueprint", async () => {
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
    expect(within(confirmation).getByText(defaultGenerationPreferenceMappingCopy)).toBeVisible();
    expect(
      within(confirmation).getByText(
        "Recommended Default Main Compound Selection for Horizontal push: Flat Barbell Bench Press",
      ),
    ).toBeVisible();

    await user.click(
      within(confirmation).getByRole("button", { name: /^generate with recommended defaults$/i }),
    );

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(planBuilderPaths.entry);
    });
    expect(await screen.findByRole("heading", { name: "Training Plan Draft" })).toBeVisible();
    expect(screen.getByRole("button", { name: /^accept draft$/i })).toBeVisible();
    expect(await getActiveTrainingPlans()).toHaveLength(0);
    expect(await planBuilderService.getOrCreatePlanBlueprint()).toMatchObject({
      equipmentPresetSource: "user_selected",
      mainCompoundSelections: completeMainCompoundSelections,
      repRanges: "balanced_hypertrophy",
      split: "full-body-3-day",
      trainingPlanDraft: {
        content: {
          split: "3-Day Full Body",
        },
      },
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
        "Weekly Movement Coverage is blocked for Horizontal push because Exercise Selection Preferences avoid every valid exercise in that Movement Pattern. Remove an avoidance or choose another valid exercise before generating.",
      ),
    ).toBeVisible();
    expect(
      screen.getByText(
        "Exercise Selection Preferences are hard exclusions. Just Workout will not generate an avoided exercise.",
      ),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: /^generate training plan$/i })).toBeDisabled();
    expect(await getActiveTrainingPlans()).toHaveLength(0);
  });

  it("accepts a read-only Training Plan Draft into the Active Training Plan route and clears the saved draft", async () => {
    const user = userEvent.setup();
    const { router } = renderPlanBuilder({ initialEntries: [planBuilderPaths.entry] });

    await user.click(await getOnePageSectionButton("Generate"));
    await user.click(screen.getByRole("button", { name: /^generate training plan$/i }));
    await user.click(
      await screen.findByRole("button", { name: /^generate with recommended defaults$/i }),
    );

    const acceptDraftButton = await screen.findByRole("button", { name: /^accept draft$/i });

    await user.click(acceptDraftButton);

    await waitFor(() => {
      expect(router.state.location.pathname).toMatch(/^\/training-plans\/[^/]+$/);
    });
    expect(await screen.findByRole("heading", { name: "3-Day Full Body" })).toBeVisible();
    expect(await getActiveTrainingPlans()).toHaveLength(1);
    expect(await planBuilderService.getOrCreatePlanBlueprint()).toMatchObject({
      trainingPlanDraft: null,
    });
  });

  it("resets draft-local starting loads and Baseline Bodyweight from current builder choices", async () => {
    const user = userEvent.setup();
    renderPlanBuilder({ initialEntries: [planBuilderPaths.entry] });
    const { baselineBodyweightInput, suggestedLoadInput } =
      await openGeneratedTrainingPlanDraft(user);

    await user.clear(suggestedLoadInput);
    await user.type(suggestedLoadInput, "42.5");
    await user.clear(baselineBodyweightInput);
    await user.type(baselineBodyweightInput, "82");
    await user.tab();

    await waitFor(() => {
      expect(suggestedLoadInput).toHaveValue(42.5);
      expect(baselineBodyweightInput).toHaveValue(82);
      expect(screen.getAllByText("Edited start: 42.5 kg").length).toBeGreaterThan(0);
    });

    await user.click(screen.getByRole("button", { name: /^reset draft$/i }));

    await waitFor(() => {
      expect(suggestedLoadInput).toHaveValue(null);
      expect(baselineBodyweightInput).toHaveValue(null);
    });
  });

  it("keeps draft-local slot edits accept-ready and resets them from current builder choices", async () => {
    const user = userEvent.setup();
    renderPlanBuilder({ initialEntries: [planBuilderPaths.entry] });
    await openGeneratedTrainingPlanDraft(user);

    const initialChoice = (await screen.findAllByLabelText(/exercise choice for /i))[0] as
      | HTMLSelectElement
      | undefined;

    if (!initialChoice) {
      throw new Error("Expected a draft slot exercise choice.");
    }

    const originalExerciseId = initialChoice.value;
    const replacementExerciseId = Array.from(initialChoice.options).find(
      (option) => option.value !== originalExerciseId,
    )?.value;

    if (!replacementExerciseId) {
      throw new Error("Expected a replacement draft slot exercise choice.");
    }

    await user.selectOptions(initialChoice, replacementExerciseId);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^accept draft$/i })).toBeEnabled();
      expect(screen.queryByText(/Stale Builder Output/i)).toBeNull();
      expect(screen.getAllByLabelText(/exercise choice for /i)[0]).toHaveValue(
        replacementExerciseId,
      );
    });

    await user.click(screen.getByRole("button", { name: /^reset draft$/i }));

    await waitFor(() => {
      expect(screen.getAllByLabelText(/exercise choice for /i)[0]).toHaveValue(originalExerciseId);
    });
  });

  it("blocks empty Superset Groups and resets draft-local group edits from current builder choices", async () => {
    const user = userEvent.setup();
    const firstRender = renderPlanBuilder({ initialEntries: [planBuilderPaths.entry] });
    await openGeneratedTrainingPlanDraft(user);
    await seedEditedTrainingPlanDraft();
    firstRender.unmount();

    renderPlanBuilder({ initialEntries: [planBuilderPaths.entry] });
    await user.click(await getOnePageSectionButton("Generate"));

    await waitFor(() => {
      expect(screen.getByText("Draft blockers")).toBeVisible();
      expect(screen.getByRole("button", { name: /^accept draft$/i })).toBeDisabled();
      expect(screen.getByDisplayValue("Main Pairing")).toBeVisible();
      expect(screen.getByDisplayValue("Finisher Pair")).toBeVisible();
    });

    await user.click(screen.getByRole("button", { name: /^reset draft$/i }));

    await waitFor(() => {
      expect(screen.queryByDisplayValue("Main Pairing")).toBeNull();
      expect(screen.queryByDisplayValue("Finisher Pair")).toBeNull();
      expect(screen.queryByText("Draft blockers")).toBeNull();
      expect(screen.getByRole("button", { name: /^accept draft$/i })).toBeEnabled();
    });
  });

  it("hides Superset Group editing controls for custom-focus draft templates", async () => {
    const user = userEvent.setup();
    renderPlanBuilder({ initialEntries: [planBuilderPaths.entry] });
    await openGeneratedTrainingPlanDraft(user);

    const editableStrengthTemplateCount = screen.getAllByRole("button", {
      name: /^add superset group$/i,
    }).length;

    const makeCustomFocusButton = screen.getAllByRole("button", {
      name: /^make custom focus$/i,
    })[0];

    if (!makeCustomFocusButton) {
      throw new Error("Expected a strength draft template.");
    }

    await user.click(makeCustomFocusButton);

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /^add superset group$/i })).toHaveLength(
        editableStrengthTemplateCount - 1,
      );
    });
  });

  it("accepts draft-local starting loads and Baseline Bodyweight into the Active Training Plan", async () => {
    const user = userEvent.setup();
    renderPlanBuilder({ initialEntries: [planBuilderPaths.entry] });
    const { baselineBodyweightInput, suggestedLoadInput } =
      await openGeneratedTrainingPlanDraft(user);

    await user.clear(suggestedLoadInput);
    await user.type(suggestedLoadInput, "45");
    await user.clear(baselineBodyweightInput);
    await user.type(baselineBodyweightInput, "81");
    await user.tab();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^accept draft$/i })).toBeEnabled();
    });
    await user.click(screen.getByRole("button", { name: /^accept draft$/i }));

    await waitFor(async () => {
      expect(await getActiveTrainingPlans()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            baselineBodyweight: 81,
            startingLoadSuggestions: expect.arrayContaining([
              expect.objectContaining({
                effectiveLoad: 45,
                exerciseId: "flat-barbell-bench-press",
                userEditedLoad: 45,
              }),
            ]),
          }),
        ]),
      );
    });
  });

  it("accepts Superset Group edits and slot movement into the Active Training Plan", async () => {
    const user = userEvent.setup();
    const firstRender = renderPlanBuilder({ initialEntries: [planBuilderPaths.entry] });
    await openGeneratedTrainingPlanDraft(user);
    await seedEditedTrainingPlanDraft({ moveSlotIntoNewGroup: true });
    firstRender.unmount();

    renderPlanBuilder({ initialEntries: [planBuilderPaths.entry] });
    await user.click(await getOnePageSectionButton("Generate"));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^accept draft$/i })).toBeEnabled();
      expect(screen.getByDisplayValue("Main Pairing")).toBeVisible();
      expect(screen.getByDisplayValue("Finisher Pair")).toBeVisible();
    });

    await user.click(screen.getByRole("button", { name: /^accept draft$/i }));

    await waitFor(async () => {
      expect(await getActiveTrainingPlans()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            workoutTemplates: expect.arrayContaining([
              expect.objectContaining({
                supersetGroups: expect.arrayContaining([
                  expect.objectContaining({
                    title: "Finisher Pair",
                    slots: expect.arrayContaining([
                      expect.objectContaining({
                        exerciseId: "flat-barbell-bench-press",
                      }),
                    ]),
                  }),
                ]),
              }),
            ]),
          }),
        ]),
      );
    });
  });

  it("edits draft slots with catalog-aware replacement, add/delete/reorder controls, and allows duplicates across Workout Templates", async () => {
    const user = userEvent.setup();
    const firstRender = renderPlanBuilder({ initialEntries: [planBuilderPaths.entry] });
    await openGeneratedTrainingPlanDraft(user);

    const blueprint = await planBuilderService.getOrCreatePlanBlueprint();

    await savePlanBlueprint({
      ...blueprint,
      trainingPlanDraft: {
        content: {
          exerciseSelectionPreferences: {
            avoidedExercises: [{ id: "avoid-1", rawText: "Decline Dumbbell Bench Press" }],
            equipmentPreset: "full_gym",
            preferredExercises: [],
            strategy: "balanced",
          },
          mainCompoundRotationPools: [],
          repRangeStyle: "balanced_hypertrophy",
          split: "3-Day Full Body",
          trainingBlockWeeks: 6,
          trainingFrequencyDaysPerWeek: 3,
          trainingGoal: "build-muscle",
          weeklyRepTargets: createPresetWeeklyRepTargets("balanced"),
          workoutTemplates: [
            {
              id: "template-1",
              label: "Upper A",
              purpose: "strength",
              supersetGroups: [
                {
                  id: "group-1",
                  slots: [
                    {
                      exerciseId: "flat-barbell-bench-press",
                      exerciseName: "Flat Barbell Bench Press",
                      kind: "exercise",
                      movementPattern: "horizontal_push",
                      role: "main_compound",
                      slotLabel: "A1",
                      targetMuscles: ["chest"],
                    },
                  ],
                  title: "Upper Superset Group",
                  type: "superset",
                },
              ],
            },
            {
              id: "template-2",
              label: "Upper B",
              purpose: "strength",
              supersetGroups: [
                {
                  id: "group-2",
                  slots: [
                    {
                      exerciseId: "flat-barbell-bench-press",
                      exerciseName: "Flat Barbell Bench Press",
                      kind: "exercise",
                      movementPattern: "horizontal_push",
                      role: "main_compound",
                      slotLabel: "A1",
                      targetMuscles: ["chest"],
                    },
                  ],
                  title: "Upper Superset Group 2",
                  type: "superset",
                },
              ],
            },
          ],
        },
        isStale: false,
        validation: { blockers: [], warnings: [] },
      },
    });
    firstRender.unmount();

    renderPlanBuilder({ initialEntries: [planBuilderPaths.entry] });
    await user.click(await getOnePageSectionButton("Generate"));

    const upperATemplate = screen.getByDisplayValue("Upper A").closest("section");

    if (!upperATemplate) {
      throw new Error("Expected the Upper A draft template.");
    }

    const initialChoice = (await within(upperATemplate).findByLabelText(
      /exercise choice for flat barbell bench press/i,
    )) as HTMLSelectElement;
    expect(
      within(initialChoice).queryByRole("option", { name: "Decline Dumbbell Bench Press" }),
    ).toBeNull();

    await user.selectOptions(initialChoice, "incline-dumbbell-bench-press");

    await waitFor(() => {
      expect(within(upperATemplate).getAllByLabelText(/exercise choice for /i)[0]).toHaveValue(
        "incline-dumbbell-bench-press",
      );
    });

    await user.click(within(upperATemplate).getByRole("button", { name: /^add slot$/i }));

    await waitFor(() => {
      expect(within(upperATemplate).getAllByLabelText(/exercise choice for /i)).toHaveLength(2);
      expect(within(upperATemplate).getByRole("button", { name: /^add slot$/i })).toBeVisible();
    });

    await user.click(within(upperATemplate).getByRole("button", { name: /^add slot$/i }));

    await waitFor(() => {
      expect(
        within(upperATemplate).getAllByRole("button", { name: /^delete slot$/i })[0],
      ).toBeEnabled();
    });

    const moveSlotUpButtons = within(upperATemplate).getAllByRole("button", {
      name: /^move slot up$/i,
    });
    const secondMoveSlotUpButton = moveSlotUpButtons[1];

    if (!secondMoveSlotUpButton) {
      throw new Error("Expected a second move slot up button.");
    }

    await user.click(secondMoveSlotUpButton);

    await waitFor(() => {
      const slotNames = within(upperATemplate)
        .getAllByLabelText(/exercise choice for /i)
        .map((select) => (select as HTMLSelectElement).selectedOptions[0]?.textContent);

      expect(slotNames.slice(0, 2)).toEqual([
        "Flat Barbell Bench Press",
        "Incline Dumbbell Bench Press",
      ]);
    });

    const deleteSlotButtons = within(upperATemplate).getAllByRole("button", {
      name: /^delete slot$/i,
    });
    const lastDeleteSlotButton = deleteSlotButtons.at(-1);

    if (!lastDeleteSlotButton) {
      throw new Error("Expected a delete slot button.");
    }

    await user.click(lastDeleteSlotButton);

    await waitFor(() => {
      const slotChoices = within(upperATemplate).getAllByLabelText(/exercise choice for /i);
      expect(slotChoices).toHaveLength(2);
    });

    await user.click(screen.getByRole("button", { name: /^accept draft$/i }));

    await waitFor(async () => {
      expect(await getActiveTrainingPlans()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            workoutTemplates: expect.arrayContaining([
              expect.objectContaining({
                id: "template-1",
                supersetGroups: [
                  expect.objectContaining({
                    slots: [
                      expect.objectContaining({ exerciseId: "flat-barbell-bench-press" }),
                      expect.objectContaining({ exerciseId: "incline-dumbbell-bench-press" }),
                    ],
                  }),
                ],
              }),
              expect.objectContaining({
                id: "template-2",
                supersetGroups: [
                  expect.objectContaining({
                    slots: [expect.objectContaining({ exerciseId: "flat-barbell-bench-press" })],
                  }),
                ],
              }),
            ]),
          }),
        ]),
      );
    });
  });
});

async function openGeneratedTrainingPlanDraft(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await getOnePageSectionButton("Generate"));
  await user.click(screen.getByRole("button", { name: /^generate training plan$/i }));
  await user.click(
    await screen.findByRole("button", { name: /^generate with recommended defaults$/i }),
  );

  const suggestedLoadInput = (
    await screen.findAllByLabelText(/suggested starting load for flat barbell bench press/i)
  )[0] as HTMLInputElement;
  const baselineBodyweightInput = (await screen.findByLabelText(
    /^baseline bodyweight$/i,
  )) as HTMLInputElement;

  return { baselineBodyweightInput, suggestedLoadInput };
}

async function seedEditedTrainingPlanDraft({
  moveSlotIntoNewGroup = false,
}: {
  moveSlotIntoNewGroup?: boolean;
} = {}) {
  const initialBlueprint = await planBuilderService.getOrCreatePlanBlueprint();
  const draft = initialBlueprint.trainingPlanDraft;
  const template = draft?.content.workoutTemplates[0];
  const firstGroup = template?.supersetGroups[0];

  if (!template || !firstGroup) {
    throw new Error("Expected a generated Training Plan Draft template.");
  }

  await planBuilderService.renameTrainingPlanDraftSupersetGroup({
    groupId: firstGroup.id,
    templateId: template.id,
    timestamp: new Date().toISOString(),
    title: "Main Pairing",
  });
  await planBuilderService.addTrainingPlanDraftSupersetGroup({
    targetIndex: template.supersetGroups.length,
    templateId: template.id,
    timestamp: new Date().toISOString(),
  });

  const updatedBlueprint = await planBuilderService.getOrCreatePlanBlueprint();
  const updatedTemplate = updatedBlueprint.trainingPlanDraft?.content.workoutTemplates[0];
  const addedGroup = updatedTemplate?.supersetGroups.at(-1);

  if (!updatedTemplate || !addedGroup) {
    throw new Error("Expected the added Superset Group.");
  }

  await planBuilderService.renameTrainingPlanDraftSupersetGroup({
    groupId: addedGroup.id,
    templateId: updatedTemplate.id,
    timestamp: new Date().toISOString(),
    title: "Finisher Pair",
  });

  if (!moveSlotIntoNewGroup) {
    return;
  }

  await planBuilderService.moveTrainingPlanDraftSlotToSupersetGroup({
    sourceGroupId: firstGroup.id,
    slotIndex: 0,
    targetGroupId: addedGroup.id,
    targetSlotIndex: 0,
    templateId: updatedTemplate.id,
    timestamp: new Date().toISOString(),
  });
  await planBuilderService.reorderTrainingPlanDraftSupersetGroup({
    groupId: addedGroup.id,
    targetIndex: Math.max(updatedTemplate.supersetGroups.length - 2, 0),
    templateId: updatedTemplate.id,
    timestamp: new Date().toISOString(),
  });
}

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

async function openExercisesSection(user: PlanBuilderTestUser) {
  const exercisesCard = await getOnePageSectionButton("Exercises");

  if (exercisesCard.getAttribute("aria-expanded") !== "true") {
    await user.click(exercisesCard);
  }
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

async function getVisibleMainCompoundRotationRow(title: string) {
  const heading = await screen.findByRole("heading", {
    name: "Rotation (Backup Exercises)",
  });
  const section = heading.closest("section");

  if (!section) {
    throw new Error("Expected a visible Main Compound Rotation Preference section.");
  }

  const rowLabel = await within(section).findByText(title);
  const row = rowLabel.closest("li");

  if (!row) {
    throw new Error(`Expected a visible Main Compound Rotation Preference row for "${title}".`);
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
  await openExercisesSection(user);

  const horizontalPushRow = await getMainCompoundPreferenceRow("Horizontal push");

  await addMainCompoundPreference(user, horizontalPushRow, "flat-barbell-bench-press");
  await addMainCompoundPreference(user, horizontalPushRow, "incline-dumbbell-bench-press");

  await user.click(within(horizontalPushRow).getByRole("button", { name: /rank preferences/i }));

  const picker = await screen.findByRole("dialog", {
    name: /rank horizontal push preferences/i,
  });

  await user.click(
    within(picker).getByRole("button", {
      name: /drag incline dumbbell bench press to reorder/i,
    }),
  );
  await user.keyboard("{Alt>}{ArrowUp}{/Alt}");
  await user.click(within(picker).getByRole("button", { name: /save ranking/i }));

  await waitFor(() =>
    expect(screen.queryByRole("dialog", { name: /rank horizontal push preferences/i })).toBeNull(),
  );

  return horizontalPushRow;
}

async function rankHorizontalPushRotationPreferences(user: PlanBuilderTestUser) {
  await openExercisesSection(user);

  const horizontalPushRow = await getVisibleMainCompoundRotationRow("Horizontal push");

  await addMainCompoundRotationPreference(user, horizontalPushRow, "flat-dumbbell-bench-press");
  await addMainCompoundRotationPreference(user, horizontalPushRow, "incline-barbell-bench-press");

  await user.click(
    within(horizontalPushRow).getByRole("button", { name: /rank rotation preferences/i }),
  );

  const picker = await screen.findByRole("dialog", {
    name: /rank horizontal push rotation preferences/i,
  });

  await user.click(
    within(picker).getByRole("button", {
      name: /drag incline barbell bench press to reorder/i,
    }),
  );
  await user.keyboard("{Alt>}{ArrowUp}{/Alt}");
  await user.click(within(picker).getByRole("button", { name: /save ranking/i }));

  await waitFor(() =>
    expect(
      screen.queryByRole("dialog", { name: /rank horizontal push rotation preferences/i }),
    ).toBeNull(),
  );

  return horizontalPushRow;
}

async function addMainCompoundPreference(
  user: PlanBuilderTestUser,
  row: HTMLElement,
  exerciseId: string,
) {
  await selectExerciseDropdownOption(user, row, /choose horizontal push exercise/i, exerciseId);
  await user.click(
    within(row).getByRole("button", {
      name: /add another horizontal push exercise/i,
    }),
  );
}

async function addMainCompoundRotationPreference(
  user: PlanBuilderTestUser,
  row: HTMLElement,
  exerciseId: string,
) {
  await selectExerciseDropdownOption(
    user,
    row,
    /choose horizontal push rotation exercise/i,
    exerciseId,
  );
  await user.click(
    within(row).getByRole("button", {
      name: /add another horizontal push rotation exercise/i,
    }),
  );
}

async function selectExerciseDropdownOption(
  user: PlanBuilderTestUser,
  row: HTMLElement,
  comboboxName: RegExp,
  exerciseId: string,
) {
  await user.click(
    within(row).getByRole("combobox", {
      name: comboboxName,
    }),
  );

  const option = await waitFor(() => {
    const candidate = document.querySelector<HTMLElement>(
      `.exercise-dropdown__option[data-exercise-id="${exerciseId}"]`,
    );

    if (!candidate) {
      throw new Error(`Expected exercise dropdown option for "${exerciseId}".`);
    }

    return candidate;
  });

  await user.click(option);
}

async function expectAddedExerciseRemovedAndNextSelected(
  user: PlanBuilderTestUser,
  row: HTMLElement,
  comboboxName: RegExp,
  addedExerciseId: string,
  nextExerciseName: string,
) {
  const combobox = within(row).getByRole("combobox", {
    name: comboboxName,
  });

  await waitFor(() => expect(combobox).toHaveTextContent(nextExerciseName));

  await user.click(combobox);

  expect(
    document.querySelector(`.exercise-dropdown__option[data-exercise-id="${addedExerciseId}"]`),
  ).toBeNull();
}

async function rankBicepsIsolationPreferences(user: PlanBuilderTestUser) {
  await openExercisesSection(user);

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
