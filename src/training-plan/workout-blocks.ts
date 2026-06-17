import { createDefaultExerciseSlot } from "./default-exercise-slots";
import type { SupersetGroup, TrainingPlanSlot } from "./training-plan";

export function createWorkoutBlock({ id, slots, title, type }: SupersetGroup): SupersetGroup {
  return {
    id,
    slots,
    title,
    type,
  };
}

export function createIsolationFinisher(
  templateId: string,
  slotLabel: string,
  includeAbs = true,
): SupersetGroup {
  const slots: TrainingPlanSlot[] =
    slotLabel === "Lower isolation"
      ? [
          createDefaultExerciseSlot("lower_isolation", "isolation"),
          createDefaultExerciseSlot("lower_isolation_2", "isolation"),
        ]
      : [
          createDefaultExerciseSlot("upper_isolation_1", "isolation"),
          createDefaultExerciseSlot("upper_isolation_2", "isolation"),
        ];

  if (includeAbs) {
    slots.push(createDefaultExerciseSlot("abs_2", "abs"));
  }

  return {
    id: `${templateId}-isolation`,
    slots,
    title: "Isolation finisher",
    type: "isolation",
  };
}

export function createFullBodyIsolationFinisher(templateId: string): SupersetGroup {
  const slots = [
    createDefaultExerciseSlot("upper_isolation_1", "isolation"),
    createDefaultExerciseSlot("upper_isolation_2", "isolation"),
    createDefaultExerciseSlot("lower_isolation_2", "isolation"),
  ];

  return {
    id: `${templateId}-isolation`,
    slots,
    title: "Isolation finisher",
    type: "isolation",
  };
}

export function createAbsFinisher(templateId: string): SupersetGroup {
  return {
    id: `${templateId}-abs-finisher`,
    slots: [createDefaultExerciseSlot("abs_1", "abs"), createDefaultExerciseSlot("abs_2", "abs")],
    title: "Abs finisher",
    type: "abs",
  };
}
