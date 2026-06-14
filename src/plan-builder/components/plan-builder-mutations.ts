import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type TrainingPlan, trainingPlanService } from "../../training-plan";
import type { ExerciseSelectionPreferences } from "../exercise-selection-preferences";
import {
  confirmExerciseSelectionPreferences,
  confirmRepRangeStyle,
  confirmTrainingFrequency,
  confirmTrainingSplit,
  confirmTrainingVolume,
  initializeTrainingVolume,
  type PlanBlueprint,
  type PlanBlueprintDefaultResolution,
  type RepRangeStyleId,
  selectMainCompound,
  selectRepRangeStyle,
  selectTrainingFrequency,
  selectTrainingSplit,
  selectTrainingVolumePreset,
  setOptionalVolumeTargetEnabled,
  summarizePlanBlueprint,
  type TrainingFrequencyDaysPerWeek,
  updateMainCompoundRotationPool,
} from "../plan-blueprint";
import { planBuilderService } from "../plan-builder-service";
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
  resolution: PlanBlueprintDefaultResolution;
};
export function usePlanBuilderBlueprint() {
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

export function useUpdateTrainingFrequencyMutation() {
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

export function useUpdateTrainingSplitMutation() {
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

export function useConfirmTrainingFrequencyMutation() {
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

export function useConfirmTrainingSplitMutation() {
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

export function useConfirmRepRangeStyleMutation() {
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

export function useUpdateRepRangeStyleMutation() {
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

export function useInitializeTrainingVolumeMutation() {
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

export function useUpdateTrainingVolumePresetMutation() {
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

export function useUpdateOptionalVolumeTargetMutation() {
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

export function useConfirmTrainingVolumeMutation() {
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

export function useConfirmExerciseSelectionPreferencesMutation() {
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

export function useUpdateMainCompoundSelectionMutation() {
  return usePlanBlueprintMutation<UpdateMainCompoundSelectionMutationVariables>({
    mutationFn: ({ exerciseId, movementPattern, timestamp }) =>
      planBuilderService.updateMainCompoundSelection({
        exerciseId,
        movementPattern,
        timestamp,
      }),
    optimisticUpdate: (blueprint, { exerciseId, movementPattern, timestamp }) =>
      selectMainCompound({
        blueprint,
        exerciseId,
        movementPattern,
        timestamp,
      }),
  });
}

export function useUpdateMainCompoundRotationPoolMutation() {
  return usePlanBlueprintMutation<UpdateMainCompoundRotationPoolMutationVariables>({
    mutationFn: ({ exerciseIds, movementPattern, timestamp }) =>
      planBuilderService.updateMainCompoundRotationPool({
        exerciseIds,
        movementPattern,
        timestamp,
      }),
    optimisticUpdate: (blueprint, { exerciseIds, movementPattern, timestamp }) =>
      updateMainCompoundRotationPool({
        blueprint,
        exerciseIds,
        movementPattern,
        timestamp,
      }),
  });
}

export function useGenerateTrainingPlanMutation() {
  return useMutation<TrainingPlan, Error, void>({
    mutationFn: trainingPlanService.generateTrainingPlan,
  });
}

export function useApplyResolvedPlanBlueprintMutation() {
  return usePlanBlueprintMutation<ApplyResolvedPlanBlueprintMutationVariables>({
    mutationFn: ({ resolution }) =>
      planBuilderService.applyResolvedPlanBlueprint({
        blueprint: resolution.resolvedBlueprint,
      }),
    optimisticUpdate: (_blueprint, { resolution }) => resolution.resolvedBlueprint,
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
