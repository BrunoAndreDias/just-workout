import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type TrainingPlan, trainingPlanService } from "../../training-plan";
import type { ExerciseSelectionPreferences } from "../exercise-selection-preferences";
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
import type {
  OptionalVolumeMuscleGroupId,
  TrainingVolumeConfiguration,
  VolumePresetId,
} from "../training-volume";
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

type UpdateMainCompoundSelectionMutationVariables = {
  exerciseId: string;
  movementPattern: MainCompoundSelection["movementPattern"];
  timestamp: string;
};

type UpdateMainCompoundRotationPoolMutationVariables = {
  exerciseIds: ReadonlyArray<string>;
  movementPattern: MainCompoundSelection["movementPattern"];
  timestamp: string;
};

type ConfirmTrainingVolumeMutationVariables = {
  timestamp: string;
  trainingVolumeConfiguration: TrainingVolumeConfiguration;
};

type ConfirmExerciseSelectionPreferencesMutationVariables = {
  exerciseSelectionPreferences?: ExerciseSelectionPreferences;
  timestamp: string;
};

type ApplyResolvedPlanBlueprintMutationVariables = {
  blueprint: PlanBlueprint;
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

export function useConfirmTrainingFrequencyMutation() {
  return usePlanBlueprintMutation<TrainingFrequencyMutationVariables>({
    buildCommand: planBlueprintCommandBuilders.confirmTrainingFrequency,
  });
}

export function useConfirmTrainingSplitMutation() {
  return usePlanBlueprintMutation<TrainingSplitMutationVariables>({
    buildCommand: planBlueprintCommandBuilders.confirmTrainingSplit,
  });
}

export function useConfirmRepRangeStyleMutation() {
  return usePlanBlueprintMutation<RepRangeStyleMutationVariables>({
    buildCommand: planBlueprintCommandBuilders.confirmRepRangeStyle,
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

export function useConfirmTrainingVolumeMutation() {
  return usePlanBlueprintMutation<ConfirmTrainingVolumeMutationVariables>({
    buildCommand: planBlueprintCommandBuilders.confirmTrainingVolume,
  });
}

export function useConfirmExerciseSelectionPreferencesMutation() {
  return usePlanBlueprintMutation<ConfirmExerciseSelectionPreferencesMutationVariables>({
    buildCommand: planBlueprintCommandBuilders.confirmExerciseSelectionPreferences,
  });
}

export function useUpdateMainCompoundSelectionMutation() {
  return usePlanBlueprintMutation<UpdateMainCompoundSelectionMutationVariables>({
    buildCommand: planBlueprintCommandBuilders.updateMainCompoundSelection,
  });
}

export function useUpdateMainCompoundRotationPoolMutation() {
  return usePlanBlueprintMutation<UpdateMainCompoundRotationPoolMutationVariables>({
    buildCommand: planBlueprintCommandBuilders.updateMainCompoundRotationPool,
  });
}

export function useGenerateTrainingPlanMutation() {
  return useMutation<TrainingPlan, Error, void>({
    mutationFn: trainingPlanService.generateTrainingPlan,
  });
}

export function useApplyResolvedPlanBlueprintMutation() {
  return usePlanBlueprintMutation<ApplyResolvedPlanBlueprintMutationVariables>({
    buildCommand: planBlueprintCommandBuilders.applyResolvedPlanBlueprint,
  });
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
