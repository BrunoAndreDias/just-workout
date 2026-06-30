import { getAvoidedExerciseIds } from "../plan-builder/exercise-selection-preferences";
import {
  getIsolationExercisePreferenceExerciseIds,
  normalizeIsolationExercisePreferences,
} from "../plan-builder/isolation-exercise-preferences";
import type { PlanBlueprint } from "../plan-builder/plan-blueprint";
import {
  isOptionalVolumeMuscleGroupId,
  type WeeklyRepTarget,
} from "../plan-builder/training-volume";
import { getExerciseCatalogExercise } from "../training-taxonomy";
import type { TrainingPlanSlot, WorkoutTemplate } from "./training-plan";
import { createNamedExerciseSlot } from "./workout-exercise-slots";

export function applyIsolationExercisePreferencesToWorkoutTemplates({
  blueprint,
  workoutTemplates,
}: {
  blueprint: Pick<
    PlanBlueprint,
    "exerciseSelectionPreferences" | "isolationExercisePreferences" | "weeklyRepTargets"
  >;
  workoutTemplates: ReadonlyArray<WorkoutTemplate>;
}): ReadonlyArray<WorkoutTemplate> {
  const normalizedPreferences = normalizeIsolationExercisePreferences(
    blueprint.isolationExercisePreferences,
  );
  const avoidedExerciseIds = getAvoidedExerciseIds(blueprint.exerciseSelectionPreferences);
  const weeklyRepTargets = blueprint.weeklyRepTargets ?? [];

  if (normalizedPreferences.length === 0) {
    return workoutTemplates;
  }

  return workoutTemplates.map((template) => {
    const usedExerciseIds = new Set(
      template.supersetGroups
        .flatMap((group) => group.slots)
        .filter((slot) => slot.role !== "isolation")
        .map((slot) => slot.exerciseId),
    );

    return {
      ...template,
      supersetGroups: template.supersetGroups.map((group) => ({
        ...group,
        slots: group.slots.map((slot) => {
          if (slot.role !== "isolation") {
            return slot;
          }

          const resolvedSlot =
            resolveIsolationPreferenceSlot({
              slot,
              avoidedExerciseIds,
              usedExerciseIds,
              preferences: normalizedPreferences,
              weeklyRepTargets,
            }) ?? slot;

          usedExerciseIds.add(resolvedSlot.exerciseId);

          return resolvedSlot;
        }),
      })),
    };
  });
}

function resolveIsolationPreferenceSlot({
  slot,
  avoidedExerciseIds,
  usedExerciseIds,
  preferences,
  weeklyRepTargets,
}: {
  slot: TrainingPlanSlot;
  avoidedExerciseIds: ReadonlySet<string>;
  usedExerciseIds: ReadonlySet<string>;
  preferences: ReturnType<typeof normalizeIsolationExercisePreferences>;
  weeklyRepTargets: ReadonlyArray<WeeklyRepTarget>;
}): TrainingPlanSlot | null {
  for (const primaryMuscleGroup of slot.targetMuscles) {
    if (!isPrimaryMuscleGroupVolumeCompatible(primaryMuscleGroup, weeklyRepTargets)) {
      continue;
    }

    const preferenceExerciseIds = getIsolationExercisePreferenceExerciseIds({
      preferences,
      primaryMuscleGroup,
    });

    for (const exerciseId of preferenceExerciseIds) {
      if (usedExerciseIds.has(exerciseId) || avoidedExerciseIds.has(exerciseId)) {
        continue;
      }

      const exercise = getExerciseCatalogExercise(exerciseId);

      if (
        exercise?.role !== "isolation" ||
        !exercise.primaryMuscleGroups.includes(primaryMuscleGroup)
      ) {
        continue;
      }

      return createNamedExerciseSlot({
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        role: slot.role,
        slotLabel: slot.slotLabel,
      });
    }
  }

  return null;
}

function isPrimaryMuscleGroupVolumeCompatible(
  primaryMuscleGroup: TrainingPlanSlot["targetMuscles"][number],
  weeklyRepTargets: ReadonlyArray<WeeklyRepTarget>,
): boolean {
  const volumeTargetMuscleGroup = getVolumeTargetMuscleGroup(primaryMuscleGroup);

  if (!volumeTargetMuscleGroup || !isOptionalVolumeMuscleGroupId(volumeTargetMuscleGroup)) {
    return true;
  }

  return (
    weeklyRepTargets.find(
      (weeklyRepTarget) => weeklyRepTarget.muscleGroup === volumeTargetMuscleGroup,
    )?.isEnabled !== false
  );
}

function getVolumeTargetMuscleGroup(
  primaryMuscleGroup: TrainingPlanSlot["targetMuscles"][number],
): string | null {
  return volumeTargetMuscleGroupByPrimaryMuscleGroup[primaryMuscleGroup];
}

const volumeTargetMuscleGroupByPrimaryMuscleGroup: Record<
  TrainingPlanSlot["targetMuscles"][number],
  string | null
> = {
  abs: "abs",
  back: "back",
  biceps: "biceps",
  calves: "calves",
  chest: "chest",
  forearms: null,
  glutes: null,
  hamstrings: "hamstrings",
  quadriceps: "quads",
  shoulders: "shoulders",
  triceps: "triceps",
};
