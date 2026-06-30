import { useMutation } from "@tanstack/react-query";
import type { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import type { PlanBuilderStep } from "../builder-state/plan-builder-config";
import {
  useConfirmExerciseSelectionPreferencesMutation,
  useUpdateIsolationExercisePreferencesMutation,
  useUpdateMainCompoundPreferencesMutation,
  useUpdateOptionalVolumeTargetMutation,
  useUpdateRepRangeStyleMutation,
  useUpdateTrainingFrequencyMutation,
  useUpdateTrainingSplitMutation,
  useUpdateTrainingVolumePresetMutation,
} from "../builder-state/plan-builder-mutations";
import {
  acceptGenerateTrainingPlanRecommendedDefaults,
  type GenerateTrainingPlanWorkflowResult,
  startGenerateTrainingPlanWorkflow,
} from "../generate-training-plan-workflow";
import type {
  PlanBlueprintDefaultResolution,
  RepRangeStyleId,
  TrainingFrequencyDaysPerWeek,
} from "../plan-blueprint";
import type {
  IsolationExercisePreferencesChange,
  MainCompoundPreferencesChange,
} from "../plan-builder-main-compound-preferences";
import type { TrainingSplitId } from "../training-split";
import type { OptionalVolumeMuscleGroupId, VolumePresetId } from "../training-volume";

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

export function useOnePageTrainingScheduleStep() {
  const { mutate: updateTrainingFrequency } = useUpdateTrainingFrequencyMutation();
  const { mutate: updateTrainingSplit } = useUpdateTrainingSplitMutation();

  return {
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

export function useOnePageRepRangeStep() {
  const { mutate: updateRepRangeStyle } = useUpdateRepRangeStyleMutation();

  return {
    onRepRangeStyleChange: (repRangeStyle: RepRangeStyleId) =>
      updateRepRangeStyle({
        repRangeStyle,
        timestamp: new Date().toISOString(),
      }),
  };
}

export function useOnePageVolumeStep() {
  const { mutate: updateTrainingVolumePreset } = useUpdateTrainingVolumePresetMutation();
  const { mutate: updateOptionalVolumeTarget } = useUpdateOptionalVolumeTargetMutation();

  return {
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
  const { mutateAsync: updateIsolationExercisePreferences } =
    useUpdateIsolationExercisePreferencesMutation();
  const { mutateAsync: updateMainCompoundPreferences } = useUpdateMainCompoundPreferencesMutation();

  return {
    onContinueToGenerate: async () => {
      await confirmSelectedExerciseSelectionPreferences({
        timestamp: new Date().toISOString(),
      });
      setActiveStep("generate");
    },
    onMainCompoundPreferencesChange: async ({
      exerciseIds,
      movementPattern,
    }: MainCompoundPreferencesChange) =>
      updateMainCompoundPreferences({
        exerciseIds,
        movementPattern,
        timestamp: new Date().toISOString(),
      }),
    onIsolationExercisePreferencesChange: async ({
      exerciseIds,
      primaryMuscleGroup,
    }: IsolationExercisePreferencesChange) =>
      updateIsolationExercisePreferences({
        exerciseIds,
        primaryMuscleGroup,
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
  const { mutateAsync: startGenerateStep, isPending: isStartingGenerateStep } = useMutation({
    mutationFn: startGenerateTrainingPlanWorkflow,
  });
  const {
    mutateAsync: acceptRecommendedDefaultsAndGenerate,
    isPending: isAcceptingRecommendedDefaults,
  } = useMutation({
    mutationFn: acceptGenerateTrainingPlanRecommendedDefaults,
  });

  async function applyWorkflowResult(result: GenerateTrainingPlanWorkflowResult) {
    if (result.status === "pending_recommended_defaults") {
      onPendingDefaultResolutionChange(result.resolution);

      return;
    }

    onPendingDefaultResolutionChange(null);
    await navigate(result.routeTarget);
  }

  return {
    isGenerating: isStartingGenerateStep || isAcceptingRecommendedDefaults,
    onAcceptRecommendedDefaults: async (resolution: PlanBlueprintDefaultResolution) => {
      const result = await acceptRecommendedDefaultsAndGenerate({ resolution });

      await applyWorkflowResult(result);
    },
    onCancelRecommendedDefaults: () => {
      onPendingDefaultResolutionChange(null);
    },
    onGenerateTrainingPlan: async () => {
      const resolution = defaultResolution;

      if (!resolution) {
        return;
      }

      const result = await startGenerateStep({ defaultResolution: resolution });

      await applyWorkflowResult(result);
    },
  };
}
