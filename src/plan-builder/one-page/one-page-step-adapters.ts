import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  trainingPlanService,
  trainingPlansQueryOptions,
  type WorkoutTemplatePurpose,
} from "../../training-plan";
import { planBuilderBlueprintQueryKey } from "../builder-state/plan-builder-config";
import {
  useRenameTrainingPlanDraftWorkoutTemplateMutation,
  useReorderTrainingPlanDraftWorkoutTemplateMutation,
  useReplaceTrainingPlanDraftWorkoutTemplateWithCustomFocusMutation,
  useUpdateIsolationExercisePreferencesMutation,
  useUpdateMainCompoundPreferencesMutation,
  useUpdateMainCompoundRotationPreferencesMutation,
  useUpdateOptionalVolumeTargetMutation,
  useUpdateRepRangeStyleMutation,
  useUpdateTrainingFrequencyMutation,
  useUpdateTrainingPlanDraftWorkoutTemplatePurposeMutation,
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
  MainCompoundRotationPreferencesChange,
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

export function useOnePageExercisesStep() {
  const { mutateAsync: updateIsolationExercisePreferences } =
    useUpdateIsolationExercisePreferencesMutation();
  const { mutateAsync: updateMainCompoundPreferences } = useUpdateMainCompoundPreferencesMutation();
  const { mutateAsync: updateMainCompoundRotationPreferences } =
    useUpdateMainCompoundRotationPreferencesMutation();

  return {
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
    onMainCompoundRotationPreferencesChange: async ({
      exerciseIds,
      movementPattern,
    }: MainCompoundRotationPreferencesChange) =>
      updateMainCompoundRotationPreferences({
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
  const queryClient = useQueryClient();
  const { mutateAsync: startGenerateStep, isPending: isStartingGenerateStep } = useMutation({
    mutationFn: startGenerateTrainingPlanWorkflow,
  });
  const {
    mutateAsync: acceptRecommendedDefaultsAndGenerate,
    isPending: isAcceptingRecommendedDefaults,
  } = useMutation({
    mutationFn: acceptGenerateTrainingPlanRecommendedDefaults,
  });
  const { mutateAsync: acceptDraft, isPending: isAcceptingDraft } = useMutation({
    mutationFn: trainingPlanService.acceptTrainingPlanDraft,
  });
  const { mutateAsync: resetDraft, isPending: isResettingDraft } = useMutation({
    mutationFn: trainingPlanService.resetTrainingPlanDraft,
  });
  const { mutate: renameDraftWorkoutTemplate } =
    useRenameTrainingPlanDraftWorkoutTemplateMutation();
  const { mutate: reorderDraftWorkoutTemplate } =
    useReorderTrainingPlanDraftWorkoutTemplateMutation();
  const { mutate: updateDraftWorkoutTemplatePurpose } =
    useUpdateTrainingPlanDraftWorkoutTemplatePurposeMutation();
  const { mutate: replaceDraftWorkoutTemplateWithCustomFocus } =
    useReplaceTrainingPlanDraftWorkoutTemplateWithCustomFocusMutation();

  async function applyWorkflowResult(result: GenerateTrainingPlanWorkflowResult) {
    if (result.status === "blocked") {
      onPendingDefaultResolutionChange(null);

      return;
    }

    if (result.status === "pending_recommended_defaults") {
      onPendingDefaultResolutionChange(result.resolution);

      return;
    }

    onPendingDefaultResolutionChange(null);
    await queryClient.invalidateQueries({ queryKey: planBuilderBlueprintQueryKey });
  }

  return {
    isGenerating:
      isStartingGenerateStep ||
      isAcceptingRecommendedDefaults ||
      isAcceptingDraft ||
      isResettingDraft,
    onAcceptDraft: async () => {
      const acceptedTrainingPlan = await acceptDraft();

      queryClient.setQueryData(planBuilderBlueprintQueryKey, undefined);
      await queryClient.invalidateQueries({ queryKey: planBuilderBlueprintQueryKey });
      await queryClient.invalidateQueries({ queryKey: trainingPlansQueryOptions().queryKey });
      await navigate({
        params: { planId: acceptedTrainingPlan.id },
        to: "/training-plans/$planId",
      });
    },
    onAcceptRecommendedDefaults: async (resolution: PlanBlueprintDefaultResolution) => {
      const result = await acceptRecommendedDefaultsAndGenerate({ resolution });

      await applyWorkflowResult(result);
    },
    onCancelRecommendedDefaults: () => {
      onPendingDefaultResolutionChange(null);
    },
    onRenameWorkoutTemplate: (templateId: string, label: string) => {
      renameDraftWorkoutTemplate({
        label,
        templateId,
        timestamp: new Date().toISOString(),
      });
    },
    onMoveWorkoutTemplate: (templateId: string, targetIndex: number) => {
      reorderDraftWorkoutTemplate({
        targetIndex,
        templateId,
        timestamp: new Date().toISOString(),
      });
    },
    onReplaceWorkoutTemplateWithCustomFocus: (templateId: string) => {
      replaceDraftWorkoutTemplateWithCustomFocus({
        templateId,
        timestamp: new Date().toISOString(),
      });
    },
    onResetDraft: async () => {
      await resetDraft();
      await queryClient.invalidateQueries({ queryKey: planBuilderBlueprintQueryKey });
    },
    onSetWorkoutTemplatePurpose: (templateId: string, purpose: WorkoutTemplatePurpose) => {
      updateDraftWorkoutTemplatePurpose({
        purpose,
        templateId,
        timestamp: new Date().toISOString(),
      });
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
