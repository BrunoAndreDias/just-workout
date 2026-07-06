import {
  normalizePlanBlueprint,
  type PlanBlueprint,
  resolvePlanBlueprintRecommendedDefaults,
} from "../plan-builder/plan-blueprint";
import {
  getCurrentPlanBlueprint,
  savePlanBlueprint,
} from "../plan-builder/plan-builder-repository";
import {
  createTrainingPlanFromDraft,
  generateTrainingPlanContentFromBlueprint,
  generateTrainingPlanFromBlueprint,
  type TrainingPlan,
  type TrainingPlanDraft,
  validateTrainingPlanDraftContent,
} from "./training-plan";
import { acceptTrainingPlanDraft, saveGeneratedTrainingPlan } from "./training-plan-repository";

type TrainingPlanGenerationDependencies = {
  createTrainingPlanId: () => string;
  getCurrentPlanBlueprint: () => Promise<PlanBlueprint | null>;
  getTimestamp: () => string;
  saveActiveTrainingPlan: (trainingPlan: TrainingPlan) => Promise<TrainingPlan>;
};

type TrainingPlanDraftGenerationDependencies = {
  getCurrentPlanBlueprint: () => Promise<PlanBlueprint | null>;
  getTimestamp: () => string;
  savePlanBlueprint: (blueprint: PlanBlueprint) => Promise<PlanBlueprint>;
};

type TrainingPlanDraftAcceptanceDependencies = {
  createTrainingPlanId: () => string;
  getCurrentPlanBlueprint: () => Promise<PlanBlueprint | null>;
  getTimestamp: () => string;
};

type CurrentPlanBlueprintDependencies = {
  getCurrentPlanBlueprint: () => Promise<PlanBlueprint | null>;
};

const defaultTrainingPlanGenerationDependencies = {
  createTrainingPlanId: () => crypto.randomUUID(),
  getCurrentPlanBlueprint,
  getTimestamp: () => new Date().toISOString(),
  savePlanBlueprint,
  saveActiveTrainingPlan: saveGeneratedTrainingPlan,
} satisfies TrainingPlanDraftAcceptanceDependencies &
  TrainingPlanDraftGenerationDependencies &
  TrainingPlanGenerationDependencies;

/** Creates or reuses the current Plan Blueprint's persisted Training Plan Draft. */
export async function generateTrainingPlanDraftFromCurrentPlanBlueprint(
  dependencies: TrainingPlanDraftGenerationDependencies = defaultTrainingPlanGenerationDependencies,
): Promise<TrainingPlanDraft> {
  const { normalizedBlueprint, resolution } = await getReadyResolvedPlanBlueprint(dependencies);

  if (normalizedBlueprint.trainingPlanDraft) {
    return normalizedBlueprint.trainingPlanDraft;
  }

  const trainingPlanDraft = buildTrainingPlanDraft({
    blueprint: resolution.resolvedBlueprint,
  });

  await saveTrainingPlanDraft({ dependencies, normalizedBlueprint, trainingPlanDraft });

  return trainingPlanDraft;
}

export async function resetTrainingPlanDraftFromCurrentPlanBlueprint(
  dependencies: TrainingPlanDraftGenerationDependencies = defaultTrainingPlanGenerationDependencies,
): Promise<TrainingPlanDraft> {
  const { normalizedBlueprint, resolution } = await getReadyResolvedPlanBlueprint(dependencies);
  const trainingPlanDraft = buildTrainingPlanDraft({
    blueprint: resolution.resolvedBlueprint,
  });

  await saveTrainingPlanDraft({ dependencies, normalizedBlueprint, trainingPlanDraft });

  return trainingPlanDraft;
}

export async function generateActiveTrainingPlanFromCurrentPlanBlueprint(
  dependencies: TrainingPlanGenerationDependencies = defaultTrainingPlanGenerationDependencies,
) {
  const { resolution } = await getReadyResolvedPlanBlueprint(dependencies);

  const timestamp = dependencies.getTimestamp();
  const trainingPlan = generateTrainingPlanFromBlueprint({
    blueprint: resolution.resolvedBlueprint,
    id: dependencies.createTrainingPlanId(),
    timestamp,
  });

  return dependencies.saveActiveTrainingPlan(trainingPlan);
}

/** Accepts the current Plan Blueprint's saved draft into a new Active Training Plan. */
export async function acceptTrainingPlanDraftFromCurrentPlanBlueprint(
  dependencies: TrainingPlanDraftAcceptanceDependencies = defaultTrainingPlanGenerationDependencies,
) {
  const { normalizedBlueprint } = await getReadyResolvedPlanBlueprint(dependencies);
  const trainingPlanDraft = normalizedBlueprint.trainingPlanDraft;

  if (!trainingPlanDraft) {
    throw new Error("Cannot accept a Training Plan Draft before one exists.");
  }

  if (trainingPlanDraft.validation.blockers.length > 0) {
    throw new Error(trainingPlanDraft.validation.blockers[0]);
  }

  const timestamp = dependencies.getTimestamp();
  const trainingPlan = createTrainingPlanFromDraft({
    draft: trainingPlanDraft,
    id: dependencies.createTrainingPlanId(),
    sourceBlueprintId: normalizedBlueprint.id,
    timestamp,
  });

  return acceptTrainingPlanDraft({
    blueprint: {
      ...normalizedBlueprint,
      trainingPlanDraft: null,
      updatedAt: timestamp,
    },
    trainingPlan,
  });
}

async function getReadyResolvedPlanBlueprint(
  dependencies: CurrentPlanBlueprintDependencies,
): Promise<{
  normalizedBlueprint: PlanBlueprint;
  resolution: ReturnType<typeof resolvePlanBlueprintRecommendedDefaults>;
}> {
  const blueprint = await dependencies.getCurrentPlanBlueprint();

  if (!blueprint) {
    throw new Error("Cannot generate a Training Plan without a Plan Blueprint.");
  }

  const normalizedBlueprint = normalizePlanBlueprint(blueprint);
  const resolution = resolvePlanBlueprintRecommendedDefaults(normalizedBlueprint);

  if (resolution.blockingIssues.length > 0) {
    throw new Error(
      `Cannot generate a Training Plan because ${resolution.blockingIssues[0]?.message}`,
    );
  }

  if (!resolution.isReady) {
    throw new Error("Cannot generate a Training Plan while Recommended Defaults are pending.");
  }

  return { normalizedBlueprint, resolution };
}

function buildTrainingPlanDraft({ blueprint }: { blueprint: PlanBlueprint }): TrainingPlanDraft {
  const content = generateTrainingPlanContentFromBlueprint({ blueprint });

  return {
    content,
    validation: validateTrainingPlanDraftContent({ content }),
  };
}

async function saveTrainingPlanDraft({
  dependencies,
  normalizedBlueprint,
  trainingPlanDraft,
}: {
  dependencies: TrainingPlanDraftGenerationDependencies;
  normalizedBlueprint: PlanBlueprint;
  trainingPlanDraft: TrainingPlanDraft;
}) {
  await dependencies.savePlanBlueprint({
    ...normalizedBlueprint,
    trainingPlanDraft,
    updatedAt: dependencies.getTimestamp(),
  });
}
