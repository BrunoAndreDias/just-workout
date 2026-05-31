import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../app/local-database";
import { createAppRouter } from "../app/router";
import {
  deriveAutomaticExerciseSelectionRules,
  type ExerciseSelectionPreferenceItem,
  type ExerciseSelectionPreferenceListId,
  type ExerciseSelectionPreferences,
} from "./exercise-selection-preferences";
import type { RepRangeStyleId, TrainingFrequencyDaysPerWeek } from "./plan-blueprint";
import { planBuilderPaths } from "./plan-builder-paths";
import { planBuilderService } from "./plan-builder-service";
import type { TrainingSplitId } from "./training-split";
import { isTrainingVolumeConfiguration, type VolumePresetId } from "./training-volume";

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

const weeklyVolumeTargetCopyPatterns = [
  /set weekly rep targets for each muscle group before exercises are selected/i,
  /just workout will translate those weekly targets into sets and reps across your training days later/i,
  /weekly targets only: these targets describe your full training week/i,
  /just workout will distribute your weekly reps across your training days/i,
  /compound and isolation exercises will both count toward the same weekly muscle-group targets/i,
  /you will refine the exact exercises later, after the weekly targets are in place/i,
] as const;

const weeklyVolumeExcludedContentPatterns = [
  /strongplan/i,
  /exercise selection/i,
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
  /upper a/i,
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

const defaultExerciseStepIncludedEquipmentLabels = [
  "Barbell",
  "Dumbbells",
  "Machines",
  "Cables",
  "Pull-up bar",
  "Bodyweight",
] as const;

const defaultExerciseStepMovementPatternLabels = [
  "Horizontal push",
  "Horizontal pull",
  "Vertical push",
  "Vertical pull",
  "Elbow flexion",
  "Elbow extension",
  "Quad dominant",
  "Hip/hamstring dominant",
  "Calves/accessories",
] as const;

const defaultExerciseStepAutomaticRuleLabels = [
  "Prioritize compounds for main work",
  "Use isolation work for targeted volume",
  "Keep movement-pattern coverage balanced",
  "Align exercise selection with Weekly Rep Targets",
  "Respect avoided exercises as hard exclusions",
  "Apply rest timing automatically",
] as const;

type ExercisePreferenceChipDraftCase = {
  addedText: string;
  confirmationTimestamp: string;
  entryListName: RegExp;
  initialItem: ExerciseSelectionPreferenceItem;
  inputLabel: RegExp;
  listId: ExerciseSelectionPreferenceListId;
  title: string;
};

const exercisePreferenceChipDraftCases = [
  {
    addedText: "Incline dumbbell press",
    confirmationTimestamp: "2026-05-31T09:06:00.000Z",
    entryListName: /preferred exercise entries/i,
    initialItem: { id: "preferred-1", rawText: "Chest-supported row" },
    inputLabel: /preferred exercises/i,
    listId: "preferredExercises",
    title: "Preferred Exercise",
  },
  {
    addedText: "Behind-the-neck press",
    confirmationTimestamp: "2026-05-31T09:07:00.000Z",
    entryListName: /avoided exercise entries/i,
    initialItem: { id: "avoided-1", rawText: "Upright row" },
    inputLabel: /avoided exercises/i,
    listId: "avoidedExercises",
    title: "Avoided Exercise",
  },
] satisfies ReadonlyArray<ExercisePreferenceChipDraftCase>;

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
  repRangeStyle: RepRangeStyleId;
  split: TrainingSplitId;
  trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek;
  volumePreset: VolumePresetId;
};

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
    expect(await screen.findByText("Build muscle")).toBeVisible();
    expect(await screen.findAllByText("3 days/week")).toHaveLength(2);
    expect(within(summary).getByRole("heading", { name: "Plan blueprint" })).toBeVisible();
    expect(within(summary).getByText("Draft")).toBeVisible();
    expectBlueprintSummaryField(summary, "Goal", "Build muscle");
    expectBlueprintSummaryField(summary, "Frequency", "3 days/week");
    expectBlueprintSummaryField(summary, "Split", "Pending");
    expectBlueprintSummaryField(summary, "Rep ranges", "Pending");
    expect(within(summary).queryByText("Experience")).not.toBeInTheDocument();
    expect(within(summary).queryByText("Generation status")).not.toBeInTheDocument();
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
    expect(
      screen.queryByText(/6-day plans are not available in this first version/i),
    ).not.toBeInTheDocument();

    const summary = screen.getByRole("complementary", { name: /plan blueprint summary/i });

    expect(within(summary).getByRole("heading", { name: "Plan blueprint" })).toBeVisible();
    expect(within(summary).getByText("Goal")).toBeVisible();
    expect(within(summary).getByText("Build muscle")).toBeVisible();
    expect(within(summary).getByText("Frequency")).toBeVisible();
    expect(within(summary).getByText("3 days/week")).toBeVisible();
    expectBlueprintSummaryField(summary, "Split", "Pending");
    expectBlueprintSummaryField(summary, "Rep ranges", "Pending");
    expect(screen.getByRole("button", { name: /^back$/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /continue to split/i })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "What happens next" })).not.toBeInTheDocument();
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
    expect(
      screen.queryByText(/6-day plans are not available in this first version/i),
    ).not.toBeInTheDocument();

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

    await user.click(screen.getByRole("button", { name: /continue to split/i }));

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

    await user.click(screen.getByRole("button", { name: /continue to split/i }));

    const splitGroup = await screen.findByRole("group", { name: /training split/i });
    const summary = screen.getByRole("complementary", { name: /plan blueprint summary/i });

    await waitFor(() => {
      expect(within(splitGroup).getByRole("radio", { name: /4-day upper\/lower/i })).toBeChecked();
    });

    expect(within(summary).getByText("4-Day Upper/Lower")).toBeVisible();
    expectBlueprintSummaryField(summary, "Rep ranges", "Pending");

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

  it("keeps the Split step focused on the Plan Blueprint instead of generated-plan wording", async () => {
    await confirmDefaultTrainingFrequency();
    renderPlanBuilder({ initialEntries: [planBuilderPaths.split] });

    expect(
      await screen.findByRole("heading", { name: /choose your training split/i }),
    ).toBeVisible();
    expect(await screen.findByRole("group", { name: /training split/i })).toBeVisible();
    expect(screen.getByText(/choose a compatible training split for the saved plan blueprint/i));
    expect(screen.queryByText(/generated plan/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue to rep ranges/i })).toBeVisible();
  });

  it("redirects direct access to Split back to Frequency when Training Frequency is configured but not confirmed", async () => {
    await saveFourDayTrainingFrequency();

    const { router } = renderPlanBuilder({ initialEntries: [planBuilderPaths.split] });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(planBuilderPaths.frequency);
    });
    expect(await screen.findByRole("group", { name: /training frequency/i })).toBeVisible();
    expect(
      within(screen.getByRole("complementary", { name: /plan blueprint summary/i })).getByText(
        "4 days/week",
      ),
    ).toBeVisible();
  });

  it("confirms Training Frequency before navigating from Frequency to Split", async () => {
    const user = userEvent.setup();
    const { router } = renderPlanBuilder({ initialEntries: [planBuilderPaths.frequency] });

    await selectTrainingFrequency(user, 4);
    await user.click(screen.getByRole("button", { name: /continue to split/i }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(planBuilderPaths.split);
    });
    await waitFor(async () => {
      expect((await planBuilderService.getOrCreatePlanBlueprint()).confirmedBuilderSteps).toEqual({
        exercises: false,
        frequency: true,
        repRanges: false,
        split: false,
        volume: false,
      });
    });
  });

  it("redirects direct access to Split back to Frequency when a stale confirmed Frequency marker has invalid data", async () => {
    const blueprint = await planBuilderService.getOrCreatePlanBlueprint();

    await db.planBlueprints.put({
      ...blueprint,
      confirmedBuilderSteps: {
        exercises: false,
        frequency: true,
        repRanges: false,
        split: false,
        volume: false,
      },
      trainingFrequencyDaysPerWeek: 6 as TrainingFrequencyDaysPerWeek,
      updatedAt: "2026-05-30T11:35:00.000Z",
    });

    const { router } = renderPlanBuilder({ initialEntries: [planBuilderPaths.split] });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(planBuilderPaths.frequency);
    });
    expect(await screen.findByRole("group", { name: /training frequency/i })).toBeVisible();
  });

  it("renders the Rep Range Style cards, defaults to Balanced hypertrophy on step entry, and saves a new selection immediately", async () => {
    const user = userEvent.setup();

    await saveConfirmedFourDayUpperLowerTrainingSplit();

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
        repRangeStyleLabels.balancedHypertrophy,
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
    expect(within(summary).getByText(repRangeStyleLabels.balancedHypertrophy)).toBeVisible();
  });

  it("redirects direct access to Rep ranges back to Split when no compatible Training Split is saved", async () => {
    await saveConfirmedFourDayTrainingFrequency();

    const { router } = renderPlanBuilder({ initialEntries: [planBuilderPaths.repRanges] });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(planBuilderPaths.split);
    });
    expect(
      await screen.findByRole("heading", { name: /choose your training split/i }),
    ).toBeVisible();
    expect(await screen.findByRole("group", { name: /training split/i })).toBeVisible();
    expect(
      within(screen.getByRole("complementary", { name: /plan blueprint summary/i })).getByText(
        "4 days/week",
      ),
    ).toBeVisible();
  });

  it("confirms Training Split before navigating from Split to Rep ranges", async () => {
    const user = userEvent.setup();
    const { router } = renderPlanBuilder({ initialEntries: [planBuilderPaths.frequency] });

    await selectTrainingFrequency(user, 4);
    const splitGroup = await continueToSplitStep(user);

    await selectTrainingSplit(user, splitGroup, trainingSplitLabels.rotatingPushPullLegs);
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

  it("confirms Rep ranges before navigating from Rep ranges to Volume", async () => {
    const user = userEvent.setup();

    await saveConfirmedFourDayUpperLowerTrainingSplit();

    const { router } = renderPlanBuilder({ initialEntries: [planBuilderPaths.repRanges] });

    expect(await screen.findByRole("heading", { name: /select rep range style/i })).toBeVisible();

    await user.click(screen.getByRole("button", { name: /continue to volume/i }));

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

  it("redirects direct access to Volume back to Split when a stale confirmed Split marker has incompatible data", async () => {
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

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(planBuilderPaths.split);
    });
    expect(await screen.findByRole("group", { name: /training split/i })).toBeVisible();
  });

  it("redirects direct access to Volume back to Rep ranges when the saved Rep Range Style has not been confirmed", async () => {
    await saveConfirmedFourDayUpperLowerTrainingSplit();
    await planBuilderService.updateRepRangeStyle({
      repRangeStyle: "strength_leaning",
      timestamp: "2026-05-31T08:05:00.000Z",
    });

    const { router } = renderPlanBuilder({ initialEntries: [planBuilderPaths.volume] });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(planBuilderPaths.repRanges);
    });
    expect(await screen.findByRole("heading", { name: /select rep range style/i })).toBeVisible();
    expectRepRangeStyleChecked(
      await screen.findByRole("group", { name: /rep range style/i }),
      repRangeStyleLabels.strengthLeaning,
    );
  });

  it("redirects direct access to Volume back to Rep ranges when a stale confirmed Rep Range Style is invalid", async () => {
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

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(planBuilderPaths.repRanges);
    });
    const repRangeGroup = await screen.findByRole("group", { name: /rep range style/i });

    expectRepRangeStyleChecked(repRangeGroup, repRangeStyleLabels.balancedHypertrophy);
    await waitFor(async () => {
      expect(await planBuilderService.getOrCreatePlanBlueprint()).toMatchObject({
        confirmedBuilderSteps: {
          frequency: true,
          repRanges: false,
          split: true,
          volume: false,
        },
        repRanges: "balanced_hypertrophy",
      });
    });
  });

  it("redirects direct access to Exercises back to Volume when Volume has not been confirmed", async () => {
    await saveConfirmedFourDayUpperLowerTrainingSplit();
    await planBuilderService.confirmSelectedRepRangeStyle({
      repRangeStyle: "balanced_hypertrophy",
      timestamp: "2026-05-31T08:06:30.000Z",
    });
    await planBuilderService.initializeTrainingVolume({
      timestamp: "2026-05-31T08:06:31.000Z",
    });

    const { router } = renderPlanBuilder({ initialEntries: [planBuilderPaths.exercises] });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(planBuilderPaths.volume);
    });
    expect(await screen.findByRole("heading", { name: /weekly volume targets/i })).toBeVisible();
  });

  it("redirects direct access to Exercises back to Volume when a stale confirmed Volume marker has invalid data", async () => {
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

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(planBuilderPaths.volume);
    });
    expect(await screen.findByRole("heading", { name: /weekly volume targets/i })).toBeVisible();
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
      });
    });
  });

  it("renders the read-only Step 5 strategy, movement coverage, and equipment screen on direct access when Volume is confirmed", async () => {
    await saveConfirmedPlanBuilderProgressForTest({
      repRangeStyle: "balanced_hypertrophy",
      split: "upper-lower-4-day",
      trainingFrequencyDaysPerWeek: 4,
      volumePreset: "conservative",
    });

    const { router } = renderPlanBuilder({ initialEntries: [planBuilderPaths.exercises] });

    await expectPlanBuilderPath(router, planBuilderPaths.exercises);
    await expectReadOnlyExercisesStep();
    expect(
      within(await screen.findByRole("list", { name: /plan builder steps/i })).getByText(
        "Exercises",
      ),
    ).toHaveAttribute("aria-current", "step");
    const summary = screen.getByRole("complementary", { name: /plan blueprint summary/i });

    expect(summary).toBeVisible();
    expectBlueprintSummaryField(summary, "Volume preset", "Conservative");
    for (const pattern of exercisesStepExcludedContentPatterns) {
      expect(screen.queryByText(pattern)).not.toBeInTheDocument();
    }
  });

  it("shows derived movement-pattern coverage on Step 5 without implying final exercise slots", async () => {
    await saveConfirmedPlanBuilderProgressForTest({
      repRangeStyle: "balanced_hypertrophy",
      split: "upper-lower-4-day",
      trainingFrequencyDaysPerWeek: 4,
      volumePreset: "balanced",
    });

    renderPlanBuilder({ initialEntries: [planBuilderPaths.exercises] });

    const coverageSection = await screen.findByRole("region", {
      name: /movement pattern coverage/i,
    });
    const coverage = within(coverageSection);

    expect(
      coverage.getByText(/read-only in v1 and does not promise final exercise slots/i),
    ).toBeVisible();
    expect(
      coverage.getByText(
        /derived from the current training split, strategy, and weekly rep targets/i,
      ),
    ).toBeVisible();
    expect(
      coverage.getByText(
        /covered across the split's upper sessions while lower days stay focused/i,
      ),
    ).toBeVisible();
    expect(
      coverage.getByText(
        /covered across the split's lower sessions with room for direct accessory work/i,
      ),
    ).toBeVisible();

    for (const patternLabel of [
      "Horizontal push",
      "Horizontal pull",
      "Vertical push",
      "Vertical pull",
      "Elbow flexion",
      "Elbow extension",
      "Quad dominant",
      "Hip/hamstring dominant",
      "Calves/accessories",
    ]) {
      expect(coverage.getByText(patternLabel)).toBeVisible();
    }

    expect(coverage.getAllByText("Direct Weekly Rep Target")).toHaveLength(8);
    expect(coverage.getByText("Indirect support only")).toBeVisible();
  });

  it("shows the Step 5 automatic rules note with passive rest copy and no rest controls", async () => {
    await saveConfirmedPlanBuilderProgressForTest({
      repRangeStyle: "balanced_hypertrophy",
      split: "upper-lower-4-day",
      trainingFrequencyDaysPerWeek: 4,
      volumePreset: "balanced",
    });

    renderPlanBuilder({ initialEntries: [planBuilderPaths.exercises] });

    expect(
      await screen.findByRole("heading", { name: /rules applied automatically/i }),
    ).toBeVisible();
    expectAutomaticExerciseSelectionRulesToBeVisible();
    expectNoManualRestControls();
  });

  it("explains hard exclusions and later conflict handling without Step 5 conflict-resolution controls", async () => {
    await saveConfirmedPlanBuilderProgressForTest({
      repRangeStyle: "balanced_hypertrophy",
      split: "upper-lower-4-day",
      trainingFrequencyDaysPerWeek: 4,
      volumePreset: "balanced",
    });

    renderPlanBuilder({ initialEntries: [planBuilderPaths.exercises] });

    const avoidedExercisesSection = getClosestSection(
      await screen.findByRole("heading", { name: /avoided exercises/i }),
      "Avoided Exercises",
    );

    expect(
      within(avoidedExercisesSection).getByText(
        /optional hard exclusions\. add painful, unavailable, or unsuitable exercises here so just workout excludes them from later training plan generation\./i,
      ),
    ).toBeVisible();

    const continueSection = getClosestSection(
      screen.getByRole("heading", { name: /before you continue/i }),
      "Before you continue",
    );

    expect(
      within(continueSection).getByText(
        /avoided exercises are hard exclusions\. if generation later cannot find a safe viable replacement, review will surface an exercise selection conflict for you to resolve instead of silently keeping the avoided exercise\./i,
      ),
    ).toBeVisible();
    expectNoConflictResolutionControls();
  });

  it("redirects direct access to Review back to Exercises when Exercises has not been confirmed", async () => {
    await saveConfirmedPlanBuilderProgressForTest({
      repRangeStyle: "balanced_hypertrophy",
      split: "upper-lower-4-day",
      trainingFrequencyDaysPerWeek: 4,
      volumePreset: "balanced",
    });

    const { router } = renderPlanBuilder({ initialEntries: [planBuilderPaths.review] });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(planBuilderPaths.exercises);
    });
    await expectReadOnlyExercisesStep();
  });

  it("renders the Review placeholder on direct access when Exercises is confirmed", async () => {
    await saveConfirmedPlanBuilderProgressForTest({
      repRangeStyle: "balanced_hypertrophy",
      split: "upper-lower-4-day",
      trainingFrequencyDaysPerWeek: 4,
      volumePreset: "balanced",
    });
    await planBuilderService.confirmSelectedExerciseSelectionPreferences({
      timestamp: "2026-05-31T09:06:00.000Z",
    });

    const { router } = renderPlanBuilder({ initialEntries: [planBuilderPaths.review] });

    await expectPlanBuilderPath(router, planBuilderPaths.review);
    await expectReviewStepComingNext();
    expect(
      within(await screen.findByRole("list", { name: /plan builder steps/i })).getByText("Review"),
    ).toHaveAttribute("aria-current", "step");
  });

  it("initializes the Balanced volume defaults when Volume opens without saved volume data", async () => {
    await saveConfirmedFourDayUpperLowerTrainingSplit();
    await planBuilderService.confirmSelectedRepRangeStyle({
      repRangeStyle: "balanced_hypertrophy",
      timestamp: "2026-05-31T08:07:00.000Z",
    });

    renderPlanBuilder({ initialEntries: [planBuilderPaths.volume] });

    expect(await screen.findByRole("heading", { name: /weekly volume targets/i })).toBeVisible();

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

    expect(within(summary).getByText("Balanced")).toBeVisible();
  });

  it("continues from Rep ranges into the Weekly volume targets frame with the approved explanatory copy", async () => {
    const user = userEvent.setup();

    await saveConfirmedFourDayUpperLowerTrainingSplit();

    const { router } = renderPlanBuilder({ initialEntries: [planBuilderPaths.repRanges] });

    expect(await screen.findByRole("heading", { name: /select rep range style/i })).toBeVisible();

    await user.click(screen.getByRole("button", { name: /continue to volume/i }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(planBuilderPaths.volume);
    });
    expect(await screen.findByRole("heading", { name: /weekly volume targets/i })).toBeVisible();
    expect(screen.getByRole("heading", { name: /how this works/i })).toBeVisible();
    for (const copyPattern of weeklyVolumeTargetCopyPatterns) {
      expect(screen.getByText(copyPattern)).toBeVisible();
    }
    expect(screen.getByRole("link", { name: /back to rep ranges/i })).toBeVisible();
    expect(
      within(await screen.findByRole("list", { name: /plan builder steps/i })).getByText("Volume"),
    ).toHaveAttribute("aria-current", "step");
    expect(
      screen.queryByRole("heading", { name: /select rep range style/i }),
    ).not.toBeInTheDocument();
    for (const excludedContentPattern of weeklyVolumeExcludedContentPatterns) {
      expect(screen.queryByText(excludedContentPattern)).not.toBeInTheDocument();
    }
  });

  it("renders the required Weekly Rep Target rows with canonical reps, derived set estimates, and quiet adjustment affordances", async () => {
    await saveConfirmedFourDayUpperLowerTrainingSplit();
    await planBuilderService.confirmSelectedRepRangeStyle({
      repRangeStyle: "balanced_hypertrophy",
      timestamp: "2026-05-31T08:07:30.000Z",
    });

    renderPlanBuilder({ initialEntries: [planBuilderPaths.volume] });

    const table = await screen.findByRole("table", { name: /required weekly rep targets/i });
    const rowExpectations = [
      { label: "Chest", reps: "90 reps/week", sets: "8-12 sets/week", status: "Main target" },
      { label: "Back", reps: "90 reps/week", sets: "8-12 sets/week", status: "Main target" },
      { label: "Shoulders", reps: "45 reps/week", sets: "4-6 sets/week", status: "Moderate" },
      { label: "Quads", reps: "90 reps/week", sets: "8-12 sets/week", status: "Main target" },
      {
        label: "Hamstrings/Glutes",
        reps: "90 reps/week",
        sets: "8-12 sets/week",
        status: "Main target",
      },
      { label: "Biceps", reps: "45 reps/week", sets: "4-6 sets/week", status: "Accessory" },
      { label: "Triceps", reps: "45 reps/week", sets: "4-6 sets/week", status: "Accessory" },
    ] as const;

    for (const { label, reps, sets, status } of rowExpectations) {
      const rowLabel = within(table).getByText(label);
      const row = rowLabel.closest("tr");

      if (!(row instanceof HTMLTableRowElement)) {
        throw new Error(`Expected ${label} to render inside a table row.`);
      }

      expect(within(row).getByText(reps)).toBeVisible();
      expect(within(row).getByText(sets)).toBeVisible();
      expect(within(row).getByText(status)).toBeVisible();
      expect(
        within(row).getByRole("button", {
          name: new RegExp(`adjust ${label} target`, "i"),
        }),
      ).toBeDisabled();
    }

    const blueprint = await planBuilderService.getOrCreatePlanBlueprint();

    expect(blueprint.weeklyRepTargets).not.toBeNull();
    for (const target of blueprint.weeklyRepTargets ?? []) {
      expect(target).not.toHaveProperty("estimatedSetRange");
      expect(target).not.toHaveProperty("estimatedSetsPerWeek");
    }
  });

  it("renders Calves and Abs as disabled Optional Volume Targets by default", async () => {
    await saveConfirmedFourDayUpperLowerTrainingSplit();
    await planBuilderService.confirmSelectedRepRangeStyle({
      repRangeStyle: "balanced_hypertrophy",
      timestamp: "2026-05-31T08:07:40.000Z",
    });

    renderPlanBuilder({ initialEntries: [planBuilderPaths.volume] });

    const table = await screen.findByRole("table", { name: /optional volume targets/i });

    for (const label of ["Calves", "Abs"] as const) {
      const row = getTableRowByLabel(table, label);

      expect(within(row).getAllByText("Optional")).toHaveLength(3);
      expect(
        within(row).getByRole("button", { name: new RegExp(`add ${label} target`, "i") }),
      ).toBeEnabled();
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
    const table = await screen.findByRole("table", { name: /required weekly rep targets/i });
    const summary = screen.getByRole("complementary", { name: /plan blueprint summary/i });
    const chestRow = getTableRowByLabel(table, "Chest");
    const shouldersRow = getTableRowByLabel(table, "Shoulders");

    expect(within(volumePresetGroup).getByRole("radio", { name: /conservative/i })).toBeVisible();
    expect(within(volumePresetGroup).getByRole("radio", { name: /balanced/i })).toBeChecked();
    expect(within(volumePresetGroup).getByRole("radio", { name: /higher volume/i })).toBeVisible();
    expect(within(chestRow).getByText("90 reps/week")).toBeVisible();
    expect(within(chestRow).getByText("8-12 sets/week")).toBeVisible();
    expect(within(shouldersRow).getByText("45 reps/week")).toBeVisible();
    expect(within(shouldersRow).getByText("4-6 sets/week")).toBeVisible();
    expect(within(summary).getByText("Balanced")).toBeVisible();

    await user.click(within(volumePresetGroup).getByText("Conservative"));

    await waitFor(() => {
      expect(within(volumePresetGroup).getByRole("radio", { name: /conservative/i })).toBeChecked();
    });
    expect(within(chestRow).getByText("60 reps/week")).toBeVisible();
    expect(within(chestRow).getByText("5-8 sets/week")).toBeVisible();
    expect(within(shouldersRow).getByText("30 reps/week")).toBeVisible();
    expect(within(shouldersRow).getByText("3-4 sets/week")).toBeVisible();
    expect(within(summary).getByText("Conservative")).toBeVisible();
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
    expect(within(summary).getByText("Higher volume")).toBeVisible();
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
    const optionalTable = await screen.findByRole("table", { name: /optional volume targets/i });
    const calvesRow = getTableRowByLabel(optionalTable, "Calves");

    await user.click(within(calvesRow).getByRole("button", { name: /add calves target/i }));

    await waitFor(() => {
      expect(within(calvesRow).getByText("45 reps/week")).toBeVisible();
    });
    expect(within(calvesRow).getByText("4-6 sets/week")).toBeVisible();
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
    expect(within(calvesRow).getByText("60 reps/week")).toBeVisible();
    expect(within(calvesRow).getByText("5-8 sets/week")).toBeVisible();
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
      expect(within(calvesRow).getAllByText("Optional")).toHaveLength(3);
    });
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

    expect(await screen.findByRole("heading", { name: /weekly volume targets/i })).toBeVisible();

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

  it("confirms Exercises before navigating from Exercises to Review", async () => {
    const user = userEvent.setup();

    await saveConfirmedPlanBuilderProgressForTest({
      repRangeStyle: "balanced_hypertrophy",
      split: "upper-lower-4-day",
      trainingFrequencyDaysPerWeek: 4,
      volumePreset: "balanced",
    });

    const { router } = renderPlanBuilder({ initialEntries: [planBuilderPaths.exercises] });

    await expectReadOnlyExercisesStep();

    await user.click(screen.getByRole("button", { name: /continue to review/i }));

    await expectPlanBuilderPath(router, planBuilderPaths.review);
    await expectReviewStepComingNext();
    await expectPlanBlueprintToMatch({
      confirmedBuilderSteps: {
        exercises: true,
        frequency: true,
        repRanges: true,
        split: true,
        volume: true,
      },
    });
  });

  it("auto-commits valid pending Preferred and Avoided Exercises when continuing to Review", async () => {
    const user = userEvent.setup();

    await saveConfirmedPlanBuilderProgressForTest({
      repRangeStyle: "balanced_hypertrophy",
      split: "upper-lower-4-day",
      trainingFrequencyDaysPerWeek: 4,
      volumePreset: "balanced",
    });

    const { router } = renderPlanBuilder({ initialEntries: [planBuilderPaths.exercises] });

    await screen.findByRole("heading", { name: /exercise selection strategy/i });

    await user.type(screen.getByLabelText(/preferred exercises/i), "Incline dumbbell press");
    await user.type(screen.getByLabelText(/avoided exercises/i), "Upright row");
    await user.click(screen.getByRole("button", { name: /continue to review/i }));

    await expectPlanBuilderPath(router, planBuilderPaths.review);
    await expectPlanBlueprintToMatch({
      confirmedBuilderSteps: {
        exercises: true,
        frequency: true,
        repRanges: true,
        split: true,
        volume: true,
      },
      exerciseSelectionPreferences: {
        avoidedExercises: [{ rawText: "Upright row" }],
        preferredExercises: [{ rawText: "Incline dumbbell press" }],
      },
    });
  });

  it("persists committed exercise entries as draft values while pending text stays local to Step 5", async () => {
    const user = userEvent.setup();

    await saveConfirmedPlanBuilderProgressForTest({
      repRangeStyle: "balanced_hypertrophy",
      split: "upper-lower-4-day",
      trainingFrequencyDaysPerWeek: 4,
      volumePreset: "balanced",
    });

    const firstView = renderPlanBuilder({ initialEntries: [planBuilderPaths.exercises] });
    const preferredInput = await screen.findByLabelText(/preferred exercises/i);

    await user.type(preferredInput, "Chest-supported row");
    await expectPlanBlueprintToMatch({
      exerciseSelectionPreferences: {
        avoidedExercises: [],
        preferredExercises: [],
      },
    });

    await user.keyboard("{Enter}");
    await expectPlanBlueprintToMatch({
      exerciseSelectionPreferences: {
        preferredExercises: [{ rawText: "Chest-supported row" }],
      },
    });

    await user.type(screen.getByLabelText(/avoided exercises/i), "Upright row");
    await expectPlanBlueprintToMatch({
      exerciseSelectionPreferences: {
        avoidedExercises: [],
        preferredExercises: [{ rawText: "Chest-supported row" }],
      },
    });

    firstView.unmount();
    renderPlanBuilder({ initialEntries: [planBuilderPaths.exercises] });

    expect(await screen.findByText("Chest-supported row")).toBeVisible();
    expect(screen.getByLabelText(/avoided exercises/i)).toHaveValue("");

    await user.click(screen.getByRole("button", { name: /^remove$/i }));
    await expectPlanBlueprintToMatch({
      exerciseSelectionPreferences: {
        preferredExercises: [],
      },
    });
  });

  it.each(
    exercisePreferenceChipDraftCases,
  )("persists committed $title chip edits as draft state and re-gates Review after Exercises was confirmed", async ({
    addedText,
    confirmationTimestamp,
    entryListName,
    initialItem,
    inputLabel,
    listId,
    title,
  }) => {
    const user = userEvent.setup();

    await saveConfirmedPlanBuilderProgressForTest({
      repRangeStyle: "balanced_hypertrophy",
      split: "upper-lower-4-day",
      trainingFrequencyDaysPerWeek: 4,
      volumePreset: "balanced",
    });
    await planBuilderService.confirmSelectedExerciseSelectionPreferences({
      exerciseSelectionPreferences: createExerciseSelectionPreferencesWithList(listId, [
        initialItem,
      ]),
      timestamp: confirmationTimestamp,
    });

    const firstView = renderPlanBuilder({ initialEntries: [planBuilderPaths.exercises] });

    expect(await screen.findByText(initialItem.rawText)).toBeVisible();

    const exerciseInput = screen.getByLabelText(inputLabel);
    const exerciseForm = getRequiredClosestForm(exerciseInput, title);

    await user.type(exerciseInput, addedText);
    await user.click(within(exerciseForm).getByRole("button", { name: /^add$/i }));

    await expectPlanBlueprintToMatch({
      confirmedBuilderSteps: {
        exercises: false,
      },
      exerciseSelectionPreferences: {
        [listId]: [{ rawText: initialItem.rawText }, { rawText: addedText }],
      },
    });

    firstView.unmount();

    const reviewView = renderPlanBuilder({ initialEntries: [planBuilderPaths.review] });

    await expectPlanBuilderPath(reviewView.router, planBuilderPaths.exercises);
    expect(await screen.findByText(initialItem.rawText)).toBeVisible();
    expect(screen.getByText(addedText)).toBeVisible();

    const initialEntry = getExercisePreferenceListEntry({
      entryListName,
      entryText: initialItem.rawText,
      title,
    });

    await user.click(within(initialEntry).getByRole("button", { name: /^remove$/i }));

    await expectPlanBlueprintToMatch({
      confirmedBuilderSteps: {
        exercises: false,
      },
      exerciseSelectionPreferences: {
        [listId]: [{ rawText: addedText }],
      },
    });
  });

  it("blocks duplicate and conflicting exercise entries with inline validation", async () => {
    const user = userEvent.setup();

    await saveConfirmedPlanBuilderProgressForTest({
      repRangeStyle: "balanced_hypertrophy",
      split: "upper-lower-4-day",
      trainingFrequencyDaysPerWeek: 4,
      volumePreset: "balanced",
    });

    renderPlanBuilder({ initialEntries: [planBuilderPaths.exercises] });

    await user.type(await screen.findByLabelText(/preferred exercises/i), "Incline dumbbell press");
    await user.keyboard("{Enter}");
    await expectPlanBlueprintToMatch({
      exerciseSelectionPreferences: {
        preferredExercises: [{ rawText: "Incline dumbbell press" }],
      },
    });

    await user.type(screen.getByLabelText(/preferred exercises/i), "  incline   dumbbell press ");
    await user.keyboard("{Enter}");

    expect(
      await screen.findByText("This exercise is already in Preferred Exercises."),
    ).toBeVisible();
    await expectPlanBlueprintToMatch({
      exerciseSelectionPreferences: {
        avoidedExercises: [],
        preferredExercises: [{ rawText: "Incline dumbbell press" }],
      },
    });

    const avoidedInput = screen.getByLabelText(/avoided exercises/i);
    const avoidedForm = getRequiredClosestForm(avoidedInput, "Avoided Exercise");

    await user.type(avoidedInput, "incline dumbbell press");
    await user.click(within(avoidedForm).getByRole("button", { name: /^add$/i }));

    expect(
      await screen.findByText(
        "This exercise is already in Preferred Exercises. Remove it there or change this entry.",
      ),
    ).toBeVisible();
    await expectPlanBlueprintToMatch({
      exerciseSelectionPreferences: {
        avoidedExercises: [],
        preferredExercises: [{ rawText: "Incline dumbbell press" }],
      },
    });
  });

  it("blocks normalized exact duplicates within Avoided Exercises with inline validation", async () => {
    const user = userEvent.setup();

    await saveConfirmedPlanBuilderProgressForTest({
      repRangeStyle: "balanced_hypertrophy",
      split: "upper-lower-4-day",
      trainingFrequencyDaysPerWeek: 4,
      volumePreset: "balanced",
    });

    renderPlanBuilder({ initialEntries: [planBuilderPaths.exercises] });

    await user.type(await screen.findByLabelText(/avoided exercises/i), "Upright row");
    await user.keyboard("{Enter}");
    await expectPlanBlueprintToMatch({
      exerciseSelectionPreferences: {
        avoidedExercises: [{ rawText: "Upright row" }],
        preferredExercises: [],
      },
    });

    await user.type(screen.getByLabelText(/avoided exercises/i), "  upright   ROW ");
    await user.keyboard("{Enter}");

    expect(await screen.findByText("This exercise is already in Avoided Exercises.")).toBeVisible();
    await expectPlanBlueprintToMatch({
      exerciseSelectionPreferences: {
        avoidedExercises: [{ rawText: "Upright row" }],
        preferredExercises: [],
      },
    });
  });

  it("blocks conflicting Preferred Exercises when the same normalized text exists in Avoided Exercises", async () => {
    const user = userEvent.setup();

    await saveConfirmedPlanBuilderProgressForTest({
      repRangeStyle: "balanced_hypertrophy",
      split: "upper-lower-4-day",
      trainingFrequencyDaysPerWeek: 4,
      volumePreset: "balanced",
    });

    renderPlanBuilder({ initialEntries: [planBuilderPaths.exercises] });

    await user.type(await screen.findByLabelText(/avoided exercises/i), "Upright row");
    await user.keyboard("{Enter}");
    await expectPlanBlueprintToMatch({
      exerciseSelectionPreferences: {
        avoidedExercises: [{ rawText: "Upright row" }],
        preferredExercises: [],
      },
    });

    const preferredInput = screen.getByLabelText(/preferred exercises/i);
    const preferredForm = getRequiredClosestForm(preferredInput, "Preferred Exercise");

    await user.type(preferredInput, "  upright   ROW ");
    await user.click(within(preferredForm).getByRole("button", { name: /^add$/i }));

    expect(
      await screen.findByText(
        "This exercise is already in Avoided Exercises. Remove it there or change this entry.",
      ),
    ).toBeVisible();
    await expectPlanBlueprintToMatch({
      exerciseSelectionPreferences: {
        avoidedExercises: [{ rawText: "Upright row" }],
        preferredExercises: [],
      },
    });
  });

  it("blocks Continue to Review when pending input is invalid", async () => {
    const user = userEvent.setup();

    await saveConfirmedPlanBuilderProgressForTest({
      repRangeStyle: "balanced_hypertrophy",
      split: "upper-lower-4-day",
      trainingFrequencyDaysPerWeek: 4,
      volumePreset: "balanced",
    });

    const { router } = renderPlanBuilder({ initialEntries: [planBuilderPaths.exercises] });

    await user.type(await screen.findByLabelText(/preferred exercises/i), "Hack squat");
    await user.keyboard("{Enter}");
    await user.type(screen.getByLabelText(/avoided exercises/i), "hack squat");
    await user.click(screen.getByRole("button", { name: /continue to review/i }));

    await expectPlanBuilderPath(router, planBuilderPaths.exercises);
    expect(
      await screen.findByText(
        "This exercise is already in Preferred Exercises. Remove it there or change this entry.",
      ),
    ).toBeVisible();
    await expectPlanBlueprintToMatch({
      confirmedBuilderSteps: {
        exercises: false,
        frequency: true,
        repRanges: true,
        split: true,
        volume: true,
      },
    });
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

    await expectReadOnlyExercisesStep();

    await user.click(screen.getByRole("link", { name: /back to volume/i }));

    await expectPlanBuilderPath(router, planBuilderPaths.volume);
    expect(await screen.findByRole("heading", { name: /weekly volume targets/i })).toBeVisible();
  });

  it("preserves compatible saved Split, Rep ranges, and Volume data after Frequency changes and restores guarded Exercises access after reconfirmation", async () => {
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

    await user.click(within(frequencyGroup).getByText("5 days/week"));
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

    const guardedExercisesView = renderPlanBuilder({
      initialEntries: [planBuilderPaths.exercises],
    });

    await waitFor(() => {
      expect(guardedExercisesView.router.state.location.pathname).toBe(planBuilderPaths.frequency);
    });
    expect(await screen.findByRole("group", { name: /training frequency/i })).toBeVisible();

    const splitGroup = await continueToSplitStep(user);

    expectTrainingSplitChecked(splitGroup, trainingSplitLabels.rotatingPushPullLegs);

    await user.click(screen.getByRole("button", { name: /continue to rep ranges/i }));

    const repRangeGroup = await screen.findByRole("group", { name: /rep range style/i });
    const summary = screen.getByRole("complementary", { name: /plan blueprint summary/i });

    expectRepRangeStyleChecked(repRangeGroup, repRangeStyleLabels.controlledHigherReps);
    expect(within(summary).getByText(trainingSplitLabels.rotatingPushPullLegs)).toBeVisible();
    expect(within(summary).getByText("Higher volume")).toBeVisible();

    guardedExercisesView.unmount();
    renderPlanBuilder({ initialEntries: [planBuilderPaths.exercises] });

    await expectReadOnlyExercisesStep();
  });

  it("preserves saved Rep ranges and Volume data after Split changes and restores guarded Exercises access after reconfirmation", async () => {
    const user = userEvent.setup();

    await saveConfirmedPlanBuilderProgressForTest({
      repRangeStyle: "strength_leaning",
      split: "full-body-3-day",
      trainingFrequencyDaysPerWeek: 3,
      volumePreset: "conservative",
    });

    const splitView = renderPlanBuilder({ initialEntries: [planBuilderPaths.split] });
    const splitGroup = await screen.findByRole("group", { name: /training split/i });

    await selectTrainingSplit(user, splitGroup, trainingSplitLabels.alternatingFullBodyAB);

    await expectPlanBlueprintToMatch({
      confirmedBuilderSteps: {
        frequency: true,
        repRanges: true,
        split: false,
        volume: true,
      },
      repRanges: "strength_leaning",
      split: "alternating-full-body-a-b",
      trainingFrequencyDaysPerWeek: 3,
      volumePreset: "conservative",
      volumePresetSource: "user_selected",
      weeklyRepTargets: expect.arrayContaining(conservativePresetWeeklyRepTargets),
    });

    splitView.unmount();

    const guardedExercisesView = renderPlanBuilder({
      initialEntries: [planBuilderPaths.exercises],
    });

    await expectPlanBuilderPath(guardedExercisesView.router, planBuilderPaths.split);

    const resumedSplitGroup = await screen.findByRole("group", { name: /training split/i });

    expect(resumedSplitGroup).toBeVisible();
    expectTrainingSplitChecked(resumedSplitGroup, trainingSplitLabels.alternatingFullBodyAB);

    await user.click(screen.getByRole("button", { name: /continue to rep ranges/i }));

    const repRangeGroup = await screen.findByRole("group", { name: /rep range style/i });
    const summary = screen.getByRole("complementary", { name: /plan blueprint summary/i });

    expectRepRangeStyleChecked(repRangeGroup, repRangeStyleLabels.strengthLeaning);
    expect(within(summary).getByText(trainingSplitLabels.alternatingFullBodyAB)).toBeVisible();
    expect(within(summary).getByText("Conservative")).toBeVisible();

    guardedExercisesView.unmount();
    renderPlanBuilder({ initialEntries: [planBuilderPaths.exercises] });

    await expectReadOnlyExercisesStep();
  });

  it("preserves canonical Weekly Rep Targets after Rep ranges change and restores guarded Exercises access after reconfirmation", async () => {
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

    const guardedExercisesView = renderPlanBuilder({
      initialEntries: [planBuilderPaths.exercises],
    });

    await expectPlanBuilderPath(guardedExercisesView.router, planBuilderPaths.repRanges);

    const resumedRepRangeGroup = await screen.findByRole("group", { name: /rep range style/i });

    expect(resumedRepRangeGroup).toBeVisible();
    expectRepRangeStyleChecked(resumedRepRangeGroup, repRangeStyleLabels.controlledHigherReps);

    await user.click(screen.getByRole("button", { name: /continue to volume/i }));

    const volumeView = await screen.findByRole("heading", { name: /weekly volume targets/i });
    const requiredTargetsTable = await screen.findByRole("table", {
      name: /required weekly rep targets/i,
    });
    const chestRow = getTableRowByLabel(requiredTargetsTable, "Chest");
    const summary = screen.getByRole("complementary", { name: /plan blueprint summary/i });

    expect(volumeView).toBeVisible();
    expect(within(chestRow).getByText("120 reps/week")).toBeVisible();
    expect(within(chestRow).getByText("8-12 sets/week")).toBeVisible();
    expect(within(summary).getByText("Higher volume")).toBeVisible();

    guardedExercisesView.unmount();

    const guardedVolumeView = renderPlanBuilder({
      initialEntries: [planBuilderPaths.exercises],
    });

    await expectPlanBuilderPath(guardedVolumeView.router, planBuilderPaths.volume);
    expect(await screen.findByRole("heading", { name: /weekly volume targets/i })).toBeVisible();

    await user.click(screen.getByRole("button", { name: /continue to exercises/i }));

    await expectReadOnlyExercisesStep();
  });

  it("marks Volume unconfirmed after Volume changes and restores guarded Exercises access after reconfirmation", async () => {
    const user = userEvent.setup();

    await saveConfirmedPlanBuilderProgressForTest({
      repRangeStyle: "balanced_hypertrophy",
      split: "upper-lower-4-day",
      trainingFrequencyDaysPerWeek: 4,
      volumePreset: "balanced",
    });

    const volumeView = renderPlanBuilder({ initialEntries: [planBuilderPaths.volume] });
    const volumePresetGroup = await screen.findByRole("group", { name: /volume preset/i });
    const requiredTargetsTable = await screen.findByRole("table", {
      name: /required weekly rep targets/i,
    });
    const chestRow = getTableRowByLabel(requiredTargetsTable, "Chest");

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

    const guardedExercisesView = renderPlanBuilder({
      initialEntries: [planBuilderPaths.exercises],
    });

    await expectPlanBuilderPath(guardedExercisesView.router, planBuilderPaths.volume);
    expect(await screen.findByRole("heading", { name: /weekly volume targets/i })).toBeVisible();

    const resumedVolumePresetGroup = await screen.findByRole("group", { name: /volume preset/i });

    expect(
      within(resumedVolumePresetGroup).getByRole("radio", { name: /conservative/i }),
    ).toBeChecked();

    await user.click(screen.getByRole("button", { name: /continue to exercises/i }));

    await expectReadOnlyExercisesStep();
  });

  it("navigates back from Weekly volume targets to Rep ranges", async () => {
    const user = userEvent.setup();

    await saveConfirmedFourDayUpperLowerTrainingSplit();
    await planBuilderService.confirmSelectedRepRangeStyle({
      repRangeStyle: "balanced_hypertrophy",
      timestamp: "2026-05-31T08:08:00.000Z",
    });

    const { router } = renderPlanBuilder({ initialEntries: [planBuilderPaths.volume] });

    expect(await screen.findByRole("heading", { name: /weekly volume targets/i })).toBeVisible();

    await user.click(screen.getByRole("link", { name: /back to rep ranges/i }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(planBuilderPaths.repRanges);
    });
    expect(await screen.findByRole("heading", { name: /select rep range style/i })).toBeVisible();
    expect(
      within(await screen.findByRole("list", { name: /plan builder steps/i })).getByText(
        "Rep ranges",
      ),
    ).toHaveAttribute("aria-current", "step");
  });

  it("navigates back from Rep ranges to Split", async () => {
    const user = userEvent.setup();

    await saveConfirmedFourDayUpperLowerTrainingSplit();

    const { router } = renderPlanBuilder({ initialEntries: [planBuilderPaths.repRanges] });

    expect(await screen.findByRole("heading", { name: /select rep range style/i })).toBeVisible();

    await user.click(screen.getByRole("link", { name: /back to split/i }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(planBuilderPaths.split);
    });
    expect(
      await screen.findByRole("heading", { name: /choose your training split/i }),
    ).toBeVisible();
    expect(
      within(await screen.findByRole("list", { name: /plan builder steps/i })).getByText("Split"),
    ).toHaveAttribute("aria-current", "step");
  });

  it("keeps the Plan Blueprint summary on Balanced hypertrophy when the persisted Recommended Default is explicitly reselected", async () => {
    const user = userEvent.setup();
    await saveConfirmedFourDayUpperLowerTrainingSplit();

    renderPlanBuilder({ initialEntries: [planBuilderPaths.repRanges] });

    const repRangeGroup = await screen.findByRole("group", { name: /rep range style/i });
    const summary = screen.getByRole("complementary", { name: /plan blueprint summary/i });

    expect(within(summary).getByText(repRangeStyleLabels.balancedHypertrophy)).toBeVisible();

    await user.click(within(repRangeGroup).getByText(repRangeStyleLabels.balancedHypertrophy));

    await waitFor(async () => {
      expect((await planBuilderService.getOrCreatePlanBlueprint()).repRanges).toBe(
        "balanced_hypertrophy",
      );
    });
    expect(within(summary).getByText(repRangeStyleLabels.balancedHypertrophy)).toBeVisible();
  });

  it("shows a single Selected badge on the active Rep Range Style card and moves it when the choice changes", async () => {
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
    await saveConfirmedFourDayUpperLowerTrainingSplit();

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
    expect(screen.getByRole("heading", { name: "Boundary for this step" })).toBeVisible();
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

  it("renders fixed-week and rotating-cycle details inside the selected Training Split panel", async () => {
    const user = userEvent.setup();

    await planBuilderService.confirmSelectedTrainingFrequency({
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
      /recommended fit/i,
      /four anchored sessions give upper and lower work dedicated space twice each week/i,
    );
    expectFixedWeekScheduleDetails(fixedWeekDetails);
    expectUnsupportedTrainingSplitGuidance();

    await user.click(within(splitGroup).getByText(trainingSplitLabels.rotatingPushPullLegs));

    const rotatingDetails = await findSelectedTrainingSplitDetails(
      trainingSplitLabels.rotatingPushPullLegs,
    );

    expectTrainingSplitFitExplanation(
      rotatingDetails,
      /compatible alternative/i,
      /a rotating push\/pull\/legs cycle stays flexible when your available weekdays move around/i,
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
    await planBuilderService.confirmSelectedTrainingFrequency({
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
    await planBuilderService.confirmSelectedTrainingFrequency({
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
    expect(screen.getByRole("button", { name: /continue to rep ranges/i })).toBeVisible();

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

    await user.click(screen.getByRole("button", { name: /continue to rep ranges/i }));

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
    await confirmSelectedTrainingFrequencyForTest(4);
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
    expectBlueprintSummaryField(summary, "Split", "Pending");

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

    await user.click(await screen.findByRole("button", { name: /continue to split/i }));

    expect(
      await screen.findByRole("heading", { name: /choose your training split/i }),
    ).toBeVisible();
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

    await user.click(screen.getByRole("button", { name: /continue to split/i }));
    await user.click(await screen.findByRole("button", { name: /continue to rep ranges/i }));

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

  it("renders the split URL directly with the recommended 3-day split selected", async () => {
    await confirmDefaultTrainingFrequency();
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

async function expectPlanBuilderPath(
  router: ReturnType<typeof renderPlanBuilder>["router"],
  pathname: string,
) {
  await waitFor(() => {
    expect(router.state.location.pathname).toBe(pathname);
  });
}

async function expectPlanBlueprintToMatch(expectedBlueprint: object) {
  await waitFor(async () => {
    expect(await planBuilderService.getOrCreatePlanBlueprint()).toMatchObject(expectedBlueprint);
  });
}

function createExerciseSelectionPreferencesWithList(
  listId: ExerciseSelectionPreferenceListId,
  items: ReadonlyArray<ExerciseSelectionPreferenceItem>,
): ExerciseSelectionPreferences {
  const defaultExerciseSelectionPreferences: ExerciseSelectionPreferences = {
    avoidedExercises: [],
    equipmentPreset: "full_gym",
    preferredExercises: [],
    strategy: "balanced",
  };

  switch (listId) {
    case "avoidedExercises":
      return {
        ...defaultExerciseSelectionPreferences,
        avoidedExercises: items,
      };
    case "preferredExercises":
      return {
        ...defaultExerciseSelectionPreferences,
        preferredExercises: items,
      };
  }
}

function getRequiredClosestForm(element: HTMLElement, formName: string) {
  const form = element.closest("form");

  if (!form) {
    throw new Error(`Expected the ${formName} form.`);
  }

  return form;
}

function getExercisePreferenceListEntry({
  entryListName,
  entryText,
  title,
}: {
  entryListName: RegExp;
  entryText: string;
  title: string;
}) {
  const entries = screen.getByRole("list", { name: entryListName });
  const entry = within(entries).getByText(entryText).closest("li");

  if (!entry) {
    throw new Error(`Expected the "${entryText}" ${title} chip.`);
  }

  return entry;
}

async function expectReadOnlyExercisesStep() {
  expect(
    await screen.findByRole("heading", { name: /exercise selection strategy/i }),
  ).toBeVisible();
  expect(screen.getByRole("heading", { name: /^Balanced$/i })).toBeVisible();
  expect(screen.getByRole("heading", { name: /^Full gym$/i })).toBeVisible();
  expect(screen.getByRole("heading", { name: /preferred exercises/i })).toBeVisible();
  expect(screen.getByRole("heading", { name: /avoided exercises/i })).toBeVisible();
  expect(screen.getByRole("heading", { name: /movement-pattern coverage/i })).toBeVisible();
  expect(screen.getByRole("heading", { name: /rules applied automatically/i })).toBeVisible();

  const includedEquipment = screen.getByRole("list", { name: /included equipment/i });

  for (const label of defaultExerciseStepIncludedEquipmentLabels) {
    expect(within(includedEquipment).getByText(label)).toBeVisible();
  }

  for (const label of defaultExerciseStepMovementPatternLabels) {
    expect(screen.getByText(label)).toBeVisible();
  }

  for (const label of defaultExerciseStepAutomaticRuleLabels) {
    expect(screen.getByText(label)).toBeVisible();
  }
}

function expectAutomaticExerciseSelectionRulesToBeVisible() {
  const rulesList = screen.getByRole("list", { name: /automatic exercise selection rules/i });
  const rules = deriveAutomaticExerciseSelectionRules("balanced");

  for (const rule of rules) {
    expect(within(rulesList).getByText(rule.description)).toBeVisible();
  }
}

function expectNoManualRestControls() {
  expect(screen.queryByRole("slider")).not.toBeInTheDocument();
  expect(screen.queryByRole("textbox", { name: /rest/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("spinbutton", { name: /rest/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /rest/i })).not.toBeInTheDocument();
  expect(screen.queryByText(/60-90 seconds/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/2-3 minutes/i)).not.toBeInTheDocument();
}

function getClosestSection(element: HTMLElement, sectionName: string) {
  const section = element.closest("section");

  if (section instanceof HTMLElement) {
    return section;
  }

  throw new Error(`Expected the ${sectionName} section.`);
}

function expectNoConflictResolutionControls() {
  const controlLabels = [
    /remove (?:the )?exclusion/i,
    /adjust equipment/i,
    /adjust preferences/i,
    /accept (?:a )?lower-quality incomplete training plan/i,
  ] as const;
  const controlRoles = ["button", "link", "radio", "checkbox"] as const;

  for (const label of controlLabels) {
    for (const role of controlRoles) {
      expect(screen.queryByRole(role, { name: label })).not.toBeInTheDocument();
    }
  }
}

async function expectReviewStepComingNext() {
  expect(await screen.findByRole("heading", { name: /review step coming next/i })).toBeVisible();
  expect(
    screen.getByText(
      /exercise order and rest rules will be applied automatically during generation/i,
    ),
  ).toBeVisible();
}

function expectBlueprintSummaryField(summary: HTMLElement, label: string, value: string) {
  const labelNode = within(summary).getByText(label);
  const fieldNode = labelNode.closest("div");

  if (!fieldNode) {
    throw new Error(`Plan Blueprint summary field "${label}" was not found.`);
  }

  expect(within(fieldNode).getByText(value)).toBeVisible();
}

async function saveFourDayTrainingFrequency() {
  await planBuilderService.updateTrainingFrequency({
    timestamp: "2026-05-30T11:30:00.000Z",
    trainingFrequencyDaysPerWeek: 4,
  });
}

async function confirmDefaultTrainingFrequency() {
  await confirmSelectedTrainingFrequencyForTest(3, "2026-05-30T11:24:00.000Z");
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
  await user.click(screen.getByRole("button", { name: /continue to split/i }));

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
  expect(within(repRangeGroup).getAllByText("Selected")).toHaveLength(1);
  expect(
    within(getRepRangeStyleOptionCard(repRangeGroup, selectedLabel)).getByText("Selected"),
  ).toBeVisible();
  expect(
    within(getRepRangeStyleOptionCard(repRangeGroup, unselectedLabel)).queryByText("Selected"),
  ).not.toBeInTheDocument();
}

function getRepRangeStyleEffectsPanel() {
  return screen.getByRole("region", { name: /how this affects your plan/i });
}

function getTableRowByLabel(table: HTMLElement, label: string) {
  const rowLabel = within(table).getByText(label);
  const row = rowLabel.closest("tr");

  if (!(row instanceof HTMLTableRowElement)) {
    throw new Error(`Expected ${label} to render inside a table row.`);
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

function getSelectedTrainingSplitDetails(label: string) {
  return screen.getByRole("region", { name: getLabelMatcher(label) });
}

function findSelectedTrainingSplitDetails(label: string) {
  return screen.findByRole("region", { name: getLabelMatcher(label) });
}

function expectTrainingSplitFitExplanation(
  detailsPanel: HTMLElement,
  title: RegExp,
  description: RegExp,
) {
  const details = within(detailsPanel);

  expect(details.getByText(/why this split fits/i)).toBeVisible();
  expect(details.getByText(title)).toBeVisible();
  expect(details.getByText(description)).toBeVisible();
}

function expectFixedWeekScheduleDetails(detailsPanel: HTMLElement) {
  const details = within(detailsPanel);

  expect(details.getByText(/suggested weekly layout/i)).toBeVisible();
  expect(details.getByText("Mon")).toBeVisible();
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

function expectUnsupportedTrainingSplitGuidance() {
  expect(screen.getByText(/not included in this step/i)).toBeVisible();
  expect(
    screen.getByText(/too low in frequency for most users on a 2-5 day builder/i),
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
