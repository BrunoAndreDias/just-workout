import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  type TrainingPlanDraftSetupUpdate,
  trainingPlanService,
  trainingPlansQueryOptions,
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
  PlanBlueprint,
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
  const { mutateAsync: saveDraft, isPending: isSavingDraft } = useMutation({
    mutationFn: trainingPlanService.saveTrainingPlanDraftSetup,
    onSuccess: updateCachedTrainingPlanDraft,
    scope: { id: "training-plan-draft-setup" },
  });
  const { mutateAsync: resetDraft, isPending: isResettingDraft } = useMutation({
    mutationFn: trainingPlanService.resetTrainingPlanDraft,
    onSuccess: updateCachedTrainingPlanDraft,
    scope: { id: "training-plan-draft-setup" },
  });
  const { mutate: renameDraftWorkoutTemplate } =
    useRenameTrainingPlanDraftWorkoutTemplateMutation();
  const { mutate: reorderDraftWorkoutTemplate } =
    useReorderTrainingPlanDraftWorkoutTemplateMutation();
  const { mutate: updateDraftWorkoutTemplatePurpose } =
    useUpdateTrainingPlanDraftWorkoutTemplatePurposeMutation();
  const { mutate: replaceDraftWorkoutTemplateWithCustomFocus } =
    useReplaceTrainingPlanDraftWorkoutTemplateWithCustomFocusMutation();

  function updateCachedTrainingPlanDraft(
    savedDraft: NonNullable<PlanBlueprint["trainingPlanDraft"]>,
  ) {
    queryClient.setQueryData<PlanBlueprint | undefined>(
      planBuilderBlueprintQueryKey,
      (blueprint) =>
        blueprint
          ? {
              ...blueprint,
              trainingPlanDraft: savedDraft,
            }
          : blueprint,
    );
  }

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
      isSavingDraft ||
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
    onResetDraft: async () => {
      await resetDraft();
    },
    onSaveDraftSetup: async (update: TrainingPlanDraftSetupUpdate) => {
      await saveDraft(update);
    },
    onGenerateTrainingPlan: async () => {
      const resolution = defaultResolution;

      if (!resolution) {
        return;
      }

      const result = await startGenerateStep({ defaultResolution: resolution });

      await applyWorkflowResult(result);
    },
    onMoveWorkoutTemplate: (templateId: string, targetIndex: number) => {
      reorderDraftWorkoutTemplate({ targetIndex, templateId, timestamp: new Date().toISOString() });
    },
    onRenameWorkoutTemplate: (templateId: string, label: string) => {
      renameDraftWorkoutTemplate({ label, templateId, timestamp: new Date().toISOString() });
    },
    onReplaceWorkoutTemplateWithCustomFocus: (templateId: string) => {
      replaceDraftWorkoutTemplateWithCustomFocus({
        templateId,
        timestamp: new Date().toISOString(),
      });
    },
    onSetWorkoutTemplatePurpose: (
      templateId: string,
      purpose: NonNullable<
        PlanBlueprint["trainingPlanDraft"]
      >["content"]["workoutTemplates"][number]["purpose"],
    ) => {
      updateDraftWorkoutTemplatePurpose({
        purpose,
        templateId,
        timestamp: new Date().toISOString(),
      });
    },
  };
}
