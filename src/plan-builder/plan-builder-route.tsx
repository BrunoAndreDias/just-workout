import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  useConfirmExerciseSelectionPreferencesMutation,
  useConfirmRepRangeStyleMutation,
  useConfirmTrainingFrequencyMutation,
  useConfirmTrainingSplitMutation,
  useConfirmTrainingVolumeMutation,
  useGenerateTrainingPlanMutation,
  useInitializeTrainingVolumeMutation,
  usePlanBuilderBlueprint,
  useUpdateMainCompoundRotationPoolMutation,
  useUpdateMainCompoundSelectionMutation,
  useUpdateOptionalVolumeTargetMutation,
  useUpdateRepRangeStyleMutation,
  useUpdateTrainingFrequencyMutation,
  useUpdateTrainingSplitMutation,
  useUpdateTrainingVolumePresetMutation,
} from "./components/plan-builder-mutations";
import { PlanBuilderPage } from "./components/plan-builder-page";
import type { MainCompoundRotationPool } from "./main-compound-rotation-pool";
import {
  defaultRepRangeStyleId,
  getRepRangeStyle,
  getValidRepRangeStyleId,
  hasValidTrainingFrequency,
  type PlanBlueprint,
  type RepRangeStyleId,
} from "./plan-blueprint";
import { planBuilderPaths } from "./plan-builder-paths";
import { ExerciseFoundationStep } from "./steps/exercise-foundation-step";
import { GenerateTrainingPlanStep } from "./steps/generate-training-plan-step";
import { RepRangeStyleStep } from "./steps/rep-range-style-step";
import { TrainingFrequencyStep } from "./steps/training-frequency-step";
import { WeeklyVolumeTargetsStep } from "./steps/weekly-volume-targets-step";
import {
  getRecommendedTrainingSplitId,
  isTrainingSplitCompatible,
  type TrainingSplitId,
} from "./training-split";
import {
  isTrainingVolumeConfiguration,
  type OptionalVolumeMuscleGroupId,
  type TrainingVolumeConfiguration,
  type VolumePresetId,
} from "./training-volume";
import type { MainCompoundSelection } from "./weekly-movement-coverage";

export function PlanBuilderRoute() {
  const { blueprint, summary } = usePlanBuilderBlueprint();
  const { mutate: updateTrainingFrequency } = useUpdateTrainingFrequencyMutation();
  const { mutate: updateTrainingSplit } = useUpdateTrainingSplitMutation();
  const { mutateAsync: confirmSelectedTrainingFrequency } = useConfirmTrainingFrequencyMutation();
  const { mutateAsync: confirmSelectedTrainingSplit } = useConfirmTrainingSplitMutation();
  const navigate = useNavigate();

  function handleTrainingFrequencyChange(
    trainingFrequencyDaysPerWeek: PlanBlueprint["trainingFrequencyDaysPerWeek"],
  ) {
    updateTrainingFrequency({
      timestamp: new Date().toISOString(),
      trainingFrequencyDaysPerWeek,
    });
  }

  function handleTrainingScheduleSplitChange(split: TrainingSplitId) {
    updateTrainingSplit({
      split,
      timestamp: new Date().toISOString(),
    });
  }

  async function handleContinueToTrainingStyle() {
    if (!blueprint) {
      return;
    }

    const timestamp = new Date().toISOString();
    const selectedSplit = getVisibleTrainingSplitId(blueprint);

    updateTrainingSplit({
      split: selectedSplit,
      timestamp,
    });
    await confirmSelectedTrainingFrequency({
      timestamp,
      trainingFrequencyDaysPerWeek: blueprint.trainingFrequencyDaysPerWeek,
    });
    await confirmSelectedTrainingSplit({
      split: selectedSplit,
      timestamp,
    });
    await navigate({ to: planBuilderPaths.repRanges });
  }

  return (
    <PlanBuilderPage
      currentStep="frequency"
      description="Choose how often you can train and confirm the weekly split Just Workout should use."
      summary={summary}
    >
      {blueprint ? (
        <TrainingFrequencyStep
          canContinueToTrainingStyle={hasValidTrainingFrequency(blueprint)}
          onContinueToTrainingStyle={handleContinueToTrainingStyle}
          onTrainingFrequencyChange={handleTrainingFrequencyChange}
          onTrainingSplitChange={handleTrainingScheduleSplitChange}
          selectedTrainingSplitId={getVisibleTrainingSplitId(blueprint)}
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
      description="Select the Rep Range Style that should shape main lifts, secondary work, and accessories."
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
      description="Set weekly rep targets before exercises are selected."
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
  const { mutateAsync: confirmSelectedExerciseSelectionPreferences } =
    useConfirmExerciseSelectionPreferencesMutation();
  const { mutateAsync: updateMainCompoundRotationPool } =
    useUpdateMainCompoundRotationPoolMutation();
  const { mutateAsync: updateMainCompoundSelection } = useUpdateMainCompoundSelectionMutation();
  const { blueprint, summary } = usePlanBuilderBlueprint();
  const navigate = useNavigate();
  const isExerciseSelectionStepReady =
    blueprint !== undefined &&
    hasCompatibleSelectedTrainingSplit(blueprint) &&
    isTrainingVolumeConfiguration(blueprint);

  async function handleContinueToGenerate() {
    await confirmSelectedExerciseSelectionPreferences({
      timestamp: new Date().toISOString(),
    });
    await navigate({ to: planBuilderPaths.generate });
  }

  return (
    <PlanBuilderPage
      currentStep="exercises"
      description="Choose main compounds and swaps."
      summary={summary}
    >
      {isExerciseSelectionStepReady ? (
        <PlanBuilderExercisesStepContent
          blueprint={blueprint}
          onContinueToGenerate={handleContinueToGenerate}
          onMainCompoundSelectionChange={updateMainCompoundSelection}
          onRotationPoolChange={updateMainCompoundRotationPool}
        />
      ) : (
        <PlanBuilderExercisesSetupState blueprint={blueprint} />
      )}
    </PlanBuilderPage>
  );
}

function PlanBuilderExercisesStepContent({
  blueprint,
  onContinueToGenerate,
  onMainCompoundSelectionChange,
  onRotationPoolChange,
}: {
  blueprint: PlanBlueprint & { split: TrainingSplitId } & TrainingVolumeConfiguration;
  onContinueToGenerate: () => Promise<void>;
  onMainCompoundSelectionChange: (variables: {
    exerciseId: string;
    movementPattern: MainCompoundSelection["movementPattern"];
    timestamp: string;
  }) => Promise<unknown>;
  onRotationPoolChange: (variables: {
    exerciseIds: ReadonlyArray<string>;
    movementPattern: MainCompoundRotationPool["movementPattern"];
    timestamp: string;
  }) => Promise<unknown>;
}) {
  return (
    <ExerciseFoundationStep
      mainCompoundSelections={blueprint.mainCompoundSelections}
      mainCompoundRotationPools={blueprint.mainCompoundRotationPools}
      onContinueToGenerate={onContinueToGenerate}
      onMainCompoundSelectionChange={async ({ exerciseId, movementPattern }) => {
        await onMainCompoundSelectionChange({
          exerciseId,
          movementPattern,
          timestamp: new Date().toISOString(),
        });
      }}
      onRotationPoolChange={async ({ exerciseIds, movementPattern }) => {
        await onRotationPoolChange({
          exerciseIds,
          movementPattern,
          timestamp: new Date().toISOString(),
        });
      }}
      split={blueprint.split}
      trainingFrequencyDaysPerWeek={blueprint.trainingFrequencyDaysPerWeek}
      weeklyRepTargets={blueprint.weeklyRepTargets}
    />
  );
}

function PlanBuilderExercisesSetupState({ blueprint }: { blueprint: PlanBlueprint | undefined }) {
  return (
    <section className="space-y-4 rounded-xl border border-dashed border-stone-900/15 bg-stone-50/70 p-5 text-sm text-stone-700">
      <div className="space-y-2">
        <h2 className="text-lg font-black text-stone-950">Exercises needs setup</h2>
        <p>Choose a compatible split and weekly volume before selecting exercises.</p>
      </div>
      <ul className="list-disc space-y-1 pl-5">
        {blueprint && !hasCompatibleSelectedTrainingSplit(blueprint) ? (
          <li>Choose a compatible split in Training schedule.</li>
        ) : null}
        {!blueprint || !isTrainingVolumeConfiguration(blueprint) ? (
          <li>Set weekly volume in Volume.</li>
        ) : null}
      </ul>
    </section>
  );
}

export function PlanBuilderGenerateRoute() {
  const { summary } = usePlanBuilderBlueprint();
  const { mutateAsync: generateTrainingPlan, isPending: isGenerating } =
    useGenerateTrainingPlanMutation();
  const navigate = useNavigate();

  async function handleGenerateTrainingPlan() {
    const trainingPlan = await generateTrainingPlan();

    await navigate({
      params: { planId: trainingPlan.id },
      to: "/training-plans/$planId",
    });
  }

  return (
    <PlanBuilderPage
      currentStep="generate"
      description="Create the Active Training Plan from the completed Plan Blueprint."
      summary={summary}
    >
      <GenerateTrainingPlanStep
        isGenerating={isGenerating}
        onGenerateTrainingPlan={handleGenerateTrainingPlan}
        summary={summary}
      />
    </PlanBuilderPage>
  );
}

function getVisibleTrainingSplitId(blueprint: PlanBlueprint): TrainingSplitId {
  if (hasCompatibleSelectedTrainingSplit(blueprint)) {
    return blueprint.split;
  }

  return getRecommendedTrainingSplitId(blueprint.trainingFrequencyDaysPerWeek);
}

function hasCompatibleSelectedTrainingSplit(
  blueprint: PlanBlueprint,
): blueprint is PlanBlueprint & { split: TrainingSplitId } {
  return isTrainingSplitCompatible(blueprint.split, blueprint.trainingFrequencyDaysPerWeek);
}
