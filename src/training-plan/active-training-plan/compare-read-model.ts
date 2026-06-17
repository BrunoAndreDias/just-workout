import type { TrainingPlan, WorkoutTemplate } from "../index";
import { formatMovementPattern } from "../training-plan-presentation";
import {
  formatTargetMuscle,
  formatWorkoutTemplateList,
  getMuscleEmphasis,
  getWorkoutTemplateSlots,
} from "./workout-template-summary";

export type CompareSessionSummary = {
  accessoryWork: string;
  emphasis: string[];
  keyFocus: string;
  mainPatterns: string;
  weeklyRole: string;
};

export type CompareSessionSnapshotReadModel = CompareSessionSummary & {
  id: WorkoutTemplate["id"];
  label: WorkoutTemplate["label"];
};

export type CompareReadModel = {
  balanceCallout: string;
  movementPatternHelper: string;
  sessionCountLabel: string;
  sessionSnapshots: CompareSessionSnapshotReadModel[];
};

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

export function getCompareReadModel(trainingPlan: TrainingPlan): CompareReadModel {
  const workoutTemplates = trainingPlan.workoutTemplates;
  const sessionCount = workoutTemplates.length;

  return {
    balanceCallout:
      "This split distributes upper-body, lower-body, and accessory stress across the week so each session has a distinct role.",
    movementPatternHelper: `See how ${formatWorkoutTemplateList(
      workoutTemplates,
    )} distribute movement patterns across the week.`,
    sessionCountLabel: `${sessionCount} ${sessionCount === 1 ? "session" : "sessions"}`,
    sessionSnapshots: workoutTemplates.map(getCompareSessionSnapshotReadModel),
  };
}

function getCompareSessionSummary(workoutTemplate: WorkoutTemplate): CompareSessionSummary {
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

function getCompareSessionSnapshotReadModel(
  workoutTemplate: WorkoutTemplate,
): CompareSessionSnapshotReadModel {
  return {
    id: workoutTemplate.id,
    label: workoutTemplate.label,
    ...getCompareSessionSummary(workoutTemplate),
  };
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
