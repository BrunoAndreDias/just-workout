import type { TrainingPlanSlot, WorkoutTemplate } from "../index";

export type WorkoutTemplateMuscleEmphasisReadModel = {
  dayIndex: number;
  id: WorkoutTemplate["id"];
  label: WorkoutTemplate["label"];
  primaryEmphasis: string[];
  secondaryEmphasis: string[];
};

export type WorkoutSplitSummaryReadModel = {
  support: string;
  templates: WorkoutTemplateMuscleEmphasisReadModel[];
};

const targetMuscleLabels = {
  abs: "Abs",
  back: "Back",
  biceps: "Biceps",
  calves: "Calves",
  chest: "Chest",
  forearms: "Forearms",
  glutes: "Glutes",
  hamstrings: "Hamstrings",
  quadriceps: "Quadriceps",
  shoulders: "Shoulders",
  triceps: "Triceps",
} as const satisfies Record<TrainingPlanSlot["targetMuscles"][number], string>;

export function getWorkoutSplitSummaryReadModel(
  workoutTemplates: ReadonlyArray<WorkoutTemplate>,
): WorkoutSplitSummaryReadModel {
  return {
    support: formatWeeklyStructureSupport(workoutTemplates),
    templates: workoutTemplates.map((workoutTemplate, index) => ({
      dayIndex: index + 1,
      id: workoutTemplate.id,
      label: workoutTemplate.label,
      primaryEmphasis: getMuscleEmphasis(workoutTemplate, ["main_compound"]),
      secondaryEmphasis: getMuscleEmphasis(workoutTemplate, [
        "secondary_compound",
        "isolation",
        "abs",
      ]),
    })),
  };
}

export function formatWorkoutTemplateList(
  workoutTemplates: ReadonlyArray<WorkoutTemplate>,
): string {
  const labels = workoutTemplates.map((template) => template.label);

  if (labels.length <= 2) {
    return labels.join(" and ");
  }

  return `${labels.slice(0, -1).join(", ")}, and ${labels.at(-1)}`;
}

function formatWeeklyStructureSupport(workoutTemplates: ReadonlyArray<WorkoutTemplate>): string {
  const labels = workoutTemplates.map((template) => template.label);

  if (labels.length === 2 && labels.includes("Full Body A") && labels.includes("Full Body B")) {
    return "Repeat weekly. Alternate between Full Body A and Full Body B.";
  }

  return `Repeat weekly. Rotate through ${formatWorkoutTemplateList(workoutTemplates)}.`;
}

export function getMuscleEmphasis(
  workoutTemplate: WorkoutTemplate,
  roles: ReadonlyArray<TrainingPlanSlot["role"]>,
): string[] {
  const muscles = getWorkoutTemplateSlots(workoutTemplate).flatMap((slot) =>
    roles.includes(slot.role) ? slot.targetMuscles : [],
  );
  const uniqueMuscles = Array.from(new Set(muscles)).map(formatTargetMuscle);

  return uniqueMuscles.length > 0 ? uniqueMuscles : ["Balanced full body"];
}

export function getWorkoutTemplateSlots(workoutTemplate: WorkoutTemplate): TrainingPlanSlot[] {
  return workoutTemplate.supersetGroups.flatMap((group) => group.slots);
}

export function formatTargetMuscles(targetMuscles: TrainingPlanSlot["targetMuscles"]): string {
  if (targetMuscles.length === 0) {
    return "Target muscles TBD";
  }

  return targetMuscles.map(formatTargetMuscle).join(", ");
}

export function formatTargetMuscle(
  targetMuscle: TrainingPlanSlot["targetMuscles"][number],
): string {
  return targetMuscleLabels[targetMuscle];
}
