import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type TrainingPlan, trainingPlanService } from "../../training-plan";
import type { ExerciseSelectionPreferences } from "../exercise-selection-preferences";
import {
  applyPlanBlueprintTransition,
  type PlanBlueprint,
  type PlanBlueprintTransition,
  type RepRangeStyleId,
  summarizePlanBlueprint,
  type TrainingFrequencyDaysPerWeek,
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
} & (
  | {
      optimisticUpdate?: never;
      transition: (variables: TVariables) => PlanBlueprintTransition;
    }
  | {
      optimisticUpdate: (blueprint: PlanBlueprint, variables: TVariables) => PlanBlueprint;
      transition?: never;
    }
);

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
    transition: ({ timestamp, trainingFrequencyDaysPerWeek }) => ({
      timestamp,
      trainingFrequencyDaysPerWeek,
      type: "selectTrainingFrequency",
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
    transition: ({ split, timestamp }) => ({
      split,
      timestamp,
      type: "selectTrainingSplit",
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
    transition: ({ timestamp, trainingFrequencyDaysPerWeek }) => ({
      timestamp,
      trainingFrequencyDaysPerWeek,
      type: "confirmTrainingFrequency",
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
    transition: ({ split, timestamp }) => ({
      split,
      timestamp,
      type: "confirmTrainingSplit",
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
    transition: ({ repRangeStyle, timestamp }) => ({
      repRangeStyle,
      timestamp,
      type: "confirmRepRangeStyle",
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
    transition: ({ repRangeStyle, timestamp }) => ({
      repRangeStyle,
      timestamp,
      type: "selectRepRangeStyle",
    }),
  });
}

export function useInitializeTrainingVolumeMutation() {
  return usePlanBlueprintMutation<InitializeTrainingVolumeMutationVariables>({
    mutationFn: ({ timestamp }) =>
      planBuilderService.initializeTrainingVolume({
        timestamp,
      }),
    transition: ({ timestamp }) => ({
      timestamp,
      type: "initializeTrainingVolume",
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
    transition: ({ timestamp, volumePreset }) => ({
      timestamp,
      type: "selectTrainingVolumePreset",
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
    transition: ({ isEnabled, muscleGroup, timestamp }) => ({
      isEnabled,
      muscleGroup,
      timestamp,
      type: "setOptionalVolumeTargetEnabled",
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
    transition: ({ timestamp, trainingVolumeConfiguration }) => ({
      timestamp,
      trainingVolumeConfiguration,
      type: "confirmTrainingVolume",
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
    transition: ({ exerciseSelectionPreferences, timestamp }) => ({
      exerciseSelectionPreferences,
      timestamp,
      type: "confirmExerciseSelectionPreferences",
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
    transition: ({ exerciseId, movementPattern, timestamp }) => ({
      exerciseId,
      movementPattern,
      timestamp,
      type: "selectMainCompound",
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
    transition: ({ exerciseIds, movementPattern, timestamp }) => ({
      exerciseIds,
      movementPattern,
      timestamp,
      type: "updateMainCompoundRotationPool",
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
    mutationFn: ({ blueprint }) =>
      planBuilderService.applyResolvedPlanBlueprint({
        blueprint,
      }),
    optimisticUpdate: (_blueprint, { blueprint }) => blueprint,
  });
}

function usePlanBlueprintMutation<TVariables>({
  mutationFn,
  optimisticUpdate,
  transition,
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
          transition
            ? applyPlanBlueprintTransition({
                blueprint: previousBlueprint,
                transition: transition(variables),
              })
            : optimisticUpdate(previousBlueprint, variables),
        );
      }

      return { previousBlueprint };
    },
    onSuccess: (updatedBlueprint) => {
      queryClient.setQueryData(planBuilderBlueprintQueryKey, updatedBlueprint);
    },
  });
}
