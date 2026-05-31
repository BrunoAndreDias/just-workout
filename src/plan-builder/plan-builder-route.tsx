import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Calendar,
  CalendarCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Dumbbell,
  Grid2X2,
  Info,
  List,
  type LucideIcon,
  SlidersHorizontal,
  Star,
  Target,
  UserRound,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { Button } from "../design-system/button";
import { cn } from "../design-system/cn";
import { Stepper } from "../design-system/stepper";
import {
  type AutomaticExerciseSelectionRule,
  commitPendingExerciseSelectionPreferences,
  createDefaultExerciseSelectionPreferences,
  deriveAutomaticExerciseSelectionRules,
  deriveMovementPatternCoverage,
  type ExerciseSelectionPendingInputId,
  type ExerciseSelectionPendingInputs,
  type ExerciseSelectionPreferenceItem,
  type ExerciseSelectionPreferenceListId,
  type ExerciseSelectionPreferences,
  type ExerciseSelectionPreferenceValidationErrors,
  emptyExerciseSelectionPendingInputs,
  getEquipmentPreset,
  getExerciseSelectionStrategy,
  hasExerciseSelectionPreferenceValidationErrors,
  type MovementPatternCoverageGroup,
  removeExerciseSelectionPreferenceItem,
} from "./exercise-selection-preferences";
import {
  confirmExerciseSelectionPreferences,
  confirmRepRangeStyle,
  confirmTrainingFrequency,
  confirmTrainingSplit,
  confirmTrainingVolume,
  defaultRepRangeStyleId,
  getRepRangeStyle,
  getTrainingFrequencyRecommendation,
  getValidRepRangeStyleId,
  hasValidTrainingFrequency,
  initializeTrainingVolume,
  type PlanBlueprint,
  type PlanBlueprintSummary,
  type RepRangeStyle,
  type RepRangeStyleId,
  repRangeStyles,
  selectRepRangeStyle,
  selectTrainingFrequency,
  selectTrainingSplit,
  selectTrainingVolumePreset,
  setOptionalVolumeTargetEnabled,
  summarizePlanBlueprint,
  type TrainingFrequencyDaysPerWeek,
  type TrainingFrequencyOption,
  type TrainingFrequencyRecommendation,
  trainingFrequencyOptions,
  updateExerciseSelectionPreferences,
} from "./plan-blueprint";
import { planBuilderPaths } from "./plan-builder-paths";
import { planBuilderService } from "./plan-builder-service";
import {
  getCompatibleTrainingSplits,
  getRecommendedTrainingSplitId,
  getTrainingSplit,
  isTrainingSplitCompatible,
  type TrainingSplitDefinition,
  type TrainingSplitId,
  type TrainingSplitSchedule,
  unsupportedTrainingSplitCategories,
} from "./training-split";
import {
  type EstimatedSetRange,
  estimateWeeklySetRangeForTarget,
  isTrainingVolumeConfiguration,
  type OptionalVolumeMuscleGroupId,
  type TrainingVolumeConfiguration,
  type VolumeMuscleGroupId,
  type VolumePreset,
  type VolumePresetId,
  type VolumePresetSource,
  volumePresets,
  type WeeklyRepTarget,
} from "./training-volume";

type PlanBlueprintSummaryRowBase = {
  icon: LucideIcon;
  label: string;
};

type PlanBlueprintSummaryRow = PlanBlueprintSummaryRowBase &
  (
    | {
        getValue: (summary: PlanBlueprintSummary) => ReactNode;
        valuePresentation?: "text";
      }
    | {
        getValue: (summary: PlanBlueprintSummary) => string;
        valuePresentation: "status";
      }
  );

const planBlueprintSummaryNotChosenValue = "Not chosen yet";
const planBlueprintEquipmentStatus = "Not configured yet";

const planBlueprintSummaryRows: ReadonlyArray<PlanBlueprintSummaryRow> = [
  {
    getValue: (summary) => summary.trainingGoal,
    icon: Target,
    label: "Goal",
  },
  {
    getValue: () => "Intermediate",
    icon: UserRound,
    label: "Experience",
  },
  {
    getValue: (summary) => summary.trainingFrequency,
    icon: CalendarDays,
    label: "Frequency",
  },
  {
    getValue: (summary) =>
      summary.split === "Choose a Training Split"
        ? planBlueprintSummaryNotChosenValue
        : summary.split,
    icon: Grid2X2,
    label: "Split",
  },
  {
    getValue: (summary) =>
      summary.repRanges === "Choose Rep ranges" ? (
        <>
          <span>{planBlueprintSummaryNotChosenValue}</span>
          <span className="sr-only">Choose Rep ranges</span>
        </>
      ) : (
        summary.repRanges
      ),
    icon: SlidersHorizontal,
    label: "Rep ranges",
  },
  {
    getValue: (summary) => summary.volumePreset,
    icon: List,
    label: "Volume preset",
  },
  {
    getValue: () => planBlueprintEquipmentStatus,
    icon: Dumbbell,
    label: "Equipment",
    valuePresentation: "status",
  },
  {
    getValue: (summary) => summary.generationStatus,
    icon: Clock3,
    label: "Generation status",
    valuePresentation: "status",
  },
] as const satisfies ReadonlyArray<PlanBlueprintSummaryRow>;

function getPlanBlueprintSummaryRowContent(
  row: PlanBlueprintSummaryRow,
  summary: PlanBlueprintSummary,
) {
  if (row.valuePresentation === "status") {
    const value = row.getValue(summary);

    return {
      status: value,
      value,
    };
  }

  return {
    status: null,
    value: row.getValue(summary),
  };
}

const planBuilderSteps = [
  { id: "frequency", label: "Frequency" },
  { id: "split", label: "Split" },
  { id: "rep-ranges", label: "Rep ranges" },
  { id: "volume", label: "Volume" },
  { id: "exercises", label: "Exercises" },
  { id: "review", label: "Review" },
];

const planBuilderBlueprintQueryKey = ["plan-builder", "blueprint"] as const;
const planBuilderPrototypeVariants = [
  { id: "strip", label: "Top strip" },
  { id: "rail", label: "Mini rail" },
  { id: "header", label: "Header metadata" },
  { id: "bottom", label: "Status bar" },
] as const satisfies ReadonlyArray<{ id: PlanBuilderPrototypeVariant; label: string }>;

const planBuilderLargeScreenQuery = "(min-width: 1280px) and (min-height: 720px)";

type PlanBuilderStep = (typeof planBuilderSteps)[number]["id"];

const planBuilderNextStepBodyByStep = {
  frequency: "Next, you'll choose the best Training Split for your weekly schedule.",
  split: "Next, you'll choose a Rep Range Style for your Plan Blueprint.",
  "rep-ranges": "Next, you will set weekly volume targets for each muscle group.",
  volume:
    "Exercises come next; this step stays focused on weekly rep targets before specific lifts are chosen.",
  exercises: "Next, you'll review the blueprint before generating the Training Plan.",
  review: "Review the blueprint and generate the Training Plan when everything is ready.",
} as const satisfies Record<PlanBuilderStep, string>;

type SelectableOptionState = "selected" | "unselected";
type MovementPatternCoverageStatus = "direct" | "indirect";
type RepRangeStyleStatusBadgeTone = "recommended" | "selected";

const selectableOptionCardBaseClassName =
  "min-w-0 rounded-lg border p-4 text-left transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-stone-950";

const selectableOptionCardStyles = {
  selected: "border-stone-950 bg-stone-950 text-stone-50 shadow-sm",
  unselected: "border-stone-900/10 bg-white/85 text-stone-950 hover:bg-white",
} as const satisfies Record<SelectableOptionState, string>;

const selectableOptionMutedTextStyles = {
  selected: "text-stone-300",
  unselected: "text-stone-600",
} as const satisfies Record<SelectableOptionState, string>;

const selectableOptionBadgeStyles = {
  selected: "bg-white/12 text-[#f4b860]",
  unselected: "bg-[#fff3ea] text-[#b93725]",
} as const satisfies Record<SelectableOptionState, string>;

const repRangeStyleOptionCardStyles = {
  selected:
    "border-[#0b8490] bg-[#f4fbfb] text-stone-950 shadow-[0_14px_30px_rgba(0,119,128,0.08)]",
  unselected:
    "border-stone-900/10 bg-white/90 text-stone-950 hover:border-stone-900/18 hover:bg-white",
} as const satisfies Record<SelectableOptionState, string>;

const weeklyVolumeHowItWorksItems = [
  "Just Workout will distribute your weekly reps across your training days.",
  "Compound and isolation exercises will both count toward the same weekly muscle-group targets.",
  "You will refine the exact exercises later, after the weekly targets are in place.",
] as const;

const weeklyVolumeHowItWorksItemClassName =
  "rounded-lg border border-stone-900/10 bg-[#f9f6ef] px-4 py-3 text-sm text-stone-700";

const exerciseSelectionHighlights = [
  {
    body: "Main work favors productive compound lifts when they fit the Plan Blueprint.",
    title: "Compound-first bias",
  },
  {
    body: "Isolation work can still support Weekly Rep Targets when more direct work is needed.",
    title: "Targeted support",
  },
  {
    body: "Painful, unavailable, or unsuitable exercises stay out of later Training Plan choices.",
    title: "Safety boundary",
  },
] as const satisfies ReadonlyArray<ExerciseSelectionHighlightProps>;

const exerciseSelectionStatusCards = [
  {
    body: "This is still your Plan Blueprint. Just Workout waits until Review before the later Training Plan is created.",
    title: "Plan status",
  },
  {
    body: "Step 5 stays focused on strategy, equipment, movement coverage, and preferences only. Day-by-day workouts and final exercise choices do not appear here.",
    title: "Step scope",
  },
  {
    body: "Preferred Exercises stay soft preferences, while Avoided Exercises remain hard exclusions. If generation cannot find a safe viable replacement later, Review will surface an Exercise Selection Conflict for you to resolve.",
    title: "Preference rules",
  },
] as const satisfies ReadonlyArray<Pick<PlanBuilderStepStatusCardProps, "body" | "title">>;

const movementPatternCoverageStatusStyles = {
  direct: "border-[#c7ebdf] bg-[#eff9f3] text-[#0f6d54]",
  indirect: "border-[#e7dcc8] bg-[#f9f3e8] text-[#8a5a2b]",
} as const;

const movementPatternCoverageStatusLabels = {
  direct: "Direct Weekly Rep Target",
  indirect: "Indirect support only",
} as const satisfies Record<MovementPatternCoverageStatus, string>;

const volumePresetDescriptions = {
  balanced:
    "Recommended middle of the source-backed weekly rep range for most muscle-building plans.",
  conservative: "Lower end of the weekly rep range when you want easier recovery.",
  higher_volume: "Upper end of the weekly rep range when you can tolerate more direct work.",
} as const satisfies Record<VolumePresetId, string>;

type WeeklyVolumeTargetStatusTone = "accessory" | "main-target" | "moderate" | "optional";

type WeeklyVolumeTargetRowDefinition = {
  label: string;
  muscleGroupId: VolumeMuscleGroupId;
  statusLabel: string;
  statusTone: WeeklyVolumeTargetStatusTone;
};

type OptionalWeeklyVolumeTargetRowDefinition = {
  label: string;
  muscleGroupId: OptionalVolumeMuscleGroupId;
};

type WeeklyVolumeTargetDisplayRow = WeeklyVolumeTargetRowDefinition & {
  estimatedSetRangeLabel: string;
  weeklyRepTargetLabel: string;
};

type OptionalWeeklyVolumeTargetDisplayRow = OptionalWeeklyVolumeTargetRowDefinition & {
  actionLabel: "Add" | "Remove";
  estimatedSetRangeLabel: string;
  isEnabled: boolean;
  weeklyRepTargetLabel: string;
};

type OptionalVolumeTargetToggleHandler = (
  muscleGroup: OptionalVolumeMuscleGroupId,
  isEnabled: boolean,
) => void;

const weeklyVolumeTargetStatusStyles = {
  accessory: "bg-[#f7efe4] text-[#8a5a2b]",
  "main-target": "bg-[#e8f6f3] text-[#0d6d67]",
  moderate: "bg-[#eef3fb] text-[#315d8a]",
  optional: "bg-[#f4f0e8] text-[#5c6d73]",
} as const satisfies Record<WeeklyVolumeTargetStatusTone, string>;

const weeklyVolumeTargetColumnHeaderClassName =
  "px-4 py-3 text-xs font-bold uppercase tracking-wide text-stone-500";

const requiredWeeklyVolumeTargetRowDefinitions = [
  {
    label: "Chest",
    muscleGroupId: "chest",
    statusLabel: "Main target",
    statusTone: "main-target",
  },
  {
    label: "Back",
    muscleGroupId: "back",
    statusLabel: "Main target",
    statusTone: "main-target",
  },
  {
    label: "Shoulders",
    muscleGroupId: "shoulders",
    statusLabel: "Moderate",
    statusTone: "moderate",
  },
  {
    label: "Quads",
    muscleGroupId: "quads",
    statusLabel: "Main target",
    statusTone: "main-target",
  },
  {
    label: "Hamstrings/Glutes",
    muscleGroupId: "hamstrings",
    statusLabel: "Main target",
    statusTone: "main-target",
  },
  {
    label: "Biceps",
    muscleGroupId: "biceps",
    statusLabel: "Accessory",
    statusTone: "accessory",
  },
  {
    label: "Triceps",
    muscleGroupId: "triceps",
    statusLabel: "Accessory",
    statusTone: "accessory",
  },
] as const satisfies ReadonlyArray<WeeklyVolumeTargetRowDefinition>;

const optionalWeeklyVolumeTargetRowDefinitions = [
  {
    label: "Calves",
    muscleGroupId: "calves",
  },
  {
    label: "Abs",
    muscleGroupId: "abs",
  },
] as const satisfies ReadonlyArray<OptionalWeeklyVolumeTargetRowDefinition>;

const repRangeStyleDescriptionStyles = {
  selected: "text-[#31505d]",
  unselected: selectableOptionMutedTextStyles.unselected,
} as const satisfies Record<SelectableOptionState, string>;

const repRangeStyleStatusBadgeStyles = {
  recommended: "bg-[#fff3ea] text-[#b93725]",
  selected: "bg-[#006f78] text-white",
} as const satisfies Record<RepRangeStyleStatusBadgeTone, string>;

const repRangeStyleDetailStyles = {
  selected: {
    noteBodyClassName: "text-[#31505d]",
    noteLabelClassName: "text-[#006f78]",
    notePanelClassName: "border-[#0b8490]/12 bg-white",
    targetCardClassName: "border-[#0b8490]/12 bg-white",
    targetLabelClassName: "text-[#5c6d73]",
    targetValueClassName: "text-stone-950",
  },
  unselected: {
    noteBodyClassName: "text-stone-600",
    noteLabelClassName: "text-stone-500",
    notePanelClassName: "border-stone-900/10 bg-[#f9f6ef]",
    targetCardClassName: "border-stone-900/10 bg-[#f4f0e8]",
    targetLabelClassName: "text-stone-500",
    targetValueClassName: "text-stone-900",
  },
} as const satisfies Record<
  SelectableOptionState,
  {
    noteBodyClassName: string;
    noteLabelClassName: string;
    notePanelClassName: string;
    targetCardClassName: string;
    targetLabelClassName: string;
    targetValueClassName: string;
  }
>;
type TrainingFrequencyMutationVariables = {
  timestamp: string;
  trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek;
};

type PlanBlueprintMutationContext = {
  previousBlueprint?: PlanBlueprint;
};

type PlanBlueprintMutationConfig<TVariables> = {
  mutationFn: (variables: TVariables) => Promise<PlanBlueprint>;
  optimisticUpdate: (blueprint: PlanBlueprint, variables: TVariables) => PlanBlueprint;
};

type TrainingSplitMutationVariables = {
  split: TrainingSplitId;
  timestamp: string;
};

type RepRangeStyleMutationVariables = {
  repRangeStyle: RepRangeStyleId;
  timestamp: string;
};

type InitializeTrainingVolumeMutationVariables = {
  timestamp: string;
};

type UpdateTrainingVolumePresetMutationVariables = {
  timestamp: string;
  volumePreset: VolumePresetId;
};

type UpdateOptionalVolumeTargetMutationVariables = {
  isEnabled: boolean;
  muscleGroup: OptionalVolumeMuscleGroupId;
  timestamp: string;
};

type UpdateExerciseSelectionPreferencesMutationVariables = {
  exerciseSelectionPreferences: ExerciseSelectionPreferences;
  timestamp: string;
};

type ConfirmTrainingVolumeMutationVariables = {
  timestamp: string;
  trainingVolumeConfiguration: TrainingVolumeConfiguration;
};

type ConfirmExerciseSelectionPreferencesMutationVariables = {
  exerciseSelectionPreferences: ExerciseSelectionPreferences;
  timestamp: string;
};

type PlanBuilderPageProps = {
  children: ReactNode;
  currentStep: PlanBuilderStep;
  intro: ReactNode;
  summary: PlanBlueprintSummary | null;
};

type PlanBuilderCurrentStepCardProps = {
  currentStep: PlanBuilderStep;
};

type PlanBuilderStepStatusCardProps = {
  body: string;
  className?: string;
  title: string;
  titleDisplay?: PlanBuilderStepStatusCardTitleDisplay;
};

type PlanBuilderStepStatusCardTitleDisplay = "screen-reader-only" | "visible";
type PlanBuilderPrototypeVariant = "bottom" | "header" | "rail" | "strip";

type TrainingSplitStepProps = {
  onContinueToRepRanges: () => Promise<void>;
  onTrainingSplitChange: (split: TrainingSplitId) => void;
  selectedSplit: TrainingSplitDefinition;
  trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek;
};

type TrainingSplitOptionRadioProps = {
  isRecommended: boolean;
  isSelected: boolean;
  onSelect: (split: TrainingSplitId) => void;
  option: TrainingSplitDefinition;
};

type TrainingSplitFitStatus = {
  body: string;
  title: string;
};

type TrainingSplitDetailsPanelProps = {
  fitStatus: TrainingSplitFitStatus;
  split: TrainingSplitDefinition;
};

type TrainingSplitFitPanelProps = {
  fitStatus: TrainingSplitFitStatus;
};

type TrainingSplitSchedulePanelProps = {
  schedule: TrainingSplitSchedule;
};

type RepRangeStyleStepProps = {
  onContinueToVolume: () => Promise<void>;
  onRepRangeStyleChange: (repRangeStyle: RepRangeStyleId) => void;
  savedRepRangeStyleId: RepRangeStyleId | null;
  selectedRepRangeStyle: RepRangeStyle;
};

type RepRangeStyleEffectsPanelProps = {
  repRangeStyle: RepRangeStyle;
};

type RepRangeStyleOptionRadioProps = {
  isSavedSelection: boolean;
  isSelected: boolean;
  onSelect: (repRangeStyle: RepRangeStyleId) => void;
  option: RepRangeStyle;
};

type SelectionBadgeProps = {
  children: ReactNode;
  isSelected: boolean;
};

type RepRangeStyleStatusBadgeProps = {
  children: ReactNode;
  tone: RepRangeStyleStatusBadgeTone;
};

type RepRangeStyleTargetsProps = {
  isSelected?: boolean;
  targets: RepRangeStyle["targets"];
};

type WeeklyVolumeTargetsStepProps = {
  canContinueToExercises: boolean;
  onContinueToExercises: () => Promise<void>;
  onOptionalVolumeTargetToggle: OptionalVolumeTargetToggleHandler;
  onVolumePresetChange: (volumePreset: VolumePresetId) => void;
  repRangeStyle: RepRangeStyle | null;
  selectedVolumePresetId: VolumePresetId | null;
  volumePresetSource: VolumePresetSource | null;
  weeklyRepTargets: ReadonlyArray<WeeklyRepTarget> | null;
};

type ExerciseSelectionPreferencesStepProps = {
  exerciseSelectionPreferences: ExerciseSelectionPreferences;
  movementPatternCoverage: ReadonlyArray<MovementPatternCoverageGroup>;
  onContinueToReview: (exerciseSelectionPreferences: ExerciseSelectionPreferences) => Promise<void>;
  onExerciseSelectionPreferencesChange: (
    exerciseSelectionPreferences: ExerciseSelectionPreferences,
  ) => Promise<void>;
  rulesAppliedAutomatically: ReadonlyArray<AutomaticExerciseSelectionRule>;
};

type MovementPatternCoverageSectionProps = {
  coverageGroups: ReadonlyArray<MovementPatternCoverageGroup>;
};

type MovementPatternCoverageGroupCardProps = {
  group: MovementPatternCoverageGroup;
};

type MovementPatternCoverageStatusBadgeProps = {
  isDirectlyTargeted: boolean;
};

type ExerciseSelectionHighlightProps = {
  body: string;
  title: string;
};

type ExerciseSelectionPreferencesEditorProps = {
  controlId: string;
  description: string;
  emptyState: string;
  inputLabel: string;
  itemAriaLabel: string;
  items: ReadonlyArray<ExerciseSelectionPreferenceItem>;
  listId: ExerciseSelectionPreferenceListId;
  onAdd: (listId: ExerciseSelectionPreferenceListId) => Promise<void>;
  onInputChange: (listId: ExerciseSelectionPreferenceListId, value: string) => void;
  onRemove: (
    listId: ExerciseSelectionPreferenceListId,
    itemId: ExerciseSelectionPreferenceItem["id"],
  ) => Promise<void>;
  pendingValue: string;
  validationError?: string;
};

type VolumePresetSelectorProps = {
  onVolumePresetChange: (volumePreset: VolumePresetId) => void;
  selectedVolumePresetId: VolumePresetId | null;
  volumePresetSource: VolumePresetSource | null;
};

type VolumePresetOptionRadioProps = {
  isExplicitSelection: boolean;
  isSelected: boolean;
  onSelect: (volumePreset: VolumePresetId) => void;
  option: VolumePreset;
};

type RequiredWeeklyRepTargetsRowsProps = {
  rows: ReadonlyArray<WeeklyVolumeTargetDisplayRow>;
};

type OptionalWeeklyRepTargetsSectionProps = {
  onOptionalVolumeTargetToggle: OptionalVolumeTargetToggleHandler;
  rows: ReadonlyArray<OptionalWeeklyVolumeTargetDisplayRow>;
};

type OptionalWeeklyRepTargetsTableProps = {
  onOptionalVolumeTargetToggle: OptionalVolumeTargetToggleHandler;
  rows: ReadonlyArray<OptionalWeeklyVolumeTargetDisplayRow>;
};

type RequiredWeeklyVolumeTargetRowsOptions = {
  repRangeStyle: RepRangeStyle | null;
  weeklyRepTargets: ReadonlyArray<WeeklyRepTarget> | null;
};

type OptionalWeeklyVolumeTargetRowsOptions = {
  repRangeStyle: RepRangeStyle | null;
  weeklyRepTargets: ReadonlyArray<WeeklyRepTarget> | null;
};

type WeeklyVolumeTargetStatusBadgeProps = {
  label: string;
  tone: WeeklyVolumeTargetStatusTone;
};

export function PlanBuilderRoute() {
  const { blueprint, summary } = usePlanBuilderBlueprint();
  const { mutate: updateTrainingFrequency } = useUpdateTrainingFrequencyMutation();
  const { mutateAsync: confirmSelectedTrainingFrequency } = useConfirmTrainingFrequencyMutation();
  const navigate = useNavigate();

  function handleTrainingFrequencyChange(
    trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek,
  ) {
    updateTrainingFrequency({
      timestamp: new Date().toISOString(),
      trainingFrequencyDaysPerWeek,
    });
  }

  async function handleContinueToSplit() {
    if (!blueprint) {
      return;
    }

    await confirmSelectedTrainingFrequency({
      timestamp: new Date().toISOString(),
      trainingFrequencyDaysPerWeek: blueprint.trainingFrequencyDaysPerWeek,
    });
    await navigate({ to: planBuilderPaths.split });
  }

  return (
    <PlanBuilderPage
      currentStep="frequency"
      intro={
        <p className="text-[1.05rem] font-medium leading-6 text-[#31505d]">
          Configure your training blueprint step by step before generating your plan.
        </p>
      }
      summary={summary}
    >
      {blueprint ? (
        <TrainingFrequencyStep
          canContinueToSplit={hasValidTrainingFrequency(blueprint)}
          onContinueToSplit={handleContinueToSplit}
          onTrainingFrequencyChange={handleTrainingFrequencyChange}
          selectedTrainingFrequencyDaysPerWeek={
            hasValidTrainingFrequency(blueprint) ? blueprint.trainingFrequencyDaysPerWeek : null
          }
        />
      ) : (
        <p className="text-sm font-semibold text-stone-600">Loading Training Frequency...</p>
      )}
    </PlanBuilderPage>
  );
}

export function PlanBuilderSplitRoute() {
  const { blueprint, summary } = usePlanBuilderBlueprint();
  const { mutate: updateTrainingSplit } = useUpdateTrainingSplitMutation();
  const { mutateAsync: confirmSelectedTrainingSplit } = useConfirmTrainingSplitMutation();
  const navigate = useNavigate();
  const selectedSplitId = blueprint ? getVisibleTrainingSplitId(blueprint) : null;
  const selectedSplit = selectedSplitId ? getTrainingSplit(selectedSplitId) : null;

  useEffect(() => {
    if (!blueprint || hasCompatibleSelectedTrainingSplit(blueprint)) {
      return;
    }

    updateTrainingSplit({
      split: getRecommendedTrainingSplitId(blueprint.trainingFrequencyDaysPerWeek),
      timestamp: new Date().toISOString(),
    });
  }, [blueprint, updateTrainingSplit]);

  function handleTrainingSplitChange(split: TrainingSplitId) {
    updateTrainingSplit({
      split,
      timestamp: new Date().toISOString(),
    });
  }

  async function handleContinueToRepRanges() {
    if (!selectedSplitId) {
      return;
    }

    await confirmSelectedTrainingSplit({
      split: selectedSplitId,
      timestamp: new Date().toISOString(),
    });
    await navigate({ to: planBuilderPaths.repRanges });
  }

  return (
    <PlanBuilderPage
      currentStep="split"
      intro={
        <p className="max-w-2xl text-base font-medium leading-7 text-[#31505d]">
          Choose a compatible Training Split for the saved Plan Blueprint. Just Workout will
          recommend the best fit for this Training Frequency without locking you into one option.
        </p>
      }
      summary={summary}
    >
      {blueprint && selectedSplit ? (
        <TrainingSplitStep
          onContinueToRepRanges={handleContinueToRepRanges}
          onTrainingSplitChange={handleTrainingSplitChange}
          selectedSplit={selectedSplit}
          trainingFrequencyDaysPerWeek={blueprint.trainingFrequencyDaysPerWeek}
        />
      ) : (
        <p className="text-sm font-semibold text-stone-600">Loading Training Split...</p>
      )}
    </PlanBuilderPage>
  );
}

export function PlanBuilderRepRangesRoute() {
  const { blueprint, summary } = usePlanBuilderBlueprint();
  const { mutateAsync: confirmSelectedRepRangeStyle } = useConfirmRepRangeStyleMutation();
  const { mutate: updateRepRangeStyle } = useUpdateRepRangeStyleMutation();
  const navigate = useNavigate();
  const savedRepRangeStyleId = blueprint ? getValidRepRangeStyleId(blueprint.repRanges) : null;
  const selectedRepRangeStyleId = blueprint
    ? (savedRepRangeStyleId ?? defaultRepRangeStyleId)
    : null;
  const selectedRepRangeStyle = selectedRepRangeStyleId
    ? getRepRangeStyle(selectedRepRangeStyleId)
    : null;

  useEffect(() => {
    if (!blueprint || savedRepRangeStyleId) {
      return;
    }

    updateRepRangeStyle({
      repRangeStyle: defaultRepRangeStyleId,
      timestamp: new Date().toISOString(),
    });
  }, [blueprint, savedRepRangeStyleId, updateRepRangeStyle]);

  function handleRepRangeStyleChange(repRangeStyle: RepRangeStyleId) {
    updateRepRangeStyle({
      repRangeStyle,
      timestamp: new Date().toISOString(),
    });
  }

  async function handleContinueToVolume() {
    if (!selectedRepRangeStyleId) {
      return;
    }

    await confirmSelectedRepRangeStyle({
      repRangeStyle: selectedRepRangeStyleId,
      timestamp: new Date().toISOString(),
    });
    await navigate({ to: planBuilderPaths.volume });
  }

  return (
    <PlanBuilderPage
      currentStep="rep-ranges"
      intro={
        <p className="max-w-2xl text-sm font-medium leading-6 text-stone-700 sm:text-base">
          Choose the Rep Range Style that should later guide how Just Workout translates Training
          Volume into sets and reps. This step stays focused on rep targets only.
        </p>
      }
      summary={summary}
    >
      {blueprint && selectedRepRangeStyle ? (
        <RepRangeStyleStep
          onContinueToVolume={handleContinueToVolume}
          onRepRangeStyleChange={handleRepRangeStyleChange}
          savedRepRangeStyleId={savedRepRangeStyleId}
          selectedRepRangeStyle={selectedRepRangeStyle}
        />
      ) : (
        <p className="text-sm font-semibold text-stone-600">Loading Rep Range Style...</p>
      )}
    </PlanBuilderPage>
  );
}

export function PlanBuilderVolumeRoute() {
  const { blueprint, summary } = usePlanBuilderBlueprint();
  const { mutateAsync: confirmSelectedTrainingVolume } = useConfirmTrainingVolumeMutation();
  const { mutate: initializeTrainingVolumeDefaults } = useInitializeTrainingVolumeMutation();
  const { mutate: updateTrainingVolumePreset } = useUpdateTrainingVolumePresetMutation();
  const { mutate: updateOptionalVolumeTarget } = useUpdateOptionalVolumeTargetMutation();
  const navigate = useNavigate();
  const selectedRepRangeStyleId = blueprint ? getValidRepRangeStyleId(blueprint.repRanges) : null;
  const selectedRepRangeStyle = selectedRepRangeStyleId
    ? getRepRangeStyle(selectedRepRangeStyleId)
    : null;
  const trainingVolumeConfiguration =
    blueprint && isTrainingVolumeConfiguration(blueprint) ? blueprint : null;

  useEffect(() => {
    if (!blueprint || trainingVolumeConfiguration) {
      return;
    }

    initializeTrainingVolumeDefaults({
      timestamp: new Date().toISOString(),
    });
  }, [blueprint, initializeTrainingVolumeDefaults, trainingVolumeConfiguration]);

  function handleVolumePresetChange(volumePreset: VolumePresetId) {
    updateTrainingVolumePreset({
      timestamp: new Date().toISOString(),
      volumePreset,
    });
  }

  function handleOptionalVolumeTargetToggle(
    muscleGroup: OptionalVolumeMuscleGroupId,
    isEnabled: boolean,
  ) {
    updateOptionalVolumeTarget({
      isEnabled,
      muscleGroup,
      timestamp: new Date().toISOString(),
    });
  }

  async function handleContinueToExercises() {
    if (!trainingVolumeConfiguration) {
      return;
    }

    await confirmSelectedTrainingVolume({
      trainingVolumeConfiguration,
      timestamp: new Date().toISOString(),
    });
    await navigate({ to: planBuilderPaths.exercises });
  }

  return (
    <PlanBuilderPage
      currentStep="volume"
      intro={
        <p className="max-w-2xl text-sm font-medium leading-6 text-stone-700 sm:text-base">
          Training Volume is configured as weekly reps before exercises are selected. This step
          frames the weekly targets before later exercise choices refine them.
        </p>
      }
      summary={summary}
    >
      <WeeklyVolumeTargetsStep
        canContinueToExercises={trainingVolumeConfiguration !== null}
        onContinueToExercises={handleContinueToExercises}
        onOptionalVolumeTargetToggle={handleOptionalVolumeTargetToggle}
        onVolumePresetChange={handleVolumePresetChange}
        repRangeStyle={selectedRepRangeStyle}
        selectedVolumePresetId={blueprint?.volumePreset ?? null}
        volumePresetSource={blueprint?.volumePresetSource ?? null}
        weeklyRepTargets={blueprint?.weeklyRepTargets ?? null}
      />
    </PlanBuilderPage>
  );
}

export function PlanBuilderExercisesRoute() {
  const navigate = useNavigate();
  const { mutateAsync: confirmSelectedExerciseSelectionPreferences } =
    useConfirmExerciseSelectionPreferencesMutation();
  const { mutateAsync: updateSelectedExerciseSelectionPreferences } =
    useUpdateExerciseSelectionPreferencesMutation();
  const { blueprint, summary } = usePlanBuilderBlueprint();
  const isExerciseSelectionStepReady =
    blueprint !== undefined &&
    hasCompatibleSelectedTrainingSplit(blueprint) &&
    isTrainingVolumeConfiguration(blueprint);
  const exerciseSelectionPreferences = isExerciseSelectionStepReady
    ? blueprint.exerciseSelectionPreferences
    : createDefaultExerciseSelectionPreferences();
  const movementPatternCoverage = isExerciseSelectionStepReady
    ? deriveMovementPatternCoverage({
        split: blueprint.split,
        strategy: exerciseSelectionPreferences.strategy,
        weeklyRepTargets: blueprint.weeklyRepTargets,
      })
    : [];
  const rulesAppliedAutomatically = deriveAutomaticExerciseSelectionRules(
    exerciseSelectionPreferences.strategy,
  );

  async function handleExerciseSelectionPreferencesChange(
    nextExerciseSelectionPreferences: ExerciseSelectionPreferences,
  ) {
    await updateSelectedExerciseSelectionPreferences({
      exerciseSelectionPreferences: nextExerciseSelectionPreferences,
      timestamp: new Date().toISOString(),
    });
  }

  async function handleContinueToReview(
    nextExerciseSelectionPreferences: ExerciseSelectionPreferences,
  ) {
    await confirmSelectedExerciseSelectionPreferences({
      exerciseSelectionPreferences: nextExerciseSelectionPreferences,
      timestamp: new Date().toISOString(),
    });
    await navigate({ to: planBuilderPaths.review });
  }

  return (
    <PlanBuilderPage
      currentStep="exercises"
      intro={
        <p className="max-w-2xl text-sm font-medium leading-6 text-stone-700 sm:text-base">
          Set Exercise Selection Preferences and review the derived movement coverage before Review
          so Just Workout can carry the right strategy, equipment, and exercise-fit notes forward
          into later Training Plan generation.
        </p>
      }
      summary={summary}
    >
      {isExerciseSelectionStepReady ? (
        <ExerciseSelectionPreferencesStep
          exerciseSelectionPreferences={exerciseSelectionPreferences}
          movementPatternCoverage={movementPatternCoverage}
          onContinueToReview={handleContinueToReview}
          onExerciseSelectionPreferencesChange={handleExerciseSelectionPreferencesChange}
          rulesAppliedAutomatically={rulesAppliedAutomatically}
        />
      ) : (
        <p className="text-sm font-semibold text-stone-600">
          Loading Exercise Selection Preferences...
        </p>
      )}
    </PlanBuilderPage>
  );
}

export function PlanBuilderReviewRoute() {
  const { summary } = usePlanBuilderBlueprint();

  return (
    <PlanBuilderPage
      currentStep="review"
      intro={
        <p className="max-w-2xl text-sm font-medium leading-6 text-stone-700 sm:text-base">
          Exercises are confirmed. This route stays intentionally minimal until the full Review
          screen lands.
        </p>
      }
      summary={summary}
    >
      <ReviewPlaceholderStep />
    </PlanBuilderPage>
  );
}

function usePlanBuilderBlueprint() {
  const blueprintQuery = useQuery({
    queryKey: planBuilderBlueprintQueryKey,
    queryFn: planBuilderService.getOrCreatePlanBlueprint,
  });

  const blueprint = blueprintQuery.data;
  const summary = blueprint ? summarizePlanBlueprint(blueprint) : null;

  return {
    blueprint,
    summary,
  };
}

function useUpdateTrainingFrequencyMutation() {
  return usePlanBlueprintMutation<TrainingFrequencyMutationVariables>({
    mutationFn: ({ timestamp, trainingFrequencyDaysPerWeek }) =>
      planBuilderService.updateTrainingFrequency({
        timestamp,
        trainingFrequencyDaysPerWeek,
      }),
    optimisticUpdate: (blueprint, { timestamp, trainingFrequencyDaysPerWeek }) =>
      selectTrainingFrequency({
        blueprint,
        timestamp,
        trainingFrequencyDaysPerWeek,
      }),
  });
}

function useUpdateTrainingSplitMutation() {
  return usePlanBlueprintMutation<TrainingSplitMutationVariables>({
    mutationFn: ({ split, timestamp }) =>
      planBuilderService.updateTrainingSplit({
        split,
        timestamp,
      }),
    optimisticUpdate: (blueprint, { split, timestamp }) =>
      selectTrainingSplit({
        blueprint,
        split,
        timestamp,
      }),
  });
}

function useConfirmTrainingFrequencyMutation() {
  return usePlanBlueprintMutation<TrainingFrequencyMutationVariables>({
    mutationFn: ({ timestamp, trainingFrequencyDaysPerWeek }) =>
      planBuilderService.confirmSelectedTrainingFrequency({
        timestamp,
        trainingFrequencyDaysPerWeek,
      }),
    optimisticUpdate: (blueprint, { timestamp, trainingFrequencyDaysPerWeek }) =>
      confirmTrainingFrequency({
        blueprint,
        timestamp,
        trainingFrequencyDaysPerWeek,
      }),
  });
}

function useConfirmTrainingSplitMutation() {
  return usePlanBlueprintMutation<TrainingSplitMutationVariables>({
    mutationFn: ({ split, timestamp }) =>
      planBuilderService.confirmSelectedTrainingSplit({
        split,
        timestamp,
      }),
    optimisticUpdate: (blueprint, { split, timestamp }) =>
      confirmTrainingSplit({
        blueprint,
        split,
        timestamp,
      }),
  });
}

function useConfirmRepRangeStyleMutation() {
  return usePlanBlueprintMutation<RepRangeStyleMutationVariables>({
    mutationFn: ({ repRangeStyle, timestamp }) =>
      planBuilderService.confirmSelectedRepRangeStyle({
        repRangeStyle,
        timestamp,
      }),
    optimisticUpdate: (blueprint, { repRangeStyle, timestamp }) =>
      confirmRepRangeStyle({
        blueprint,
        repRangeStyle,
        timestamp,
      }),
  });
}

function useUpdateRepRangeStyleMutation() {
  return usePlanBlueprintMutation<RepRangeStyleMutationVariables>({
    mutationFn: ({ repRangeStyle, timestamp }) =>
      planBuilderService.updateRepRangeStyle({
        repRangeStyle,
        timestamp,
      }),
    optimisticUpdate: (blueprint, { repRangeStyle, timestamp }) =>
      selectRepRangeStyle({
        blueprint,
        repRangeStyle,
        timestamp,
      }),
  });
}

function useInitializeTrainingVolumeMutation() {
  return usePlanBlueprintMutation<InitializeTrainingVolumeMutationVariables>({
    mutationFn: ({ timestamp }) =>
      planBuilderService.initializeTrainingVolume({
        timestamp,
      }),
    optimisticUpdate: (blueprint, { timestamp }) =>
      initializeTrainingVolume({
        blueprint,
        timestamp,
      }),
  });
}

function useUpdateTrainingVolumePresetMutation() {
  return usePlanBlueprintMutation<UpdateTrainingVolumePresetMutationVariables>({
    mutationFn: ({ timestamp, volumePreset }) =>
      planBuilderService.updateTrainingVolumePreset({
        timestamp,
        volumePreset,
      }),
    optimisticUpdate: (blueprint, { timestamp, volumePreset }) =>
      selectTrainingVolumePreset({
        blueprint,
        timestamp,
        volumePreset,
      }),
  });
}

function useUpdateOptionalVolumeTargetMutation() {
  return usePlanBlueprintMutation<UpdateOptionalVolumeTargetMutationVariables>({
    mutationFn: ({ isEnabled, muscleGroup, timestamp }) =>
      planBuilderService.updateOptionalVolumeTarget({
        isEnabled,
        muscleGroup,
        timestamp,
      }),
    optimisticUpdate: (blueprint, { isEnabled, muscleGroup, timestamp }) =>
      setOptionalVolumeTargetEnabled({
        blueprint,
        isEnabled,
        muscleGroup,
        timestamp,
      }),
  });
}

function useConfirmTrainingVolumeMutation() {
  return usePlanBlueprintMutation<ConfirmTrainingVolumeMutationVariables>({
    mutationFn: ({ timestamp, trainingVolumeConfiguration }) =>
      planBuilderService.confirmSelectedTrainingVolume({
        trainingVolumeConfiguration,
        timestamp,
      }),
    optimisticUpdate: (blueprint, { timestamp, trainingVolumeConfiguration }) =>
      confirmTrainingVolume({
        blueprint: {
          ...blueprint,
          ...trainingVolumeConfiguration,
        },
        timestamp,
      }),
  });
}

function useConfirmExerciseSelectionPreferencesMutation() {
  return usePlanBlueprintMutation<ConfirmExerciseSelectionPreferencesMutationVariables>({
    mutationFn: ({ exerciseSelectionPreferences, timestamp }) =>
      planBuilderService.confirmSelectedExerciseSelectionPreferences({
        exerciseSelectionPreferences,
        timestamp,
      }),
    optimisticUpdate: (blueprint, { exerciseSelectionPreferences, timestamp }) =>
      confirmExerciseSelectionPreferences({
        blueprint,
        exerciseSelectionPreferences,
        timestamp,
      }),
  });
}

function useUpdateExerciseSelectionPreferencesMutation() {
  return usePlanBlueprintMutation<UpdateExerciseSelectionPreferencesMutationVariables>({
    mutationFn: ({ exerciseSelectionPreferences, timestamp }) =>
      planBuilderService.updateExerciseSelectionPreferences({
        exerciseSelectionPreferences,
        timestamp,
      }),
    optimisticUpdate: (blueprint, { exerciseSelectionPreferences, timestamp }) =>
      updateExerciseSelectionPreferences({
        blueprint,
        exerciseSelectionPreferences,
        timestamp,
      }),
  });
}

function usePlanBlueprintMutation<TVariables>({
  mutationFn,
  optimisticUpdate,
}: PlanBlueprintMutationConfig<TVariables>) {
  const queryClient = useQueryClient();

  return useMutation<PlanBlueprint, Error, TVariables, PlanBlueprintMutationContext>({
    mutationFn,
    onError: (_error, _variables, context) => {
      if (context?.previousBlueprint) {
        queryClient.setQueryData(planBuilderBlueprintQueryKey, context.previousBlueprint);
      }
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: planBuilderBlueprintQueryKey });

      const previousBlueprint = queryClient.getQueryData<PlanBlueprint>(
        planBuilderBlueprintQueryKey,
      );

      if (previousBlueprint) {
        queryClient.setQueryData(
          planBuilderBlueprintQueryKey,
          optimisticUpdate(previousBlueprint, variables),
        );
      }

      return { previousBlueprint };
    },
    onSuccess: (updatedBlueprint) => {
      queryClient.setQueryData(planBuilderBlueprintQueryKey, updatedBlueprint);
    },
  });
}

function getVisibleTrainingSplitId(blueprint: PlanBlueprint): TrainingSplitId {
  if (hasCompatibleSelectedTrainingSplit(blueprint)) {
    return blueprint.split;
  }

  return getRecommendedTrainingSplitId(blueprint.trainingFrequencyDaysPerWeek);
}

function hasCompatibleSelectedTrainingSplit(
  blueprint: PlanBlueprint,
): blueprint is PlanBlueprint & {
  split: TrainingSplitId;
} {
  return isTrainingSplitCompatible(blueprint.split, blueprint.trainingFrequencyDaysPerWeek);
}

function PlanBuilderPage({ children, currentStep, intro, summary }: PlanBuilderPageProps) {
  const currentStepIndex = getPlanBuilderStepDetails(currentStep).index;
  const prototypeVariant = usePlanBuilderPrototypeVariant();
  const shouldShowPlanBuilderRail = usePlanBuilderLargeScreenLayout();
  const pageTitle = getPlanBuilderPageTitle(currentStep);

  if (currentStep === "frequency" && prototypeVariant) {
    return (
      <PlanBuilderPrototypePage
        currentStepIndex={currentStepIndex}
        intro={intro}
        summary={summary}
        variant={prototypeVariant}
      >
        {children}
      </PlanBuilderPrototypePage>
    );
  }

  return (
    <section
      className={cn(
        "plan-builder-page",
        `plan-builder-page--${currentStep}`,
        currentStep === "frequency" ? "plan-builder-page--frequency" : null,
      )}
    >
      <section
        aria-label="Plan Builder workspace"
        className="plan-builder-workspace-card min-w-0 p-6 sm:p-8 lg:min-h-screen lg:px-8 lg:pb-3 lg:pt-11 xl:px-[3.125rem]"
      >
        <header className="space-y-2">
          <p className="plan-builder-eyebrow text-sm font-black uppercase tracking-wide text-[#00636a]">
            Workout Plan Builder
          </p>
          <h1 className="plan-builder-title text-4xl font-black leading-tight text-[#120f0d] sm:text-[2.5rem]">
            {pageTitle}
          </h1>
          {intro}
          <PlanBlueprintHeaderBar summary={summary} />
        </header>

        <div className="plan-builder-stepper mt-7">
          <Stepper currentIndex={currentStepIndex} items={planBuilderSteps} label="Plan Builder" />
        </div>

        <div className="plan-builder-step-content mt-9">{children}</div>
      </section>

      {shouldShowPlanBuilderRail ? (
        <aside aria-label="Plan blueprint summary" className="plan-builder-right-rail">
          <PlanBlueprintRailCard summary={summary} />
          <PlanBuilderNextStepCard currentStep={currentStep} />
        </aside>
      ) : null}
    </section>
  );
}

function getPlanBuilderPageTitle(currentStep: PlanBuilderStep): string {
  switch (currentStep) {
    case "frequency":
      return "Build your workout plan";
    case "split":
      return "Choose your training split";
    case "rep-ranges":
      return "Choose your rep ranges";
    case "volume":
      return "Set your training volume";
    case "exercises":
      return "Choose your exercises";
    case "review":
      return "Review your plan blueprint";
  }

  return "Build your workout plan";
}

function PlanBlueprintHeaderBar({ summary }: { summary: PlanBlueprintSummary | null }) {
  const fields = summary ? getPlanBlueprintHeaderFields(summary) : [];

  return (
    <aside
      aria-label="Plan blueprint summary"
      className="plan-blueprint-header mt-4 flex min-w-0 items-center rounded-lg border border-stone-950/10 bg-white/76 px-4 py-3 shadow-[0_1px_0_rgba(29,26,22,0.04)]"
    >
      <div className="plan-blueprint-header__title flex min-w-0 shrink-0 items-center gap-3 pr-5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center text-stone-950">
          <CalendarCheck aria-hidden="true" size={24} strokeWidth={1.7} />
        </span>
        <h2 className="truncate text-base font-black leading-none text-stone-950">
          Plan blueprint
        </h2>
        <span className="rounded-full bg-[#007780] px-3 py-1 text-xs font-black leading-none text-white">
          Draft
        </span>
      </div>

      {summary ? (
        <dl className="plan-blueprint-header__fields min-w-0 flex-1 items-center">
          {fields.map((field) => (
            <div
              className="plan-blueprint-header__field grid min-w-0 grid-cols-1 content-center gap-1 border-l border-stone-950/18 px-5"
              key={field.label}
            >
              <dt className="text-xs font-black leading-none text-[#007780]">{field.label}</dt>
              <dd
                className={cn(
                  "min-w-0 text-sm font-bold leading-tight",
                  field.isPending ? "text-stone-500" : "text-stone-950",
                )}
              >
                {field.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="min-w-0 truncate border-l border-stone-950/18 pl-5 text-sm font-bold text-stone-600">
          Loading Plan Blueprint...
        </p>
      )}
    </aside>
  );
}

function getPlanBlueprintHeaderFields(
  summary: PlanBlueprintSummary,
): ReadonlyArray<PlanBlueprintHeaderField> {
  return [
    {
      isPending: false,
      label: "Goal",
      value: summary.trainingGoal,
    },
    {
      isPending: false,
      label: "Frequency",
      value: summary.trainingFrequency,
    },
    {
      isPending: summary.split === "Choose a Training Split",
      label: "Split",
      value: summary.split === "Choose a Training Split" ? "Pending" : summary.split,
    },
    {
      isPending: summary.repRanges === "Choose Rep ranges",
      label: "Rep ranges",
      value: summary.repRanges === "Choose Rep ranges" ? "Pending" : summary.repRanges,
    },
    {
      isPending: summary.volumePreset === planBlueprintSummaryNotChosenValue,
      label: "Volume preset",
      value:
        summary.volumePreset === planBlueprintSummaryNotChosenValue
          ? "Pending"
          : summary.volumePreset,
    },
  ];
}

function PlanBlueprintRailCard({ summary }: PrototypeBlueprintSummaryProps) {
  const railRows = summary ? getPlanBlueprintRailRows(summary) : [];

  return (
    <section className="plan-builder-summary-card rounded-lg border border-stone-950/10 bg-white/60 px-6 py-7">
      <h2 className="text-2xl font-black leading-tight text-[#120f0d]">Plan blueprint</h2>
      {summary ? (
        <dl className="mt-7 divide-y divide-stone-950/8">
          {railRows.map((row) => {
            const Icon = row.icon;

            return (
              <div className="plan-builder-summary-row grid gap-4 py-5 first:pt-0" key={row.label}>
                <span className="plan-builder-summary-row__icon flex h-12 w-12 items-center justify-center rounded-full bg-[#eef4f2] text-[#0a5960]">
                  <Icon aria-hidden="true" size={24} strokeWidth={1.65} />
                </span>
                <div className="min-w-0">
                  <dt className="text-base font-black text-[#112c3a]">{row.label}</dt>
                  <dd className="mt-2 text-sm font-medium leading-6 text-[#244256]">
                    {row.value}
                    {row.status ? (
                      <>
                        {" "}
                        <span className="font-black text-[#00636a]">{row.status}</span>
                      </>
                    ) : null}
                  </dd>
                </div>
              </div>
            );
          })}
        </dl>
      ) : (
        <p className="mt-6 text-sm font-semibold text-[#31505d]">Loading Plan Blueprint...</p>
      )}
    </section>
  );
}

function getPlanBlueprintRailRows(summary: PlanBlueprintSummary): ReadonlyArray<{
  icon: LucideIcon;
  label: string;
  status?: string | null;
  value: string;
}> {
  return [
    {
      icon: Calendar,
      label: "Frequency:",
      status: summary.trainingFrequencyStatus,
      value: summary.trainingFrequency,
    },
    {
      icon: Dumbbell,
      label: "Split:",
      status: summary.splitStatus,
      value: summary.split === "Choose a Training Split" ? "Pending" : summary.split,
    },
    {
      icon: Clock3,
      label: "Weekly rhythm:",
      value: summary.weeklyRhythm,
    },
    {
      icon: SlidersHorizontal,
      label: "Muscle frequency:",
      value: summary.muscleFrequency,
    },
    {
      icon: CalendarCheck,
      label: "Recovery:",
      value: summary.recovery,
    },
    {
      icon: ArrowRight,
      label: "Next:",
      value: summary.nextStep,
    },
  ];
}

function PlanBuilderNextStepCard({ currentStep }: PlanBuilderCurrentStepCardProps) {
  return (
    <section className="plan-builder-next-card rounded-lg border border-stone-950/10 bg-white/60 px-6 py-7">
      <h2 className="text-2xl font-black leading-tight text-[#120f0d]">What happens next</h2>
      <p className="mt-5 text-base font-medium leading-7 text-[#31505d]">
        {planBuilderNextStepBodyByStep[currentStep as keyof typeof planBuilderNextStepBodyByStep]}
      </p>
    </section>
  );
}

type PlanBuilderPrototypePageProps = {
  children: ReactNode;
  currentStepIndex: number;
  intro: ReactNode;
  summary: PlanBlueprintSummary | null;
  variant: PlanBuilderPrototypeVariant;
};

type PrototypeBlueprintSummaryProps = {
  compact?: boolean;
  summary: PlanBlueprintSummary | null;
};

type PrototypeBlueprintField = {
  isPending: boolean;
  label: string;
  value: ReactNode;
};

type PlanBlueprintHeaderField = {
  isPending: boolean;
  label: string;
  value: string;
};

// PROTOTYPE: Four Plan Blueprint layout variants, switchable via `?variant=`.
function PlanBuilderPrototypePage({
  children,
  currentStepIndex,
  intro,
  summary,
  variant,
}: PlanBuilderPrototypePageProps) {
  if (variant === "rail") {
    return (
      <section className="plan-builder-page plan-builder-prototype grid gap-4 xl:grid-cols-[minmax(0,1fr)_15rem] xl:items-start">
        <section
          aria-label="Plan Builder workspace"
          className="plan-builder-workspace-card min-w-0 px-6 pb-4 pt-6 sm:px-8 lg:min-h-screen xl:px-10"
        >
          <PlanBuilderPrototypeHeader intro={intro} />
          <PlanBuilderPrototypeStepper currentStepIndex={currentStepIndex} />
          <div className="plan-builder-step-content mt-5">{children}</div>
        </section>

        <aside
          aria-label="Plan blueprint summary"
          className="self-start border-l border-stone-950/10 px-4 pt-7"
        >
          <p className="text-xs font-black uppercase text-[#b93725]">Plan blueprint</p>
          <PrototypeBlueprintRows compact summary={summary} />
          <PlanBuilderNextStepMini currentStep="frequency" />
        </aside>

        <PlanBuilderPrototypeSwitcher current={variant} />
      </section>
    );
  }

  if (variant === "header") {
    return (
      <section className="plan-builder-page plan-builder-prototype">
        <section
          aria-label="Plan Builder workspace"
          className="plan-builder-workspace-card min-w-0 px-6 pb-4 pt-6 sm:px-8 lg:min-h-screen xl:px-12"
        >
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,32rem)] xl:items-end">
            <PlanBuilderPrototypeHeader intro={intro} />
            <aside aria-label="Plan blueprint summary">
              <PrototypeHeaderBlueprintPanel summary={summary} />
            </aside>
          </div>
          <PlanBuilderPrototypeStepper currentStepIndex={currentStepIndex} />
          <div className="plan-builder-step-content mt-5">{children}</div>
        </section>

        <PlanBuilderPrototypeSwitcher current={variant} />
      </section>
    );
  }

  if (variant === "bottom") {
    return (
      <section className="plan-builder-page plan-builder-prototype">
        <section
          aria-label="Plan Builder workspace"
          className="plan-builder-workspace-card min-w-0 px-6 pb-4 pt-6 sm:px-8 lg:min-h-screen xl:px-12"
        >
          <PlanBuilderPrototypeHeader intro={intro} />
          <PlanBuilderPrototypeStepper currentStepIndex={currentStepIndex} />
          <div className="plan-builder-step-content mt-5">{children}</div>
          <aside
            aria-label="Plan blueprint summary"
            className="mt-4 border-t border-stone-950/10 pt-3"
          >
            <PrototypeBlueprintPills summary={summary} />
          </aside>
        </section>

        <PlanBuilderPrototypeSwitcher current={variant} />
      </section>
    );
  }

  return (
    <section className="plan-builder-page plan-builder-prototype">
      <section
        aria-label="Plan Builder workspace"
        className="plan-builder-workspace-card min-w-0 px-6 pb-4 pt-6 sm:px-8 lg:min-h-screen xl:px-12"
      >
        <PlanBuilderPrototypeHeader intro={intro} />
        <PlanBuilderPrototypeStepper currentStepIndex={currentStepIndex} />
        <PrototypeBlueprintStrip summary={summary} />
        <div className="plan-builder-step-content mt-5">{children}</div>
      </section>

      <PlanBuilderPrototypeSwitcher current={variant} />
    </section>
  );
}

function PlanBuilderPrototypeHeader({ intro }: Pick<PlanBuilderPrototypePageProps, "intro">) {
  return (
    <header className="space-y-1">
      <p className="text-xs font-black uppercase text-[#b93725]">Prototype layout</p>
      <h1 className="plan-builder-title text-[2rem] font-black leading-tight text-[#120f0d]">
        Build your workout plan
      </h1>
      {intro}
    </header>
  );
}

function PlanBuilderPrototypeStepper({ currentStepIndex }: { currentStepIndex: number }) {
  return (
    <div className="plan-builder-stepper mt-4">
      <Stepper currentIndex={currentStepIndex} items={planBuilderSteps} label="Plan Builder" />
    </div>
  );
}

function PrototypeBlueprintStrip({ summary }: PrototypeBlueprintSummaryProps) {
  return (
    <aside aria-label="Plan blueprint summary" className="mt-4 border-y border-stone-950/10 py-3">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <p className="text-xs font-black uppercase text-[#b93725]">Plan blueprint</p>
        <PrototypeBlueprintPills summary={summary} />
      </div>
    </aside>
  );
}

function PrototypeBlueprintPills({ summary }: PrototypeBlueprintSummaryProps) {
  if (!summary) {
    return <p className="text-sm font-semibold text-stone-600">Loading Plan Blueprint...</p>;
  }

  return (
    <dl className="flex min-w-0 flex-wrap items-center gap-2">
      {planBlueprintSummaryRows.slice(0, 5).map((row) => {
        const { value } = getPlanBlueprintSummaryRowContent(row, summary);

        return (
          <div
            className="flex min-w-0 items-center gap-2 rounded-full border border-stone-950/10 bg-white/70 px-3 py-1.5"
            key={row.label}
          >
            <dt className="text-[0.7rem] font-black uppercase text-stone-500">{row.label}</dt>
            <dd className="max-w-48 truncate text-xs font-bold text-stone-950">{value}</dd>
          </div>
        );
      })}
    </dl>
  );
}

function PrototypeHeaderBlueprintPanel({ summary }: PrototypeBlueprintSummaryProps) {
  if (!summary) {
    return (
      <div className="border-l border-stone-950/10 pl-5">
        <p className="text-xs font-black uppercase text-[#b93725]">Plan blueprint</p>
        <p className="mt-2 text-sm font-semibold text-stone-600">Loading Plan Blueprint...</p>
      </div>
    );
  }

  const fields = getPrototypeHeaderBlueprintFields(summary);
  const completedCount = fields.filter((field) => !field.isPending).length;

  return (
    <div className="border-l border-stone-950/10 pl-4">
      <div className="flex items-center gap-3">
        <div className="shrink-0">
          <p className="text-xs font-black uppercase text-[#b93725]">Plan blueprint</p>
          <p className="mt-0.5 text-[0.68rem] font-semibold leading-3 text-[#31505d]">
            {completedCount} of {fields.length} decisions set
          </p>
        </div>
        <span className="rounded-full bg-[#006f78] px-2 py-0.5 text-[0.6rem] font-black uppercase text-white">
          Draft
        </span>
      </div>

      <dl className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {fields.map((field) => (
          <div
            className={cn(
              "flex min-w-0 items-baseline gap-1.5 border-l pl-2",
              field.isPending ? "border-stone-950/10" : "border-[#006f78]/60",
            )}
            key={field.label}
          >
            <dt
              className={cn(
                "shrink-0 text-[0.58rem] font-black uppercase",
                field.isPending ? "text-stone-400" : "text-[#006f78]",
              )}
            >
              {field.label}
            </dt>
            <dd
              className={cn(
                "max-w-28 truncate text-[0.72rem] font-bold leading-3",
                field.isPending ? "text-stone-500" : "text-stone-950",
              )}
            >
              {field.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function getPrototypeHeaderBlueprintFields(
  summary: PlanBlueprintSummary,
): ReadonlyArray<PrototypeBlueprintField> {
  return [
    {
      isPending: false,
      label: "Goal",
      value: summary.trainingGoal,
    },
    {
      isPending: false,
      label: "Frequency",
      value: summary.trainingFrequency,
    },
    {
      isPending: summary.split === "Choose a Training Split",
      label: "Split",
      value: summary.split === "Choose a Training Split" ? "Pending" : summary.split,
    },
    {
      isPending: summary.repRanges === "Choose Rep ranges",
      label: "Rep ranges",
      value: summary.repRanges === "Choose Rep ranges" ? "Pending" : summary.repRanges,
    },
  ];
}

function PrototypeBlueprintRows({ compact = false, summary }: PrototypeBlueprintSummaryProps) {
  if (!summary) {
    return <p className="mt-3 text-sm font-semibold text-stone-600">Loading Plan Blueprint...</p>;
  }

  return (
    <dl className={cn("mt-4 grid divide-y divide-stone-950/8", compact ? "text-xs" : "text-sm")}>
      {planBlueprintSummaryRows.map((row) => {
        const { status, value } = getPlanBlueprintSummaryRowContent(row, summary);

        return (
          <div className="grid grid-cols-[1rem_minmax(0,1fr)] gap-2 py-2" key={row.label}>
            <row.icon
              aria-hidden="true"
              className="mt-0.5 text-[#006f78]"
              size={14}
              strokeWidth={1.8}
            />
            <div className="min-w-0">
              <dt className="font-black uppercase text-stone-500">{row.label}</dt>
              <dd className="mt-0.5 truncate font-semibold text-stone-950">
                {status ? <span className="text-[#b93725]">{status}</span> : value}
              </dd>
            </div>
          </div>
        );
      })}
    </dl>
  );
}

function PlanBuilderNextStepMini({ currentStep }: PlanBuilderCurrentStepCardProps) {
  return (
    <section className="mt-4 border-t border-stone-950/10 pt-4">
      <h2 className="text-xs font-black uppercase text-stone-500">Next</h2>
      <p className="mt-1 text-xs font-semibold leading-5 text-[#31505d]">
        {planBuilderNextStepBodyByStep[currentStep as keyof typeof planBuilderNextStepBodyByStep]}
      </p>
    </section>
  );
}

function PlanBuilderPrototypeSwitcher({ current }: { current: PlanBuilderPrototypeVariant }) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target?.closest("input, textarea, select, button, a, [contenteditable='true']") ||
        (event.key !== "ArrowLeft" && event.key !== "ArrowRight")
      ) {
        return;
      }

      event.preventDefault();
      selectPlanBuilderPrototypeVariant(current, event.key === "ArrowLeft" ? -1 : 1);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [current]);

  if (!import.meta.env.DEV) {
    return null;
  }

  const currentVariant = planBuilderPrototypeVariants.find((variantOption) => {
    return variantOption.id === current;
  });

  return (
    <div className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border border-stone-950/15 bg-stone-950 px-3 py-2 text-sm font-bold text-white shadow-2xl">
      <button
        aria-label="Previous prototype variant"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
        onClick={() => selectPlanBuilderPrototypeVariant(current, -1)}
        type="button"
      >
        <ChevronLeft aria-hidden="true" size={18} />
      </button>
      <p className="min-w-40 text-center">
        {current.toUpperCase()} - {currentVariant?.label ?? "Prototype"}
      </p>
      <button
        aria-label="Next prototype variant"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
        onClick={() => selectPlanBuilderPrototypeVariant(current, 1)}
        type="button"
      >
        <ChevronRight aria-hidden="true" size={18} />
      </button>
    </div>
  );
}

function usePlanBuilderPrototypeVariant(): PlanBuilderPrototypeVariant | null {
  const [variant, setVariant] = useState(getPlanBuilderPrototypeVariantFromLocation);

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }

    function handleUrlChange() {
      setVariant(getPlanBuilderPrototypeVariantFromLocation());
    }

    window.addEventListener("popstate", handleUrlChange);
    window.addEventListener("plan-builder-prototype-change", handleUrlChange);
    return () => {
      window.removeEventListener("popstate", handleUrlChange);
      window.removeEventListener("plan-builder-prototype-change", handleUrlChange);
    };
  }, []);

  if (!import.meta.env.DEV) {
    return null;
  }

  return variant;
}

function usePlanBuilderLargeScreenLayout() {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }

    return window.matchMedia(planBuilderLargeScreenQuery).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia(planBuilderLargeScreenQuery);
    const handleChange = () => setMatches(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return matches;
}

function getPlanBuilderPrototypeVariantFromLocation(): PlanBuilderPrototypeVariant | null {
  if (typeof window === "undefined") {
    return null;
  }

  const requestedVariant = new URLSearchParams(window.location.search).get("variant");
  const matchingVariant = planBuilderPrototypeVariants.find((variant) => {
    return variant.id === requestedVariant;
  });

  return matchingVariant?.id ?? null;
}

function selectPlanBuilderPrototypeVariant(
  current: PlanBuilderPrototypeVariant,
  direction: -1 | 1,
) {
  const currentIndex = planBuilderPrototypeVariants.findIndex((variant) => variant.id === current);
  const nextIndex =
    (currentIndex + direction + planBuilderPrototypeVariants.length) %
    planBuilderPrototypeVariants.length;
  const nextVariant = planBuilderPrototypeVariants[nextIndex] ?? planBuilderPrototypeVariants[0];
  const url = new URL(window.location.href);

  url.searchParams.set("variant", nextVariant.id);
  window.history.replaceState(null, "", url);
  window.dispatchEvent(new Event("plan-builder-prototype-change"));
}

function getPlanBuilderStepDetails(currentStep: PlanBuilderStep) {
  const index = planBuilderSteps.findIndex((step) => step.id === currentStep);
  const step = planBuilderSteps[index];

  return {
    index,
    number: index + 1,
    title: step?.label ?? "Current step",
  };
}

type TrainingFrequencyStepProps = {
  canContinueToSplit: boolean;
  onContinueToSplit: () => Promise<void>;
  onTrainingFrequencyChange: (trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek) => void;
  selectedTrainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek | null;
};

function TrainingFrequencyStep({
  canContinueToSplit,
  onContinueToSplit,
  onTrainingFrequencyChange,
  selectedTrainingFrequencyDaysPerWeek,
}: TrainingFrequencyStepProps) {
  const recommendation = getTrainingFrequencyRecommendation(
    selectedTrainingFrequencyDaysPerWeek ?? 3,
  );
  const shouldShowLargeScreenWarning = usePlanBuilderLargeScreenLayout();

  return (
    <section
      aria-labelledby="training-frequency-title"
      className="training-frequency-panel lg:-mx-[1.375rem]"
    >
      <div>
        <h2
          className="training-frequency-title text-3xl font-black leading-tight text-[#120f0d]"
          id="training-frequency-title"
        >
          Training frequency
        </h2>
        <p className="training-frequency-copy mt-4 max-w-3xl text-base font-medium leading-6 text-[#31505d]">
          Choose how many days per week you can realistically train so Just Workout can recommend
          the right split.
        </p>
      </div>

      <fieldset className="training-frequency-options mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <legend className="sr-only">Training Frequency</legend>
        {trainingFrequencyOptions.map((option) => (
          <TrainingFrequencyOptionRadio
            isSelected={option.daysPerWeek === selectedTrainingFrequencyDaysPerWeek}
            key={option.daysPerWeek}
            onSelect={onTrainingFrequencyChange}
            option={option}
          />
        ))}
      </fieldset>
      <TrainingFrequencyRecommendationCard recommendation={recommendation} />
      {shouldShowLargeScreenWarning ? (
        <PlanBuilderStepStatusCard
          body="6-day plans are not available in this first version."
          className="training-frequency-large-screen-warning"
          title="Unavailable training frequency"
        />
      ) : null}

      <div className="training-frequency-actions mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          className="training-frequency-action-button h-[3.75rem] min-w-[7.375rem] border-stone-950/10 bg-[#fbf7f1] text-base text-stone-400 hover:bg-[#fbf7f1]"
          disabled
          type="button"
          variant="outline"
        >
          <ChevronLeft aria-hidden="true" size={20} />
          Back
        </Button>
        {canContinueToSplit ? (
          <Button
            className="training-frequency-action-button h-[3.75rem] min-w-[14.25rem] bg-[#007780] text-base font-medium shadow-[0_12px_26px_rgba(0,119,128,0.18)] hover:bg-[#00666e] focus-visible:outline-[#007780]"
            onClick={() => {
              void onContinueToSplit();
            }}
            type="button"
          >
            Continue to Split
            <ArrowRight aria-hidden="true" size={20} />
          </Button>
        ) : (
          <Button disabled type="button">
            Continue to Split
            <ArrowRight aria-hidden="true" size={20} />
          </Button>
        )}
      </div>
    </section>
  );
}

function TrainingSplitStep({
  onContinueToRepRanges,
  onTrainingSplitChange,
  selectedSplit,
  trainingFrequencyDaysPerWeek,
}: TrainingSplitStepProps) {
  const compatibleSplits = getCompatibleTrainingSplits(trainingFrequencyDaysPerWeek);
  const recommendedSplitId = getRecommendedTrainingSplitId(trainingFrequencyDaysPerWeek);
  const trainingFrequencyLabel = `${trainingFrequencyDaysPerWeek} days/week`;
  const fitStatus = getTrainingSplitFitStatus({
    recommendedSplitId,
    selectedSplit,
    trainingFrequencyLabel,
  });

  return (
    <div className="training-split-step">
      <div className="min-w-0">
        <section aria-labelledby="training-split-title" className="training-split-choice">
          <div>
            <h3
              className="training-split-section-title font-black text-stone-950"
              id="training-split-title"
            >
              Choose a compatible split
            </h3>
            <p className="training-split-section-copy mt-1 max-w-2xl text-sm text-[#244256]">
              Just Workout recommends the best fit, but you can choose another compatible structure
              for {trainingFrequencyLabel}.
            </p>
          </div>

          <fieldset className="training-split-options">
            <legend className="sr-only">Training Split</legend>
            {compatibleSplits.map((option) => (
              <TrainingSplitOptionRadio
                isRecommended={option.id === recommendedSplitId}
                isSelected={option.id === selectedSplit.id}
                key={option.id}
                onSelect={onTrainingSplitChange}
                option={option}
              />
            ))}
          </fieldset>
        </section>

        <TrainingSplitDetailsPanel
          fitStatus={fitStatus}
          key={selectedSplit.id}
          split={selectedSplit}
        />
        <UnsupportedTrainingSplitsPanel />

        <div className="training-split-actions flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button asChild className="training-split-action-button" variant="outline">
            <Link to={planBuilderPaths.frequency}>Back to Frequency</Link>
          </Button>
          <Button
            className="training-split-action-button"
            onClick={() => {
              void onContinueToRepRanges();
            }}
            type="button"
          >
            Continue to Rep ranges
          </Button>
        </div>
      </div>

      <PlanBuilderStepStatusCard
        body="Your workout stays in blueprint mode until Review confirms the full plan."
        className="training-split-generation-note"
        title="Plan status"
      />
    </div>
  );
}

function getTrainingSplitFitStatus({
  recommendedSplitId,
  selectedSplit,
  trainingFrequencyLabel,
}: {
  recommendedSplitId: TrainingSplitId;
  selectedSplit: TrainingSplitDefinition;
  trainingFrequencyLabel: string;
}): TrainingSplitFitStatus {
  if (selectedSplit.id === recommendedSplitId) {
    return {
      body: `Just Workout recommends ${selectedSplit.label} for ${trainingFrequencyLabel} as the clearest starting point.`,
      title: "Recommended fit",
    };
  }

  return {
    body: `${selectedSplit.label} still fits ${trainingFrequencyLabel}, but it trades the default recommendation for a different weekly rhythm.`,
    title: "Compatible alternative",
  };
}

function RepRangeStyleStep({
  onContinueToVolume,
  onRepRangeStyleChange,
  savedRepRangeStyleId,
  selectedRepRangeStyle,
}: RepRangeStyleStepProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
        <section aria-labelledby="rep-range-style-title" className="space-y-3">
          <div>
            <h3
              className="text-xl font-black text-stone-950 sm:text-2xl"
              id="rep-range-style-title"
            >
              Select Rep Range Style
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-stone-600">
              Pick the rep target bias that fits how you want main compounds, secondary compounds,
              and accessories to feel before Volume is set next.
            </p>
          </div>

          <fieldset className="grid gap-3">
            <legend className="sr-only">Rep Range Style</legend>
            {repRangeStyles.map((option) => (
              <RepRangeStyleOptionRadio
                isSavedSelection={option.id === savedRepRangeStyleId}
                isSelected={option.id === selectedRepRangeStyle.id}
                key={option.id}
                onSelect={onRepRangeStyleChange}
                option={option}
              />
            ))}
          </fieldset>
        </section>

        <div className="grid gap-3">
          <RepRangeStyleEffectsPanel repRangeStyle={selectedRepRangeStyle} />
          <PlanBuilderStepStatusCard
            body="Volume targets are set next; Just Workout will use this rep range style later when translating volume into sets and reps."
            title="Boundary for this step"
            titleDisplay="visible"
          />
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button asChild variant="outline">
          <Link to={planBuilderPaths.split}>Back to Split</Link>
        </Button>
        <Button
          onClick={() => {
            void onContinueToVolume();
          }}
          type="button"
        >
          Continue to Volume
        </Button>
      </div>
    </div>
  );
}

function RepRangeStyleEffectsPanel({ repRangeStyle }: RepRangeStyleEffectsPanelProps) {
  return (
    <section
      aria-labelledby="rep-range-style-effect-title"
      aria-atomic="true"
      aria-live="polite"
      className="rounded-lg border border-stone-900/10 bg-[#f9f6ef] p-4"
    >
      <p className="text-sm font-bold uppercase tracking-wide text-[#b93725]">Selected style</p>
      <h3 className="mt-1 text-xl font-black text-stone-950" id="rep-range-style-effect-title">
        How this affects your plan
      </h3>
      <p className="mt-2 text-sm font-semibold text-stone-900">{repRangeStyle.title}</p>
      <ul className="mt-4 grid gap-3">
        {repRangeStyle.planEffects.map((effect) => (
          <li
            className="rounded-lg border border-stone-900/10 bg-white/80 px-4 py-3 text-sm text-stone-700"
            key={effect}
          >
            {effect}
          </li>
        ))}
      </ul>
    </section>
  );
}

function WeeklyVolumeTargetsStep({
  canContinueToExercises,
  onContinueToExercises,
  onOptionalVolumeTargetToggle,
  onVolumePresetChange,
  repRangeStyle,
  selectedVolumePresetId,
  volumePresetSource,
  weeklyRepTargets,
}: WeeklyVolumeTargetsStepProps) {
  const requiredWeeklyVolumeTargetRows = getRequiredWeeklyVolumeTargetRows({
    repRangeStyle,
    weeklyRepTargets,
  });
  const optionalWeeklyVolumeTargetRows = getOptionalWeeklyVolumeTargetRows({
    repRangeStyle,
    weeklyRepTargets,
  });

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-start">
      <div className="min-w-0 space-y-4">
        <section
          aria-labelledby="weekly-volume-targets-title"
          className="rounded-lg border border-stone-900/10 bg-white/78 p-6"
        >
          <h3
            className="text-xl font-black text-stone-950 sm:text-2xl"
            id="weekly-volume-targets-title"
          >
            Weekly volume targets
          </h3>
          <p className="mt-3 max-w-2xl text-sm text-stone-600">
            Set weekly rep targets for each muscle group before exercises are selected.
          </p>
          <p className="mt-2 max-w-2xl text-sm text-stone-600">
            Just Workout will translate those weekly targets into sets and reps across your training
            days later.
          </p>

          <VolumePresetSelector
            onVolumePresetChange={onVolumePresetChange}
            selectedVolumePresetId={selectedVolumePresetId}
            volumePresetSource={volumePresetSource}
          />

          <PlanBuilderStepStatusCard
            body="Weekly targets only: these targets describe your full training week, not a single workout."
            className="mt-5"
            title="Weekly targets note"
          />

          <RequiredWeeklyRepTargetsSection rows={requiredWeeklyVolumeTargetRows} />
          <OptionalWeeklyRepTargetsSection
            onOptionalVolumeTargetToggle={onOptionalVolumeTargetToggle}
            rows={optionalWeeklyVolumeTargetRows}
          />

          <section aria-labelledby="weekly-volume-how-it-works-title" className="mt-5">
            <h4
              className="text-lg font-black text-stone-950 sm:text-xl"
              id="weekly-volume-how-it-works-title"
            >
              How this works
            </h4>
            <ul className="mt-3 grid gap-3">
              {weeklyVolumeHowItWorksItems.map((item) => (
                <li className={weeklyVolumeHowItWorksItemClassName} key={item}>
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button asChild variant="outline">
              <Link to={planBuilderPaths.repRanges}>Back to Rep ranges</Link>
            </Button>
            <Button
              disabled={!canContinueToExercises}
              onClick={() => {
                void onContinueToExercises();
              }}
              type="button"
            >
              Continue to Exercises
            </Button>
          </div>
        </section>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <PlanBuilderStepStatusCard
          body="This step frames Training Volume as weekly reps before exercise choices and later builder outputs are introduced."
          title="Step scope"
          titleDisplay="visible"
        />
      </div>
    </div>
  );
}

function ExerciseSelectionPreferencesStep({
  exerciseSelectionPreferences,
  movementPatternCoverage,
  onContinueToReview,
  onExerciseSelectionPreferencesChange,
  rulesAppliedAutomatically,
}: ExerciseSelectionPreferencesStepProps) {
  const selectedStrategy = getExerciseSelectionStrategy(exerciseSelectionPreferences.strategy);
  const selectedEquipmentPreset = getEquipmentPreset(exerciseSelectionPreferences.equipmentPreset);
  const [pendingInputs, setPendingInputs] = useState<ExerciseSelectionPendingInputs>({
    ...emptyExerciseSelectionPendingInputs,
  });
  const [validationErrors, setValidationErrors] =
    useState<ExerciseSelectionPreferenceValidationErrors>({});

  function handleInputChange(listId: ExerciseSelectionPreferenceListId, value: string) {
    const inputId = getExerciseSelectionPendingInputId(listId);

    setPendingInputs((currentPendingInputs) => ({
      ...currentPendingInputs,
      [inputId]: value,
    }));
    setValidationErrors((currentValidationErrors) =>
      clearExerciseSelectionValidationError(currentValidationErrors, inputId),
    );
  }

  async function handleAdd(listId: ExerciseSelectionPreferenceListId) {
    const inputId = getExerciseSelectionPendingInputId(listId);
    const commitResult = commitPendingExerciseSelectionPreferences({
      createId: () => crypto.randomUUID(),
      exerciseSelectionPreferences,
      pendingInputs: {
        ...emptyExerciseSelectionPendingInputs,
        [inputId]: pendingInputs[inputId],
      },
    });

    if (hasExerciseSelectionPreferenceValidationErrors(commitResult.validationErrors)) {
      setValidationErrors((currentValidationErrors) => ({
        ...currentValidationErrors,
        ...commitResult.validationErrors,
      }));
      return;
    }

    setValidationErrors((currentValidationErrors) =>
      clearExerciseSelectionValidationError(currentValidationErrors, inputId),
    );
    setPendingInputs((currentPendingInputs) => ({
      ...currentPendingInputs,
      [inputId]: "",
    }));

    await onExerciseSelectionPreferencesChange(commitResult.exerciseSelectionPreferences);
  }

  async function handleRemove(
    listId: ExerciseSelectionPreferenceListId,
    itemId: ExerciseSelectionPreferenceItem["id"],
  ) {
    setValidationErrors({});

    await onExerciseSelectionPreferencesChange(
      removeExerciseSelectionPreferenceItem({
        exerciseSelectionPreferences,
        itemId,
        listId,
      }),
    );
  }

  async function handleContinueToReviewClick() {
    const commitResult = commitPendingExerciseSelectionPreferences({
      createId: () => crypto.randomUUID(),
      exerciseSelectionPreferences,
      pendingInputs,
    });

    if (hasExerciseSelectionPreferenceValidationErrors(commitResult.validationErrors)) {
      setValidationErrors(commitResult.validationErrors);
      return;
    }

    setPendingInputs({
      ...emptyExerciseSelectionPendingInputs,
    });
    setValidationErrors({});

    await onContinueToReview(commitResult.exerciseSelectionPreferences);
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-start">
      <div className="min-w-0 space-y-4">
        <section
          aria-labelledby="exercise-selection-strategy-title"
          className="rounded-lg border border-stone-900/10 bg-white/78 p-6"
        >
          <div>
            <h3
              className="text-xl font-black text-stone-950 sm:text-2xl"
              id="exercise-selection-strategy-title"
            >
              Exercise selection strategy
            </h3>
            <p className="mt-2 max-w-2xl text-sm text-stone-600">
              Just Workout keeps Step 5 read-only in v1 so your Plan Blueprint can stay focused on
              strategy and equipment before the later Training Plan is created.
            </p>
          </div>

          <div className="mt-5 rounded-lg border border-stone-950 bg-stone-950 p-5 text-stone-50 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-black uppercase tracking-wide text-stone-300">
                Selected strategy
              </p>
              {selectedStrategy.isRecommended ? (
                <span className="rounded-full bg-[#b93725] px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-wide text-white">
                  Recommended default
                </span>
              ) : null}
              <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-wide text-stone-100">
                Read-only in v1
              </span>
            </div>
            <h4 className="mt-3 text-2xl font-black">{selectedStrategy.title}</h4>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-200">
              {selectedStrategy.description}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {exerciseSelectionHighlights.map((highlight) => (
                <ExerciseSelectionHighlight key={highlight.title} {...highlight} />
              ))}
            </div>
          </div>
        </section>

        <MovementPatternCoverageSection coverageGroups={movementPatternCoverage} />

        <div className="grid gap-4 lg:grid-cols-2">
          <section
            aria-labelledby="equipment-preset-title"
            className="rounded-lg border border-stone-900/10 bg-white/78 p-6"
          >
            <div>
              <h3
                className="text-xl font-black text-stone-950 sm:text-2xl"
                id="equipment-preset-title"
              >
                Equipment preset
              </h3>
              <p className="mt-2 max-w-2xl text-sm text-stone-600">
                Full gym is the only v1 preset, and the included equipment chips below are derived
                from that preset instead of stored separately in the Plan Blueprint.
              </p>
            </div>

            <div className="mt-5 rounded-lg border border-stone-900/10 bg-[#f9f6ef] p-5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-black uppercase tracking-wide text-stone-500">
                  Selected preset
                </p>
                <span className="rounded-full bg-[#006f78] px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-wide text-white">
                  Only v1 preset
                </span>
              </div>
              <h4 className="mt-3 text-2xl font-black text-stone-950">
                {selectedEquipmentPreset.title}
              </h4>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-700">
                Just Workout assumes standard full-gym availability here so later Training Plan
                generation can pull from the expected equipment pool.
              </p>

              <div className="mt-5">
                <p className="text-xs font-black uppercase tracking-wide text-stone-500">
                  Included equipment
                </p>
                <ul aria-label="Included equipment" className="mt-3 flex flex-wrap gap-2.5">
                  {selectedEquipmentPreset.includedEquipment.map((equipment) => (
                    <li key={equipment.id}>
                      <span className="inline-flex items-center rounded-full border border-stone-900/10 bg-white px-3 py-1.5 text-sm font-bold text-stone-950 shadow-sm">
                        {equipment.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <ExerciseSelectionPreferencesEditor
            description="Optional soft preferences. Just Workout will prioritize them when they fit your Plan Blueprint, movement balance, and Weekly Rep Targets."
            emptyState="No Preferred Exercises added yet."
            controlId="preferred-exercises-input"
            inputLabel="Preferred Exercises"
            itemAriaLabel="Preferred Exercise entries"
            items={exerciseSelectionPreferences.preferredExercises}
            listId="preferredExercises"
            onAdd={handleAdd}
            onInputChange={handleInputChange}
            onRemove={handleRemove}
            pendingValue={pendingInputs.preferredExercise}
            validationError={validationErrors.preferredExercise}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <ExerciseSelectionPreferencesEditor
            description="Optional hard exclusions. Add painful, unavailable, or unsuitable exercises here so Just Workout excludes them from later Training Plan generation."
            emptyState="No Avoided Exercises added yet."
            controlId="avoided-exercises-input"
            inputLabel="Avoided Exercises"
            itemAriaLabel="Avoided Exercise entries"
            items={exerciseSelectionPreferences.avoidedExercises}
            listId="avoidedExercises"
            onAdd={handleAdd}
            onInputChange={handleInputChange}
            onRemove={handleRemove}
            pendingValue={pendingInputs.avoidedExercise}
            validationError={validationErrors.avoidedExercise}
          />

          <section className="rounded-lg border border-stone-900/10 bg-white/78 p-6">
            <h3 className="text-xl font-black text-stone-950 sm:text-2xl">Before you continue</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              Step 5 saves Exercise Selection Preferences only. The final Training Plan, exercise
              order, and detailed rest prescriptions still come later during generation.
            </p>
            <div className="mt-5 rounded-lg border border-[#d9c8a7] bg-[#f9f6ef] p-4">
              <p className="text-xs font-black uppercase tracking-wide text-stone-500">
                Conflict note
              </p>
              <p className="mt-2 text-sm leading-6 text-stone-700">
                Avoided Exercises are hard exclusions. If generation later cannot find a safe viable
                replacement, Review will surface an Exercise Selection Conflict for you to resolve
                instead of silently keeping the avoided exercise.
              </p>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button asChild variant="outline">
                <Link to={planBuilderPaths.volume}>Back to Volume</Link>
              </Button>
              <Button
                onClick={() => {
                  void handleContinueToReviewClick();
                }}
                type="button"
              >
                Continue to Review
              </Button>
            </div>
          </section>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <ExerciseSelectionAutomaticRulesPanel
          rulesAppliedAutomatically={rulesAppliedAutomatically}
        />
        {exerciseSelectionStatusCards.map((statusCard) => (
          <PlanBuilderStepStatusCard
            body={statusCard.body}
            key={statusCard.title}
            title={statusCard.title}
            titleDisplay="visible"
          />
        ))}
      </div>
    </div>
  );
}

function MovementPatternCoverageSection({ coverageGroups }: MovementPatternCoverageSectionProps) {
  return (
    <section
      aria-label="Movement pattern coverage"
      className="rounded-lg border border-stone-900/10 bg-white/78 p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3
            className="text-xl font-black text-stone-950 sm:text-2xl"
            id="movement-pattern-coverage-title"
          >
            Movement-pattern coverage
          </h3>
          <p className="mt-2 max-w-3xl text-sm text-stone-600">
            Derived from the current Training Split, strategy, and Weekly Rep Targets. This view
            stays read-only in v1 and does not promise final exercise slots.
          </p>
        </div>
        <span className="rounded-full border border-stone-900/10 bg-[#f4f0e8] px-3 py-1 text-[0.68rem] font-black uppercase tracking-wide text-stone-700">
          Read-only in v1
        </span>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {coverageGroups.map((group) => (
          <MovementPatternCoverageGroupCard group={group} key={group.id} />
        ))}
      </div>
    </section>
  );
}

function MovementPatternCoverageGroupCard({ group }: MovementPatternCoverageGroupCardProps) {
  const titleId = `${group.id}-movement-patterns-title`;

  return (
    <section
      aria-labelledby={titleId}
      className="rounded-lg border border-stone-900/10 bg-[#f9f6ef] p-5"
    >
      <h4 className="text-lg font-black text-stone-950" id={titleId}>
        {group.title}
      </h4>
      <p className="mt-2 text-sm leading-6 text-stone-700">{group.sessionBias}</p>

      <ul aria-label={group.title} className="mt-4 grid gap-3">
        {group.patterns.map((pattern) => (
          <li
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-900/10 bg-white px-4 py-3"
            key={pattern.id}
          >
            <span className="text-sm font-bold text-stone-950">{pattern.label}</span>
            <MovementPatternCoverageStatusBadge isDirectlyTargeted={pattern.isDirectlyTargeted} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function MovementPatternCoverageStatusBadge({
  isDirectlyTargeted,
}: MovementPatternCoverageStatusBadgeProps) {
  const status = getMovementPatternCoverageStatus(isDirectlyTargeted);

  return (
    <span
      className={cn(
        "rounded-full border px-3 py-1 text-[0.68rem] font-black uppercase tracking-wide",
        movementPatternCoverageStatusStyles[status],
      )}
    >
      {movementPatternCoverageStatusLabels[status]}
    </span>
  );
}

function getMovementPatternCoverageStatus(
  isDirectlyTargeted: boolean,
): MovementPatternCoverageStatus {
  if (isDirectlyTargeted) {
    return "direct";
  }

  return "indirect";
}

function ReviewPlaceholderStep() {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-start">
      <div className="min-w-0 space-y-4">
        <section className="rounded-lg border border-stone-900/10 bg-white/78 p-6">
          <h3 className="text-xl font-black text-stone-950 sm:text-2xl">Review step coming next</h3>
          <p className="mt-3 max-w-2xl text-sm text-stone-600">
            Exercises are confirmed. This placeholder keeps the final pre-generation route real
            without introducing full Review content yet.
          </p>
          <p className="mt-3 max-w-2xl text-sm text-stone-600">
            Exercise order and rest rules will be applied automatically during generation.
          </p>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button asChild variant="outline">
              <Link to={planBuilderPaths.exercises}>Back to Exercises</Link>
            </Button>
          </div>
        </section>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <PlanBuilderStepStatusCard
          body="This route is a guarded placeholder only. Final blueprint review stays out of scope in this slice."
          title="Step scope"
          titleDisplay="visible"
        />
      </div>
    </div>
  );
}

function ExerciseSelectionPreferencesEditor({
  controlId,
  description,
  emptyState,
  inputLabel,
  itemAriaLabel,
  items,
  listId,
  onAdd,
  onInputChange,
  onRemove,
  pendingValue,
  validationError,
}: ExerciseSelectionPreferencesEditorProps) {
  const validationMessageId = `${controlId}-validation-message`;

  return (
    <section className="rounded-lg border border-stone-900/10 bg-white/78 p-6">
      <div>
        <h3 className="text-xl font-black text-stone-950 sm:text-2xl">{inputLabel}</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">{description}</p>
      </div>

      <form
        className="mt-5"
        onSubmit={(event) => {
          event.preventDefault();
          void onAdd(listId);
        }}
      >
        <label className="text-sm font-bold text-stone-900" htmlFor={controlId}>
          {inputLabel}
        </label>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <input
            aria-describedby={validationError ? validationMessageId : undefined}
            aria-invalid={validationError ? "true" : undefined}
            className={cn(
              "min-h-11 flex-1 rounded-md border bg-white px-3 py-2 text-sm text-stone-950 placeholder:text-stone-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
              validationError
                ? "border-[#d6462f] focus-visible:outline-[#d6462f]"
                : "border-stone-900/15 focus-visible:outline-stone-950",
            )}
            id={controlId}
            onChange={(event) => onInputChange(listId, event.currentTarget.value)}
            placeholder="Add an exercise name"
            type="text"
            value={pendingValue}
          />
          <Button size="sm" type="submit" variant="outline">
            Add
          </Button>
        </div>
        {validationError ? (
          <p className="mt-2 text-sm font-semibold text-[#b93725]" id={validationMessageId}>
            {validationError}
          </p>
        ) : null}
      </form>

      <ul aria-label={itemAriaLabel} className="mt-5 grid gap-2.5">
        {items.length > 0 ? (
          items.map((item) => (
            <li
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-900/10 bg-[#f9f6ef] px-4 py-3"
              key={item.id}
            >
              <span className="text-sm font-semibold text-stone-950">{item.rawText}</span>
              <Button
                onClick={() => {
                  void onRemove(listId, item.id);
                }}
                size="sm"
                type="button"
                variant="ghost"
              >
                Remove
              </Button>
            </li>
          ))
        ) : (
          <li className="rounded-lg border border-dashed border-stone-900/12 bg-[#fcfaf6] px-4 py-3 text-sm font-medium text-stone-600">
            {emptyState}
          </li>
        )}
      </ul>
    </section>
  );
}

function ExerciseSelectionAutomaticRulesPanel({
  rulesAppliedAutomatically,
}: {
  rulesAppliedAutomatically: ReadonlyArray<AutomaticExerciseSelectionRule>;
}) {
  return (
    <section
      aria-labelledby="automatic-rules-title"
      className="rounded-lg border border-stone-900/10 bg-white/78 p-5"
    >
      <h3 className="text-lg font-black text-stone-950" id="automatic-rules-title">
        Rules applied automatically
      </h3>
      <p className="mt-2 text-sm leading-6 text-stone-600">
        Just Workout will apply these during Training Plan generation. This note stays explanatory
        only, so Step 5 does not add manual rest controls or detailed prescriptions.
      </p>

      <ul aria-label="Automatic exercise selection rules" className="mt-4 grid gap-2.5">
        {rulesAppliedAutomatically.map((rule) => (
          <li
            className="rounded-lg border border-stone-900/10 bg-[#fcfaf6] px-4 py-3"
            key={rule.id}
          >
            <p className="text-sm font-bold text-stone-950">{rule.label}</p>
            <p className="mt-1 text-sm leading-6 text-stone-600">{rule.description}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ExerciseSelectionHighlight({ body, title }: ExerciseSelectionHighlightProps) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/8 p-4">
      <h5 className="text-sm font-black uppercase tracking-wide text-stone-100">{title}</h5>
      <p className="mt-2 text-sm leading-6 text-stone-200">{body}</p>
    </div>
  );
}

function VolumePresetSelector({
  onVolumePresetChange,
  selectedVolumePresetId,
  volumePresetSource,
}: VolumePresetSelectorProps) {
  if (!selectedVolumePresetId || !volumePresetSource) {
    return <p className="mt-5 text-sm font-semibold text-stone-600">Loading volume presets...</p>;
  }

  return (
    <fieldset className="mt-5 grid gap-3">
      <legend className="sr-only">Volume preset</legend>
      {volumePresets.map((option) => (
        <VolumePresetOptionRadio
          isExplicitSelection={
            selectedVolumePresetId === option.id && volumePresetSource === "user_selected"
          }
          isSelected={selectedVolumePresetId === option.id}
          key={option.id}
          onSelect={onVolumePresetChange}
          option={option}
        />
      ))}
    </fieldset>
  );
}

function VolumePresetOptionRadio({
  isExplicitSelection,
  isSelected,
  onSelect,
  option,
}: VolumePresetOptionRadioProps) {
  const optionState = getSelectableOptionState(isSelected);

  function selectOption() {
    onSelect(option.id);
  }

  function saveExplicitSelection() {
    if (isSelected && !isExplicitSelection) {
      selectOption();
    }
  }

  return (
    <label className={getSelectableOptionCardClassName(optionState)}>
      <input
        checked={isSelected}
        className="sr-only"
        name="volume-preset"
        onClick={saveExplicitSelection}
        onChange={selectOption}
        type="radio"
        value={option.id}
      />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg font-black">{option.title}</p>
          <p className={cn("mt-2 text-sm", selectableOptionMutedTextStyles[optionState])}>
            {volumePresetDescriptions[option.id]}
          </p>
          <p
            className={cn(
              "mt-3 text-xs font-bold uppercase tracking-wide",
              selectableOptionMutedTextStyles[optionState],
            )}
          >
            {option.largerMuscleTarget} larger-muscle reps/week · {option.smallerMuscleTarget}{" "}
            smaller-muscle reps/week
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {isSelected ? <SelectionBadge isSelected={isSelected}>Selected</SelectionBadge> : null}
          {option.isRecommended ? (
            <SelectionBadge isSelected={isSelected}>Recommended</SelectionBadge>
          ) : null}
        </div>
      </div>
    </label>
  );
}

function RequiredWeeklyRepTargetsSection({ rows }: RequiredWeeklyRepTargetsRowsProps) {
  return (
    <section aria-labelledby="required-weekly-rep-targets-title" className="mt-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4
            className="text-lg font-black text-stone-950 sm:text-xl"
            id="required-weekly-rep-targets-title"
          >
            Required weekly rep targets
          </h4>
          <p className="mt-1 max-w-2xl text-sm text-stone-600">
            Reps/week is the saved Training Volume target. Estimated sets/week is display context
            only.
          </p>
        </div>
      </div>

      {rows.length > 0 ? (
        <RequiredWeeklyRepTargetsTable rows={rows} />
      ) : (
        <p className="mt-3 text-sm font-semibold text-stone-600">Loading weekly rep targets...</p>
      )}
    </section>
  );
}

function OptionalWeeklyRepTargetsSection({
  onOptionalVolumeTargetToggle,
  rows,
}: OptionalWeeklyRepTargetsSectionProps) {
  return (
    <section aria-labelledby="optional-volume-targets-title" className="mt-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4
            className="text-lg font-black text-stone-950 sm:text-xl"
            id="optional-volume-targets-title"
          >
            Optional volume targets
          </h4>
          <p className="mt-1 max-w-2xl text-sm text-stone-600">
            Calves and Abs stay out of the saved Training Volume until you add direct work for them.
          </p>
        </div>
      </div>

      {rows.length > 0 ? (
        <OptionalWeeklyRepTargetsTable
          onOptionalVolumeTargetToggle={onOptionalVolumeTargetToggle}
          rows={rows}
        />
      ) : (
        <p className="mt-3 text-sm font-semibold text-stone-600">
          Loading optional volume targets...
        </p>
      )}
    </section>
  );
}

function RequiredWeeklyRepTargetsTable({ rows }: RequiredWeeklyRepTargetsRowsProps) {
  return (
    <div className="mt-3 overflow-x-auto rounded-lg border border-stone-900/10 bg-[#fcfaf6]">
      <table
        aria-label="Required Weekly Rep Targets"
        className="min-w-full border-collapse text-left"
      >
        <thead className="bg-[#f4f0e8]">
          <tr>
            <th className={weeklyVolumeTargetColumnHeaderClassName}>Muscle group</th>
            <th className={weeklyVolumeTargetColumnHeaderClassName}>Weekly rep target</th>
            <th className={weeklyVolumeTargetColumnHeaderClassName}>Estimated sets/week</th>
            <th className={weeklyVolumeTargetColumnHeaderClassName}>Status</th>
            <th className={weeklyVolumeTargetColumnHeaderClassName}>Adjustment</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-900/10 bg-white/88">
          {rows.map((row) => (
            <tr className="align-top" key={row.muscleGroupId}>
              <th className="px-4 py-4 text-sm font-semibold text-stone-950" scope="row">
                {row.label}
              </th>
              <td className="px-4 py-4 text-sm font-semibold text-stone-900">
                {row.weeklyRepTargetLabel}
              </td>
              <td className="px-4 py-4 text-sm font-semibold text-stone-900">
                {row.estimatedSetRangeLabel}
              </td>
              <td className="px-4 py-4">
                <WeeklyVolumeTargetStatusBadge label={row.statusLabel} tone={row.statusTone} />
              </td>
              <td className="px-4 py-4">
                <Button
                  aria-label={`Adjust ${row.label} target`}
                  className="px-0 text-stone-500 disabled:opacity-100"
                  disabled
                  size="sm"
                  variant="ghost"
                >
                  Adjust
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OptionalWeeklyRepTargetsTable({
  onOptionalVolumeTargetToggle,
  rows,
}: OptionalWeeklyRepTargetsTableProps) {
  return (
    <div className="mt-3 overflow-x-auto rounded-lg border border-stone-900/10 bg-[#fcfaf6]">
      <table aria-label="Optional Volume Targets" className="min-w-full border-collapse text-left">
        <thead className="bg-[#f4f0e8]">
          <tr>
            <th className={weeklyVolumeTargetColumnHeaderClassName}>Muscle group</th>
            <th className={weeklyVolumeTargetColumnHeaderClassName}>Weekly rep target</th>
            <th className={weeklyVolumeTargetColumnHeaderClassName}>Estimated sets/week</th>
            <th className={weeklyVolumeTargetColumnHeaderClassName}>Status</th>
            <th className={weeklyVolumeTargetColumnHeaderClassName}>Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-900/10 bg-white/88">
          {rows.map((row) => (
            <tr className="align-top" key={row.muscleGroupId}>
              <th className="px-4 py-4 text-sm font-semibold text-stone-950" scope="row">
                {row.label}
              </th>
              <td className="px-4 py-4 text-sm font-semibold text-stone-900">
                {row.weeklyRepTargetLabel}
              </td>
              <td className="px-4 py-4 text-sm font-semibold text-stone-900">
                {row.estimatedSetRangeLabel}
              </td>
              <td className="px-4 py-4">
                <WeeklyVolumeTargetStatusBadge label="Optional" tone="optional" />
              </td>
              <td className="px-4 py-4">
                <Button
                  aria-label={`${row.actionLabel} ${row.label} target`}
                  onClick={() => onOptionalVolumeTargetToggle(row.muscleGroupId, !row.isEnabled)}
                  size="sm"
                  variant={row.isEnabled ? "ghost" : "outline"}
                >
                  {row.actionLabel}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WeeklyVolumeTargetStatusBadge({ label, tone }: WeeklyVolumeTargetStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide",
        weeklyVolumeTargetStatusStyles[tone],
      )}
    >
      {label}
    </span>
  );
}

function getRequiredWeeklyVolumeTargetRows({
  repRangeStyle,
  weeklyRepTargets,
}: RequiredWeeklyVolumeTargetRowsOptions): Array<WeeklyVolumeTargetDisplayRow> {
  if (!repRangeStyle || !weeklyRepTargets) {
    return [];
  }

  const rows: Array<WeeklyVolumeTargetDisplayRow> = [];

  for (const definition of requiredWeeklyVolumeTargetRowDefinitions) {
    const weeklyRepTarget = weeklyRepTargets.find(
      ({ muscleGroup }) => muscleGroup === definition.muscleGroupId,
    );

    if (!weeklyRepTarget) {
      continue;
    }

    const row = createWeeklyVolumeTargetDisplayRow({
      definition,
      repRangeStyle,
      weeklyRepTarget,
    });

    if (row) {
      rows.push(row);
    }
  }

  return rows;
}

function getOptionalWeeklyVolumeTargetRows({
  repRangeStyle,
  weeklyRepTargets,
}: OptionalWeeklyVolumeTargetRowsOptions): Array<OptionalWeeklyVolumeTargetDisplayRow> {
  if (!weeklyRepTargets) {
    return [];
  }

  const rows: Array<OptionalWeeklyVolumeTargetDisplayRow> = [];

  for (const definition of optionalWeeklyVolumeTargetRowDefinitions) {
    const weeklyRepTarget = weeklyRepTargets.find(
      ({ muscleGroup }) => muscleGroup === definition.muscleGroupId,
    );

    if (!weeklyRepTarget) {
      continue;
    }

    rows.push(
      createOptionalWeeklyVolumeTargetDisplayRow({
        definition,
        repRangeStyle,
        weeklyRepTarget,
      }),
    );
  }

  return rows;
}

function createWeeklyVolumeTargetDisplayRow({
  definition,
  repRangeStyle,
  weeklyRepTarget,
}: {
  definition: WeeklyVolumeTargetRowDefinition;
  repRangeStyle: RepRangeStyle;
  weeklyRepTarget: WeeklyRepTarget;
}): WeeklyVolumeTargetDisplayRow | null {
  const weeklyRepTargetValue = weeklyRepTarget.target;

  if (weeklyRepTargetValue === null) {
    return null;
  }

  const estimatedSetRange = estimateWeeklySetRangeForTarget({
    volumeEstimationRepRange: repRangeStyle.volumeEstimationRepRange,
    weeklyRepTarget,
  });

  if (!estimatedSetRange) {
    return null;
  }

  return {
    ...definition,
    estimatedSetRangeLabel: formatEstimatedSetRange(estimatedSetRange),
    weeklyRepTargetLabel: `${weeklyRepTargetValue} reps/week`,
  };
}

function createOptionalWeeklyVolumeTargetDisplayRow({
  definition,
  repRangeStyle,
  weeklyRepTarget,
}: {
  definition: OptionalWeeklyVolumeTargetRowDefinition;
  repRangeStyle: RepRangeStyle | null;
  weeklyRepTarget: WeeklyRepTarget;
}): OptionalWeeklyVolumeTargetDisplayRow {
  const optionalLabel = "Optional";
  const hasVisibleTarget = weeklyRepTarget.isEnabled && weeklyRepTarget.target !== null;
  let estimatedSetRange: EstimatedSetRange | null = null;

  if (hasVisibleTarget && repRangeStyle) {
    estimatedSetRange = estimateWeeklySetRangeForTarget({
      volumeEstimationRepRange: repRangeStyle.volumeEstimationRepRange,
      weeklyRepTarget,
    });
  }

  return {
    ...definition,
    actionLabel: weeklyRepTarget.isEnabled ? "Remove" : "Add",
    estimatedSetRangeLabel: estimatedSetRange
      ? formatEstimatedSetRange(estimatedSetRange)
      : optionalLabel,
    isEnabled: weeklyRepTarget.isEnabled,
    weeklyRepTargetLabel: hasVisibleTarget ? `${weeklyRepTarget.target} reps/week` : optionalLabel,
  };
}

function formatEstimatedSetRange({ max, min }: EstimatedSetRange): string {
  return `${min}-${max} sets/week`;
}

type TrainingFrequencyOptionRadioProps = {
  isSelected: boolean;
  onSelect: (trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek) => void;
  option: TrainingFrequencyOption;
};

function clearExerciseSelectionValidationError(
  validationErrors: ExerciseSelectionPreferenceValidationErrors,
  inputId: ExerciseSelectionPendingInputId,
): ExerciseSelectionPreferenceValidationErrors {
  if (!(inputId in validationErrors)) {
    return validationErrors;
  }

  const nextValidationErrors = { ...validationErrors };

  delete nextValidationErrors[inputId];

  return nextValidationErrors;
}

function getExerciseSelectionPendingInputId(
  listId: ExerciseSelectionPreferenceListId,
): ExerciseSelectionPendingInputId {
  return listId === "preferredExercises" ? "preferredExercise" : "avoidedExercise";
}

function getSelectableOptionState(isSelected: boolean): SelectableOptionState {
  return isSelected ? "selected" : "unselected";
}

function getSelectableOptionCardClassName(state: SelectableOptionState): string {
  return cn(selectableOptionCardBaseClassName, selectableOptionCardStyles[state]);
}

function getRepRangeStyleOptionCardClassName(state: SelectableOptionState): string {
  return cn(selectableOptionCardBaseClassName, repRangeStyleOptionCardStyles[state]);
}

function SelectionBadge({ children, isSelected }: SelectionBadgeProps) {
  const optionState = getSelectableOptionState(isSelected);

  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide",
        selectableOptionBadgeStyles[optionState],
      )}
    >
      {children}
    </span>
  );
}

function RepRangeStyleStatusBadge({ children, tone }: RepRangeStyleStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide",
        repRangeStyleStatusBadgeStyles[tone],
      )}
    >
      {children}
    </span>
  );
}

function TrainingFrequencyOptionRadio({
  isSelected,
  onSelect,
  option,
}: TrainingFrequencyOptionRadioProps) {
  const optionLabel = `${option.daysPerWeek} days/week`;

  return (
    <label
      className={cn(
        "training-frequency-option relative flex min-h-60 min-w-0 cursor-pointer flex-col items-center justify-center rounded-lg border bg-white/80 p-5 text-center transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[#007780]",
        isSelected
          ? "border-[#0b8490] text-[#00636a] shadow-[0_14px_30px_rgba(0,119,128,0.08)]"
          : "border-stone-950/10 text-stone-950 hover:bg-white",
      )}
    >
      <input
        checked={isSelected}
        className="sr-only"
        name="training-frequency-days-per-week"
        onChange={() => onSelect(option.daysPerWeek)}
        type="radio"
        value={option.daysPerWeek}
      />
      {isSelected ? (
        <span className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-[#007780] text-white">
          <Check aria-hidden="true" size={19} strokeWidth={2.5} />
        </span>
      ) : null}
      <span className="training-frequency-option__icon flex h-16 w-16 items-center justify-center text-stone-950">
        <span className="training-frequency-option__icon-frame relative flex h-16 w-16 items-center justify-center">
          <Calendar aria-hidden="true" size={58} strokeWidth={1.4} />
          <span className="training-frequency-option__day absolute top-[1.58rem] text-[1.35rem] font-medium leading-none">
            {option.daysPerWeek}
          </span>
        </span>
      </span>
      <span className="training-frequency-option__label mt-6 block text-[1.35rem] font-medium leading-7 text-stone-950">
        {optionLabel}
      </span>
      <span className="training-frequency-option__helper mt-4 block min-h-12 text-base font-medium leading-6 text-[#526873]">
        {option.helperText}
      </span>
    </label>
  );
}

function TrainingSplitOptionRadio({
  isRecommended,
  isSelected,
  onSelect,
  option,
}: TrainingSplitOptionRadioProps) {
  const badgeLabel = isRecommended ? "Recommended" : "Also works";
  const optionState = getSelectableOptionState(isSelected);

  return (
    <label
      className={cn(
        "training-split-option",
        getSelectableOptionCardClassName(optionState),
        isSelected ? "training-split-option--selected" : null,
      )}
    >
      <input
        checked={isSelected}
        className="sr-only"
        name="training-split"
        onChange={() => onSelect(option.id)}
        type="radio"
        value={option.id}
      />
      <div className="training-split-option__body">
        <span className="training-split-option__control" aria-hidden="true">
          {isSelected ? <Check aria-hidden="true" size={19} strokeWidth={2.8} /> : null}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="training-split-option__title font-black">{option.label}</p>
            <SelectionBadge isSelected={isSelected}>{badgeLabel}</SelectionBadge>
          </div>
          <p
            className={cn(
              "training-split-option__copy",
              isSelected ? "text-[#244256]" : selectableOptionMutedTextStyles[optionState],
            )}
          >
            {option.cardDescription}
          </p>
        </div>
      </div>
    </label>
  );
}

function RepRangeStyleOptionRadio({
  isSavedSelection,
  isSelected,
  onSelect,
  option,
}: RepRangeStyleOptionRadioProps) {
  const optionState = getSelectableOptionState(isSelected);
  const detailStyles = repRangeStyleDetailStyles[optionState];
  function selectOption() {
    onSelect(option.id);
  }

  function saveImplicitDefaultSelection() {
    if (isSelected && !isSavedSelection) {
      selectOption();
    }
  }

  return (
    <label className={getRepRangeStyleOptionCardClassName(optionState)}>
      <input
        checked={isSelected}
        className="sr-only"
        name="rep-range-style"
        onClick={saveImplicitDefaultSelection}
        onChange={selectOption}
        type="radio"
        value={option.id}
      />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg font-black">{option.title}</p>
          <p className={cn("mt-2 text-sm", repRangeStyleDescriptionStyles[optionState])}>
            {option.description}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {isSelected ? (
            <RepRangeStyleStatusBadge tone="selected">
              <CheckCircle2 aria-hidden="true" size={14} strokeWidth={2} />
              Selected
            </RepRangeStyleStatusBadge>
          ) : null}

          {option.isRecommended ? (
            <RepRangeStyleStatusBadge tone="recommended">Recommended</RepRangeStyleStatusBadge>
          ) : null}
        </div>
      </div>

      <div className={cn("mt-4 rounded-lg border p-3", detailStyles.notePanelClassName)}>
        <p
          className={cn(
            "text-xs font-bold uppercase tracking-wide",
            detailStyles.noteLabelClassName,
          )}
        >
          Contextual note
        </p>
        <p className={cn("mt-2 text-sm", detailStyles.noteBodyClassName)}>{option.note}</p>
      </div>

      <RepRangeStyleTargets isSelected={isSelected} targets={option.targets} />
    </label>
  );
}

function RepRangeStyleTargets({ isSelected = false, targets }: RepRangeStyleTargetsProps) {
  const optionState = getSelectableOptionState(isSelected);
  const styles = repRangeStyleDetailStyles[optionState];

  return (
    <dl className="mt-4 grid gap-2 sm:grid-cols-3">
      {targets.map((target) => (
        <div
          className={cn("rounded-md border px-3 py-3", styles.targetCardClassName)}
          key={target.label}
        >
          <dt
            className={cn("text-xs font-bold uppercase tracking-wide", styles.targetLabelClassName)}
          >
            {target.label}
          </dt>
          <dd className={cn("mt-1 text-sm font-semibold", styles.targetValueClassName)}>
            {target.reps}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function TrainingSplitDetailsPanel({ fitStatus, split }: TrainingSplitDetailsPanelProps) {
  return (
    <section
      aria-labelledby="training-split-details-title"
      aria-atomic="true"
      aria-live="polite"
      className="training-split-details rounded-lg border border-[#0b6f78] bg-[#fbfdfc] p-4"
    >
      <div className="training-split-details__heading">
        <span className="training-split-details__check flex h-9 w-9 items-center justify-center rounded-full bg-[#00636a] text-white">
          <Check aria-hidden="true" size={20} strokeWidth={2.6} />
        </span>
        <h3 className="text-xl font-black text-stone-950" id="training-split-details-title">
          {split.label}
        </h3>
      </div>
      <p className="training-split-details__copy mt-2 max-w-3xl text-sm text-[#244256]">
        {split.cardDescription}
      </p>

      <div className="training-split-details__content">
        <TrainingSplitFitPanel fitStatus={fitStatus} />
        <TrainingSplitSchedulePanel schedule={split.schedule} />
      </div>
    </section>
  );
}

function TrainingSplitFitPanel({ fitStatus }: TrainingSplitFitPanelProps) {
  return (
    <div className="training-split-fit-panel">
      <h4 className="text-base font-black text-stone-950">Why this split fits</h4>
      <ul className="mt-3 grid gap-2 text-sm font-medium leading-5 text-[#112c3a]">
        <li className="flex gap-2">
          <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0 text-[#00636a]" size={17} />
          <span>{fitStatus.title}</span>
        </li>
        <li className="flex gap-2">
          <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0 text-[#00636a]" size={17} />
          <span>Muscle frequency and recovery stay balanced.</span>
        </li>
        <li className="flex gap-2">
          <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0 text-[#00636a]" size={17} />
          <span>Easy to recover from and schedule.</span>
        </li>
      </ul>
    </div>
  );
}

function UnsupportedTrainingSplitsPanel() {
  return (
    <section aria-labelledby="not-recommended-split-title" className="training-split-unsupported">
      <h4 className="text-base font-black text-stone-950" id="not-recommended-split-title">
        Not included in this step
      </h4>
      <div className="mt-2 divide-y divide-stone-950/10">
        {unsupportedTrainingSplitCategories.map((category) => (
          <div className="training-split-unsupported__row" key={category.title}>
            <Info aria-hidden="true" className="mt-0.5 shrink-0 text-[#0a5960]" size={18} />
            <p className="font-semibold text-[#112c3a]">{category.title}</p>
            <p className="text-[#244256]">
              {getUnsupportedTrainingSplitShortReason(category.title)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function getUnsupportedTrainingSplitShortReason(title: string): string {
  if (title === "Body-part split weeks") {
    return "Too low in frequency for most users on a 2-5 day builder.";
  }

  return "Less compatible with the selected Training Frequency.";
}

function TrainingSplitSchedulePanel({ schedule }: TrainingSplitSchedulePanelProps) {
  return (
    <div className="training-split-schedule-panel">
      <h4 className="text-base font-black text-stone-950">
        {getTrainingSplitScheduleHeading(schedule)}
      </h4>
      <TrainingSplitScheduleContent schedule={schedule} />
    </div>
  );
}

function TrainingSplitScheduleContent({ schedule }: TrainingSplitSchedulePanelProps) {
  switch (schedule.kind) {
    case "fixed-week": {
      const trainingDays = schedule.week.filter(
        (day) => !day.sessionLabel.toLowerCase().includes("rest"),
      );

      return (
        <div className="mt-3">
          <ol className="training-split-schedule-days">
            {trainingDays.map((day, index) => (
              <li
                className="training-split-schedule-day"
                key={`${day.dayLabel}-${day.sessionLabel}`}
              >
                <p className="text-sm font-bold text-[#244256]">
                  {getSuggestedTrainingDayLabel(day.dayLabel, index)}
                </p>
                <p className="mt-1 text-sm font-semibold text-[#00636a]">{day.sessionLabel}</p>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-sm font-medium leading-6 text-[#244256]">
            {schedule.description}
          </p>
        </div>
      );
    }
    case "rotating-cycle":
      return (
        <div className="mt-3 space-y-3">
          <ol className="training-split-schedule-days">
            {schedule.cycle.map((session, index) => (
              <li className="training-split-schedule-day" key={session.id}>
                <p className="text-sm font-bold text-[#244256]">Cycle step {index + 1}</p>
                <p className="mt-1 text-sm font-semibold text-[#00636a]">{session.sessionLabel}</p>
              </li>
            ))}
          </ol>
          <p className="text-sm font-medium leading-6 text-[#244256]">{schedule.cadence}</p>
        </div>
      );
  }
}

function getSuggestedTrainingDayLabel(dayLabel: string, index: number): string {
  const suggestedWeekdays = ["Mon", "Wed", "Fri", "Sat", "Sun"];

  if (dayLabel.startsWith("Day ")) {
    return suggestedWeekdays[index] ?? dayLabel;
  }

  return dayLabel;
}

function getTrainingSplitScheduleHeading(schedule: TrainingSplitSchedule): string {
  switch (schedule.kind) {
    case "fixed-week":
      return "Suggested weekly layout";
    case "rotating-cycle":
      return "Rotating-cycle preview";
  }
}

type TrainingFrequencyRecommendationCardProps = {
  recommendation: TrainingFrequencyRecommendation;
};

function TrainingFrequencyRecommendationCard({
  recommendation,
}: TrainingFrequencyRecommendationCardProps) {
  return (
    <section
      aria-labelledby="training-frequency-recommendation-title"
      className="training-frequency-recommendation mt-6 flex items-center gap-5 rounded-lg border border-[#d9ebed] bg-[#f8fcfc] px-5 py-[17px] text-[#075d63]"
    >
      <span className="training-frequency-recommendation__icon flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[#0b8490]/20 bg-white/60">
        <Star aria-hidden="true" size={28} strokeWidth={1.5} />
      </span>
      <div className="min-w-0">
        <h3 className="text-base font-bold" id="training-frequency-recommendation-title">
          Recommended for you
        </h3>
        <p className="mt-2 text-base font-medium leading-7 text-[#31505d]">
          {recommendation.description}
        </p>
      </div>
    </section>
  );
}

function PlanBuilderStepStatusCard({
  body,
  className,
  title,
  titleDisplay = "screen-reader-only",
}: PlanBuilderStepStatusCardProps) {
  const hasVisibleTitle = titleDisplay === "visible";

  return (
    <div
      className={cn(
        "plan-builder-step-status flex gap-4 rounded-lg border border-[#f0cfad] bg-[#fff8f1] px-5 py-[14px] text-[#8a4a18]",
        hasVisibleTitle ? "items-start" : "items-center",
        className,
      )}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center text-[#db7a1d]">
        <Info aria-hidden="true" size={24} strokeWidth={1.7} />
      </span>
      <div className="min-w-0">
        {hasVisibleTitle ? (
          <h4 className="text-sm font-bold uppercase tracking-wide text-[#9a612c]">{title}</h4>
        ) : (
          <p className="sr-only">{title}</p>
        )}
        <p className={cn("text-base font-medium leading-7", hasVisibleTitle ? "mt-1" : null)}>
          {body}
        </p>
      </div>
    </div>
  );
}
