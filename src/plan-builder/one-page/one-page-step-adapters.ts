import type { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import type { PlanBuilderStep } from "../builder-state/plan-builder-config";
import {
  useApplyResolvedPlanBlueprintMutation,
  useConfirmExerciseSelectionPreferencesMutation,
  useConfirmRepRangeStyleMutation,
  useConfirmTrainingFrequencyMutation,
  useConfirmTrainingSplitMutation,
  useConfirmTrainingVolumeMutation,
  useGenerateTrainingPlanMutation,
  useUpdateMainCompoundRotationPoolMutation,
  useUpdateMainCompoundSelectionMutation,
  useUpdateOptionalVolumeTargetMutation,
  useUpdateRepRangeStyleMutation,
  useUpdateTrainingFrequencyMutation,
  useUpdateTrainingSplitMutation,
  useUpdateTrainingVolumePresetMutation,
} from "../builder-state/plan-builder-mutations";
import type {
  PlanBlueprintDefaultResolution,
  RepRangeStyleId,
  TrainingFrequencyDaysPerWeek,
} from "../plan-blueprint";
import type {
  MainCompoundRotationPoolChange,
  MainCompoundSelectionChange,
} from "../plan-builder-exercise-foundation";
import type { TrainingSplitId } from "../training-split";
import type {
  OptionalVolumeMuscleGroupId,
  TrainingVolumeConfiguration,
  VolumePresetId,
} from "../training-volume";

export function useRepRangeDefaultSelection({
  defaultRepRangeStyleId,
  shouldSelectDefaultRepRangeStyle,
  updateRepRangeStyle,
}: {
  defaultRepRangeStyleId: RepRangeStyleId;
  shouldSelectDefaultRepRangeStyle: boolean;
  updateRepRangeStyle: (variables: { repRangeStyle: RepRangeStyleId; timestamp: string }) => void;
}) {
  useEffect(() => {
    if (!shouldSelectDefaultRepRangeStyle) {
      return;
    }

    updateRepRangeStyle({
      repRangeStyle: defaultRepRangeStyleId,
      timestamp: new Date().toISOString(),
    });
  }, [defaultRepRangeStyleId, shouldSelectDefaultRepRangeStyle, updateRepRangeStyle]);
}

export function useTrainingVolumeDefaultSelection({
  initializeTrainingVolumeDefaults,
  shouldInitializeTrainingVolume,
}: {
  initializeTrainingVolumeDefaults: (variables: { timestamp: string }) => void;
  shouldInitializeTrainingVolume: boolean;
}) {
  useEffect(() => {
    if (!shouldInitializeTrainingVolume) {
      return;
    }

    initializeTrainingVolumeDefaults({
      timestamp: new Date().toISOString(),
    });
  }, [initializeTrainingVolumeDefaults, shouldInitializeTrainingVolume]);
}

export function useOnePageTrainingScheduleStep({
  blueprint,
  selectedTrainingSplitId,
  setActiveStep,
}: {
  blueprint: { trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek };
  selectedTrainingSplitId: TrainingSplitId;
  setActiveStep: (step: PlanBuilderStep) => void;
}) {
  const { mutate: updateTrainingFrequency } = useUpdateTrainingFrequencyMutation();
  const { mutate: updateTrainingSplit } = useUpdateTrainingSplitMutation();
  const { mutateAsync: confirmSelectedTrainingFrequency } = useConfirmTrainingFrequencyMutation();
  const { mutateAsync: confirmSelectedTrainingSplit } = useConfirmTrainingSplitMutation();

  return {
    onContinueToTrainingStyle: async () => {
      const timestamp = new Date().toISOString();

      updateTrainingSplit({ split: selectedTrainingSplitId, timestamp });
      await confirmSelectedTrainingFrequency({
        timestamp,
        trainingFrequencyDaysPerWeek: blueprint.trainingFrequencyDaysPerWeek,
      });
      await confirmSelectedTrainingSplit({ split: selectedTrainingSplitId, timestamp });
      setActiveStep("rep-ranges");
    },
    onTrainingFrequencyChange: (trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek) =>
      updateTrainingFrequency({
        timestamp: new Date().toISOString(),
        trainingFrequencyDaysPerWeek,
      }),
    onTrainingSplitChange: (split: TrainingSplitId) =>
      updateTrainingSplit({
        split,
        timestamp: new Date().toISOString(),
      }),
  };
}

export function useOnePageRepRangeStep({
  selectedRepRangeStyleId,
  setActiveStep,
}: {
  selectedRepRangeStyleId: RepRangeStyleId;
  setActiveStep: (step: PlanBuilderStep) => void;
}) {
  const { mutateAsync: confirmSelectedRepRangeStyle } = useConfirmRepRangeStyleMutation();
  const { mutate: updateRepRangeStyle } = useUpdateRepRangeStyleMutation();

  return {
    onContinueToVolume: async () => {
      await confirmSelectedRepRangeStyle({
        repRangeStyle: selectedRepRangeStyleId,
        timestamp: new Date().toISOString(),
      });
      setActiveStep("volume");
    },
    onRepRangeStyleChange: (repRangeStyle: RepRangeStyleId) =>
      updateRepRangeStyle({
        repRangeStyle,
        timestamp: new Date().toISOString(),
      }),
  };
}

export function useOnePageVolumeStep({
  setActiveStep,
  trainingVolumeConfiguration,
}: {
  setActiveStep: (step: PlanBuilderStep) => void;
  trainingVolumeConfiguration: TrainingVolumeConfiguration | null;
}) {
  const { mutateAsync: confirmSelectedTrainingVolume } = useConfirmTrainingVolumeMutation();
  const { mutate: updateTrainingVolumePreset } = useUpdateTrainingVolumePresetMutation();
  const { mutate: updateOptionalVolumeTarget } = useUpdateOptionalVolumeTargetMutation();

  return {
    onContinueToExercises: async () => {
      if (!trainingVolumeConfiguration) {
        return;
      }

      await confirmSelectedTrainingVolume({
        trainingVolumeConfiguration,
        timestamp: new Date().toISOString(),
      });
      setActiveStep("exercises");
    },
    onOptionalVolumeTargetToggle: (muscleGroup: OptionalVolumeMuscleGroupId, isEnabled: boolean) =>
      updateOptionalVolumeTarget({ isEnabled, muscleGroup, timestamp: new Date().toISOString() }),
    onVolumePresetChange: (volumePreset: VolumePresetId) =>
      updateTrainingVolumePreset({
        timestamp: new Date().toISOString(),
        volumePreset,
      }),
  };
}

export function useOnePageExercisesStep({
  setActiveStep,
}: {
  setActiveStep: (step: PlanBuilderStep) => void;
}) {
  const { mutateAsync: confirmSelectedExerciseSelectionPreferences } =
    useConfirmExerciseSelectionPreferencesMutation();
  const { mutateAsync: updateMainCompoundRotationPool } =
    useUpdateMainCompoundRotationPoolMutation();
  const { mutateAsync: updateMainCompoundSelection } = useUpdateMainCompoundSelectionMutation();

  return {
    onContinueToGenerate: async () => {
      await confirmSelectedExerciseSelectionPreferences({
        timestamp: new Date().toISOString(),
      });
      setActiveStep("generate");
    },
    onMainCompoundSelectionChange: async ({
      exerciseId,
      movementPattern,
    }: MainCompoundSelectionChange) =>
      updateMainCompoundSelection({
        exerciseId,
        movementPattern,
        timestamp: new Date().toISOString(),
      }),
    onRotationPoolChange: async ({
      exerciseIds,
      movementPattern,
    }: MainCompoundRotationPoolChange) =>
      updateMainCompoundRotationPool({
        exerciseIds,
        movementPattern,
        timestamp: new Date().toISOString(),
      }),
  };
}

export function useOnePageGenerateStep({
  defaultResolution,
  navigate,
  onPendingDefaultResolutionChange,
}: {
  defaultResolution: PlanBlueprintDefaultResolution | null;
  navigate: ReturnType<typeof useNavigate>;
  onPendingDefaultResolutionChange: (resolution: PlanBlueprintDefaultResolution | null) => void;
}) {
  const { mutateAsync: applyResolvedPlanBlueprint, isPending: isApplyingResolvedBlueprint } =
    useApplyResolvedPlanBlueprintMutation();
  const { mutateAsync: generateTrainingPlan, isPending: isGenerating } =
    useGenerateTrainingPlanMutation();

  async function generateAndNavigate() {
    const trainingPlan = await generateTrainingPlan();

    await navigate({
      params: { planId: trainingPlan.id },
      to: "/training-plans/$planId",
    });
  }

  return {
    isGenerating: isGenerating || isApplyingResolvedBlueprint,
    onAcceptRecommendedDefaults: async (resolution: PlanBlueprintDefaultResolution) => {
      await applyResolvedPlanBlueprint({ blueprint: resolution.resolvedBlueprint });
      onPendingDefaultResolutionChange(null);
      await generateAndNavigate();
    },
    onCancelRecommendedDefaults: () => {
      onPendingDefaultResolutionChange(null);
    },
    onGenerateTrainingPlan: async () => {
      const resolution = defaultResolution;

      if (!resolution) {
        return;
      }

      if (!resolution.isReady) {
        onPendingDefaultResolutionChange(resolution);
        return;
      }

      await generateAndNavigate();
    },
  };
}
