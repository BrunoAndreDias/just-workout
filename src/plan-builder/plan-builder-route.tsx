import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
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
import { type ReactNode, useEffect } from "react";
import { Button } from "../design-system/button";
import { Card } from "../design-system/card";
import { cn } from "../design-system/cn";
import { KeyValueRow } from "../design-system/key-value-row";
import { Stepper } from "../design-system/stepper";
import {
  confirmRepRangeStyle,
  confirmTrainingFrequency,
  confirmTrainingSplit,
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
  type VolumeMuscleGroupId,
  type VolumePreset,
  type VolumePresetId,
  type VolumePresetSource,
  volumePresets,
  type WeeklyRepTarget,
} from "./training-volume";

type PlanBlueprintSummaryStatusKey = "splitStatus" | "trainingFrequencyStatus";
type PlanBlueprintSummaryStatus = NonNullable<PlanBlueprintSummary[PlanBlueprintSummaryStatusKey]>;

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
] as const;

const planBuilderBlueprintQueryKey = ["plan-builder", "blueprint"] as const;

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

type PlanBuilderPageProps = {
  children: ReactNode;
  currentStep: PlanBuilderStep;
  intro: ReactNode;
  stepLabel: string;
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
  onOptionalVolumeTargetToggle: OptionalVolumeTargetToggleHandler;
  onVolumePresetChange: (volumePreset: VolumePresetId) => void;
  repRangeStyle: RepRangeStyle | null;
  selectedVolumePresetId: VolumePresetId | null;
  volumePresetSource: VolumePresetSource | null;
  weeklyRepTargets: ReadonlyArray<WeeklyRepTarget> | null;
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
      stepLabel="Frequency step"
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
      stepLabel="Split step"
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
      stepLabel="Rep ranges step"
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
  const { mutate: initializeTrainingVolumeDefaults } = useInitializeTrainingVolumeMutation();
  const { mutate: updateTrainingVolumePreset } = useUpdateTrainingVolumePresetMutation();
  const { mutate: updateOptionalVolumeTarget } = useUpdateOptionalVolumeTargetMutation();
  const selectedRepRangeStyleId = blueprint ? getValidRepRangeStyleId(blueprint.repRanges) : null;
  const selectedRepRangeStyle = selectedRepRangeStyleId
    ? getRepRangeStyle(selectedRepRangeStyleId)
    : null;

  useEffect(() => {
    if (!blueprint || isTrainingVolumeConfiguration(blueprint)) {
      return;
    }

    initializeTrainingVolumeDefaults({
      timestamp: new Date().toISOString(),
    });
  }, [blueprint, initializeTrainingVolumeDefaults]);

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

  return (
    <PlanBuilderPage
      currentStep="volume"
      intro={
        <p className="max-w-2xl text-sm font-medium leading-6 text-stone-700 sm:text-base">
          Training Volume is configured as weekly reps before exercises are selected. This step
          frames the weekly targets before later exercise choices refine them.
        </p>
      }
      stepLabel="Volume step"
      summary={summary}
    >
      <WeeklyVolumeTargetsStep
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

function PlanBuilderPage({
  children,
  currentStep,
  intro,
  stepLabel: _stepLabel,
  summary,
}: PlanBuilderPageProps) {
  const currentStepIndex = getPlanBuilderStepDetails(currentStep).index;

  return (
    <section className="plan-builder-page grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start 2xl:grid-cols-[906px_22.5rem] 2xl:gap-[1.625rem]">
      <section aria-label="Plan Builder workspace" className="min-w-0">
        <Card className="plan-builder-workspace-card rounded-[0.875rem] bg-white/88 p-6 shadow-none sm:p-8 lg:min-h-screen lg:px-[3.125rem] lg:pb-3 lg:pt-11">
          <header className="space-y-2">
            <h1 className="plan-builder-title font-serif text-4xl font-black leading-tight text-[#120f0d] sm:text-[2.5rem]">
              Build your workout plan
            </h1>
            {intro}
          </header>

          <div className="plan-builder-stepper mt-7">
            <Stepper
              currentIndex={currentStepIndex}
              items={planBuilderSteps}
              label="Plan Builder"
            />
          </div>

          <div className="plan-builder-step-content mt-9">{children}</div>
        </Card>
      </section>

      <div className="plan-builder-right-rail grid gap-6 self-start xl:pt-6">
        <PlanBlueprintSummaryCard summary={summary} />
        <PlanBuilderNextStepCard currentStep={currentStep} />
      </div>
    </section>
  );
}

function PlanBuilderNextStepCard({ currentStep }: PlanBuilderCurrentStepCardProps) {
  const body = planBuilderNextStepBodyByStep[currentStep];

  return (
    <Card className="plan-builder-next-card rounded-[0.875rem] bg-white/88 p-6 shadow-none sm:p-7">
      <h2 className="font-serif text-2xl font-black leading-tight text-[#120f0d]">
        What happens next
      </h2>
      <p className="mt-5 text-base font-medium leading-8 text-[#31505d]">{body}</p>
    </Card>
  );
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

  return (
    <section
      aria-labelledby="training-frequency-title"
      className="training-frequency-panel rounded-lg border border-stone-950/10 bg-white/78 p-6 sm:p-8 lg:-mx-[1.375rem]"
    >
      <div>
        <h2
          className="training-frequency-title font-serif text-3xl font-black leading-tight text-[#120f0d]"
          id="training-frequency-title"
        >
          Training frequency
        </h2>
        <p className="training-frequency-copy mt-4 max-w-3xl text-base font-medium leading-6 text-[#31505d]">
          Choose how many days per week you can realistically train.
        </p>
        <p className="mt-1 max-w-3xl text-base font-medium leading-6 text-[#31505d]">
          Just Workout will recommend the best Training Split based on this choice.
        </p>
      </div>

      <fieldset className="training-frequency-options mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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

      <PlanBuilderStepStatusCard
        body="6-day plans are not available in this first version."
        className="mt-4"
        title="Unavailable"
      />

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
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-start">
      <div className="min-w-0 space-y-4">
        <section aria-labelledby="training-split-title" className="space-y-3">
          <div>
            <h3 className="text-xl font-black text-stone-950 sm:text-2xl" id="training-split-title">
              Select Training Split
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-stone-600">
              These options stay compatible with {trainingFrequencyLabel}. The saved Plan Blueprint
              keeps only the selected split id while weekly rhythm and recovery stay derived.
            </p>
          </div>

          <fieldset className="grid gap-3">
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

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button asChild variant="outline">
            <Link to={planBuilderPaths.frequency}>Back to Frequency</Link>
          </Button>
          <Button
            onClick={() => {
              void onContinueToRepRanges();
            }}
            type="button"
          >
            Continue to Rep ranges
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <PlanBuilderStepStatusCard
          body="No Training Plan has been generated yet. Review is still the point where the full Training Plan is created."
          title="Plan status"
        />
      </div>
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
        <CheckCircle2
          aria-hidden="true"
          className="absolute right-4 top-4 text-[#006f78]"
          size={22}
          strokeWidth={2}
        />
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
    <label className={getSelectableOptionCardClassName(optionState)}>
      <input
        checked={isSelected}
        className="sr-only"
        name="training-split"
        onChange={() => onSelect(option.id)}
        type="radio"
        value={option.id}
      />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg font-black">{option.label}</p>
          <p className={cn("mt-2 text-sm", selectableOptionMutedTextStyles[optionState])}>
            {option.cardDescription}
          </p>
        </div>
        <SelectionBadge isSelected={isSelected}>{badgeLabel}</SelectionBadge>
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
      className="rounded-lg border border-stone-900/10 bg-[#f9f6ef] p-4"
    >
      <p className="text-sm font-bold uppercase tracking-wide text-[#b93725]">Selected split</p>
      <h3 className="mt-1 text-xl font-black text-stone-950" id="training-split-details-title">
        {split.label}
      </h3>
      <p className="mt-2 max-w-3xl text-sm text-stone-600">{split.cardDescription}</p>

      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        <SummaryRow label="Weekly rhythm" value={split.weeklyRhythm} />
        <SummaryRow label="Muscle frequency" value={split.muscleFrequency} />
        <SummaryRow label="Recovery" value={split.recovery} />
      </dl>

      <TrainingSplitFitPanel fitStatus={fitStatus} />
      <TrainingSplitSchedulePanel schedule={split.schedule} />
      <UnsupportedTrainingSplitsPanel />
    </section>
  );
}

function TrainingSplitFitPanel({ fitStatus }: TrainingSplitFitPanelProps) {
  return (
    <div className="mt-4 rounded-lg border border-stone-900/10 bg-white/80 p-4">
      <h4 className="text-sm font-bold uppercase tracking-wide text-stone-500">
        Why this split fits
      </h4>
      <p className="mt-2 text-sm font-semibold text-stone-900">{fitStatus.title}</p>
      <p className="mt-2 text-sm text-stone-600">{fitStatus.body}</p>
    </div>
  );
}

function UnsupportedTrainingSplitsPanel() {
  return (
    <section aria-labelledby="not-recommended-split-title" className="mt-4 space-y-3">
      <div>
        <h4
          className="text-lg font-black text-stone-950 sm:text-xl"
          id="not-recommended-split-title"
        >
          Not included in this step
        </h4>
        <p className="mt-1 max-w-2xl text-sm text-stone-600">
          Common split categories that do not fit this first Plan Builder version stay explanatory
          only.
        </p>
      </div>

      <div className="grid gap-3">
        {unsupportedTrainingSplitCategories.map((category) => (
          <PlanBuilderStepStatusCard
            body={category.description}
            key={category.title}
            title={category.title}
          />
        ))}
      </div>
    </section>
  );
}

function TrainingSplitSchedulePanel({ schedule }: TrainingSplitSchedulePanelProps) {
  return (
    <div className="mt-4 rounded-lg border border-stone-900/10 bg-white/80 p-4">
      <h4 className="text-sm font-bold uppercase tracking-wide text-stone-500">
        {getTrainingSplitScheduleHeading(schedule)}
      </h4>
      <p className="mt-2 text-sm text-stone-600">{schedule.description}</p>

      <TrainingSplitScheduleContent schedule={schedule} />
    </div>
  );
}

function TrainingSplitScheduleContent({ schedule }: TrainingSplitSchedulePanelProps) {
  switch (schedule.kind) {
    case "fixed-week":
      return (
        <ol className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {schedule.week.map((day) => (
            <li
              className="rounded-md border border-stone-900/10 bg-[#f4f0e8] px-3 py-3"
              key={`${day.dayLabel}-${day.sessionLabel}`}
            >
              <p className="text-xs font-bold uppercase tracking-wide text-stone-500">
                {day.dayLabel}
              </p>
              <p className="mt-1 text-sm font-semibold text-stone-900">{day.sessionLabel}</p>
            </li>
          ))}
        </ol>
      );
    case "rotating-cycle":
      return (
        <div className="mt-4 space-y-3">
          <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {schedule.cycle.map((session, index) => (
              <li
                className="rounded-md border border-stone-900/10 bg-[#f4f0e8] px-3 py-3"
                key={session.id}
              >
                <p className="text-xs font-bold uppercase tracking-wide text-stone-500">
                  Cycle step {index + 1}
                </p>
                <p className="mt-1 text-sm font-semibold text-stone-900">{session.sessionLabel}</p>
              </li>
            ))}
          </ol>
          <p className="text-sm font-semibold text-stone-700">{schedule.cadence}</p>
        </div>
      );
  }
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
      className="training-frequency-recommendation mt-6 flex items-center gap-5 rounded-lg border border-stone-950/8 bg-[#f5f6f4] px-5 py-[17px] text-[#075d63]"
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
        "plan-builder-step-status flex gap-4 rounded-lg border border-[#eecba9]/45 bg-[#fff7ee] px-5 py-[14px] text-[#7a512a]",
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

type PlanBlueprintSummaryCardProps = {
  summary: PlanBlueprintSummary | null;
};

function PlanBlueprintSummaryCard({ summary }: PlanBlueprintSummaryCardProps) {
  return (
    <aside aria-label="Plan blueprint summary" className="self-start xl:sticky xl:top-6">
      <Card className="plan-builder-summary-card rounded-[0.875rem] bg-white/88 p-6 shadow-none sm:p-7">
        <h2
          className="font-serif text-2xl font-black leading-tight text-[#120f0d]"
          id="plan-blueprint-summary-title"
        >
          Plan blueprint
        </h2>

        {summary ? (
          <dl className="mt-6 divide-y divide-stone-950/8">
            {planBlueprintSummaryRows.map((row) => {
              const { status, value } = getPlanBlueprintSummaryRowContent(row, summary);

              return (
                <KeyValueRow
                  icon={row.icon}
                  key={row.label}
                  label={row.label}
                  status={status}
                  statusClassName="bg-[#f8eee6]"
                  value={value}
                />
              );
            })}
          </dl>
        ) : (
          <p className="mt-6 text-base font-medium text-[#526873]">Loading Plan Blueprint...</p>
        )}
      </Card>
    </aside>
  );
}

type SummaryRowProps = {
  label: string;
  status?: PlanBlueprintSummaryStatus | null;
  value: string;
};

const planBlueprintSummaryStatusStyles = {
  "Also works": "bg-stone-900/10 text-stone-700",
  Completed: "bg-stone-950 text-stone-50",
  Recommended: "bg-[#fff3ea] text-[#b93725]",
} as const satisfies Record<PlanBlueprintSummaryStatus, string>;

function SummaryRow({ label, status = null, value }: SummaryRowProps) {
  return (
    <div className="min-w-0 rounded-lg border border-stone-900/10 bg-[#f9f6ef] px-3 py-3">
      <dt className="flex items-start justify-between gap-3 text-xs font-bold uppercase tracking-wide text-stone-500">
        <span>{label}</span>
        {status ? (
          <span
            className={cn(
              "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
              planBlueprintSummaryStatusStyles[status],
            )}
          >
            {status}
          </span>
        ) : null}
      </dt>
      <dd className="mt-1 break-words text-sm font-semibold text-stone-900">{value}</dd>
    </div>
  );
}
