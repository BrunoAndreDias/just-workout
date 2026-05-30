import { createDefaultPlanBlueprint } from "./plan-blueprint";
import { getCurrentPlanBlueprint, savePlanBlueprint } from "./plan-builder-repository";

async function getOrCreatePlanBlueprint() {
  const existingBlueprint = await getCurrentPlanBlueprint();

  if (existingBlueprint) {
    return existingBlueprint;
  }

  const blueprint = createDefaultPlanBlueprint({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  });

  return savePlanBlueprint(blueprint);
}

export const planBuilderService = {
  getOrCreatePlanBlueprint,
};
