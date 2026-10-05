import type { PlanBuilderStep } from "../builder-state/plan-builder-config";
import {
  hasConfiguredExercises,
  type PlanBlueprint,
  type PlanBlueprintSummary,
} from "../plan-blueprint";

/**
 * The short "what did I pick" text for a Plan Builder section, shared by the
 * overview checklist and the Generate step's choice summary.
 */
export function getPlanBuilderChoiceValue({
  blueprint,
  isConfigured,
  sectionId,
  summary,
}: {
  blueprint: PlanBlueprint | undefined;
  isConfigured: boolean;
  sectionId: PlanBuilderStep;
  summary: PlanBlueprintSummary | null;
}): string {
  if (!blueprint || !summary) {
    return "Loading…";
  }

  switch (sectionId) {
    case "frequency":
      return isConfigured
        ? `${summary.trainingFrequency} · ${summary.split}`
        : `${summary.trainingFrequency} · no split yet`;
    case "rep-ranges":
      return isConfigured ? summary.repRanges : "Not chosen";
    case "volume":
      return isConfigured ? summary.volumePreset : "Not chosen";
    case "exercises":
      return getExercisesChoiceValue(blueprint);
    case "generate":
      return "";
  }

  return "";
}

function getExercisesChoiceValue(blueprint: PlanBlueprint): string {
  const rankedCount =
    blueprint.mainCompoundPreferences.length +
    blueprint.mainCompoundRotationPreferences.length +
    blueprint.isolationExercisePreferences.length;

  if (rankedCount > 0) {
    return `${rankedCount} ${rankedCount === 1 ? "preference" : "preferences"} ranked`;
  }

  return hasConfiguredExercises(blueprint) ? "Recommended picks" : "Not reviewed";
}
