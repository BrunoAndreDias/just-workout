import type { PlanBlueprint } from "../plan-builder/plan-blueprint";
import { getTrainingSplit } from "../training-taxonomy";
import { applyIsolationExercisePreferencesToWorkoutTemplates } from "./isolation-exercise-preference-selection";
import { createAssignedTemplateDrafts } from "./template-draft-assignment";
import type { WorkoutTemplate } from "./training-plan";
import { resolveWorkoutTemplateSlotConflicts } from "./workout-slot-conflict-resolution";
import { createWorkoutTemplates } from "./workout-template-generation";

type CreateTrainingPlanTemplatesForBlueprintOptions = {
  blueprint: PlanBlueprint;
};

type TrainingPlanTemplateGeneration = {
  splitLabel: string;
  workoutTemplates: ReadonlyArray<WorkoutTemplate>;
};

export function createTrainingPlanTemplatesForBlueprint({
  blueprint,
}: CreateTrainingPlanTemplatesForBlueprintOptions): TrainingPlanTemplateGeneration {
  const split = blueprint.split;

  if (!split) {
    throw new Error("Cannot generate a Training Plan without a Training Split.");
  }

  const trainingSplit = getTrainingSplit(split);
  const templateDrafts = createAssignedTemplateDrafts({
    mainCompoundSelections: blueprint.mainCompoundSelections,
    schedule: trainingSplit.schedule,
    split,
    trainingFrequencyDaysPerWeek: blueprint.trainingFrequencyDaysPerWeek,
  });
  const workoutTemplates = createWorkoutTemplates({
    split,
    templateDrafts,
  });

  return {
    splitLabel: trainingSplit.label,
    workoutTemplates: resolveWorkoutTemplateSlotConflicts({
      blueprint,
      workoutTemplates: applyIsolationExercisePreferencesToWorkoutTemplates({
        blueprint,
        workoutTemplates,
      }),
    }),
  };
}
