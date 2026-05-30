import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { createAppRouter } from "../app/router";
import { db } from "../training/local-database";
import { createStarterPlan } from "../training/starter-data";
import { trainingService } from "../training/training-service";
import type { TrainingFrequencyDaysPerWeek } from "./plan-blueprint";
import { planBuilderPaths } from "./plan-builder-paths";
import { planBuilderService } from "./plan-builder-service";
import type { TrainingSplitId } from "./training-split";

const trainingSplitLabels = {
  alternatingFullBodyAB: "Alternating Full Body A/B",
  fullBody2Day: "2-Day Full Body",
  fullBody3Day: "3-Day Full Body",
  rotatingPushPullLegs: "Rotating Push/Pull/Legs",
  upperLower4Day: "4-Day Upper/Lower",
  upperLowerFullBody: "Upper / Lower / Full Body",
} as const;

const repRangeStyleLabels = {
  balancedHypertrophy: "Balanced hypertrophy",
  controlledHigherReps: "Controlled higher reps",
  strengthLeaning: "Strength-leaning",
} as const;

const repRangeStyleEffectCopy = {
  balancedHypertrophy: [
    "Main compounds stay in the 6-8 rep range for steady progression.",
    "Secondary compounds move to 8-10 reps for productive muscle-building work.",
    "Accessories stay in the 10-15 rep range to keep isolation work controlled and repeatable.",
  ],
  controlledHigherReps: [
    "Main compounds move up to 8-10 reps for slightly lighter loading.",
    "Secondary compounds sit in the 10-12 rep range for more controlled work.",
    "Accessories extend to 12-20 reps so lighter lifts stay clearly higher-rep.",
  ],
} as const;

const repRangeStyleBoundaryCopy =
  "Volume targets are set next; Just Workout will use this rep range style later when translating volume into sets and reps.";

const repRangeStyleNextStepCopy = "Next, you will set weekly volume targets for each muscle group.";

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

const singleSelectableTrainingSplitCases = [
  {
    daysPerWeek: 2,
    expectedSplitId: "full-body-2-day",
    label: trainingSplitLabels.fullBody2Day,
  },
  {
    daysPerWeek: 5,
    expectedSplitId: "rotating-push-pull-legs",
    label: trainingSplitLabels.rotatingPushPullLegs,
  },
] satisfies ReadonlyArray<{
  daysPerWeek: TrainingFrequencyDaysPerWeek;
  expectedSplitId: TrainingSplitId;
  label: string;
}>;

type PlanBuilderTestUser = ReturnType<typeof userEvent.setup>;

describe("PlanBuilderRoute", () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it("routes the plan builder entry point into the canonical frequency URL", async () => {
    const { router } = renderPlanBuilder();

    expect(await screen.findByRole("heading", { name: "Build your workout plan" })).toBeVisible();

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(planBuilderPaths.frequency);
    });

    expect(await screen.findByRole("group", { name: /training frequency/i })).toBeVisible();
    expect(screen.getByRole("radio", { name: /3 days\/week/i })).toBeChecked();
  });

  it("renders the resumable plan builder summary inside the app shell", async () => {
    renderPlanBuilder({ initialEntries: [planBuilderPaths.frequency] });
    const summary = await screen.findByRole("complementary", { name: /plan blueprint summary/i });

    expect(await screen.findByRole("heading", { name: "Build your workout plan" })).toBeVisible();
    expect(await screen.findByRole("region", { name: /plan builder workspace/i })).toBeVisible();
    expect(screen.getByRole("link", { name: /just workout/i })).toBeVisible();
    expect(await screen.findByText("Build Muscle")).toBeVisible();
    expect(await screen.findAllByText("3 days/week")).toHaveLength(2);
    expect(within(summary).getByText("Goal")).toBeVisible();
    expect(within(summary).getByText("Experience")).toBeVisible();
    expect(within(summary).getByText("Intermediate")).toBeVisible();
    expect(within(summary).getByText("Split")).toBeVisible();
    expect(within(summary).getByText("Rep ranges")).toBeVisible();
    expect(within(summary).getByText("Volume preset")).toBeVisible();
    expect(within(summary).getAllByText("Not chosen yet")).toHaveLength(3);
    expect(within(summary).getByText("Not configured yet")).toBeVisible();
    expect(within(summary).getByText("Not ready yet")).toBeVisible();
  });

  it("renders the Training Frequency step in the blueprint builder layout", async () => {
    renderPlanBuilder({ initialEntries: [planBuilderPaths.frequency] });

    expect(await screen.findByRole("heading", { name: "Build your workout plan" })).toBeVisible();
    expect(
      screen.getByText(
        "Configure your training blueprint step by step before generating your plan.",
      ),
    ).toBeVisible();

    const stepList = screen.getByRole("list", { name: /plan builder steps/i });

    expect(within(stepList).getByText("Frequency")).toHaveAttribute("aria-current", "step");
    expect(within(stepList).getByText("Split")).toBeVisible();
    expect(within(stepList).getByText("Rep ranges")).toBeVisible();
    expect(within(stepList).getByText("Volume")).toBeVisible();
    expect(within(stepList).getByText("Exercises")).toBeVisible();
    expect(within(stepList).getByText("Review")).toBeVisible();

    const frequencyGroup = await screen.findByRole("group", { name: /training frequency/i });

    expect(within(frequencyGroup).getByRole("radio", { name: /3 days\/week/i })).toBeChecked();
    expect(within(frequencyGroup).getByText("Full Body A/B only")).toBeVisible();
    expect(within(frequencyGroup).getByText("Full Body recommended")).toBeVisible();
    expect(within(frequencyGroup).getByText("Upper/Lower recommended")).toBeVisible();
    expect(within(frequencyGroup).getByText("Advanced Push/Pull/Legs variation")).toBeVisible();
    expect(screen.getByText("Recommended for you")).toBeVisible();
    expect(screen.getByText(/6-day plans are not available in this first version/i)).toBeVisible();

    const summary = screen.getByRole("complementary", { name: /plan blueprint summary/i });

    expect(within(summary).getByRole("heading", { name: "Plan blueprint" })).toBeVisible();
    expect(within(summary).getByText("Goal")).toBeVisible();
    expect(within(summary).getByText("Build Muscle")).toBeVisible();
    expect(within(summary).getByText("Experience")).toBeVisible();
    expect(within(summary).getByText("Intermediate")).toBeVisible();
    expect(within(summary).getByText("Frequency")).toBeVisible();
    expect(within(summary).getByText("3 days/week")).toBeVisible();
    expect(within(summary).getByText("Generation status")).toBeVisible();
    expect(within(summary).getByText("Not ready yet")).toBeVisible();

    expect(screen.getByRole("heading", { name: "What happens next" })).toBeVisible();
    expect(
      screen.getByText("Next, you'll choose the best Training Split for your weekly schedule."),
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
    expect(screen.getByText("Full Body recommended")).toBeVisible();
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

    expect(within(summary).getByText("4-Day Upper/Lower")).toBeVisible();
    expect(within(summary).getByText("Not ready yet")).toBeVisible();
    expect(within(summary).getByText("Rep ranges")).toBeVisible();

    await user.click(within(splitGroup).getByText("Rotating Push/Pull/Legs"));

    await waitFor(() => {
      expect(
        within(splitGroup).getByRole("radio", { name: /rotating push\/pull\/legs/i }),
      ).toBeChecked();
    });

    await waitFor(() => {
      expect(within(summary).getByText("Rotating Push/Pull/Legs")).toBeVisible();
    });
    expect(within(summary).queryByText("4-Day Upper/Lower")).not.toBeInTheDocument();
  });

  it("renders the Rep Range Style cards, defaults to Balanced hypertrophy on step entry, and saves a new selection immediately", async () => {
    const user = userEvent.setup();

    await planBuilderService.updateTrainingFrequency({
      timestamp: "2026-05-30T11:30:00.000Z",
      trainingFrequencyDaysPerWeek: 4,
    });
    await planBuilderService.updateTrainingSplit({
      split: "upper-lower-4-day",
      timestamp: "2026-05-30T11:31:00.000Z",
    });

    renderPlanBuilder({ initialEntries: [planBuilderPaths.repRanges] });

    const repRangeGroup = await screen.findByRole("group", { name: /rep range style/i });

    expect(screen.getByRole("heading", { name: /select rep range style/i })).toBeVisible();
    expect(within(repRangeGroup).getByText(repRangeStyleLabels.strengthLeaning)).toBeVisible();
    expect(within(repRangeGroup).getByText(repRangeStyleLabels.balancedHypertrophy)).toBeVisible();
    expect(within(repRangeGroup).getByText(repRangeStyleLabels.controlledHigherReps)).toBeVisible();
    expect(within(repRangeGroup).getAllByText("Recommended")).toHaveLength(1);
    expectRepRangeStyleChecked(repRangeGroup, repRangeStyleLabels.balancedHypertrophy);
    expect(
      within(screen.getByRole("complementary", { name: /plan blueprint summary/i })).getByText(
        "Choose Rep ranges",
      ),
    ).toBeVisible();

    await user.click(within(repRangeGroup).getByText(repRangeStyleLabels.strengthLeaning));

    await waitFor(() => {
      expectRepRangeStyleChecked(repRangeGroup, repRangeStyleLabels.strengthLeaning);
    });
    await waitFor(async () => {
      expect((await planBuilderService.getOrCreatePlanBlueprint()).repRanges).toBe(
        "strength_leaning",
      );
    });
    expect(
      within(screen.getByRole("complementary", { name: /plan blueprint summary/i })).getByText(
        repRangeStyleLabels.strengthLeaning,
      ),
    ).toBeVisible();
  });

  it("preserves a saved non-default Rep Range Style when reopening the step", async () => {
    await planBuilderService.updateTrainingFrequency({
      timestamp: "2026-05-30T11:40:00.000Z",
      trainingFrequencyDaysPerWeek: 4,
    });
    await planBuilderService.updateTrainingSplit({
      split: "upper-lower-4-day",
      timestamp: "2026-05-30T11:41:00.000Z",
    });
    await planBuilderService.updateRepRangeStyle({
      repRangeStyle: "controlled_higher_reps",
      timestamp: "2026-05-30T11:42:00.000Z",
    });

    const firstView = renderPlanBuilder({ initialEntries: [planBuilderPaths.repRanges] });

    const repRangeGroup = await screen.findByRole("group", { name: /rep range style/i });

    expectRepRangeStyleChecked(repRangeGroup, repRangeStyleLabels.controlledHigherReps);
    expect(
      within(screen.getByRole("complementary", { name: /plan blueprint summary/i })).getByText(
        repRangeStyleLabels.controlledHigherReps,
      ),
    ).toBeVisible();
    expect(
      within(repRangeGroup).getByRole("radio", { name: /balanced hypertrophy/i }),
    ).not.toBeChecked();

    firstView.unmount();
    renderPlanBuilder({ initialEntries: [planBuilderPaths.repRanges] });

    const resumedRepRangeGroup = await screen.findByRole("group", { name: /rep range style/i });

    expectRepRangeStyleChecked(resumedRepRangeGroup, repRangeStyleLabels.controlledHigherReps);
    expect(
      within(screen.getByRole("complementary", { name: /plan blueprint summary/i })).getByText(
        repRangeStyleLabels.controlledHigherReps,
      ),
    ).toBeVisible();
  });

  it("shows data-driven Rep Range Style notes and targets without rendering advanced programming controls", async () => {
    await planBuilderService.updateTrainingFrequency({
      timestamp: "2026-05-30T11:45:00.000Z",
      trainingFrequencyDaysPerWeek: 4,
    });
    await planBuilderService.updateTrainingSplit({
      split: "upper-lower-4-day",
      timestamp: "2026-05-30T11:46:00.000Z",
    });

    renderPlanBuilder({ initialEntries: [planBuilderPaths.repRanges] });

    const repRangeGroup = await screen.findByRole("group", { name: /rep range style/i });
    const options = within(repRangeGroup);

    expect(options.getByText("Heavier main lifts with slightly lower reps.")).toBeVisible();
    expect(
      options.getByText(
        "Biases the week toward lower-rep top work on the main lifts before accessories climb.",
      ),
    ).toBeVisible();
    expect(
      options.getByText(
        "Useful when you want slightly lighter loading and more controlled fatigue across the week.",
      ),
    ).toBeVisible();
    expect(options.getAllByText("Main compounds")).toHaveLength(3);
    expect(options.getAllByText("Secondary compounds")).toHaveLength(3);
    expect(options.getAllByText("Accessories")).toHaveLength(3);
    expect(options.getByText("4-6 reps")).toBeVisible();
    expect(options.getAllByText("6-8 reps")).toHaveLength(2);
    expect(options.getAllByText("8-10 reps")).toHaveLength(2);
    expect(options.getByText("10-12 reps")).toBeVisible();
    expect(options.getByText("10-15 reps")).toBeVisible();
    expect(options.getByText("12-20 reps")).toBeVisible();
    expect(screen.queryByText(/\bRPE\b/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\bRIR\b/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\b1RM\b/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\btempo\b/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/rest time/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/load recommendation/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/advanced programming controls/i)).not.toBeInTheDocument();
  });

  it("updates Rep Range Style explanation bullets and uses the approved boundary and next-step copy", async () => {
    const user = userEvent.setup();

    await planBuilderService.updateTrainingFrequency({
      timestamp: "2026-05-30T11:47:00.000Z",
      trainingFrequencyDaysPerWeek: 4,
    });
    await planBuilderService.updateTrainingSplit({
      split: "upper-lower-4-day",
      timestamp: "2026-05-30T11:48:00.000Z",
    });

    renderPlanBuilder({ initialEntries: [planBuilderPaths.repRanges] });

    const repRangeGroup = await screen.findByRole("group", { name: /rep range style/i });
    const effectsPanel = getRepRangeStyleEffectsPanel();

    expect(
      within(effectsPanel).getByRole("heading", { name: /how this affects your plan/i }),
    ).toBeVisible();
    expectRepRangeStyleEffects(effectsPanel, repRangeStyleEffectCopy.balancedHypertrophy);
    expect(screen.getByText(repRangeStyleBoundaryCopy)).toBeVisible();
    expect(screen.getByRole("heading", { name: "What happens next" })).toBeVisible();
    expect(screen.getByText(repRangeStyleNextStepCopy)).toBeVisible();
    expect(
      screen.queryByText("Next, you'll tune the volume preset before choosing exercises."),
    ).not.toBeInTheDocument();

    await user.click(within(repRangeGroup).getByText(repRangeStyleLabels.controlledHigherReps));

    await waitFor(() => {
      expectRepRangeStyleChecked(repRangeGroup, repRangeStyleLabels.controlledHigherReps);
    });
    await waitFor(() => {
      expectRepRangeStyleEffects(
        getRepRangeStyleEffectsPanel(),
        repRangeStyleEffectCopy.controlledHigherReps,
      );
    });
    expect(
      within(getRepRangeStyleEffectsPanel()).queryByText(
        repRangeStyleEffectCopy.balancedHypertrophy[0],
      ),
    ).not.toBeInTheDocument();
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

  it.each(
    singleSelectableTrainingSplitCases,
  )("keeps the Split step actionable for $daysPerWeek days/week when only one Training Split is selectable", async ({
    daysPerWeek,
    expectedSplitId,
    label,
  }) => {
    const user = userEvent.setup();
    const { router } = renderPlanBuilder({ initialEntries: [planBuilderPaths.frequency] });

    await selectTrainingFrequency(user, daysPerWeek);

    const splitGroup = await continueToSplitStep(user);
    const splitOptions = within(splitGroup);

    expect(splitOptions.getAllByRole("radio")).toHaveLength(1);
    expectTrainingSplitChecked(splitGroup, label);
    expect(screen.getByRole("link", { name: /back to frequency/i })).toBeVisible();
    expect(screen.getByRole("link", { name: /continue to rep ranges/i })).toBeVisible();

    await user.click(screen.getByRole("link", { name: /back to frequency/i }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(planBuilderPaths.frequency);
    });
    expect(await screen.findByRole("group", { name: /training frequency/i })).toBeVisible();

    const resumedSplitGroup = await continueToSplitStep(user);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(planBuilderPaths.split);
    });
    expectTrainingSplitChecked(resumedSplitGroup, label);

    await user.click(screen.getByRole("link", { name: /continue to rep ranges/i }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(planBuilderPaths.repRanges);
    });
    expect(await screen.findByRole("heading", { name: /select rep range style/i })).toBeVisible();
    expectRepRangeStyleChecked(
      await screen.findByRole("group", { name: /rep range style/i }),
      repRangeStyleLabels.balancedHypertrophy,
    );
    await expectPersistedTrainingSplit(expectedSplitId);
  });

  it("resumes a user-selected compatible Training Split after the route unmounts and remounts", async () => {
    const user = userEvent.setup();

    const firstView = renderPlanBuilder({ initialEntries: [planBuilderPaths.frequency] });

    await selectTrainingFrequency(user, 4);

    const splitGroup = await continueToSplitStep(user);

    await selectTrainingSplit(user, splitGroup, trainingSplitLabels.rotatingPushPullLegs);
    await expectPersistedTrainingSplit("rotating-push-pull-legs");

    firstView.unmount();
    renderPlanBuilder({ initialEntries: [planBuilderPaths.split] });

    const resumedSplitGroup = await screen.findByRole("group", { name: /training split/i });

    expectTrainingSplitChecked(resumedSplitGroup, trainingSplitLabels.rotatingPushPullLegs);
    expect(
      within(screen.getByRole("complementary", { name: /plan blueprint summary/i })).getByText(
        trainingSplitLabels.rotatingPushPullLegs,
      ),
    ).toBeVisible();
  });

  it("does not retain an incompatible selected Training Split after the training frequency changes", async () => {
    const user = userEvent.setup();

    renderPlanBuilder({ initialEntries: [planBuilderPaths.frequency] });

    await selectTrainingFrequency(user, 4);

    const splitGroup = await continueToSplitStep(user);

    await selectTrainingSplit(user, splitGroup, trainingSplitLabels.rotatingPushPullLegs);
    await expectPersistedTrainingSplit("rotating-push-pull-legs");

    await user.click(screen.getByRole("link", { name: /back to frequency/i }));

    const summary = await screen.findByRole("complementary", {
      name: /plan blueprint summary/i,
    });
    const resumedFrequencyGroup = await screen.findByRole("group", {
      name: /training frequency/i,
    });

    await user.click(within(resumedFrequencyGroup).getByText(getTrainingFrequencyLabel(3)));

    await expectTrainingFrequencyChecked(resumedFrequencyGroup, 3);
    await expectPersistedTrainingSplit(null);
    expect(
      within(summary).queryByText(trainingSplitLabels.rotatingPushPullLegs),
    ).not.toBeInTheDocument();
    expect(within(summary).getAllByText("Not chosen yet").length).toBeGreaterThan(0);

    const resumedSplitGroup = await continueToSplitStep(user);

    await waitFor(() => {
      expectTrainingSplitChecked(resumedSplitGroup, trainingSplitLabels.fullBody3Day);
    });
    await expectPersistedTrainingSplit("full-body-3-day");
    expect(
      within(screen.getByRole("complementary", { name: /plan blueprint summary/i })).getByText(
        trainingSplitLabels.fullBody3Day,
      ),
    ).toBeVisible();
  });

  it("does not create or mutate an active Training Plan while navigating away from and forward through the Split step", async () => {
    const user = userEvent.setup();
    const activePlan = createStarterPlan("Current Active Plan");

    await db.trainingPlans.add(activePlan);

    const initialDashboardSnapshot = await trainingService.getDashboardSnapshot();
    const { router } = renderPlanBuilder({ initialEntries: [planBuilderPaths.split] });

    await screen.findByRole("group", { name: /training split/i });

    expect(await trainingService.getDashboardSnapshot()).toEqual(initialDashboardSnapshot);

    await user.click(screen.getByRole("link", { name: /back to frequency/i }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(planBuilderPaths.frequency);
    });

    await user.click(screen.getByRole("link", { name: /continue to split/i }));
    await user.click(await screen.findByRole("link", { name: /continue to rep ranges/i }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(planBuilderPaths.repRanges);
    });
    expect(await screen.findByRole("heading", { name: /select rep range style/i })).toBeVisible();
    expect(
      within(screen.getByRole("complementary", { name: /plan blueprint summary/i })).getByText(
        "Not ready yet",
      ),
    ).toBeVisible();
    expect(await trainingService.getDashboardSnapshot()).toEqual(initialDashboardSnapshot);
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

    expect(await screen.findByRole("heading", { name: /select rep range style/i })).toBeVisible();
    expectRepRangeStyleChecked(
      await screen.findByRole("group", { name: /rep range style/i }),
      repRangeStyleLabels.balancedHypertrophy,
    );
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

async function selectTrainingFrequency(
  user: PlanBuilderTestUser,
  daysPerWeek: TrainingFrequencyDaysPerWeek,
) {
  const frequencyGroup = await screen.findByRole("group", {
    name: /training frequency/i,
  });

  await user.click(within(frequencyGroup).getByText(getTrainingFrequencyLabel(daysPerWeek)));
  await expectTrainingFrequencyChecked(frequencyGroup, daysPerWeek);

  return frequencyGroup;
}

async function expectTrainingFrequencyChecked(
  frequencyGroup: HTMLElement,
  daysPerWeek: TrainingFrequencyDaysPerWeek,
) {
  await waitFor(() => {
    expect(
      within(frequencyGroup).getByRole("radio", {
        name: getLabelMatcher(getTrainingFrequencyLabel(daysPerWeek)),
      }),
    ).toBeChecked();
  });
}

async function continueToSplitStep(user: PlanBuilderTestUser) {
  await user.click(screen.getByRole("link", { name: /continue to split/i }));

  return screen.findByRole("group", { name: /training split/i });
}

async function selectTrainingSplit(
  user: PlanBuilderTestUser,
  splitGroup: HTMLElement,
  label: string,
) {
  await user.click(within(splitGroup).getByText(label));

  await waitFor(() => {
    expectTrainingSplitChecked(splitGroup, label);
  });
}

function expectTrainingSplitChecked(splitGroup: HTMLElement, label: string) {
  expect(
    within(splitGroup).getByRole("radio", {
      name: getLabelMatcher(label),
    }),
  ).toBeChecked();
}

function expectRepRangeStyleChecked(repRangeGroup: HTMLElement, label: string) {
  expect(
    within(repRangeGroup).getByRole("radio", {
      name: getLabelMatcher(label),
    }),
  ).toBeChecked();
}

function getRepRangeStyleEffectsPanel() {
  return screen.getByRole("region", { name: /how this affects your plan/i });
}

function expectRepRangeStyleEffects(
  effectsPanel: HTMLElement,
  expectedEffects: ReadonlyArray<string>,
) {
  const effects = within(effectsPanel);

  for (const effect of expectedEffects) {
    expect(effects.getByText(effect)).toBeVisible();
  }
}

async function expectPersistedTrainingSplit(split: TrainingSplitId | null) {
  await waitFor(async () => {
    expect((await planBuilderService.getOrCreatePlanBlueprint()).split).toBe(split);
  });
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

function getTrainingFrequencyLabel(daysPerWeek: TrainingFrequencyDaysPerWeek) {
  return `${daysPerWeek} days/week`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
