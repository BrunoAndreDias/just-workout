import { repRangeStyleLabels } from "../../plan-builder/plan-blueprint-options";
import type { TrainingPlan, TrainingPlanSlot, WorkoutTemplate } from "../index";
import { formatMovementPattern } from "../training-plan-presentation";

export { formatExerciseRole, formatMovementPattern } from "../training-plan-presentation";

export type ActiveTrainingPlanTabId = "overview" | `workout-${number}` | "compare";

export type ActiveTrainingPlanTab = {
  id: ActiveTrainingPlanTabId;
  label: string;
};

export type MovementCoverageRow = {
  label: string;
  patterns: TrainingPlanSlot["movementPattern"][];
};

export type CompareSessionSummary = {
  accessoryWork: string;
  emphasis: string[];
  keyFocus: string;
  mainPatterns: string;
  weeklyRole: string;
};

export const movementCoverageRows: MovementCoverageRow[] = [
  { label: "Horizontal Push", patterns: ["horizontal_push"] },
  { label: "Horizontal Pull", patterns: ["horizontal_pull"] },
  { label: "Vertical Push", patterns: ["vertical_push"] },
  { label: "Vertical Pull", patterns: ["vertical_pull"] },
  { label: "Quad Dominant", patterns: ["quad_dominant"] },
  { label: "Hip/Hamstring Dominant", patterns: ["hip_hamstring_dominant"] },
  { label: "Arms", patterns: ["elbow_flexion", "elbow_extension"] },
  { label: "Calves / Core", patterns: ["calves_accessories", "core"] },
];

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

const compareSessionSummaries: Record<string, CompareSessionSummary> = {
  "Full Body A": {
    accessoryWork: "Arms, calves",
    emphasis: ["Chest", "Quadriceps", "Back", "Hamstrings", "Glutes"],
    keyFocus: "Mixed upper + lower",
    mainPatterns: "Push, pull, squat, hinge",
    weeklyRole: "Full-body bridge",
  },
  "Full Body B": {
    accessoryWork: "Arms, calves",
    emphasis: ["Chest", "Quadriceps", "Back", "Hamstrings", "Glutes"],
    keyFocus: "Mixed upper + lower",
    mainPatterns: "Push, pull, squat, hinge",
    weeklyRole: "Full-body alternate",
  },
  Lower: {
    accessoryWork: "Calves",
    emphasis: ["Quadriceps", "Hamstrings", "Glutes"],
    keyFocus: "Quads + posterior chain",
    mainPatterns: "Quad dominant, hip/hamstring",
    weeklyRole: "Lower-body foundation",
  },
  Upper: {
    accessoryWork: "Biceps, triceps",
    emphasis: ["Chest", "Back"],
    keyFocus: "Push + pull",
    mainPatterns: "Horizontal push, vertical pull, horizontal pull",
    weeklyRole: "Upper-body balance",
  },
};

export function getWorkoutTemplateForTab(
  trainingPlan: TrainingPlan,
  activeTabId: ActiveTrainingPlanTabId,
): WorkoutTemplate | null {
  if (activeTabId.startsWith("workout-")) {
    const templateIndex = Number(activeTabId.replace("workout-", ""));

    return trainingPlan.workoutTemplates[templateIndex] ?? null;
  }

  return null;
}

export function getActiveTrainingPlanTabs(trainingPlan: TrainingPlan): ActiveTrainingPlanTab[] {
  return [
    { id: "overview", label: "Overview" },
    ...trainingPlan.workoutTemplates.map((template, index) => ({
      id: `workout-${index}` as const,
      label: template.label,
    })),
    { id: "compare", label: "Compare" },
  ];
}

export function formatWeeklyCoverageCount(
  workoutTemplates: ReadonlyArray<WorkoutTemplate>,
  patterns: TrainingPlanSlot["movementPattern"][],
): string {
  const coveredCount = workoutTemplates.filter((template) =>
    hasMovementCoverage(template, patterns),
  ).length;

  return `${coveredCount} of ${workoutTemplates.length} sessions`;
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

export function formatWeeklyStructureSupport(
  workoutTemplates: ReadonlyArray<WorkoutTemplate>,
): string {
  const labels = workoutTemplates.map((template) => template.label);

  if (labels.length === 2 && labels.includes("Full Body A") && labels.includes("Full Body B")) {
    return "Repeat weekly. Alternate between Full Body A and Full Body B.";
  }

  return `Repeat weekly. Rotate through ${formatWorkoutTemplateList(workoutTemplates)}.`;
}

export function getCompareSessionSummary(workoutTemplate: WorkoutTemplate): CompareSessionSummary {
  const authoredSummary = compareSessionSummaries[workoutTemplate.label];

  if (authoredSummary) {
    return authoredSummary;
  }

  const emphasis = getMuscleEmphasis(workoutTemplate, ["main_compound"]);
  const mainPatterns = getWorkoutTemplateSlots(workoutTemplate)
    .filter((slot) => slot.role === "main_compound" || slot.role === "secondary_compound")
    .map((slot) => formatMovementPattern(slot.movementPattern))
    .filter((pattern, index, patterns) => patterns.indexOf(pattern) === index)
    .slice(0, 4);

  return {
    accessoryWork: formatAccessorySummary(workoutTemplate),
    emphasis,
    keyFocus: formatFallbackKeyFocus(emphasis),
    mainPatterns: mainPatterns.length > 0 ? mainPatterns.join(", ") : "Balanced movement coverage",
    weeklyRole: workoutTemplate.label.includes("Full Body")
      ? "Full-body coverage"
      : "Weekly support",
  };
}

export function hasMovementCoverage(
  workoutTemplate: WorkoutTemplate,
  patterns: TrainingPlanSlot["movementPattern"][],
): boolean {
  return getWorkoutTemplateSlots(workoutTemplate).some((slot) =>
    patterns.includes(slot.movementPattern),
  );
}

function getWorkoutTemplateSlots(workoutTemplate: WorkoutTemplate): TrainingPlanSlot[] {
  return workoutTemplate.supersetGroups.flatMap((group) => group.slots);
}

export function getMuscleEmphasis(
  workoutTemplate: WorkoutTemplate,
  roles: TrainingPlanSlot["role"][],
): string[] {
  const muscles = getWorkoutTemplateSlots(workoutTemplate).flatMap((slot) =>
    roles.includes(slot.role) ? slot.targetMuscles : [],
  );
  const uniqueMuscles = Array.from(new Set(muscles)).map(formatTargetMuscle);

  return uniqueMuscles.length > 0 ? uniqueMuscles : ["Balanced full body"];
}

export function formatTargetMuscles(targetMuscles: TrainingPlanSlot["targetMuscles"]): string {
  if (targetMuscles.length === 0) {
    return "Target muscles TBD";
  }

  return targetMuscles.map(formatTargetMuscle).join(", ");
}

function formatTargetMuscle(targetMuscle: TrainingPlanSlot["targetMuscles"][number]): string {
  return targetMuscleLabels[targetMuscle];
}

export function formatSummaryRepRangeStyle(trainingPlan: TrainingPlan): string {
  return getRepRangeStyleLabel(trainingPlan).replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getNextWorkoutLabel(trainingPlan: TrainingPlan): string {
  return trainingPlan.workoutTemplates[0]?.label ?? "Full Body A";
}

export function getEnabledVolumeTargetCount(trainingPlan: TrainingPlan): number {
  return trainingPlan.weeklyRepTargets.filter((target) => target.isEnabled).length;
}

function getRepRangeStyleLabel(trainingPlan: TrainingPlan): string {
  return repRangeStyleLabels[trainingPlan.repRangeStyle] ?? "Balanced hypertrophy";
}

function formatFallbackKeyFocus(emphasis: string[]): string {
  if (emphasis.length >= 2) {
    return `${emphasis[0]} + ${emphasis[1]}`;
  }

  return emphasis[0] ?? "Balanced training";
}

function formatAccessorySummary(workoutTemplate: WorkoutTemplate): string {
  const accessoryMuscles = getWorkoutTemplateSlots(workoutTemplate)
    .filter((slot) => slot.role === "isolation")
    .flatMap((slot) => slot.targetMuscles)
    .filter((muscle, index, muscles) => muscles.indexOf(muscle) === index)
    .map(formatTargetMuscle);

  return accessoryMuscles.length > 0 ? accessoryMuscles.join(", ") : "Accessory support";
}
