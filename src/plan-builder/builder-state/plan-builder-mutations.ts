import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { WorkoutTemplatePurpose } from "../../training-plan";
import type { ExerciseCatalogMuscleGroupId } from "../exercise-catalog";
import {
  type PlanBlueprint,
  type RepRangeStyleId,
  summarizePlanBlueprint,
  type TrainingFrequencyDaysPerWeek,
} from "../plan-blueprint";
import {
  getOrCreatePlanBlueprint,
  type PlanBlueprintCommand,
  persistPlanBlueprintCommand,
  planBlueprintCommandBuilders,
  projectPlanBlueprintCommand,
} from "../plan-blueprint-command";
import type { TrainingSplitId } from "../training-split";
import type { OptionalVolumeMuscleGroupId, VolumePresetId } from "../training-volume";
import type { MainCompoundSelection } from "../weekly-movement-coverage";
import { planBuilderBlueprintQueryKey } from "./plan-builder-config";

type TrainingFrequencyMutationVariables = {
  timestamp: string;
  trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek;
};

type PlanBlueprintMutationContext = {
  previousBlueprint?: PlanBlueprint;
};

type PlanBlueprintMutationConfig<TVariables> = {
  buildCommand: (variables: TVariables) => PlanBlueprintCommand;
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

type UpdateMainCompoundRotationPreferencesMutationVariables = {
  exerciseIds: ReadonlyArray<string>;
  movementPattern: MainCompoundSelection["movementPattern"];
  timestamp: string;
};

type UpdateMainCompoundPreferencesMutationVariables = {
  exerciseIds: ReadonlyArray<string>;
  movementPattern: MainCompoundSelection["movementPattern"];
  timestamp: string;
};

type UpdateIsolationExercisePreferencesMutationVariables = {
  exerciseIds: ReadonlyArray<string>;
  primaryMuscleGroup: ExerciseCatalogMuscleGroupId;
  timestamp: string;
};

type RenameTrainingPlanDraftWorkoutTemplateMutationVariables = {
  label: string;
  templateId: string;
  timestamp: string;
};

type ReorderTrainingPlanDraftWorkoutTemplateMutationVariables = {
  targetIndex: number;
  templateId: string;
  timestamp: string;
};

type UpdateTrainingPlanDraftWorkoutTemplatePurposeMutationVariables = {
  purpose: WorkoutTemplatePurpose;
  templateId: string;
  timestamp: string;
};

type ReplaceTrainingPlanDraftWorkoutTemplateWithCustomFocusMutationVariables = {
  templateId: string;
  timestamp: string;
};

export function usePlanBuilderBlueprint() {
  const blueprintQuery = useQuery({
    queryKey: planBuilderBlueprintQueryKey,
    queryFn: getOrCreatePlanBlueprint,
  });

  const blueprint = blueprintQuery.data;
  const summary = blueprint ? summarizePlanBlueprint(blueprint) : null;

  return {
    blueprint,
    summary,
  };
}

export function useUpdateTrainingFrequencyMutation() {
  return usePlanBlueprintMutation<TrainingFrequencyMutationVariables>({
    buildCommand: planBlueprintCommandBuilders.updateTrainingFrequency,
  });
}

export function useUpdateTrainingSplitMutation() {
  return usePlanBlueprintMutation<TrainingSplitMutationVariables>({
    buildCommand: planBlueprintCommandBuilders.updateTrainingSplit,
  });
}

export function useUpdateRepRangeStyleMutation() {
  return usePlanBlueprintMutation<RepRangeStyleMutationVariables>({
    buildCommand: planBlueprintCommandBuilders.updateRepRangeStyle,
  });
}

export function useInitializeTrainingVolumeMutation() {
  return usePlanBlueprintMutation<InitializeTrainingVolumeMutationVariables>({
    buildCommand: planBlueprintCommandBuilders.initializeTrainingVolume,
  });
}

export function useUpdateTrainingVolumePresetMutation() {
  return usePlanBlueprintMutation<UpdateTrainingVolumePresetMutationVariables>({
    buildCommand: planBlueprintCommandBuilders.updateTrainingVolumePreset,
  });
}

export function useUpdateOptionalVolumeTargetMutation() {
  return usePlanBlueprintMutation<UpdateOptionalVolumeTargetMutationVariables>({
    buildCommand: planBlueprintCommandBuilders.updateOptionalVolumeTarget,
  });
}

export function useUpdateMainCompoundRotationPreferencesMutation() {
  return usePlanBlueprintMutation<UpdateMainCompoundRotationPreferencesMutationVariables>({
    buildCommand: planBlueprintCommandBuilders.updateMainCompoundRotationPreferences,
  });
}

export function useUpdateMainCompoundPreferencesMutation() {
  return usePlanBlueprintMutation<UpdateMainCompoundPreferencesMutationVariables>({
    buildCommand: planBlueprintCommandBuilders.updateMainCompoundPreferences,
  });
}

export function useUpdateIsolationExercisePreferencesMutation() {
  return usePlanBlueprintMutation<UpdateIsolationExercisePreferencesMutationVariables>({
    buildCommand: planBlueprintCommandBuilders.updateIsolationExercisePreferences,
  });
}

export function useRenameTrainingPlanDraftWorkoutTemplateMutation() {
  return usePlanBlueprintMutation<RenameTrainingPlanDraftWorkoutTemplateMutationVariables>({
    buildCommand: planBlueprintCommandBuilders.renameTrainingPlanDraftWorkoutTemplate,
  });
}

export function useReorderTrainingPlanDraftWorkoutTemplateMutation() {
  return usePlanBlueprintMutation<ReorderTrainingPlanDraftWorkoutTemplateMutationVariables>({
    buildCommand: planBlueprintCommandBuilders.reorderTrainingPlanDraftWorkoutTemplate,
  });
}

export function useUpdateTrainingPlanDraftWorkoutTemplatePurposeMutation() {
  return usePlanBlueprintMutation<UpdateTrainingPlanDraftWorkoutTemplatePurposeMutationVariables>({
    buildCommand: planBlueprintCommandBuilders.updateTrainingPlanDraftWorkoutTemplatePurpose,
  });
}

export function useReplaceTrainingPlanDraftWorkoutTemplateWithCustomFocusMutation() {
  return usePlanBlueprintMutation<ReplaceTrainingPlanDraftWorkoutTemplateWithCustomFocusMutationVariables>(
    {
      buildCommand:
        planBlueprintCommandBuilders.replaceTrainingPlanDraftWorkoutTemplateWithCustomFocus,
    },
  );
}

function usePlanBlueprintMutation<TVariables>({
  buildCommand,
}: PlanBlueprintMutationConfig<TVariables>) {
  const queryClient = useQueryClient();

  return useMutation<PlanBlueprint, Error, TVariables, PlanBlueprintMutationContext>({
    mutationFn: (variables) => persistPlanBlueprintCommand(buildCommand(variables)),
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
          projectPlanBlueprintCommand({
            blueprint: previousBlueprint,
            command: buildCommand(variables),
          }),
        );
      }

      return { previousBlueprint };
    },
    onSuccess: (updatedBlueprint) => {
      queryClient.setQueryData(planBuilderBlueprintQueryKey, updatedBlueprint);
    },
  });
}
