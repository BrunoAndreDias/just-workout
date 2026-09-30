import { getAvoidedExerciseIds } from "../plan-builder/exercise-selection-preferences";
import type { PlanBlueprint } from "../plan-builder/plan-blueprint";
import {
  getExerciseCatalogExercise,
  getExerciseCatalogExercisesByMovementPattern,
} from "../training-taxonomy";
import type { TrainingPlanSlot, WorkoutTemplate } from "./training-plan";
import { createNamedExerciseSlot } from "./workout-exercise-slots";

/**
 * Replaces generated slots that use an avoided exercise, or repeat an exercise already used in
 * the same Workout Template, with the first compatible catalog alternative: same Movement
 * Pattern, same compound-or-isolation role, and a shared primary muscle group. Slots without a
 * compatible alternative are left for draft validation to report.
 */
export function resolveWorkoutTemplateSlotConflicts({
  blueprint,
  workoutTemplates,
}: {
  blueprint: Pick<PlanBlueprint, "exerciseSelectionPreferences">;
  workoutTemplates: ReadonlyArray<WorkoutTemplate>;
}): ReadonlyArray<WorkoutTemplate> {
  const avoidedExerciseIds = getAvoidedExerciseIds(blueprint.exerciseSelectionPreferences);

  return workoutTemplates.map((template) => {
    const usedExerciseIds = new Set<string>();

    return {
      ...template,
      supersetGroups: template.supersetGroups.map((group) => ({
        ...group,
        slots: group.slots.map((slot) => {
          const resolvedSlot =
            avoidedExerciseIds.has(slot.exerciseId) || usedExerciseIds.has(slot.exerciseId)
              ? (findCompatibleReplacement({ avoidedExerciseIds, slot, usedExerciseIds }) ?? slot)
              : slot;

          usedExerciseIds.add(resolvedSlot.exerciseId);

          return resolvedSlot;
        }),
      })),
    };
  });
}

function findCompatibleReplacement({
  avoidedExerciseIds,
  slot,
  usedExerciseIds,
}: {
  avoidedExerciseIds: ReadonlySet<string>;
  slot: TrainingPlanSlot;
  usedExerciseIds: ReadonlySet<string>;
}): TrainingPlanSlot | null {
  const originalExercise = getExerciseCatalogExercise(slot.exerciseId);
  const replacement = getExerciseCatalogExercisesByMovementPattern(slot.movementPattern).find(
    (exercise) =>
      exercise.id !== slot.exerciseId &&
      !avoidedExerciseIds.has(exercise.id) &&
      !usedExerciseIds.has(exercise.id) &&
      (!originalExercise || exercise.role === originalExercise.role) &&
      (slot.targetMuscles.length === 0 ||
        exercise.primaryMuscleGroups.some((muscleGroup) =>
          slot.targetMuscles.includes(muscleGroup),
        )),
  );

  return replacement
    ? {
        ...createNamedExerciseSlot({
          exerciseId: replacement.id,
          exerciseName: replacement.name,
          role: slot.role,
          slotLabel: slot.slotLabel,
        }),
        ...(slot.trainingPrescription ? { trainingPrescription: slot.trainingPrescription } : {}),
      }
    : null;
}
