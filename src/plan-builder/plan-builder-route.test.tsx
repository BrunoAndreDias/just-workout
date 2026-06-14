import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../app/local-database";
import { createAppRouter } from "../app/router";
import type { RepRangeStyleId, TrainingFrequencyDaysPerWeek } from "./plan-blueprint";
import { planBuilderPaths } from "./plan-builder-paths";
import { planBuilderService } from "./plan-builder-service";
import { completeMainCompoundSelections } from "./plan-builder-test-fixtures";
import type { TrainingSplitId } from "./training-split";
import {
  createRecommendedTrainingVolumeConfiguration,
  isTrainingVolumeConfiguration,
  type OptionalVolumeMuscleGroupId,
  type VolumePresetId,
} from "./training-volume";

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
  "Rest times and progression rules will be added when the plan is generated.";

const repRangeStyleNextStepCopy = "Next, you will set weekly volume targets for each muscle group.";
const isolationExercisesSummaryText = "2 recommended · 4 more available";
const isolationExercisesUnavailableText = "Isolation exercises unlock after main compounds.";
const exerciseFoundationIntroText = "Choose main compounds and swaps.";

const weeklyVolumeExcludedContentPatterns = [
  /strongplan/i,
  /generated training plan/i,
  /chart/i,
  /analytics/i,
  /\bRPE\b/i,
  /\bRIR\b/i,
  /\b1RM\b/i,
  /tempo/i,
  /progression rules/i,
  /nutrition/i,
  /recovery scores/i,
  /bodyweight tracking/i,
] as const;

const exercisesStepExcludedContentPatterns = [
  /\bupper a\b/i,
  /lower a/i,
  /generated training plan/i,
  /final exercise list/i,
  /sets and reps/i,
  /loads/i,
  /percentages/i,
  /nutrition/i,
  /bodyweight tracking/i,
  /progress charts?/i,
] as const;

const conservativePresetWeeklyRepTargets = [
  { isEnabled: true, muscleGroup: "chest", source: "preset", target: 60 },
  { isEnabled: true, muscleGroup: "shoulders", source: "preset", target: 30 },
];

const higherVolumePresetWeeklyRepTargets = [
  { isEnabled: true, muscleGroup: "chest", source: "preset", target: 120 },
  { isEnabled: true, muscleGroup: "shoulders", source: "preset", target: 60 },
];

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

type ConfirmedPlanBuilderProgressForTest = {
  enabledOptionalVolumeTargets?: ReadonlyArray<OptionalVolumeMuscleGroupId>;
  repRangeStyle: RepRangeStyleId;
  split: TrainingSplitId;
  trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek;
  volumePreset: VolumePresetId;
};

const defaultMatchMedia = window.matchMedia;

describe("PlanBuilderRoute", () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    restoreDefaultMatchMedia();
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

  it("opens each Plan Builder section from the unified workspace without prior confirmation", async () => {
    const user = userEvent.setup();

    renderPlanBuilder({ initialEntries: [planBuilderPaths.entry] });

    const exercisesCard = await getOnePageSectionButton("Exercises");

    await user.click(await getOnePageSectionButton("Rep ranges"));
    expect(
      await screen.findByRole("radio", {
        name: new RegExp(repRangeStyleLabels.balancedHypertrophy, "i"),
      }),
    ).toBeChecked();

    await user.click(await getOnePageSectionButton("Volume"));
    expect(await screen.findByRole("region", { name: /weekly volume targets/i })).toBeVisible();
    expect(await screen.findByRole("group", { name: /volume preset/i })).toBeVisible();

    await user.click(exercisesCard);
    expect(await screen.findByRole("heading", { name: "Exercises needs setup" })).toBeVisible();
    expect(
      screen.getByText("Choose a compatible split and weekly volume before selecting exercises."),
    ).toBeVisible();
    expect(screen.queryByText("Preparing exercise foundation...")).not.toBeInTheDocument();

    await user.click(await getOnePageSectionButton("Generate"));
    expect(await screen.findByRole("heading", { name: /generate training plan/i })).toBeVisible();
  });

  it("renders the resumable plan builder summary inside the app shell", async () => {
    renderPlanBuilder({ initialEntries: [planBuilderPaths.frequency] });
    const summary = await screen.findByRole("complementary", { name: /plan blueprint summary/i });

    expect(await screen.findByRole("heading", { name: "Training schedule" })).toBeVisible();
    expect(await screen.findByRole("region", { name: /plan builder workspace/i })).toBeVisible();
    expect(screen.getByRole("link", { name: /just workout/i })).toBeVisible();
    expect(within(summary).getByRole("heading", { name: "Plan blueprint" })).toBeVisible();
    expectBlueprintSummaryBadge(summary, "Draft");
    await waitFor(() => {
      expectBlueprintSummaryField(summary, "Goal", "Build muscle");
      expectBlueprintSummaryField(summary, "Frequency", "3 days/week");
      expectBlueprintSummaryField(summary, "Split", "Pending");
      expectBlueprintSummaryField(summary, "Rep ranges", "Pending");
      expectBlueprintSummaryValueAbsent(summary, "Experience");
      expectBlueprintSummaryValueAbsent(summary, "Generation status");
    });
  });

  it("renders the Training Frequency step in the blueprint builder layout", async () => {
    renderPlanBuilder({ initialEntries: [planBuilderPaths.frequency] });

    expect(await screen.findByRole("heading", { name: "Training schedule" })).toBeVisible();
    expect(
      screen.getByText(
        "Choose how often you can train and confirm the weekly split Just Workout should use.",
      ),
    ).toBeVisible();

    const stepList = screen.getByRole("list", { name: /plan builder steps/i });

    expect(within(stepList).getByText("Frequency")).toHaveAttribute("aria-current", "step");
    expect(within(stepList).getByText("Rep ranges")).toBeVisible();
    expect(within(stepList).getByText("Volume")).toBeVisible();
    expect(within(stepList).getByText("Exercises")).toBeVisible();
    expect(within(stepList).getByText("Generate")).toBeVisible();

    const frequencyGroup = await screen.findByRole("group", { name: /training frequency/i });
    const splitGroup = await getTrainingScheduleSplitSection();

    expect(within(frequencyGroup).getByRole("radio", { name: /3 days per week/i })).toBeChecked();
    expect(within(frequencyGroup).queryByText("Full Body A/B")).not.toBeInTheDocument();
    expect(within(frequencyGroup).queryByText("Full Body")).not.toBeInTheDocument();
    expect(within(frequencyGroup).queryByText("Upper/Lower")).not.toBeInTheDocument();
    expect(within(frequencyGroup).queryByText("Push/Pull/Legs variation")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "How many days can you train per week?" }),
    ).toBeVisible();
    expect(screen.getByRole("heading", { name: "Choose your weekly split" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "3-Day Full Body" })).toBeVisible();
    expect(within(splitGroup).getByText("Best fit")).toBeVisible();
    expect(within(splitGroup).queryByText(/Good fit for/i)).not.toBeInTheDocument();
    expect(within(splitGroup).queryByText("Other compatible splits")).not.toBeInTheDocument();
    expect(screen.getByText("Weekly preview")).toBeVisible();
    expect(
      screen.getByText("Training on Mon, Wed and Fri with recovery days between sessions."),
    ).toBeVisible();
    expect(screen.getByText("Alternating Full Body A/B")).toBeVisible();
    expect(within(splitGroup).getByText("Upper / Lower / Full Body")).toBeVisible();
    expect(
      screen.queryByText(/6-day plans are not available in this first version/i),
    ).not.toBeInTheDocument();

    const summary = screen.getByRole("complementary", { name: /plan blueprint summary/i });

    expect(within(summary).getByRole("heading", { name: "Plan blueprint" })).toBeVisible();
    expectBlueprintSummaryLabel(summary, "Goal");
    expectBlueprintSummaryValue(summary, "Build muscle");
    expectBlueprintSummaryLabel(summary, "Frequency");
    expectBlueprintSummaryValue(summary, "3 days/week");
    expectBlueprintSummaryField(summary, "Split", "Pending");
    expectBlueprintSummaryField(summary, "Rep ranges", "Pending");
    expect(screen.getByRole("button", { name: /^back$/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /continue to rep ranges/i })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "What happens next" })).not.toBeInTheDocument();
  });

  it("lets the user select a training frequency, updates the summary, and restores it on return", async () => {
    const user = userEvent.setup();
    const firstView = renderPlanBuilder({ initialEntries: [planBuilderPaths.frequency] });

    const frequencyGroup = await screen.findByRole("group", {
      name: /training frequency/i,
    });

    expect(within(frequencyGroup).getByText("2 days")).toBeVisible();
    expect(within(frequencyGroup).getByRole("radio", { name: /3 days per week/i })).toBeChecked();
    expect(within(frequencyGroup).getByText("4 days")).toBeVisible();
    expect(within(frequencyGroup).getByText("5 days")).toBeVisible();
    expect(within(frequencyGroup).queryByText("Full Body")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/flexible split options, steady recovery, and enough training frequency/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/6-day plans are not available in this first version/i),
    ).not.toBeInTheDocument();

    await user.click(within(frequencyGroup).getByRole("radio", { name: /5 days per week/i }));

    await waitFor(() => {
      expect(within(frequencyGroup).getByRole("radio", { name: /5 days per week/i })).toBeChecked();
    });

    const summary = screen.getByRole("complementary", { name: /plan blueprint summary/i });

    await waitFor(() => {
      expectBlueprintSummaryField(summary, "Frequency", "5 days/week");
    });

    expect(screen.getByRole("heading", { name: "Rotating Push/Pull/Legs" })).toBeVisible();

    firstView.unmount();
    renderPlanBuilder({ initialEntries: [planBuilderPaths.frequency] });

    const resumedFrequencyGroup = await screen.findByRole("group", {
      name: /training frequency/i,
    });

    await waitFor(() => {
      expect(
        within(resumedFrequencyGroup).getByRole("radio", { name: /5 days per week/i }),
      ).toBeChecked();
    });
    expectBlueprintSummaryField(
      screen.getByRole("complementary", { name: /plan blueprint summary/i }),
      "Frequency",
      "5 days/week",
    );
  });

  it("defaults 4 days/week to 4-Day Upper/Lower and lets the user switch to Rotating Push/Pull/Legs", async () => {
    const user = userEvent.setup();

    renderPlanBuilder({ initialEntries: [planBuilderPaths.frequency] });

    const frequencyGroup = await screen.findByRole("group", {
      name: /training frequency/i,
    });

    await user.click(within(frequencyGroup).getByRole("radio", { name: /4 days per week/i }));
    await waitFor(() => {
      expect(within(frequencyGroup).getByRole("radio", { name: /4 days per week/i })).toBeChecked();
    });

    const splitGroup = await getTrainingScheduleSplitSection();

    await waitFor(() => {
      expect(within(splitGroup).getByRole("radio", { name: /4-day upper\/lower/i })).toBeChecked();
    });

    await user.click(within(splitGroup).getByText("Rotating Push/Pull/Legs"));

    await waitFor(() => {
      expect(
        within(splitGroup).getByRole("radio", { name: /rotating push\/pull\/legs/i }),
      ).toBeChecked();
    });
  });

  it("shows split-derived summary statuses and updates them when the selected split changes", async () => {
    const user = userEvent.setup();

    renderPlanBuilder({ initialEntries: [planBuilderPaths.frequency] });

    const frequencyGroup = await screen.findByRole("group", {
      name: /training frequency/i,
    });

    await user.click(within(frequencyGroup).getByRole("radio", { name: /4 days per week/i }));
    await waitFor(() => {
      expect(within(frequencyGroup).getByRole("radio", { name: /4 days per week/i })).toBeChecked();
    });

    const splitGroup = await getTrainingScheduleSplitSection();
    const summary = screen.getByRole("complementary", { name: /plan blueprint summary/i });

    await waitFor(() => {
      expect(within(splitGroup).getByRole("radio", { name: /4-day upper\/lower/i })).toBeChecked();
    });

    expectBlueprintSummaryField(summary, "Split", "Pending");
    expectBlueprintSummaryField(summary, "Rep ranges", "Pending");

    await user.click(within(splitGroup).getByText("Rotating Push/Pull/Legs"));

    await waitFor(() => {
      expect(
        within(splitGroup).getByRole("radio", { name: /rotating push\/pull\/legs/i }),
      ).toBeChecked();
    });

    expectBlueprintSummaryValueAbsent(summary, "4-Day Upper/Lower");
  });

  it("confirms Training schedule before navigating from Frequency to Rep ranges", async () => {
    const user = userEvent.setup();
    const { router } = renderPlanBuilder({ initialEntries: [planBuilderPaths.frequency] });

    await selectTrainingFrequency(user, 4);
    await user.click(screen.getByRole("button", { name: /continue to rep ranges/i }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(planBuilderPaths.repRanges);
    });
    await waitFor(async () => {
      expect((await planBuilderService.getOrCreatePlanBlueprint()).confirmedBuilderSteps).toEqual({
        exercises: false,
        frequency: true,
        repRanges: false,
        split: true,
        volume: false,
      });
    });
  });

  it("lets the user choose another compatible split from Training schedule before continuing", async () => {
    const user = userEvent.setup();
    const { router } = renderPlanBuilder({ initialEntries: [planBuilderPaths.frequency] });
    const splitGroup = await getTrainingScheduleSplitSection();

    expect(
      await screen.findByRole("radio", { name: getLabelMatcher(trainingSplitLabels.fullBody3Day) }),
    ).toBeChecked();

    await user.click(within(splitGroup).getByText(trainingSplitLabels.upperLowerFullBody));

    await waitFor(() => {
      expect(
        screen.getByRole("radio", {
          name: getLabelMatcher(trainingSplitLabels.upperLowerFullBody),
        }),
      ).toBeChecked();
    });

    await user.click(screen.getByRole("button", { name: /continue to rep ranges/i }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(planBuilderPaths.repRanges);
    });
    await waitFor(async () => {
      expect(await planBuilderService.getOrCreatePlanBlueprint()).toMatchObject({
        confirmedBuilderSteps: {
          exercises: false,
          frequency: true,
          repRanges: false,
          split: true,
          volume: false,
        },
        split: "upper-lower-full-body",
      });
    });
  });

  it("renders the Rep Range Style cards, defaults to Balanced hypertrophy on step entry, and saves a new selection immediately", async () => {
    const user = userEvent.setup();

    await saveConfirmedFourDayUpperLowerTrainingSplit();

    renderPlanBuilder({ initialEntries: [planBuilderPaths.repRanges] });

    const repRangeGroup = await screen.findByRole("group", { name: /rep range style/i });

    expect(screen.getByRole("heading", { name: /^rep ranges$/i })).toBeVisible();
    expect(within(repRangeGroup).getByText(repRangeStyleLabels.strengthLeaning)).toBeVisible();
    expect(within(repRangeGroup).getByText(repRangeStyleLabels.balancedHypertrophy)).toBeVisible();
    expect(within(repRangeGroup).getByText(repRangeStyleLabels.controlledHigherReps)).toBeVisible();
    expect(within(repRangeGroup).getAllByText("Recommended")).toHaveLength(1);
    expectRepRangeStyleChecked(repRangeGroup, repRangeStyleLabels.balancedHypertrophy);
    expectBlueprintSummaryField(
      screen.getByRole("complementary", { name: /plan blueprint summary/i }),
      "Rep ranges",
      repRangeStyleLabels.balancedHypertrophy,
    );

    await user.click(within(repRangeGroup).getByText(repRangeStyleLabels.strengthLeaning));

    await waitFor(() => {
      expectRepRangeStyleChecked(repRangeGroup, repRangeStyleLabels.strengthLeaning);
    });
    await waitFor(async () => {
      expect((await planBuilderService.getOrCreatePlanBlueprint()).repRanges).toBe(
        "strength_leaning",
      );
    });
    expectBlueprintSummaryField(
      screen.getByRole("complementary", { name: /plan blueprint summary/i }),
      "Rep ranges",
      repRangeStyleLabels.strengthLeaning,
    );
  });

  it("persists Balanced hypertrophy as the Recommended Default when Rep ranges opens without a saved selection", async () => {
    await saveConfirmedFourDayUpperLowerTrainingSplit();

    renderPlanBuilder({ initialEntries: [planBuilderPaths.repRanges] });

    const repRangeGroup = await screen.findByRole("group", { name: /rep range style/i });
    const summary = screen.getByRole("complementary", { name: /plan blueprint summary/i });

    expectRepRangeStyleChecked(repRangeGroup, repRangeStyleLabels.balancedHypertrophy);
    await waitFor(async () => {
      expect(await planBuilderService.getOrCreatePlanBlueprint()).toMatchObject({
        repRanges: "balanced_hypertrophy",
      });
    });
    expectBlueprintSummaryField(summary, "Rep ranges", repRangeStyleLabels.balancedHypertrophy);
  });

  it("opens Rep ranges directly when no compatible Training Split is saved", async () => {
    await saveConfirmedFourDayTrainingFrequency();

    const { router } = renderPlanBuilder({ initialEntries: [planBuilderPaths.repRanges] });

    await expectPlanBuilderPath(router, planBuilderPaths.repRanges);
    expect(await screen.findByRole("group", { name: /rep range style/i })).toBeVisible();
    expectBlueprintSummaryField(
      screen.getByRole("complementary", { name: /plan blueprint summary/i }),
      "Frequency",
      "4 days/week",
    );
  });

  it("confirms Rep ranges before navigating from Rep ranges to Volume", async () => {
    const user = userEvent.setup();

    await saveConfirmedFourDayUpperLowerTrainingSplit();

    const { router } = renderPlanBuilder({ initialEntries: [planBuilderPaths.repRanges] });

    expect(await screen.findByRole("heading", { name: /^rep ranges$/i })).toBeVisible();

    await user.click(await screen.findByRole("button", { name: /continue to volume/i }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(planBuilderPaths.volume);
    });
    await waitFor(async () => {
      expect((await planBuilderService.getOrCreatePlanBlueprint()).confirmedBuilderSteps).toEqual({
        exercises: false,
        frequency: true,
        split: true,
        repRanges: true,
        volume: false,
      });
    });
  });

  it("opens Volume directly when a stale confirmed Split marker has incompatible data", async () => {
    const blueprint = await planBuilderService.getOrCreatePlanBlueprint();

    await db.planBlueprints.put({
      ...blueprint,
      confirmedBuilderSteps: {
        exercises: false,
        frequency: true,
        repRanges: false,
        split: true,
        volume: false,
      },
      split: "upper-lower-full-body",
      trainingFrequencyDaysPerWeek: 5,
      updatedAt: "2026-05-30T11:37:00.000Z",
    });

    const { router } = renderPlanBuilder({ initialEntries: [planBuilderPaths.volume] });

    await expectPlanBuilderPath(router, planBuilderPaths.volume);
    expect(await screen.findByRole("group", { name: /volume preset/i })).toBeVisible();
  });

  it("opens Volume directly when the saved Rep Range Style has not been confirmed", async () => {
    await saveConfirmedFourDayUpperLowerTrainingSplit();
    await planBuilderService.updateRepRangeStyle({
      repRangeStyle: "strength_leaning",
      timestamp: "2026-05-31T08:05:00.000Z",
    });

    const { router } = renderPlanBuilder({ initialEntries: [planBuilderPaths.volume] });

    await expectPlanBuilderPath(router, planBuilderPaths.volume);
    expect(await screen.findByRole("group", { name: /volume preset/i })).toBeVisible();
  });

  it("opens Volume directly and restores the default Rep Range Style when a stale saved value is invalid", async () => {
    const blueprint = await planBuilderService.getOrCreatePlanBlueprint();

    await db.planBlueprints.put({
      ...blueprint,
      confirmedBuilderSteps: {
        exercises: false,
        frequency: true,
        repRanges: true,
        split: true,
        volume: false,
      },
      repRanges: "powerbuilding" as never,
      split: "upper-lower-4-day",
      trainingFrequencyDaysPerWeek: 4,
      updatedAt: "2026-05-31T08:06:00.000Z",
    });

    const { router } = renderPlanBuilder({ initialEntries: [planBuilderPaths.volume] });

    await expectPlanBuilderPath(router, planBuilderPaths.volume);
    expect(await screen.findByRole("group", { name: /volume preset/i })).toBeVisible();
  });

  it("opens Exercises directly and shows setup guidance when Volume has not been confirmed", async () => {
    await saveConfirmedFourDayUpperLowerTrainingSplit();
    await planBuilderService.confirmSelectedRepRangeStyle({
      repRangeStyle: "balanced_hypertrophy",
      timestamp: "2026-05-31T08:06:30.000Z",
    });
    await planBuilderService.initializeTrainingVolume({
      timestamp: "2026-05-31T08:06:31.000Z",
    });

    const { router } = renderPlanBuilder({ initialEntries: [planBuilderPaths.exercises] });

    await expectPlanBuilderPath(router, planBuilderPaths.exercises);
    await expectExercisesSetupState();
  });

  it("opens Exercises directly and shows setup guidance when a stale confirmed Volume marker has invalid data", async () => {
    const blueprint = await planBuilderService.getOrCreatePlanBlueprint();

    await db.planBlueprints.put({
      ...blueprint,
      confirmedBuilderSteps: {
        exercises: false,
        frequency: true,
        repRanges: true,
        split: true,
        volume: true,
      },
      repRanges: "balanced_hypertrophy",
      split: "upper-lower-4-day",
      trainingFrequencyDaysPerWeek: 4,
      updatedAt: "2026-05-31T08:06:45.000Z",
      volumePreset: null,
      volumePresetSource: null,
      weeklyRepTargets: null,
    });

    const { router } = renderPlanBuilder({ initialEntries: [planBuilderPaths.exercises] });

    await expectPlanBuilderPath(router, planBuilderPaths.exercises);
    await expectExercisesSetupState();
  });

  it("renders the Exercise picker overview on direct access when Volume is confirmed", async () => {
    await saveConfirmedVolumeStepForTest({
      repRangeStyle: "balanced_hypertrophy",
      split: "full-body-3-day",
      trainingFrequencyDaysPerWeek: 3,
      volumePreset: "conservative",
    });

    const { router } = renderPlanBuilder({ initialEntries: [planBuilderPaths.exercises] });

    await expectPlanBuilderPath(router, planBuilderPaths.exercises);
    expect(await screen.findByRole("heading", { name: "Exercise foundation" })).toBeVisible();
    expect(screen.getByText(exerciseFoundationIntroText)).toBeVisible();
    expect(
      within(await screen.findByRole("list", { name: /plan builder steps/i })).getByText(
        "Exercises",
      ),
    ).toHaveAttribute("aria-current", "step");

    expect(screen.getByText("5 suggested main compounds")).toBeVisible();
    expect(
      screen.getByRole("listitem", {
        name: /vertical pull.*suggested exercise preview, not confirmed.*pull-ups/i,
      }),
    ).toBeVisible();
    expect(screen.getAllByText("Suggested").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Suggested ·", { exact: false }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Choose" }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /change/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /choose horizontal push exercise/i })).toBeDisabled();
    expect(screen.queryByText("Rotation pool preview")).not.toBeInTheDocument();
    expect(screen.queryByText("Rotation pool")).not.toBeInTheDocument();
    expect(screen.queryByText("Exercise preferences · optional")).not.toBeInTheDocument();

    const summary = screen.getByRole("complementary", { name: /plan blueprint summary/i });

    expect(summary).toBeVisible();
    expectBlueprintSummaryField(summary, "Volume preset", "Conservative");
    for (const pattern of exercisesStepExcludedContentPatterns) {
      expect(screen.queryByText(pattern)).not.toBeInTheDocument();
    }
  });

  it("separates confirmed main compounds from compact rotation pool summaries", async () => {
    await saveConfirmedVolumeStepForTest({
      repRangeStyle: "balanced_hypertrophy",
      split: "upper-lower-4-day",
      trainingFrequencyDaysPerWeek: 4,
      volumePreset: "balanced",
    });
    await saveMainCompoundSelectionsForTest(completeMainCompoundSelections);

    renderPlanBuilder({ initialEntries: [planBuilderPaths.exercises] });

    const exerciseRows = await screen.findByRole("list", { name: "Exercise foundation rows" });
    const horizontalPushRow = within(exerciseRows).getByRole("listitem", {
      name: /horizontal push.*required movement pattern selected.*flat barbell bench press/i,
    });
    const rotationSummary = within(horizontalPushRow).getByRole("region", {
      name: /horizontal push rotation pool summary/i,
    });

    expect(within(horizontalPushRow).getByText("Flat Barbell Bench Press")).toBeVisible();
    expect(within(horizontalPushRow).getByText(/^Main · \d+ options$/)).toBeVisible();
    expect(within(rotationSummary).getByText("Rotation pool")).toBeVisible();
    expect(within(rotationSummary).getByText("3 suggested")).toBeVisible();
    expect(
      within(rotationSummary).getByRole("button", {
        name: /edit horizontal push rotation pool/i,
      }),
    ).toBeVisible();
    expect(
      screen.queryByRole("complementary", { name: "Coverage summary" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/after a 6-week training block, these can replace the main compound/i),
    ).not.toBeInTheDocument();
  });

  it("keeps Exercise foundation secondary sections compact and non-confirming", async () => {
    await saveConfirmedVolumeStepForTest({
      repRangeStyle: "balanced_hypertrophy",
      split: "full-body-3-day",
      trainingFrequencyDaysPerWeek: 3,
      volumePreset: "conservative",
    });

    renderPlanBuilder({ initialEntries: [planBuilderPaths.exercises] });

    expect(await screen.findByRole("heading", { name: "Exercise foundation" })).toBeVisible();
    expect(await screen.findByText("5 suggested main compounds")).toBeVisible();
    expect(
      screen.queryByRole("complementary", { name: "Coverage summary" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Rotation pools locked" })).not.toBeInTheDocument();
    expect(screen.getByText("Swaps unlock after required picks")).toBeVisible();
    expect(screen.queryByText("Rotation pool preview")).not.toBeInTheDocument();
    expect(screen.queryByText("Rotation pool")).not.toBeInTheDocument();
    expect(screen.getByText(isolationExercisesUnavailableText)).toBeVisible();

    expect(screen.getAllByRole("button", { name: "Choose" }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText(isolationExercisesSummaryText)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /choose horizontal push exercise/i })).toBeDisabled();
    expect(screen.queryByText("Exercise preferences · optional")).not.toBeInTheDocument();
    await expectPlanBlueprintToMatch({
      confirmedBuilderSteps: {
        exercises: false,
      },
      mainCompoundSelections: [],
    });
  });

  it("does not persist suggested compounds before an explicit picker selection", async () => {
    await saveConfirmedVolumeStepForTest({
      repRangeStyle: "balanced_hypertrophy",
      split: "full-body-3-day",
      trainingFrequencyDaysPerWeek: 3,
      volumePreset: "balanced",
    });

    const { router } = renderPlanBuilder({ initialEntries: [planBuilderPaths.exercises] });

    await expectPlanBuilderPath(router, planBuilderPaths.exercises);
    expect(await screen.findByText("5 suggested main compounds")).toBeVisible();
    expect(screen.getByText("Pull-Ups")).toBeVisible();
    expect(screen.getAllByText("Suggested ·", { exact: false }).length).toBeGreaterThan(0);
    expect(screen.queryByText("Rotation pool preview")).not.toBeInTheDocument();
    expect(screen.queryByText("Rotation pool")).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Choose" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /choose horizontal push exercise/i })).toBeDisabled();
    await waitFor(async () => {
      expect(await planBuilderService.getOrCreatePlanBlueprint()).toMatchObject({
        confirmedBuilderSteps: {
          exercises: false,
        },
        mainCompoundSelections: [],
      });
    });
  });

  it("persists an explicit partial main compound picker selection without confirming Exercises", async () => {
    const user = userEvent.setup();

    await saveConfirmedVolumeStepForTest({
      repRangeStyle: "balanced_hypertrophy",
      split: "full-body-3-day",
      trainingFrequencyDaysPerWeek: 3,
      volumePreset: "balanced",
    });

    renderPlanBuilder({ initialEntries: [planBuilderPaths.exercises] });

    const verticalPullRow = await screen.findByRole("listitem", {
      name: /vertical pull.*suggested exercise preview, not confirmed.*pull-ups/i,
    });

    await user.click(within(verticalPullRow).getByRole("button", { name: "Choose" }));
    expect(
      within(verticalPullRow).queryByRole("region", {
        name: /vertical pull main compound options/i,
      }),
    ).not.toBeInTheDocument();

    const mainCompoundDrawer = await screen.findByRole("dialog", {
      name: "Choose your main Vertical Pull",
    });

    expect(
      within(mainCompoundDrawer).getByText(
        "Pick one compound that will count toward this movement pattern.",
      ),
    ).toBeVisible();
    expect(
      within(mainCompoundDrawer).getByPlaceholderText("Search vertical pull exercises..."),
    ).toBeVisible();
    expect(within(mainCompoundDrawer).getByRole("button", { name: "Equipment" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(within(mainCompoundDrawer).getByRole("button", { name: "Bodyweight" })).toBeVisible();
    expect(within(mainCompoundDrawer).queryByRole("button", { name: "Select" })).toBeNull();

    const pullUpsOption = within(mainCompoundDrawer).getByRole("radio", {
      name: /pull-ups.*suggested, not confirmed/i,
    });

    expect(pullUpsOption).not.toBeChecked();
    await user.click(pullUpsOption);

    expect(await screen.findByText("Pull-Ups")).toBeVisible();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /choose horizontal push exercise/i })).toBeDisabled();
    await expectPlanBlueprintToMatch({
      confirmedBuilderSteps: {
        exercises: false,
      },
      mainCompoundSelections: [
        {
          exerciseId: "pull-ups",
          movementPattern: "vertical_pull",
        },
      ],
    });
  });

  it("presents Exercises as a suggested preview without confirming coverage or enabling Generate", async () => {
    mockPlanBuilderMediaQueries({ isLargeScreen: true, isWideDesktop: false });
    await saveConfirmedVolumeStepForTest({
      repRangeStyle: "balanced_hypertrophy",
      split: "full-body-3-day",
      trainingFrequencyDaysPerWeek: 3,
      volumePreset: "balanced",
    });

    renderPlanBuilder({ initialEntries: [planBuilderPaths.exercises] });

    expect(await screen.findByRole("heading", { name: "Exercise foundation" })).toBeVisible();
    expect(await screen.findByText("5 suggested main compounds")).toBeVisible();
    expect(
      screen.getByRole("listitem", {
        name: /vertical pull.*suggested exercise preview, not confirmed.*pull-ups/i,
      }),
    ).toBeVisible();
    expect(
      screen.queryByRole("complementary", { name: "Coverage summary" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Rotation pools locked" })).not.toBeInTheDocument();

    const generateCta = screen.getByRole("button", {
      name: /choose horizontal push exercise/i,
    });

    expect(generateCta).toBeDisabled();
    expect(generateCta).not.toHaveAccessibleDescription();
    await expectPlanBlueprintToMatch({
      confirmedBuilderSteps: {
        exercises: false,
      },
      mainCompoundSelections: [],
    });
  });

  it("recomputes Exercise foundation summary and missing copy from the selected split", async () => {
    const selectionsWithoutVerticalPush = completeMainCompoundSelections.filter(
      (selection) => selection.movementPattern !== "vertical_push",
    );

    await saveConfirmedVolumeStepForTest({
      repRangeStyle: "balanced_hypertrophy",
      split: "full-body-3-day",
      trainingFrequencyDaysPerWeek: 3,
      volumePreset: "balanced",
    });

    await saveMainCompoundSelectionsForTest(selectionsWithoutVerticalPush);

    const fullBodyView = renderPlanBuilder({ initialEntries: [planBuilderPaths.exercises] });

    expect(await screen.findByText("5 of 5 main compounds selected")).toBeVisible();
    expect(screen.getByText("Add Vertical push.")).toBeVisible();

    fullBodyView.unmount();

    await saveConfirmedVolumeStepForTest({
      repRangeStyle: "balanced_hypertrophy",
      split: "upper-lower-4-day",
      trainingFrequencyDaysPerWeek: 4,
      volumePreset: "balanced",
    });

    await saveMainCompoundSelectionsForTest(selectionsWithoutVerticalPush);

    const upperLowerView = renderPlanBuilder({ initialEntries: [planBuilderPaths.exercises] });

    expect(await screen.findByText("5 of 6 main compounds selected, 1 missing")).toBeVisible();
    expect(
      screen.getByRole("listitem", {
        name: /vertical push.*required movement pattern missing.*standing overhead barbell press/i,
      }),
    ).toBeVisible();

    upperLowerView.unmount();

    await saveConfirmedVolumeStepForTest({
      repRangeStyle: "balanced_hypertrophy",
      split: "rotating-push-pull-legs",
      trainingFrequencyDaysPerWeek: 4,
      volumePreset: "balanced",
    });

    await saveMainCompoundSelectionsForTest(selectionsWithoutVerticalPush);

    renderPlanBuilder({ initialEntries: [planBuilderPaths.exercises] });

    expect(await screen.findByText("5 of 6 main compounds selected, 1 missing")).toBeVisible();
    expect(
      screen.getByRole("listitem", {
        name: /vertical push.*required movement pattern missing.*standing overhead barbell press/i,
      }),
    ).toBeVisible();
  });

  it("keeps isolation exercises quiet until persisted main compound coverage is valid", async () => {
    await saveConfirmedVolumeStepForTest({
      repRangeStyle: "balanced_hypertrophy",
      split: "upper-lower-4-day",
      trainingFrequencyDaysPerWeek: 4,
      volumePreset: "balanced",
    });

    const emptyCoverageView = renderPlanBuilder({ initialEntries: [planBuilderPaths.exercises] });

    await expectReadOnlyExercisesStep();
    expect(screen.getByText(isolationExercisesUnavailableText)).toBeVisible();
    expect(screen.queryByText(isolationExercisesSummaryText)).not.toBeInTheDocument();
    emptyCoverageView.unmount();

    await saveMainCompoundSelectionsForTest(
      completeMainCompoundSelections.filter(
        (selection) => selection.movementPattern !== "vertical_push",
      ),
    );

    const incompleteCoverageView = renderPlanBuilder({
      initialEntries: [planBuilderPaths.exercises],
    });

    await expectReadOnlyExercisesStep();
    expect(screen.getByText(isolationExercisesUnavailableText)).toBeVisible();
    expect(screen.queryByText(isolationExercisesSummaryText)).not.toBeInTheDocument();

    incompleteCoverageView.unmount();

    await saveMainCompoundSelectionsForTest(completeMainCompoundSelections);

    renderPlanBuilder({ initialEntries: [planBuilderPaths.exercises] });

    expect(await screen.findByText("Isolation exercises")).toBeVisible();
    expect(screen.getByText(isolationExercisesSummaryText)).toBeVisible();
    expect(screen.getByRole("button", { name: /^add isolation exercises$/i })).toBeVisible();
    expect(screen.queryByRole("textbox", { name: /isolation exercises/i })).not.toBeInTheDocument();
  });

  it("configures isolation exercises without blocking Generate or changing main compound validation", async () => {
    const user = userEvent.setup();

    await saveConfirmedVolumeStepForTest({
      repRangeStyle: "balanced_hypertrophy",
      split: "upper-lower-4-day",
      trainingFrequencyDaysPerWeek: 4,
      volumePreset: "balanced",
    });
    await saveMainCompoundSelectionsForTest(completeMainCompoundSelections);

    renderPlanBuilder({ initialEntries: [planBuilderPaths.exercises] });

    const generateCta = await screen.findByRole("button", { name: /continue to generate/i });

    expect(generateCta).toBeEnabled();

    await user.click(screen.getByRole("button", { name: /^add isolation exercises$/i }));

    const isolationExercisesDialog = await screen.findByRole("dialog", {
      name: "Configure isolation exercises",
    });

    expect(isolationExercisesDialog).toBeVisible();
    expect(
      within(isolationExercisesDialog).queryByRole("searchbox", {
        name: /search isolation exercises/i,
      }),
    ).not.toBeInTheDocument();
    expect(
      within(isolationExercisesDialog).queryByRole("button", { name: "Muscle group" }),
    ).not.toBeInTheDocument();
    expect(
      within(isolationExercisesDialog).queryByRole("button", { name: "Equipment" }),
    ).not.toBeInTheDocument();
    expect(
      within(isolationExercisesDialog).queryByRole("button", { name: "Beginner-friendly" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /leg curl/i })).toBeVisible();
    expect(screen.queryByText("Add")).not.toBeInTheDocument();
    expect(screen.getByText("hamstring work")).toBeVisible();
    expect(screen.getByRole("checkbox", { name: /farmer walks/i })).toBeVisible();
    expect(screen.getByText("grip & core")).toBeVisible();
    expect(screen.queryByRole("checkbox", { name: /decline crunch/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /calf raise/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^core$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^calves$/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: /lateral raise/i }));

    expect(screen.getByRole("checkbox", { name: /lateral raise/i })).toBeChecked();
    expect(screen.queryByText("Added")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue to generate/i })).toBeEnabled();

    await user.click(
      within(isolationExercisesDialog).getByRole("button", { name: /close isolation exercises/i }),
    );

    expect(screen.getByText("1 selected · 2 recommended · 4 more available")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Isolation exercises" })).toBeVisible();
    expect(screen.getByRole("list", { name: "Selected isolation exercises" })).toBeVisible();
    expect(screen.getByText("Lateral raise")).toBeVisible();
    expect(screen.getByRole("button", { name: /^edit isolation exercises$/i })).toBeVisible();
    expect(screen.getByText("6 of 6 main compounds selected")).toBeVisible();
  });

  it("shows abs and calf isolation exercises only when their optional Volume Targets are enabled", async () => {
    const user = userEvent.setup();

    await saveConfirmedVolumeStepForTest({
      enabledOptionalVolumeTargets: ["abs", "calves"],
      repRangeStyle: "balanced_hypertrophy",
      split: "upper-lower-4-day",
      trainingFrequencyDaysPerWeek: 4,
      volumePreset: "balanced",
    });
    await saveMainCompoundSelectionsForTest(completeMainCompoundSelections);

    renderPlanBuilder({ initialEntries: [planBuilderPaths.exercises] });

    expect(await screen.findByText("Isolation exercises")).toBeVisible();
    expect(screen.getByText("3 recommended · 5 more available")).toBeVisible();

    await user.click(screen.getByRole("button", { name: /^add isolation exercises$/i }));

    const isolationExercisesDialog = await screen.findByRole("dialog", {
      name: "Configure isolation exercises",
    });

    expect(
      within(isolationExercisesDialog).getByRole("checkbox", { name: /decline crunch/i }),
    ).toBeVisible();
    expect(
      within(isolationExercisesDialog).getByRole("checkbox", { name: /calf raise/i }),
    ).toBeVisible();
    expect(
      within(isolationExercisesDialog).queryByRole("button", { name: /^core$/i }),
    ).not.toBeInTheDocument();
    expect(
      within(isolationExercisesDialog).queryByRole("button", { name: /^calves$/i }),
    ).not.toBeInTheDocument();
  });

  it("enables Generate only after persisted main compound selections cover every required pattern", async () => {
    const user = userEvent.setup();

    await saveConfirmedVolumeStepForTest({
      repRangeStyle: "balanced_hypertrophy",
      split: "upper-lower-4-day",
      trainingFrequencyDaysPerWeek: 4,
      volumePreset: "balanced",
    });
    await saveMainCompoundSelectionsForTest(completeMainCompoundSelections);

    const { router } = renderPlanBuilder({ initialEntries: [planBuilderPaths.exercises] });

    expect(await screen.findByText("6 of 6 main compounds selected")).toBeVisible();
    expect(screen.queryByText("Suggested coverage preview")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Coverage is not confirmed until main compounds are selected."),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Exercise selection will be editable in the next iteration."),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Swaps ready")).toBeVisible();
    expect(
      screen.queryByRole("complementary", { name: "Coverage summary" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Swaps unlock after required picks")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Rotation pools locked" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Change" })).toHaveLength(6);

    const generateCta = screen.getByRole("button", { name: /continue to generate/i });

    expect(generateCta).toBeEnabled();
    await expectPlanBlueprintToMatch({
      confirmedBuilderSteps: {
        exercises: false,
      },
      mainCompoundSelections: completeMainCompoundSelections,
    });

    await user.click(generateCta);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(planBuilderPaths.generate);
    });
    await expectGenerateStepComingNext();
    await expectPlanBlueprintToMatch({
      confirmedBuilderSteps: {
        exercises: true,
      },
      mainCompoundSelections: completeMainCompoundSelections,
    });
  });

  it("opens Generate directly when Exercises has not been confirmed", async () => {
    await saveConfirmedPlanBuilderProgressForTest({
      repRangeStyle: "balanced_hypertrophy",
      split: "upper-lower-4-day",
      trainingFrequencyDaysPerWeek: 4,
      volumePreset: "balanced",
    });

    const { router } = renderPlanBuilder({ initialEntries: [planBuilderPaths.generate] });

    await expectPlanBuilderPath(router, planBuilderPaths.generate);
    expect(await screen.findByRole("heading", { name: /generate training plan/i })).toBeVisible();
  });

  it("prompts before generating when non-exercise Recommended Defaults will be applied and cancels without persisting them", async () => {
    const user = userEvent.setup();
    const blueprint = await planBuilderService.getOrCreatePlanBlueprint();

    await db.planBlueprints.put({
      ...blueprint,
      mainCompoundSelections: completeMainCompoundSelections,
    });

    const { router } = renderPlanBuilder({ initialEntries: [planBuilderPaths.entry] });

    await user.click(await getOnePageSectionButton("Generate"));
    await expectGenerateStepComingNext();
    await user.click(screen.getByRole("button", { name: /^generate training plan$/i }));

    const confirmation = await screen.findByRole("dialog", {
      name: /default generation confirmation/i,
    });

    expect(
      within(confirmation).getByText(
        "Just Workout will apply these Recommended Defaults before generation continues.",
      ),
    ).toBeVisible();
    expect(within(confirmation).getByText("3-Day Full Body")).toBeVisible();
    expect(within(confirmation).getByText("Balanced hypertrophy")).toBeVisible();
    expect(within(confirmation).getByText("Balanced volume preset")).toBeVisible();
    expect(within(confirmation).getByText("Full gym equipment preset")).toBeVisible();

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

  it("generates an active Training Plan and navigates to the plan route", async () => {
    const user = userEvent.setup();

    await saveConfirmedPlanBuilderProgressForTest({
      repRangeStyle: "balanced_hypertrophy",
      split: "upper-lower-4-day",
      trainingFrequencyDaysPerWeek: 4,
      volumePreset: "balanced",
    });
    await planBuilderService.confirmSelectedExerciseSelectionPreferences({
      timestamp: "2026-05-31T09:06:00.000Z",
    });

    const { router } = renderPlanBuilder({ initialEntries: [planBuilderPaths.generate] });

    await expectPlanBuilderPath(router, planBuilderPaths.generate);
    await expectGenerateStepComingNext();
    expect(
      within(await screen.findByRole("list", { name: /plan builder steps/i })).getByText(
        "Generate",
      ),
    ).toHaveAttribute("aria-current", "step");

    await user.click(screen.getByRole("button", { name: /^generate training plan$/i }));

    await waitFor(() => {
      expect(router.state.location.pathname).toMatch(/^\/training-plans\/[^/]+$/);
    });
    expect(await screen.findByRole("heading", { name: "4-Day Upper/Lower" })).toBeVisible();
    expect(screen.getByText("4 days/week with 4 workout templates configured.")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Upper A" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Lower A" })).toBeVisible();
    await user.click(screen.getByRole("tab", { name: "Upper A" }));
    expect(
      within(screen.getByRole("tabpanel", { name: "Upper A" })).getByText(
        "Flat Barbell Bench Press",
      ),
    ).toBeVisible();
    await user.click(screen.getByRole("tab", { name: "Lower A" }));
    expect(
      within(screen.getByRole("tabpanel", { name: "Lower A" })).getByText("Barbell Squats"),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: /training plans/i })).toBeVisible();
    expect(await db.trainingPlans.filter((plan) => plan.active).count()).toBe(1);
  });

  it("accepts fully defaulted Recommended Defaults before generating and persists them into the Plan Blueprint", async () => {
    const user = userEvent.setup();

    const { router } = renderPlanBuilder({ initialEntries: [planBuilderPaths.entry] });

    await user.click(await getOnePageSectionButton("Generate"));
    await expectGenerateStepComingNext();
    await user.click(screen.getByRole("button", { name: /^generate training plan$/i }));

    const confirmation = await screen.findByRole("dialog", {
      name: /default generation confirmation/i,
    });

    expect(within(confirmation).getByText("3-Day Full Body")).toBeVisible();
    expect(within(confirmation).getByText("Balanced hypertrophy")).toBeVisible();
    expect(within(confirmation).getByText("Balanced volume preset")).toBeVisible();
    expect(within(confirmation).getByText("Full gym equipment preset")).toBeVisible();
    expect(within(confirmation).getByText("Flat Barbell Bench Press")).toBeVisible();
    expect(within(confirmation).getByText("Bent Over Barbell Rows")).toBeVisible();
    expect(within(confirmation).getByText("Barbell Squats")).toBeVisible();

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

  it("accepts mixed user-picked and Recommended Default main compounds before generating", async () => {
    const user = userEvent.setup();
    const blueprint = await planBuilderService.getOrCreatePlanBlueprint();

    await db.planBlueprints.put({
      ...blueprint,
      ...createBalancedFullBodyDefaults(),
      equipmentPresetSource: "user_selected",
      mainCompoundSelections: completeMainCompoundSelections.slice(0, 1),
    });

    const { router } = renderPlanBuilder({ initialEntries: [planBuilderPaths.entry] });

    await user.click(await getOnePageSectionButton("Generate"));
    await expectGenerateStepComingNext();
    await user.click(screen.getByRole("button", { name: /^generate training plan$/i }));

    const confirmation = await screen.findByRole("dialog", {
      name: /default generation confirmation/i,
    });

    expect(within(confirmation).queryByText("Flat Barbell Bench Press")).not.toBeInTheDocument();
    expect(within(confirmation).getByText("Bent Over Barbell Rows")).toBeVisible();
    expect(within(confirmation).getByText("Standing Overhead Barbell Press")).toBeVisible();
    expect(within(confirmation).getByText("Pull-Ups")).toBeVisible();
    expect(within(confirmation).getByText("Barbell Squats")).toBeVisible();
    expect(within(confirmation).getByText("Barbell Romanian Deadlifts")).toBeVisible();

    await user.click(
      within(confirmation).getByRole("button", { name: /^generate with recommended defaults$/i }),
    );

    await waitFor(() => {
      expect(router.state.location.pathname).toMatch(/^\/training-plans\/[^/]+$/);
    });
    expect(await screen.findByRole("heading", { name: "3-Day Full Body" })).toBeVisible();
    expect(await planBuilderService.getOrCreatePlanBlueprint()).toMatchObject({
      mainCompoundSelections: completeMainCompoundSelections,
      repRanges: "balanced_hypertrophy",
      split: "full-body-3-day",
      volumePreset: "balanced",
    });
  });

  it("opens the Training Plans route from the top menu", async () => {
    const user = userEvent.setup();
    const { router } = renderPlanBuilder({ initialEntries: [planBuilderPaths.frequency] });

    await user.click(await screen.findByRole("link", { name: /training plans/i }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/training-plans");
    });
    expect(await screen.findByRole("heading", { name: "Generated training plans" })).toBeVisible();
    expect(screen.getByText("No Training Plans yet")).toBeVisible();
  });

  it("initializes the Balanced volume defaults when Volume opens without saved volume data", async () => {
    await saveConfirmedFourDayUpperLowerTrainingSplit();
    await planBuilderService.confirmSelectedRepRangeStyle({
      repRangeStyle: "balanced_hypertrophy",
      timestamp: "2026-05-31T08:07:00.000Z",
    });

    renderPlanBuilder({ initialEntries: [planBuilderPaths.volume] });

    expect(await screen.findByRole("heading", { name: /set your training volume/i })).toBeVisible();

    await waitFor(async () => {
      expect(await planBuilderService.getOrCreatePlanBlueprint()).toMatchObject({
        confirmedBuilderSteps: {
          frequency: true,
          repRanges: true,
          split: true,
          volume: false,
        },
        volumePreset: "balanced",
        volumePresetSource: "recommended_default",
        weeklyRepTargets: [
          { muscleGroup: "chest", source: "preset", target: 90 },
          { muscleGroup: "back", source: "preset", target: 90 },
          { muscleGroup: "quads", source: "preset", target: 90 },
          { muscleGroup: "hamstrings", source: "preset", target: 90 },
          { muscleGroup: "shoulders", source: "preset", target: 45 },
          { muscleGroup: "biceps", source: "preset", target: 45 },
          { muscleGroup: "triceps", source: "preset", target: 45 },
          { isEnabled: false, muscleGroup: "calves", source: "preset" },
          { isEnabled: false, muscleGroup: "abs", source: "preset" },
        ],
      });
    });
    const summary = screen.getByRole("complementary", { name: /plan blueprint summary/i });

    expectBlueprintSummaryField(summary, "Volume preset", "Balanced");
  });

  it("continues from Rep ranges into the Volume step without redundant explanatory copy", async () => {
    const user = userEvent.setup();

    await saveConfirmedFourDayUpperLowerTrainingSplit();

    const { router } = renderPlanBuilder({ initialEntries: [planBuilderPaths.repRanges] });

    expect(await screen.findByRole("heading", { name: /^rep ranges$/i })).toBeVisible();

    await user.click(await screen.findByRole("button", { name: /continue to volume/i }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(planBuilderPaths.volume);
    });
    expect(await screen.findByRole("heading", { name: /set your training volume/i })).toBeVisible();
    expect(screen.getByRole("group", { name: /^volume preset$/i })).toBeVisible();
    expect(screen.getByRole("heading", { name: /weekly volume targets/i })).toBeVisible();
    expect(screen.getByText(/these targets guide which exercises/i)).toBeVisible();
    expect(screen.getByRole("heading", { name: /main targets/i })).toBeVisible();
    expect(screen.getByRole("heading", { name: /supporting targets/i })).toBeVisible();
    expect(screen.getByRole("heading", { name: /optional targets/i })).toBeVisible();
    expect(screen.queryByRole("heading", { name: /how this works/i })).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        /just workout will translate those weekly targets into sets and reps across your training days later/i,
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/reps\/week is the saved training volume target/i),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to rep ranges/i })).toBeVisible();
    expect(
      within(await screen.findByRole("list", { name: /plan builder steps/i })).getByText("Volume"),
    ).toHaveAttribute("aria-current", "step");
    expect(screen.queryByRole("heading", { name: /^rep ranges$/i })).not.toBeInTheDocument();
    for (const excludedContentPattern of weeklyVolumeExcludedContentPatterns) {
      expect(screen.queryByText(excludedContentPattern)).not.toBeInTheDocument();
    }
  });

  it("renders the required Weekly Rep Target rows as grouped lists with canonical reps and derived set estimates", async () => {
    await saveConfirmedFourDayUpperLowerTrainingSplit();
    await planBuilderService.confirmSelectedRepRangeStyle({
      repRangeStyle: "balanced_hypertrophy",
      timestamp: "2026-05-31T08:07:30.000Z",
    });

    renderPlanBuilder({ initialEntries: [planBuilderPaths.volume] });

    const weeklyTargets = await screen.findByRole("region", { name: /weekly volume targets/i });
    const mainTargets = await within(weeklyTargets).findByRole("list", { name: /main targets/i });
    const supportingTargets = await within(weeklyTargets).findByRole("list", {
      name: /supporting targets/i,
    });
    const rowExpectations = [
      {
        group: mainTargets,
        label: "Chest",
        reps: "90 reps/week",
        sets: "8-12 sets/week",
        status: "Main target",
      },
      {
        group: mainTargets,
        label: "Back",
        reps: "90 reps/week",
        sets: "8-12 sets/week",
        status: "Main target",
      },
      {
        group: mainTargets,
        label: "Quads",
        reps: "90 reps/week",
        sets: "8-12 sets/week",
        status: "Main target",
      },
      {
        group: mainTargets,
        label: "Hamstrings/Glutes",
        reps: "90 reps/week",
        sets: "8-12 sets/week",
        status: "Main target",
      },
      {
        group: supportingTargets,
        label: "Shoulders",
        reps: "45 reps/week",
        sets: "4-6 sets/week",
        status: "Moderate",
      },
      {
        group: supportingTargets,
        label: "Biceps",
        reps: "45 reps/week",
        sets: "4-6 sets/week",
        status: "Accessory",
      },
      {
        group: supportingTargets,
        label: "Triceps",
        reps: "45 reps/week",
        sets: "4-6 sets/week",
        status: "Accessory",
      },
    ] as const;

    expect(
      within(weeklyTargets).getByText(/targets are generated from your selected volume style/i),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: /adjust .* target/i })).not.toBeInTheDocument();

    for (const { group, label, reps, sets, status } of rowExpectations) {
      const row = getListItemByLabel(group, label);
      expect(within(row).getByText(reps)).toBeVisible();
      expect(within(row).getByText(sets)).toBeVisible();
      expect(within(row).getByText(status)).toBeVisible();
    }

    const blueprint = await planBuilderService.getOrCreatePlanBlueprint();

    expect(blueprint.weeklyRepTargets).not.toBeNull();
    for (const target of blueprint.weeklyRepTargets ?? []) {
      expect(target).not.toHaveProperty("estimatedSetRange");
      expect(target).not.toHaveProperty("estimatedSetsPerWeek");
    }
  });

  it("renders Calves and Abs as optional targets inside Weekly volume targets by default", async () => {
    await saveConfirmedFourDayUpperLowerTrainingSplit();
    await planBuilderService.confirmSelectedRepRangeStyle({
      repRangeStyle: "balanced_hypertrophy",
      timestamp: "2026-05-31T08:07:40.000Z",
    });

    renderPlanBuilder({ initialEntries: [planBuilderPaths.volume] });

    const weeklyTargets = await screen.findByRole("region", { name: /weekly volume targets/i });
    const optionalTargets = await within(weeklyTargets).findByRole("list", {
      name: /optional targets/i,
    });
    expect(
      within(weeklyTargets).getByText(
        /add direct work for smaller muscle groups if you want them included/i,
      ),
    ).toBeVisible();

    for (const label of ["Calves", "Abs"] as const) {
      const row = getListItemByLabel(optionalTargets, label);

      expect(
        within(row).getByRole("button", { name: new RegExp(`add ${label} target`, "i") }),
      ).toBeEnabled();
      expect(within(row).getByText("Not included")).toBeVisible();
      expect(within(row).getByText("Add target")).toBeVisible();
      expect(within(row).queryByText("Optional")).not.toBeInTheDocument();
      expect(within(row).queryByText("Included")).not.toBeInTheDocument();
      expect(within(row).queryByText(/reps\/week/i)).not.toBeInTheDocument();
      expect(within(row).queryByText(/sets\/week/i)).not.toBeInTheDocument();
    }
  });

  it("lets the user switch Volume Presets and updates saved targets, set estimates, summary, and source markers", async () => {
    const user = userEvent.setup();

    await saveConfirmedFourDayUpperLowerTrainingSplit();
    await planBuilderService.confirmSelectedRepRangeStyle({
      repRangeStyle: "balanced_hypertrophy",
      timestamp: "2026-05-31T08:07:45.000Z",
    });

    renderPlanBuilder({ initialEntries: [planBuilderPaths.volume] });

    const volumePresetGroup = await screen.findByRole("group", { name: /volume preset/i });
    const weeklyTargets = await screen.findByRole("region", { name: /weekly volume targets/i });
    const summary = screen.getByRole("complementary", { name: /plan blueprint summary/i });
    const chestRow = getListItemByLabel(weeklyTargets, "Chest");
    const shouldersRow = getListItemByLabel(weeklyTargets, "Shoulders");

    expect(within(volumePresetGroup).getByRole("radio", { name: /conservative/i })).toBeVisible();
    expect(within(volumePresetGroup).getByRole("radio", { name: /balanced/i })).toBeChecked();
    expect(within(volumePresetGroup).getByRole("radio", { name: /higher volume/i })).toBeVisible();
    expect(within(chestRow).getByText("90 reps/week")).toBeVisible();
    expect(within(chestRow).getByText("8-12 sets/week")).toBeVisible();
    expect(within(shouldersRow).getByText("45 reps/week")).toBeVisible();
    expect(within(shouldersRow).getByText("4-6 sets/week")).toBeVisible();
    expectBlueprintSummaryField(summary, "Volume preset", "Balanced");

    await user.click(within(volumePresetGroup).getByText("Conservative"));

    await waitFor(() => {
      expect(within(volumePresetGroup).getByRole("radio", { name: /conservative/i })).toBeChecked();
    });
    expect(within(chestRow).getByText("60 reps/week")).toBeVisible();
    expect(within(chestRow).getByText("5-8 sets/week")).toBeVisible();
    expect(within(shouldersRow).getByText("30 reps/week")).toBeVisible();
    expect(within(shouldersRow).getByText("3-4 sets/week")).toBeVisible();
    expectBlueprintSummaryField(summary, "Volume preset", "Conservative");
    await waitFor(async () => {
      expect(await planBuilderService.getOrCreatePlanBlueprint()).toMatchObject({
        volumePreset: "conservative",
        volumePresetSource: "user_selected",
      });
    });

    await user.click(within(volumePresetGroup).getByText("Higher volume"));

    await waitFor(() => {
      expect(
        within(volumePresetGroup).getByRole("radio", { name: /higher volume/i }),
      ).toBeChecked();
    });
    expect(within(chestRow).getByText("120 reps/week")).toBeVisible();
    expect(within(chestRow).getByText("10-15 sets/week")).toBeVisible();
    expect(within(shouldersRow).getByText("60 reps/week")).toBeVisible();
    expect(within(shouldersRow).getByText("5-8 sets/week")).toBeVisible();
    expectBlueprintSummaryField(summary, "Volume preset", "Higher volume");
    await waitFor(async () => {
      expect(await planBuilderService.getOrCreatePlanBlueprint()).toMatchObject({
        volumePreset: "higher_volume",
        volumePresetSource: "user_selected",
      });
    });
  });

  it("adds and removes optional Volume Targets while keeping enabled preset-derived rows in sync with preset changes", async () => {
    const user = userEvent.setup();

    await saveConfirmedFourDayUpperLowerTrainingSplit();
    await planBuilderService.confirmSelectedRepRangeStyle({
      repRangeStyle: "balanced_hypertrophy",
      timestamp: "2026-05-31T08:07:46.000Z",
    });
    const initializedBlueprint = await planBuilderService.initializeTrainingVolume({
      timestamp: "2026-05-31T08:07:47.000Z",
    });

    await db.planBlueprints.put({
      ...initializedBlueprint,
      confirmedBuilderSteps: {
        ...initializedBlueprint.confirmedBuilderSteps,
        volume: true,
      },
      updatedAt: "2026-05-31T08:07:48.000Z",
    });

    renderPlanBuilder({ initialEntries: [planBuilderPaths.volume] });

    const volumePresetGroup = await screen.findByRole("group", { name: /volume preset/i });
    const weeklyTargets = await screen.findByRole("region", { name: /weekly volume targets/i });
    const optionalTargets = await within(weeklyTargets).findByRole("list", {
      name: /optional targets/i,
    });
    const calvesRow = getListItemByLabel(optionalTargets, "Calves");

    await user.click(within(calvesRow).getByRole("button", { name: /add calves target/i }));

    await waitFor(() => {
      expect(within(calvesRow).getByText(/45 reps\/week/i)).toBeVisible();
    });
    expect(within(calvesRow).getByText(/4-6 sets\/week/i)).toBeVisible();
    expect(within(calvesRow).queryByText("Included")).not.toBeInTheDocument();
    expect(within(calvesRow).getByRole("button", { name: /remove calves target/i })).toBeVisible();
    await waitFor(async () => {
      expect(await planBuilderService.getOrCreatePlanBlueprint()).toMatchObject({
        confirmedBuilderSteps: {
          frequency: true,
          repRanges: true,
          split: true,
          volume: false,
        },
        weeklyRepTargets: expect.arrayContaining([
          { isEnabled: true, muscleGroup: "calves", source: "preset", target: 45 },
        ]),
      });
    });

    await user.click(within(volumePresetGroup).getByText("Higher volume"));

    await waitFor(() => {
      expect(
        within(volumePresetGroup).getByRole("radio", { name: /higher volume/i }),
      ).toBeChecked();
    });
    expect(within(calvesRow).getByText(/60 reps\/week/i)).toBeVisible();
    expect(within(calvesRow).getByText(/5-8 sets\/week/i)).toBeVisible();
    await waitFor(async () => {
      expect(await planBuilderService.getOrCreatePlanBlueprint()).toMatchObject({
        volumePreset: "higher_volume",
        volumePresetSource: "user_selected",
        weeklyRepTargets: expect.arrayContaining([
          { isEnabled: true, muscleGroup: "calves", source: "preset", target: 60 },
        ]),
      });
    });

    await user.click(within(calvesRow).getByRole("button", { name: /remove calves target/i }));

    await waitFor(() => {
      expect(within(calvesRow).queryByText("Included")).not.toBeInTheDocument();
    });
    expect(within(calvesRow).getByText("Not included")).toBeVisible();
    expect(within(calvesRow).getByRole("button", { name: /add calves target/i })).toBeVisible();
    await waitFor(async () => {
      expect(await planBuilderService.getOrCreatePlanBlueprint()).toMatchObject({
        volumePreset: "higher_volume",
        weeklyRepTargets: expect.arrayContaining([
          { isEnabled: false, muscleGroup: "calves", source: "preset", target: null },
        ]),
      });
    });
  });

  it("confirms Volume before navigating from Volume to Exercises and renders the read-only Step 5 route", async () => {
    const user = userEvent.setup();

    await saveConfirmedFourDayUpperLowerTrainingSplit();
    await planBuilderService.confirmSelectedRepRangeStyle({
      repRangeStyle: "balanced_hypertrophy",
      timestamp: "2026-05-31T08:07:49.000Z",
    });

    const { router } = renderPlanBuilder({ initialEntries: [planBuilderPaths.volume] });

    expect(await screen.findByRole("heading", { name: /set your training volume/i })).toBeVisible();

    await user.click(screen.getByRole("button", { name: /continue to exercises/i }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(planBuilderPaths.exercises);
    });
    await expectReadOnlyExercisesStep();
    expect(
      within(await screen.findByRole("list", { name: /plan builder steps/i })).getByText(
        "Exercises",
      ),
    ).toHaveAttribute("aria-current", "step");
    expect(screen.queryByText(/generated training plan/i)).not.toBeInTheDocument();

    await waitFor(async () => {
      expect(await planBuilderService.getOrCreatePlanBlueprint()).toMatchObject({
        confirmedBuilderSteps: {
          frequency: true,
          repRanges: true,
          split: true,
          volume: true,
        },
        volumePreset: "balanced",
        volumePresetSource: "recommended_default",
        weeklyRepTargets: [
          { isEnabled: true, muscleGroup: "chest", source: "preset", target: 90 },
          { isEnabled: true, muscleGroup: "back", source: "preset", target: 90 },
          { isEnabled: true, muscleGroup: "quads", source: "preset", target: 90 },
          { isEnabled: true, muscleGroup: "hamstrings", source: "preset", target: 90 },
          { isEnabled: true, muscleGroup: "shoulders", source: "preset", target: 45 },
          { isEnabled: true, muscleGroup: "biceps", source: "preset", target: 45 },
          { isEnabled: true, muscleGroup: "triceps", source: "preset", target: 45 },
          { isEnabled: false, muscleGroup: "calves", source: "preset", target: null },
          { isEnabled: false, muscleGroup: "abs", source: "preset", target: null },
        ],
      });
    });
  });

  it("keeps Exercises unconfirmed until the active Generate CTA is used", async () => {
    await saveConfirmedPlanBuilderProgressForTest({
      repRangeStyle: "balanced_hypertrophy",
      split: "upper-lower-4-day",
      trainingFrequencyDaysPerWeek: 4,
      volumePreset: "balanced",
    });

    renderPlanBuilder({ initialEntries: [planBuilderPaths.exercises] });

    await expectConfirmableExercisesStep();
    await expectPlanBlueprintToMatch({
      confirmedBuilderSteps: {
        exercises: false,
        frequency: true,
        repRanges: true,
        split: true,
        volume: true,
      },
    });
    expect(screen.getByRole("button", { name: /continue to generate/i })).toBeEnabled();
  });

  it("returns from Exercises to Volume with the existing footer back action", async () => {
    const user = userEvent.setup();

    await saveConfirmedPlanBuilderProgressForTest({
      repRangeStyle: "balanced_hypertrophy",
      split: "upper-lower-4-day",
      trainingFrequencyDaysPerWeek: 4,
      volumePreset: "balanced",
    });

    const { router } = renderPlanBuilder({ initialEntries: [planBuilderPaths.exercises] });

    await expectConfirmableExercisesStep();

    await user.click(screen.getByRole("link", { name: /back to volume/i }));

    await expectPlanBuilderPath(router, planBuilderPaths.volume);
    expect(await screen.findByRole("heading", { name: /set your training volume/i })).toBeVisible();
  });

  it("preserves compatible saved Split, Rep ranges, and Volume data after Frequency changes while leaving Exercises openable", async () => {
    const user = userEvent.setup();

    await saveConfirmedPlanBuilderProgressForTest({
      repRangeStyle: "controlled_higher_reps",
      split: "rotating-push-pull-legs",
      trainingFrequencyDaysPerWeek: 4,
      volumePreset: "higher_volume",
    });

    const frequencyView = renderPlanBuilder({ initialEntries: [planBuilderPaths.frequency] });
    const frequencyGroup = await screen.findByRole("group", {
      name: /training frequency/i,
    });

    await user.click(within(frequencyGroup).getByRole("radio", { name: /5 days per week/i }));
    await expectTrainingFrequencyChecked(frequencyGroup, 5);

    await waitFor(async () => {
      expect(await planBuilderService.getOrCreatePlanBlueprint()).toMatchObject({
        confirmedBuilderSteps: {
          frequency: false,
          repRanges: true,
          split: false,
          volume: true,
        },
        repRanges: "controlled_higher_reps",
        split: "rotating-push-pull-legs",
        trainingFrequencyDaysPerWeek: 5,
        volumePreset: "higher_volume",
        volumePresetSource: "user_selected",
        weeklyRepTargets: expect.arrayContaining([
          { isEnabled: true, muscleGroup: "chest", source: "preset", target: 120 },
          { isEnabled: true, muscleGroup: "shoulders", source: "preset", target: 60 },
        ]),
      });
    });

    frequencyView.unmount();

    const exercisesView = renderPlanBuilder({
      initialEntries: [planBuilderPaths.exercises],
    });

    await expectPlanBuilderPath(exercisesView.router, planBuilderPaths.exercises);
    await expectConfirmableExercisesStep();
    const summary = screen.getByRole("complementary", { name: /plan blueprint summary/i });

    expect(await planBuilderService.getOrCreatePlanBlueprint()).toMatchObject({
      repRanges: "controlled_higher_reps",
    });
    expectBlueprintSummaryField(summary, "Split", trainingSplitLabels.rotatingPushPullLegs);
    expectBlueprintSummaryField(summary, "Volume preset", "Higher volume");

    exercisesView.unmount();
    renderPlanBuilder({ initialEntries: [planBuilderPaths.exercises] });

    await expectConfirmableExercisesStep();
  });

  it("preserves canonical Weekly Rep Targets after Rep ranges change while leaving Exercises openable", async () => {
    const user = userEvent.setup();

    await saveConfirmedPlanBuilderProgressForTest({
      repRangeStyle: "balanced_hypertrophy",
      split: "upper-lower-4-day",
      trainingFrequencyDaysPerWeek: 4,
      volumePreset: "higher_volume",
    });

    const repRangesView = renderPlanBuilder({ initialEntries: [planBuilderPaths.repRanges] });
    const repRangeGroup = await screen.findByRole("group", { name: /rep range style/i });

    await user.click(within(repRangeGroup).getByText(repRangeStyleLabels.controlledHigherReps));

    await waitFor(() => {
      expectRepRangeStyleChecked(repRangeGroup, repRangeStyleLabels.controlledHigherReps);
    });
    await expectPlanBlueprintToMatch({
      confirmedBuilderSteps: {
        frequency: true,
        repRanges: false,
        split: true,
        volume: false,
      },
      repRanges: "controlled_higher_reps",
      split: "upper-lower-4-day",
      trainingFrequencyDaysPerWeek: 4,
      volumePreset: "higher_volume",
      volumePresetSource: "user_selected",
      weeklyRepTargets: expect.arrayContaining(higherVolumePresetWeeklyRepTargets),
    });

    repRangesView.unmount();

    const exercisesView = renderPlanBuilder({
      initialEntries: [planBuilderPaths.exercises],
    });

    await expectPlanBuilderPath(exercisesView.router, planBuilderPaths.exercises);
    await expectConfirmableExercisesStep();
    const summary = screen.getByRole("complementary", { name: /plan blueprint summary/i });

    expectBlueprintSummaryField(summary, "Volume preset", "Higher volume");

    exercisesView.unmount();
    renderPlanBuilder({ initialEntries: [planBuilderPaths.exercises] });
    await expectConfirmableExercisesStep();
  });

  it("marks Volume unconfirmed after Volume changes while leaving Exercises openable", async () => {
    const user = userEvent.setup();

    await saveConfirmedPlanBuilderProgressForTest({
      repRangeStyle: "balanced_hypertrophy",
      split: "upper-lower-4-day",
      trainingFrequencyDaysPerWeek: 4,
      volumePreset: "balanced",
    });

    const volumeView = renderPlanBuilder({ initialEntries: [planBuilderPaths.volume] });
    const volumePresetGroup = await screen.findByRole("group", { name: /volume preset/i });
    const weeklyTargets = await screen.findByRole("region", { name: /weekly volume targets/i });
    const chestRow = getListItemByLabel(weeklyTargets, "Chest");

    await user.click(within(volumePresetGroup).getByText("Conservative"));

    await waitFor(() => {
      expect(within(volumePresetGroup).getByRole("radio", { name: /conservative/i })).toBeChecked();
    });
    await expectPlanBlueprintToMatch({
      confirmedBuilderSteps: {
        frequency: true,
        repRanges: true,
        split: true,
        volume: false,
      },
      volumePreset: "conservative",
      volumePresetSource: "user_selected",
      weeklyRepTargets: expect.arrayContaining(conservativePresetWeeklyRepTargets),
    });
    expect(within(chestRow).getByText("60 reps/week")).toBeVisible();
    expect(within(chestRow).getByText("5-8 sets/week")).toBeVisible();

    volumeView.unmount();

    const exercisesView = renderPlanBuilder({
      initialEntries: [planBuilderPaths.exercises],
    });

    await expectPlanBuilderPath(exercisesView.router, planBuilderPaths.exercises);
    await expectConfirmableExercisesStep();
  });

  it("navigates back from Weekly volume targets to Rep ranges", async () => {
    const user = userEvent.setup();

    await saveConfirmedFourDayUpperLowerTrainingSplit();
    await planBuilderService.confirmSelectedRepRangeStyle({
      repRangeStyle: "balanced_hypertrophy",
      timestamp: "2026-05-31T08:08:00.000Z",
    });

    const { router } = renderPlanBuilder({ initialEntries: [planBuilderPaths.volume] });

    expect(await screen.findByRole("heading", { name: /set your training volume/i })).toBeVisible();

    await user.click(screen.getByRole("link", { name: /back to rep ranges/i }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(planBuilderPaths.repRanges);
    });
    expect(await screen.findByRole("heading", { name: /^rep ranges$/i })).toBeVisible();
    expect(
      within(await screen.findByRole("list", { name: /plan builder steps/i })).getByText(
        "Rep ranges",
      ),
    ).toHaveAttribute("aria-current", "step");
  });

  it("navigates backward through the Plan Builder stepper and returns forward when downstream output is still confirmed", async () => {
    const user = userEvent.setup();

    await saveConfirmedPlanBuilderProgressForTest({
      repRangeStyle: "balanced_hypertrophy",
      split: "upper-lower-4-day",
      trainingFrequencyDaysPerWeek: 4,
      volumePreset: "balanced",
    });

    const { router } = renderPlanBuilder({ initialEntries: [planBuilderPaths.volume] });

    expect(await screen.findByRole("heading", { name: /set your training volume/i })).toBeVisible();

    await user.click(screen.getByRole("button", { name: /frequency/i }));
    await expectPlanBuilderPath(router, planBuilderPaths.frequency);

    const frequencyGroup = await screen.findByRole("group", { name: /training frequency/i });

    await user.click(within(frequencyGroup).getByRole("radio", { name: /4 days per week/i }));
    await user.click(screen.getByRole("button", { name: /volume/i }));

    await expectPlanBuilderPath(router, planBuilderPaths.volume);
    expect(await screen.findByRole("heading", { name: /set your training volume/i })).toBeVisible();
  });

  it("allows stepper forward navigation after an upstream change stales downstream output", async () => {
    const user = userEvent.setup();

    await saveConfirmedPlanBuilderProgressForTest({
      repRangeStyle: "balanced_hypertrophy",
      split: "upper-lower-4-day",
      trainingFrequencyDaysPerWeek: 4,
      volumePreset: "balanced",
    });

    const { router } = renderPlanBuilder({ initialEntries: [planBuilderPaths.volume] });

    expect(await screen.findByRole("heading", { name: /set your training volume/i })).toBeVisible();

    await user.click(screen.getByRole("button", { name: /rep ranges/i }));
    await expectPlanBuilderPath(router, planBuilderPaths.repRanges);

    const repRangeGroup = await screen.findByRole("group", { name: /rep range style/i });

    await user.click(within(repRangeGroup).getByText(repRangeStyleLabels.controlledHigherReps));
    await user.click(
      within(screen.getByRole("list", { name: /plan builder steps/i })).getByRole("button", {
        name: /volume/i,
      }),
    );

    await expectPlanBuilderPath(router, planBuilderPaths.volume);
    expect(await screen.findByRole("heading", { name: /set your training volume/i })).toBeVisible();
  });

  it("navigates backward from the wide Plan Blueprint progress summary", async () => {
    const user = userEvent.setup();

    mockPlanBuilderMediaQueries({ isLargeScreen: true, isWideDesktop: true });
    await saveConfirmedFourDayUpperLowerTrainingSplit();

    const { router } = renderPlanBuilder({ initialEntries: [planBuilderPaths.repRanges] });

    await user.click(await screen.findByRole("button", { name: /go to training schedule/i }));

    await expectPlanBuilderPath(router, planBuilderPaths.frequency);
    expect(await screen.findByRole("heading", { name: /training schedule/i })).toBeVisible();

    await user.click(await screen.findByRole("button", { name: /go to rep ranges/i }));

    await expectPlanBuilderPath(router, planBuilderPaths.repRanges);
    expect(await screen.findByRole("heading", { name: /^rep ranges$/i })).toBeVisible();
  });

  it("navigates to Volume from the wide Plan Blueprint progress summary", async () => {
    const user = userEvent.setup();

    mockPlanBuilderMediaQueries({ isLargeScreen: true, isWideDesktop: true });
    await saveConfirmedPlanBuilderProgressForTest({
      repRangeStyle: "balanced_hypertrophy",
      split: "upper-lower-4-day",
      trainingFrequencyDaysPerWeek: 4,
      volumePreset: "balanced",
    });

    const { router } = renderPlanBuilder({ initialEntries: [planBuilderPaths.exercises] });

    await user.click(await screen.findByRole("button", { name: /go to volume/i }));

    await expectPlanBuilderPath(router, planBuilderPaths.volume);
    expect(await screen.findByRole("heading", { name: /set your training volume/i })).toBeVisible();
  });

  it("keeps the Plan Blueprint summary on Balanced hypertrophy when the persisted Recommended Default is explicitly reselected", async () => {
    const user = userEvent.setup();
    await saveConfirmedFourDayUpperLowerTrainingSplit();

    renderPlanBuilder({ initialEntries: [planBuilderPaths.repRanges] });

    const repRangeGroup = await screen.findByRole("group", { name: /rep range style/i });
    const summary = screen.getByRole("complementary", { name: /plan blueprint summary/i });

    expectBlueprintSummaryField(summary, "Rep ranges", repRangeStyleLabels.balancedHypertrophy);

    await user.click(within(repRangeGroup).getByText(repRangeStyleLabels.balancedHypertrophy));

    await waitFor(async () => {
      expect((await planBuilderService.getOrCreatePlanBlueprint()).repRanges).toBe(
        "balanced_hypertrophy",
      );
    });
    expectBlueprintSummaryField(summary, "Rep ranges", repRangeStyleLabels.balancedHypertrophy);
  });

  it("shows a single active Rep Range Style card and moves it when the choice changes", async () => {
    const user = userEvent.setup();

    await saveConfirmedFourDayUpperLowerTrainingSplit();

    renderPlanBuilder({ initialEntries: [planBuilderPaths.repRanges] });

    const repRangeGroup = await screen.findByRole("group", { name: /rep range style/i });

    expectOnlyRepRangeStyleCardSelected(
      repRangeGroup,
      repRangeStyleLabels.balancedHypertrophy,
      repRangeStyleLabels.controlledHigherReps,
    );

    await user.click(within(repRangeGroup).getByText(repRangeStyleLabels.controlledHigherReps));

    await waitFor(() => {
      expectRepRangeStyleChecked(repRangeGroup, repRangeStyleLabels.controlledHigherReps);
    });

    expectOnlyRepRangeStyleCardSelected(
      repRangeGroup,
      repRangeStyleLabels.controlledHigherReps,
      repRangeStyleLabels.balancedHypertrophy,
    );
  });

  it("preserves a saved non-default Rep Range Style when reopening the step", async () => {
    await saveConfirmedFourDayUpperLowerTrainingSplit();
    await planBuilderService.updateRepRangeStyle({
      repRangeStyle: "controlled_higher_reps",
      timestamp: "2026-05-30T11:42:00.000Z",
    });

    const firstView = renderPlanBuilder({ initialEntries: [planBuilderPaths.repRanges] });

    const repRangeGroup = await screen.findByRole("group", { name: /rep range style/i });

    expectRepRangeStyleChecked(repRangeGroup, repRangeStyleLabels.controlledHigherReps);
    expectBlueprintSummaryField(
      screen.getByRole("complementary", { name: /plan blueprint summary/i }),
      "Rep ranges",
      repRangeStyleLabels.controlledHigherReps,
    );
    expect(
      within(repRangeGroup).getByRole("radio", { name: /balanced hypertrophy/i }),
    ).not.toBeChecked();

    firstView.unmount();
    renderPlanBuilder({ initialEntries: [planBuilderPaths.repRanges] });

    const resumedRepRangeGroup = await screen.findByRole("group", { name: /rep range style/i });

    expectRepRangeStyleChecked(resumedRepRangeGroup, repRangeStyleLabels.controlledHigherReps);
    expectBlueprintSummaryField(
      screen.getByRole("complementary", { name: /plan blueprint summary/i }),
      "Rep ranges",
      repRangeStyleLabels.controlledHigherReps,
    );
  });

  it("shows data-driven Rep Range Style notes and targets without rendering advanced programming controls", async () => {
    const user = userEvent.setup();

    await saveConfirmedFourDayUpperLowerTrainingSplit();

    renderPlanBuilder({ initialEntries: [planBuilderPaths.repRanges] });

    const repRangeGroup = await screen.findByRole("group", { name: /rep range style/i });
    const options = within(repRangeGroup);

    expect(options.getByText("Heavier main lifts with slightly lower reps.")).toBeVisible();
    expect(
      options.queryByText(
        "Biases the week toward lower-rep top work on the main lifts before accessories climb.",
      ),
    ).not.toBeInTheDocument();
    expect(
      options.queryByText("Best fit for 4 days/week, Upper/Lower, and a muscle-building goal."),
    ).not.toBeInTheDocument();
    expect(
      options.queryByText(
        "Useful when you want slightly lighter loading and more controlled fatigue across the week.",
      ),
    ).not.toBeInTheDocument();
    expect(options.getAllByText("Main compounds")).toHaveLength(3);
    expect(options.getAllByText("Secondary compounds")).toHaveLength(3);
    expect(options.getAllByText("Accessories")).toHaveLength(3);
    expect(options.queryByText("Select")).not.toBeInTheDocument();
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
    expect(screen.queryByText(/rest time recommendation/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/load recommendation/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/advanced programming controls/i)).not.toBeInTheDocument();

    await user.click(options.getByText(repRangeStyleLabels.strengthLeaning));

    await waitFor(() => {
      expectRepRangeStyleChecked(repRangeGroup, repRangeStyleLabels.strengthLeaning);
    });

    expect(options.getByText("4-6 reps")).toBeVisible();
    expect(options.getAllByText("6-8 reps")).toHaveLength(2);
    expect(options.getByText("8-12 reps")).toBeVisible();
    expect(options.getByText("10-15 reps")).toBeVisible();
  });

  it("updates Rep Range Style explanation bullets and uses the approved boundary and next-step copy", async () => {
    const user = userEvent.setup();

    await planBuilderService.confirmSelectedTrainingFrequency({
      timestamp: "2026-05-30T11:47:00.000Z",
      trainingFrequencyDaysPerWeek: 4,
    });
    await planBuilderService.confirmSelectedTrainingSplit({
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
    expect(screen.queryByRole("heading", { name: "What happens next" })).not.toBeInTheDocument();
    expect(screen.queryByText(repRangeStyleNextStepCopy)).not.toBeInTheDocument();
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

  it.each(
    selectableTrainingSplitCases,
  )("shows only the approved selectable Training Splits for $daysPerWeek days/week", async ({
    daysPerWeek,
    expectedLabels,
    recommendedLabel,
  }) => {
    await planBuilderService.confirmSelectedTrainingFrequency({
      timestamp: "2026-05-30T11:00:00.000Z",
      trainingFrequencyDaysPerWeek: daysPerWeek,
    });

    renderPlanBuilder({ initialEntries: [planBuilderPaths.frequency] });

    const splitGroup = await getTrainingScheduleSplitSection();
    const splitOptions = within(splitGroup);

    expect(splitOptions.getAllByRole("radio")).toHaveLength(expectedLabels.length);
    expect(
      splitOptions.getByRole("radio", { name: getLabelMatcher(recommendedLabel) }),
    ).toBeChecked();
    expect(within(splitGroup).getByText("Best fit")).toBeVisible();

    for (const label of expectedLabels) {
      expect(splitOptions.getByText(label)).toBeVisible();
      expect(splitOptions.getByRole("radio", { name: getLabelMatcher(label) })).toBeVisible();
    }
  });

  it("shows split benefits in selectable split cards", async () => {
    const user = userEvent.setup();

    renderPlanBuilder({ initialEntries: [planBuilderPaths.frequency] });

    const splitGroup = await getTrainingScheduleSplitSection();

    expect(within(splitGroup).getByRole("radio", { name: /3-day full body/i })).toBeChecked();
    expect(within(splitGroup).getByText("Muscles trained 3x/week")).toBeVisible();
    expect(within(splitGroup).getByText(trainingSplitLabels.alternatingFullBodyAB)).toBeVisible();
    expect(within(splitGroup).getByText("Upper / Lower / Full Body")).toBeVisible();
    expect(
      within(splitGroup).queryByText("More variety, slightly more complex."),
    ).not.toBeInTheDocument();
    expect(
      within(splitGroup).queryByText("Mixed emphasis, less repeated full-body work."),
    ).not.toBeInTheDocument();
    expect(within(splitGroup).queryByText("Select")).not.toBeInTheDocument();

    await user.click(within(splitGroup).getByText(trainingSplitLabels.alternatingFullBodyAB));

    await waitFor(() => {
      expect(
        within(splitGroup).getByRole("radio", {
          name: getLabelMatcher(trainingSplitLabels.alternatingFullBodyAB),
        }),
      ).toBeChecked();
    });

    expect(within(splitGroup).getByText(trainingSplitLabels.alternatingFullBodyAB)).toBeVisible();
    expect(within(splitGroup).getByText("Muscles trained 3x/week")).toBeVisible();
  });

  it.each(
    singleSelectableTrainingSplitCases,
  )("keeps Training schedule actionable for $daysPerWeek days/week when only one Training Split is selectable", async ({
    daysPerWeek,
    expectedSplitId,
    label,
  }) => {
    const user = userEvent.setup();
    const { router } = renderPlanBuilder({ initialEntries: [planBuilderPaths.frequency] });

    await selectTrainingFrequency(user, daysPerWeek);

    const splitGroup = await getTrainingScheduleSplitSection();
    const splitOptions = within(splitGroup);

    expect(splitOptions.getAllByRole("radio")).toHaveLength(1);
    expectTrainingSplitChecked(splitGroup, label);
    expect(screen.getByRole("button", { name: /continue to rep ranges/i })).toBeVisible();

    await user.click(screen.getByRole("button", { name: /continue to rep ranges/i }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(planBuilderPaths.repRanges);
    });
    expect(await screen.findByRole("heading", { name: /^rep ranges$/i })).toBeVisible();
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

    const splitGroup = await getTrainingScheduleSplitSection();

    await selectTrainingSplit(user, splitGroup, trainingSplitLabels.rotatingPushPullLegs);
    await expectPersistedTrainingSplit("rotating-push-pull-legs");

    firstView.unmount();
    await confirmSelectedTrainingFrequencyForTest(4);
    renderPlanBuilder({ initialEntries: [planBuilderPaths.frequency] });

    const resumedSplitGroup = await getTrainingScheduleSplitSection();

    expectTrainingSplitChecked(resumedSplitGroup, trainingSplitLabels.rotatingPushPullLegs);
  });

  it("does not retain an incompatible selected Training Split after the training frequency changes", async () => {
    const user = userEvent.setup();

    renderPlanBuilder({ initialEntries: [planBuilderPaths.frequency] });

    await selectTrainingFrequency(user, 4);

    const splitGroup = await getTrainingScheduleSplitSection();

    await selectTrainingSplit(user, splitGroup, trainingSplitLabels.rotatingPushPullLegs);
    await expectPersistedTrainingSplit("rotating-push-pull-legs");

    const summary = await screen.findByRole("complementary", {
      name: /plan blueprint summary/i,
    });
    const resumedFrequencyGroup = await screen.findByRole("group", {
      name: /training frequency/i,
    });

    await user.click(
      within(resumedFrequencyGroup).getByRole("radio", {
        name: getLabelMatcher(getTrainingFrequencyOptionLabel(3)),
      }),
    );

    await expectTrainingFrequencyChecked(resumedFrequencyGroup, 3);
    await expectPersistedTrainingSplit(null);
    expectBlueprintSummaryValueAbsent(summary, trainingSplitLabels.rotatingPushPullLegs);
    expectBlueprintSummaryField(summary, "Split", "Pending");

    const resumedSplitGroup = await getTrainingScheduleSplitSection();

    await waitFor(() => {
      expectTrainingSplitChecked(resumedSplitGroup, trainingSplitLabels.fullBody3Day);
    });
  });

  it("shows the builder steps, disables Back on Frequency, and continues from Frequency to Rep ranges", async () => {
    const user = userEvent.setup();

    const { router } = renderPlanBuilder({ initialEntries: [planBuilderPaths.frequency] });

    const stepList = await screen.findByRole("list", { name: /plan builder steps/i });

    expect(within(stepList).getByText("Frequency")).toHaveAttribute("aria-current", "step");
    expect(within(stepList).getByText("Rep ranges")).toBeVisible();
    expect(within(stepList).getByText("Volume")).toBeVisible();
    expect(within(stepList).getByText("Exercises")).toBeVisible();
    expect(within(stepList).getByText("Generate")).toBeVisible();
    expect(await screen.findByRole("button", { name: /^back$/i })).toBeDisabled();

    const lockedRepRangesStep = within(stepList).getByRole("button", {
      name: /rep ranges step locked/i,
    });

    expect(lockedRepRangesStep).toHaveAttribute("aria-disabled", "true");

    await user.click(lockedRepRangesStep);

    expect(
      await screen.findByText("Confirm Training schedule to unlock Rep ranges.", {
        selector: ".plan-builder-stepper-notice",
      }),
    ).toBeVisible();
    expect(router.state.location.pathname).toBe(planBuilderPaths.frequency);

    await user.click(await screen.findByRole("button", { name: /continue to rep ranges/i }));

    expect(await screen.findByRole("heading", { name: /^rep ranges$/i })).toBeVisible();
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
    queryClient,
    router,
  };
}

async function expectPlanBuilderPath(router: ReturnType<typeof createAppRouter>, pathname: string) {
  await waitFor(() => {
    expect(router.state.location.pathname).toBe(pathname);
  });
}

async function expectPlanBlueprintToMatch(expected: object) {
  await waitFor(async () => {
    expect(await planBuilderService.getOrCreatePlanBlueprint()).toMatchObject(expected);
  });
}

function mockPlanBuilderMediaQueries({
  isLargeScreen,
  isWideDesktop,
}: {
  isLargeScreen: boolean;
  isWideDesktop: boolean;
}) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      addEventListener: () => {},
      addListener: () => {},
      dispatchEvent: () => false,
      matches: query.includes("2200") ? isWideDesktop : isLargeScreen,
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

async function getOnePageSectionButton(title: string) {
  const label = await screen.findByText(title);
  const button = label.closest("button");

  if (!button) {
    throw new Error(`Expected a one-page section button for "${title}".`);
  }

  return button;
}

async function expectReadOnlyExercisesStep() {
  expect(
    await screen.findByRole("heading", { level: 1, name: "Exercise foundation" }),
  ).toBeVisible();
  expect(screen.getByText(exerciseFoundationIntroText)).toBeVisible();
  expect(await screen.findByRole("button", { name: /choose .* exercise/i })).toBeDisabled();
  expect(screen.queryByText("Rotation pool preview")).not.toBeInTheDocument();
  expect(screen.queryByText("Exercise preferences · optional")).not.toBeInTheDocument();
  expect(screen.queryAllByRole("button", { name: /choose|change/i }).length).toBeGreaterThan(0);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
}

async function expectExercisesSetupState() {
  expect(await screen.findByRole("heading", { name: "Exercises needs setup" })).toBeVisible();
  expect(
    screen.getByText("Choose a compatible split and weekly volume before selecting exercises."),
  ).toBeVisible();
}

async function expectConfirmableExercisesStep() {
  expect(
    await screen.findByRole("heading", { level: 1, name: "Exercise foundation" }),
  ).toBeVisible();
  expect(screen.getByText(exerciseFoundationIntroText)).toBeVisible();
  expect(await screen.findByText(/\d+ of \d+ main compounds selected/i)).toBeVisible();
  expect(screen.getAllByText("Rotation pool").length).toBeGreaterThan(0);
  expect(screen.queryByText("Suggested coverage preview")).not.toBeInTheDocument();
  expect(
    screen.queryByText("Coverage is not confirmed until main compounds are selected."),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByText("Exercise selection will be editable in the next iteration."),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: /continue to generate/i })).toBeEnabled();
  expect(screen.queryByText("Exercise preferences · optional")).not.toBeInTheDocument();
  expect(screen.queryAllByRole("button", { name: /change/i }).length).toBeGreaterThan(0);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
}

async function expectGenerateStepComingNext() {
  expect(await screen.findByRole("heading", { name: /generate training plan/i })).toBeVisible();
  expect(
    screen.getByText(
      /split-derived Workout Templates, selected main compounds, weekly volume targets, rep range style, and Superset Groups/i,
    ),
  ).toBeVisible();
  expect(screen.getByRole("button", { name: /^generate training plan$/i })).toBeEnabled();
}

function expectBlueprintSummaryField(summary: HTMLElement, label: string, value: string) {
  const labelNode = within(getBlueprintSummaryFields(summary)).getByText(label);
  const fieldNode = labelNode.closest("div");

  if (!fieldNode) {
    throw new Error(`Plan Blueprint summary field "${label}" was not found.`);
  }

  expect(within(fieldNode).getByText(value)).toBeVisible();
}

function expectBlueprintSummaryBadge(summary: HTMLElement, value: string) {
  expect(within(getBlueprintSummaryTitle(summary)).getByText(value)).toBeVisible();
}

function expectBlueprintSummaryLabel(summary: HTMLElement, label: string) {
  expect(within(getBlueprintSummaryFields(summary)).getByText(label)).toBeVisible();
}

function expectBlueprintSummaryValue(summary: HTMLElement, value: string) {
  expect(within(getBlueprintSummaryFields(summary)).getByText(value)).toBeVisible();
}

function expectBlueprintSummaryValueAbsent(summary: HTMLElement, value: string) {
  expect(within(getBlueprintSummaryFields(summary)).queryByText(value)).not.toBeInTheDocument();
}

function createBalancedFullBodyDefaults() {
  return {
    ...createRecommendedTrainingVolumeConfiguration(),
    repRanges: "balanced_hypertrophy" as const,
    split: "full-body-3-day" as const,
  };
}

function getBlueprintSummaryFields(summary: HTMLElement) {
  const fields = summary.querySelector(".plan-blueprint-header__fields");

  if (!(fields instanceof HTMLElement)) {
    throw new Error("Plan Blueprint summary fields were not found.");
  }

  return fields;
}

function getBlueprintSummaryTitle(summary: HTMLElement) {
  const title = summary.querySelector(".plan-blueprint-header__title");

  if (!(title instanceof HTMLElement)) {
    throw new Error("Plan Blueprint summary title was not found.");
  }

  return title;
}

async function saveConfirmedFourDayTrainingFrequency() {
  await confirmSelectedTrainingFrequencyForTest(4, "2026-05-30T11:30:00.000Z");
}

async function saveConfirmedFourDayUpperLowerTrainingSplit() {
  await saveConfirmedFourDayTrainingFrequency();
  await planBuilderService.confirmSelectedTrainingSplit({
    split: "upper-lower-4-day",
    timestamp: "2026-05-30T11:31:00.000Z",
  });
}

async function saveConfirmedPlanBuilderProgressForTest({
  repRangeStyle,
  split,
  trainingFrequencyDaysPerWeek,
  volumePreset,
}: ConfirmedPlanBuilderProgressForTest) {
  await saveConfirmedVolumeStepForTest({
    repRangeStyle,
    split,
    trainingFrequencyDaysPerWeek,
    volumePreset,
  });

  await saveMainCompoundSelectionsForTest(completeMainCompoundSelections);
}

async function saveMainCompoundSelectionsForTest(
  mainCompoundSelections: ReadonlyArray<(typeof completeMainCompoundSelections)[number]>,
) {
  const configuredBlueprint = await planBuilderService.getOrCreatePlanBlueprint();

  await db.planBlueprints.put({
    ...configuredBlueprint,
    mainCompoundSelections,
  });
}

async function saveConfirmedVolumeStepForTest({
  enabledOptionalVolumeTargets = [],
  repRangeStyle,
  split,
  trainingFrequencyDaysPerWeek,
  volumePreset,
}: ConfirmedPlanBuilderProgressForTest) {
  await planBuilderService.confirmSelectedTrainingFrequency({
    timestamp: "2026-05-31T09:00:00.000Z",
    trainingFrequencyDaysPerWeek,
  });
  await planBuilderService.confirmSelectedTrainingSplit({
    split,
    timestamp: "2026-05-31T09:01:00.000Z",
  });
  await planBuilderService.confirmSelectedRepRangeStyle({
    repRangeStyle,
    timestamp: "2026-05-31T09:02:00.000Z",
  });

  let trainingVolumeBlueprint = await planBuilderService.initializeTrainingVolume({
    timestamp: "2026-05-31T09:03:00.000Z",
  });

  if (trainingVolumeBlueprint.volumePreset !== volumePreset) {
    trainingVolumeBlueprint = await planBuilderService.updateTrainingVolumePreset({
      timestamp: "2026-05-31T09:04:00.000Z",
      volumePreset,
    });
  }

  for (const muscleGroup of enabledOptionalVolumeTargets) {
    trainingVolumeBlueprint = await planBuilderService.updateOptionalVolumeTarget({
      isEnabled: true,
      muscleGroup,
      timestamp: "2026-05-31T09:04:30.000Z",
    });
  }

  if (!isTrainingVolumeConfiguration(trainingVolumeBlueprint)) {
    throw new Error("Expected a Training Volume configuration before confirmation.");
  }

  await planBuilderService.confirmSelectedTrainingVolume({
    timestamp: "2026-05-31T09:05:00.000Z",
    trainingVolumeConfiguration: trainingVolumeBlueprint,
  });
}

async function confirmSelectedTrainingFrequencyForTest(
  trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek,
  timestamp = "2026-05-30T11:29:00.000Z",
) {
  await planBuilderService.confirmSelectedTrainingFrequency({
    timestamp,
    trainingFrequencyDaysPerWeek,
  });
}

async function selectTrainingFrequency(
  user: PlanBuilderTestUser,
  daysPerWeek: TrainingFrequencyDaysPerWeek,
) {
  const frequencyGroup = await screen.findByRole("group", {
    name: /training frequency/i,
  });

  await user.click(
    within(frequencyGroup).getByRole("radio", {
      name: getLabelMatcher(getTrainingFrequencyOptionLabel(daysPerWeek)),
    }),
  );
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
        name: getLabelMatcher(getTrainingFrequencyOptionLabel(daysPerWeek)),
      }),
    ).toBeChecked();
  });
}

async function getTrainingScheduleSplitSection() {
  const heading = await screen.findByRole("heading", { name: /choose your weekly split/i });
  const section = heading.closest("section");

  if (!(section instanceof HTMLElement)) {
    throw new Error("Expected the Training schedule split section.");
  }

  return section;
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

function getRepRangeStyleOptionCard(repRangeGroup: HTMLElement, label: string) {
  const radio = within(repRangeGroup).getByRole("radio", {
    name: getLabelMatcher(label),
  });
  const optionCard = radio.closest("label");

  if (!optionCard) {
    throw new Error(`Rep Range Style option card for "${label}" was not found.`);
  }

  return optionCard;
}

function expectOnlyRepRangeStyleCardSelected(
  repRangeGroup: HTMLElement,
  selectedLabel: string,
  unselectedLabel: string,
) {
  expect(within(repRangeGroup).queryByText("Selected")).not.toBeInTheDocument();
  expect(
    within(getRepRangeStyleOptionCard(repRangeGroup, selectedLabel)).getByRole("radio", {
      name: getLabelMatcher(selectedLabel),
    }),
  ).toBeChecked();
  expect(
    within(getRepRangeStyleOptionCard(repRangeGroup, unselectedLabel)).getByRole("radio", {
      name: getLabelMatcher(unselectedLabel),
    }),
  ).not.toBeChecked();
}

function getRepRangeStyleEffectsPanel() {
  return screen.getByRole("region", { name: /how this affects your plan/i });
}

function getListItemByLabel(container: HTMLElement, label: string) {
  const rowLabel = within(container).getByText(label);
  const row = rowLabel.closest("li");

  if (!(row instanceof HTMLLIElement)) {
    throw new Error(`Expected ${label} to render inside a list item.`);
  }

  return row;
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

function getLabelMatcher(label: string) {
  return new RegExp(escapeRegExp(label), "i");
}

function getTrainingFrequencyOptionLabel(daysPerWeek: TrainingFrequencyDaysPerWeek) {
  return `${daysPerWeek} days per week`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
