import type { TrainingPlanSlot, WorkoutTemplate } from "../index";

export type MovementCoverageRow = {
  label: string;
  patterns: ReadonlyArray<TrainingPlanSlot["movementPattern"]>;
};

export const movementCoverageRows: ReadonlyArray<MovementCoverageRow> = [
  { label: "Horizontal Push", patterns: ["horizontal_push"] },
  { label: "Horizontal Pull", patterns: ["horizontal_pull"] },
  { label: "Vertical Push", patterns: ["vertical_push"] },
  { label: "Vertical Pull", patterns: ["vertical_pull"] },
  { label: "Quad Dominant", patterns: ["quad_dominant"] },
  { label: "Hip/Hamstring Dominant", patterns: ["hip_hamstring_dominant"] },
  { label: "Arms", patterns: ["elbow_flexion", "elbow_extension"] },
  { label: "Calves / Core", patterns: ["calves_accessories", "core"] },
];

export function formatWeeklyCoverageCount(
  workoutTemplates: ReadonlyArray<WorkoutTemplate>,
  patterns: ReadonlyArray<TrainingPlanSlot["movementPattern"]>,
): string {
  const coveredCount = workoutTemplates.filter((template) =>
    hasMovementCoverage(template, patterns),
  ).length;

  return `${coveredCount} of ${workoutTemplates.length} sessions`;
}

export function hasMovementCoverage(
  workoutTemplate: WorkoutTemplate,
  patterns: ReadonlyArray<TrainingPlanSlot["movementPattern"]>,
): boolean {
  return workoutTemplate.supersetGroups
    .flatMap((group) => group.slots)
    .some((slot) => patterns.includes(slot.movementPattern));
}
