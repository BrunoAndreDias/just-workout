import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { createAppRouter } from "../app/router";
import { db } from "../training/local-database";
import { trainingService } from "../training/training-service";
import type { TrainingFrequencyDaysPerWeek } from "./plan-blueprint";
import { planBuilderPaths } from "./plan-builder-paths";
import { planBuilderService } from "./plan-builder-service";

const trainingSplitLabels = {
  alternatingFullBodyAB: "Alternating Full Body A/B",
  fullBody2Day: "2-Day Full Body",
  fullBody3Day: "3-Day Full Body",
  rotatingPushPullLegs: "Rotating Push/Pull/Legs",
  upperLower4Day: "4-Day Upper/Lower",
  upperLowerFullBody: "Upper / Lower / Full Body",
} as const;

const selectableTrainingSplitCases = [
  {
    daysPerWeek: 2,
    expectedLabels: [trainingSplitLabels.fullBody2Day],
    recommendedLabel: trainingSplitLabels.fullBody2Day,
  },
  {
    daysPerWeek: 3,
    expectedLabels: [
      trainingSplitLabels.fullBody3Day,
      trainingSplitLabels.upperLowerFullBody,
      trainingSplitLabels.alternatingFullBodyAB,
    ],
    recommendedLabel: trainingSplitLabels.fullBody3Day,
  },
  {
    daysPerWeek: 4,
    expectedLabels: [trainingSplitLabels.upperLower4Day, trainingSplitLabels.rotatingPushPullLegs],
    recommendedLabel: trainingSplitLabels.upperLower4Day,
  },
  {
    daysPerWeek: 5,
    expectedLabels: [trainingSplitLabels.rotatingPushPullLegs],
    recommendedLabel: trainingSplitLabels.rotatingPushPullLegs,
  },
] satisfies ReadonlyArray<{
  daysPerWeek: TrainingFrequencyDaysPerWeek;
  expectedLabels: ReadonlyArray<string>;
  recommendedLabel: string;
}>;

describe("PlanBuilderRoute", () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it("routes the plan builder entry point into the canonical frequency URL", async () => {
    const { router } = renderPlanBuilder();

    expect(await screen.findByRole("heading", { name: /plan builder/i })).toBeVisible();

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(planBuilderPaths.frequency);
    });

    expect(await screen.findByRole("group", { name: /training frequency/i })).toBeVisible();
    expect(screen.getByRole("radio", { name: /3 days\/week/i })).toBeChecked();
  });

  it("renders the resumable plan builder summary inside the app shell", async () => {
    renderPlanBuilder({ initialEntries: [planBuilderPaths.frequency] });
    const summary = await screen.findByRole("complementary", { name: /plan blueprint summary/i });

    expect(await screen.findByRole("heading", { name: /plan builder/i })).toBeVisible();
    expect(await screen.findByRole("region", { name: /plan builder workspace/i })).toBeVisible();
    expect(screen.getByRole("link", { name: /just workout/i })).toBeVisible();
    expect(await screen.findByText("Build Muscle")).toBeVisible();
    expect(await screen.findAllByText("3 days/week")).toHaveLength(2);
    expect(within(summary).getAllByText("Choose a Training Split")).toHaveLength(2);
    expect(
      within(summary).getAllByText("Choose a compatible split to see this detail."),
    ).toHaveLength(3);
    expect(
      within(summary).getByText("No Training Plan yet. Review creates the full Training Plan."),
    ).toBeVisible();
  });

  it("lets the user select a training frequency, updates the summary, and restores it on return", async () => {
    const user = userEvent.setup();
    const firstView = renderPlanBuilder({ initialEntries: [planBuilderPaths.frequency] });

    const frequencyGroup = await screen.findByRole("group", {
      name: /training frequency/i,
    });

    expect(within(frequencyGroup).getByText("2 days/week")).toBeVisible();
    expect(within(frequencyGroup).getByRole("radio", { name: /3 days\/week/i })).toBeChecked();
    expect(within(frequencyGroup).getByText("4 days/week")).toBeVisible();
    expect(within(frequencyGroup).getByText("5 days/week")).toBeVisible();
    expect(screen.getByText("Flexible split options")).toBeVisible();
    expect(
      screen.getByText(/flexible split options, steady recovery, and enough training frequency/i),
    ).toBeVisible();
    expect(screen.getByText(/6-day plans are not available in this first version/i)).toBeVisible();

    await user.click(within(frequencyGroup).getByText("5 days/week"));

    await waitFor(() => {
      expect(within(frequencyGroup).getByRole("radio", { name: /5 days\/week/i })).toBeChecked();
    });

    const summary = screen.getByRole("complementary", { name: /plan blueprint summary/i });

    await waitFor(() => {
      expect(within(summary).getAllByText("5 days/week")).toHaveLength(1);
    });

    expect(
      screen.getByText(/supports higher weekly frequency and shorter sessions/i),
    ).toBeVisible();

    firstView.unmount();
    renderPlanBuilder({ initialEntries: [planBuilderPaths.frequency] });

    const resumedFrequencyGroup = await screen.findByRole("group", {
      name: /training frequency/i,
    });

    await waitFor(() => {
      expect(
        within(resumedFrequencyGroup).getByRole("radio", { name: /5 days\/week/i }),
      ).toBeChecked();
    });
    expect(
      within(screen.getByRole("complementary", { name: /plan blueprint summary/i })).getByText(
        "5 days/week",
      ),
    ).toBeVisible();
  });

  it("defaults 4 days/week to 4-Day Upper/Lower and lets the user switch to Rotating Push/Pull/Legs", async () => {
    const user = userEvent.setup();

    renderPlanBuilder({ initialEntries: [planBuilderPaths.frequency] });

    const frequencyGroup = await screen.findByRole("group", {
      name: /training frequency/i,
    });

    await user.click(within(frequencyGroup).getByText("4 days/week"));
    await waitFor(() => {
      expect(within(frequencyGroup).getByRole("radio", { name: /4 days\/week/i })).toBeChecked();
    });

    await user.click(screen.getByRole("link", { name: /continue to split/i }));

    const splitGroup = await screen.findByRole("group", { name: /training split/i });

    await waitFor(() => {
      expect(within(splitGroup).getByRole("radio", { name: /4-day upper\/lower/i })).toBeChecked();
    });
    expect(
      within(screen.getByRole("complementary", { name: /plan blueprint summary/i })).getByText(
        "4-Day Upper/Lower",
      ),
    ).toBeVisible();

    await user.click(within(splitGroup).getByText("Rotating Push/Pull/Legs"));

    await waitFor(() => {
      expect(
        within(splitGroup).getByRole("radio", { name: /rotating push\/pull\/legs/i }),
      ).toBeChecked();
    });
    expect(await screen.findByText(/rotating-cycle preview/i)).toBeVisible();
    expect(
      await screen.findByText(/schedule-flexible: the cycle rotates across available weekdays/i),
    ).toBeVisible();
    expect(
      within(screen.getByRole("complementary", { name: /plan blueprint summary/i })).getByText(
        "Rotating Push/Pull/Legs",
      ),
    ).toBeVisible();
    expect(await trainingService.getDashboardSnapshot()).toMatchObject({
      activePlan: null,
      exercises: [],
      recentSessions: [],
    });
  });

  it("shows split-derived summary statuses and updates them when the selected split changes", async () => {
    const user = userEvent.setup();

    renderPlanBuilder({ initialEntries: [planBuilderPaths.frequency] });

    const frequencyGroup = await screen.findByRole("group", {
      name: /training frequency/i,
    });

    await user.click(within(frequencyGroup).getByText("4 days/week"));
    await waitFor(() => {
      expect(within(frequencyGroup).getByRole("radio", { name: /4 days\/week/i })).toBeChecked();
    });

    await user.click(screen.getByRole("link", { name: /continue to split/i }));

    const summary = await screen.findByRole("complementary", { name: /plan blueprint summary/i });
    const splitGroup = await screen.findByRole("group", { name: /training split/i });

    await waitFor(() => {
      expect(within(splitGroup).getByRole("radio", { name: /4-day upper\/lower/i })).toBeChecked();
    });

    expect(within(summary).getByText("Completed")).toBeVisible();
    expect(within(summary).getByText("Recommended")).toBeVisible();
    expect(within(summary).getByText("4-Day Upper/Lower")).toBeVisible();
    expect(
      within(summary).getByText(
        "Two upper sessions and two lower sessions in a stable weekly layout.",
      ),
    ).toBeVisible();
    expect(
      within(summary).getByText(
        "Each major muscle group is trained about twice per week with focused volume.",
      ),
    ).toBeVisible();
    expect(
      within(summary).getByText(
        "Upper and lower sessions alternate so each region gets recovery before the next hard effort.",
      ),
    ).toBeVisible();
    expect(within(summary).getByText("Rep ranges")).toBeVisible();

    await user.click(within(splitGroup).getByText("Rotating Push/Pull/Legs"));

    await waitFor(() => {
      expect(
        within(splitGroup).getByRole("radio", { name: /rotating push\/pull\/legs/i }),
      ).toBeChecked();
    });

    await waitFor(() => {
      expect(within(summary).getByText("Also works")).toBeVisible();
    });
    expect(within(summary).queryByText("Recommended")).not.toBeInTheDocument();
    expect(within(summary).getByText("Rotating Push/Pull/Legs")).toBeVisible();
    expect(
      within(summary).getByText(
        "A rotating Push/Pull/Legs cycle that flexes across available weekdays instead of locking to one fixed week.",
      ),
    ).toBeVisible();
    expect(
      within(summary).getByText(
        "Most muscle groups are trained every 4-6 days as the push, pull, and legs cycle keeps rotating.",
      ),
    ).toBeVisible();
    expect(
      within(summary).getByText(
        "The cycle separates related stress across different session types, but calendar-week recovery can flex with your schedule.",
      ),
    ).toBeVisible();
  });

  it("renders fixed-week and rotating-cycle details inside the selected Training Split panel", async () => {
    const user = userEvent.setup();

    await planBuilderService.updateTrainingFrequency({
      timestamp: "2026-05-30T11:10:00.000Z",
      trainingFrequencyDaysPerWeek: 4,
    });

    renderPlanBuilder({ initialEntries: [planBuilderPaths.split] });

    const splitGroup = await screen.findByRole("group", { name: /training split/i });

    await waitFor(() => {
      expect(
        within(splitGroup).getByRole("radio", {
          name: getLabelMatcher(trainingSplitLabels.upperLower4Day),
        }),
      ).toBeChecked();
    });

    const fixedWeekDetails = getSelectedTrainingSplitDetails(trainingSplitLabels.upperLower4Day);

    expectTrainingSplitFitExplanation(
      fixedWeekDetails,
      /just workout recommends 4-day upper\/lower for 4 days\/week as the clearest starting point/i,
    );
    expectFixedWeekScheduleDetails(fixedWeekDetails);
    expectUnsupportedTrainingSplitGuidance(fixedWeekDetails);

    await user.click(within(splitGroup).getByText(trainingSplitLabels.rotatingPushPullLegs));

    const rotatingDetails = await findSelectedTrainingSplitDetails(
      trainingSplitLabels.rotatingPushPullLegs,
    );

    expectTrainingSplitFitExplanation(
      rotatingDetails,
      /rotating push\/pull\/legs still fits 4 days\/week, but it trades the default recommendation for a different weekly rhythm/i,
    );
    expectRotatingCycleScheduleDetails(rotatingDetails);
  });

  it.each(
    selectableTrainingSplitCases,
  )("shows only the approved selectable Training Splits for $daysPerWeek days/week", async ({
    daysPerWeek,
    expectedLabels,
    recommendedLabel,
  }) => {
    await planBuilderService.updateTrainingFrequency({
      timestamp: "2026-05-30T11:00:00.000Z",
      trainingFrequencyDaysPerWeek: daysPerWeek,
    });

    renderPlanBuilder({ initialEntries: [planBuilderPaths.split] });

    const splitGroup = await screen.findByRole("group", { name: /training split/i });
    const splitOptions = within(splitGroup);

    expect(splitOptions.getAllByRole("radio")).toHaveLength(expectedLabels.length);
    expect(
      splitOptions.getByRole("radio", { name: getLabelMatcher(recommendedLabel) }),
    ).toBeChecked();
    expect(splitOptions.getAllByText("Recommended")).toHaveLength(1);
    expect(splitOptions.queryAllByText("Also works")).toHaveLength(expectedLabels.length - 1);

    for (const label of expectedLabels) {
      expect(splitOptions.getByText(label)).toBeVisible();
      expect(splitOptions.getByRole("radio", { name: getLabelMatcher(label) })).toBeVisible();
    }
  });

  it("auto-selects and persists the recommended split when Split opens without a compatible selection", async () => {
    await planBuilderService.updateTrainingFrequency({
      timestamp: "2026-05-30T11:05:00.000Z",
      trainingFrequencyDaysPerWeek: 5,
    });

    const firstView = renderPlanBuilder({ initialEntries: [planBuilderPaths.split] });

    const splitGroup = await screen.findByRole("group", { name: /training split/i });
    const splitOptions = within(splitGroup);

    await waitFor(() => {
      expect(
        splitOptions.getByRole("radio", {
          name: getLabelMatcher(trainingSplitLabels.rotatingPushPullLegs),
        }),
      ).toBeChecked();
    });
    await waitFor(async () => {
      expect((await planBuilderService.getOrCreatePlanBlueprint()).split).toBe(
        "rotating-push-pull-legs",
      );
    });

    firstView.unmount();
    renderPlanBuilder({ initialEntries: [planBuilderPaths.split] });

    const resumedSplitGroup = await screen.findByRole("group", { name: /training split/i });
    const resumedSplitOptions = within(resumedSplitGroup);

    expect(
      resumedSplitOptions.getByRole("radio", {
        name: getLabelMatcher(trainingSplitLabels.rotatingPushPullLegs),
      }),
    ).toBeChecked();
    expect(
      within(screen.getByRole("complementary", { name: /plan blueprint summary/i })).getByText(
        trainingSplitLabels.rotatingPushPullLegs,
      ),
    ).toBeVisible();
  });

  it("shows the builder steps, disables Back on Frequency, and navigates between the Frequency, Split, and Rep ranges URLs", async () => {
    const user = userEvent.setup();

    const { router } = renderPlanBuilder({ initialEntries: [planBuilderPaths.frequency] });

    const stepList = await screen.findByRole("list", { name: /plan builder steps/i });

    expect(within(stepList).getByText("Frequency")).toHaveAttribute("aria-current", "step");
    expect(within(stepList).getByText("Split")).toBeVisible();
    expect(within(stepList).getByText("Rep ranges")).toBeVisible();
    expect(within(stepList).getByText("Volume")).toBeVisible();
    expect(within(stepList).getByText("Exercises")).toBeVisible();
    expect(within(stepList).getByText("Review")).toBeVisible();
    expect(await screen.findByRole("button", { name: /^back$/i })).toBeDisabled();

    await user.click(await screen.findByRole("link", { name: /continue to split/i }));

    expect(await screen.findByRole("heading", { name: /select training split/i })).toBeVisible();
    await waitFor(() => {
      expect(router.state.location.pathname).toBe(planBuilderPaths.split);
    });
    expect(screen.getByRole("radio", { name: /3-day full body/i })).toBeChecked();
    expect(
      within(await screen.findByRole("list", { name: /plan builder steps/i })).getByText("Split"),
    ).toHaveAttribute("aria-current", "step");

    await user.click(screen.getByRole("link", { name: /back to frequency/i }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(planBuilderPaths.frequency);
    });
    expect(await screen.findByRole("group", { name: /training frequency/i })).toBeVisible();

    await user.click(screen.getByRole("link", { name: /continue to split/i }));
    await user.click(await screen.findByRole("link", { name: /continue to rep ranges/i }));

    expect(await screen.findByRole("heading", { name: /rep ranges placeholder/i })).toBeVisible();
    await waitFor(() => {
      expect(router.state.location.pathname).toBe(planBuilderPaths.repRanges);
    });
    expect(
      within(await screen.findByRole("list", { name: /plan builder steps/i })).getByText(
        "Rep ranges",
      ),
    ).toHaveAttribute("aria-current", "step");
  });

  it("renders the split URL directly with the recommended 3-day split selected and without generating a training plan", async () => {
    const { router } = renderPlanBuilder({ initialEntries: [planBuilderPaths.split] });

    const splitGroup = await screen.findByRole("group", { name: /training split/i });

    expect(router.state.location.pathname).toBe(planBuilderPaths.split);
    expect(within(splitGroup).getByRole("radio", { name: /3-day full body/i })).toBeChecked();
    expect(within(splitGroup).getByText("Upper / Lower / Full Body")).toBeVisible();
    expect(within(splitGroup).getByText("Alternating Full Body A/B")).toBeVisible();
    expect(
      within(screen.getByRole("complementary", { name: /plan blueprint summary/i })).getByText(
        "3-Day Full Body",
      ),
    ).toBeVisible();
    expect(await trainingService.getDashboardSnapshot()).toMatchObject({
      activePlan: null,
      exercises: [],
      recentSessions: [],
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

  const view = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  return {
    ...view,
    router,
  };
}

function getSelectedTrainingSplitDetails(label: string) {
  return screen.getByRole("region", { name: getLabelMatcher(label) });
}

function findSelectedTrainingSplitDetails(label: string) {
  return screen.findByRole("region", { name: getLabelMatcher(label) });
}

function expectTrainingSplitFitExplanation(detailsPanel: HTMLElement, body: RegExp) {
  const details = within(detailsPanel);

  expect(details.getByText(/why this split fits/i)).toBeVisible();
  expect(details.getByText(body)).toBeVisible();
}

function expectFixedWeekScheduleDetails(detailsPanel: HTMLElement) {
  const details = within(detailsPanel);

  expect(details.getByText(/suggested weekly layout/i)).toBeVisible();
  expect(details.getByText("Day 1")).toBeVisible();
  expect(details.getAllByText("Upper")).toHaveLength(2);
}

function expectRotatingCycleScheduleDetails(detailsPanel: HTMLElement) {
  const details = within(detailsPanel);

  expect(details.getByText(/rotating-cycle preview/i)).toBeVisible();
  expect(
    details.getByText(
      /schedule-flexible: the cycle rotates across available weekdays and can land as 4-5 sessions in a calendar week/i,
    ),
  ).toBeVisible();
  expect(details.getByText(/cycle step 1/i)).toBeVisible();
  expect(details.getAllByText("Push")).toHaveLength(2);
  expect(details.queryByText(/suggested weekly layout/i)).not.toBeInTheDocument();
}

function expectUnsupportedTrainingSplitGuidance(detailsPanel: HTMLElement) {
  const details = within(detailsPanel);

  expect(details.getByText(/not included in this step/i)).toBeVisible();
  expect(
    details.getByText(
      /body-part split weeks usually drop muscle frequency too low for the 2-5 days\/week builder options/i,
    ),
  ).toBeVisible();
}

function getLabelMatcher(label: string) {
  return new RegExp(escapeRegExp(label), "i");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
