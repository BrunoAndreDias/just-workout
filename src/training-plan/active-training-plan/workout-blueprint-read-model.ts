import type { SupersetGroup, TrainingPlanSlot, WorkoutTemplate } from "../index";
import { formatExerciseRole, formatMovementPattern } from "../training-plan-presentation";
import {
  createLegacyDefaultTrainingPrescription,
  formatTrainingPrescriptionForBlueprint,
} from "../training-prescription";
import { formatTargetMuscles } from "./workout-template-summary";

export type WorkoutBlueprintExerciseRowReadModel = {
  exerciseId: TrainingPlanSlot["exerciseId"];
  exerciseName: TrainingPlanSlot["exerciseName"];
  groupId: string;
  key: string;
  movementPattern: string;
  movementPatternId: TrainingPlanSlot["movementPattern"];
  prescription: string;
  roleId: TrainingPlanSlot["role"];
  role: string;
  slotIndex: number;
  templateId: string;
  targetMuscles: string;
};

export type WorkoutBlueprintSectionReadModel = {
  defaultExpandedOnMobile: boolean;
  rows: WorkoutBlueprintExerciseRowReadModel[];
  title: string;
};

export type WorkoutBlueprintReadModel = {
  isolationFinisher: WorkoutBlueprintSectionReadModel;
  supersets: WorkoutBlueprintSectionReadModel[];
};

export function getWorkoutBlueprintReadModel(
  workoutTemplate: WorkoutTemplate,
): WorkoutBlueprintReadModel {
  const supersetGroups = workoutTemplate.supersetGroups.filter(
    (group) => group.type === "superset",
  );
  const isolationGroup =
    workoutTemplate.supersetGroups.find((group) => group.type === "isolation") ?? null;

  return {
    isolationFinisher: {
      defaultExpandedOnMobile: false,
      rows: getExercisePlanRows(isolationGroup, "C").map((row) =>
        getExerciseRowReadModel(row, isolationGroup?.id ?? "isolation", workoutTemplate.id),
      ),
      title: "Isolation Finisher",
    },
    supersets: supersetGroups.slice(0, 2).map((group, index) => ({
      defaultExpandedOnMobile: index === 0,
      rows: getExercisePlanRows(group, index === 0 ? "A" : "B").map((row) =>
        getExerciseRowReadModel(row, group.id, workoutTemplate.id),
      ),
      title: `Superset ${index + 1}`,
    })),
  };
}

function getExercisePlanRows(
  group: SupersetGroup | null,
  labelPrefix: "A" | "B" | "C",
): Array<{ exerciseLabel: string; slot: TrainingPlanSlot; slotIndex: number }> {
  const slots = group?.slots ?? [];

  return slots.map((slot, index) => ({
    exerciseLabel: labelPrefix + (index + 1),
    slot,
    slotIndex: index,
  }));
}

function getExerciseRowReadModel(
  row: { exerciseLabel: string; slot: TrainingPlanSlot; slotIndex: number },
  groupId: string,
  templateId: string,
): WorkoutBlueprintExerciseRowReadModel {
  return {
    exerciseId: row.slot.exerciseId,
    exerciseName: row.slot.exerciseName,
    key: `${groupId}-${row.exerciseLabel}-${row.slot.exerciseId}`,
    groupId,
    movementPattern: formatMovementPattern(row.slot.movementPattern),
    movementPatternId: row.slot.movementPattern,
    prescription: formatTrainingPrescriptionForBlueprint(
      row.slot.trainingPrescription ?? createLegacyDefaultTrainingPrescription(),
    ),
    roleId: row.slot.role,
    role: formatExerciseRole(row.slot.role),
    slotIndex: row.slotIndex,
    templateId,
    targetMuscles: formatTargetMuscles(row.slot.targetMuscles),
  };
}
