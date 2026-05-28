export type ProgressionInput = {
  completedSets: number[];
  targetSets: number;
  targetRepMax: number;
  currentLoad: number;
  loadStep: number;
};

export type ProgressionRecommendation =
  | {
      kind: "increase-load";
      nextLoad: number;
      reason: "all-target-reps-completed";
    }
  | {
      kind: "repeat-load";
      nextLoad: number;
      reason: "target-reps-not-yet-completed";
    };

export function recommendProgression(input: ProgressionInput): ProgressionRecommendation {
  const performedTargetSets = input.completedSets.slice(0, input.targetSets);
  const achievedTarget =
    performedTargetSets.length === input.targetSets &&
    performedTargetSets.every((reps) => reps >= input.targetRepMax);

  if (achievedTarget) {
    return {
      kind: "increase-load",
      nextLoad: input.currentLoad + input.loadStep,
      reason: "all-target-reps-completed",
    };
  }

  return {
    kind: "repeat-load",
    nextLoad: input.currentLoad,
    reason: "target-reps-not-yet-completed",
  };
}
