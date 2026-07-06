import {
  normalizePlanBlueprint,
  type PlanBlueprint,
  resolvePlanBlueprintRecommendedDefaults,
} from "../plan-builder/plan-blueprint";
import {
  getCurrentPlanBlueprint,
  savePlanBlueprint,
  updateCurrentPlanBlueprint,
} from "../plan-builder/plan-builder-repository";
import {
  createTrainingPlanFromDraft,
  generateTrainingPlanContentFromBlueprint,
  generateTrainingPlanFromBlueprint,
  type TrainingPlan,
  type TrainingPlanDraft,
  type TrainingPlanDraftSetupUpdate,
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

type TrainingPlanDraftSetupSaveDependencies = {
  getTimestamp: () => string;
  updateCurrentPlanBlueprint: (
    updateBlueprint: (blueprint: PlanBlueprint | null) => PlanBlueprint,
  ) => Promise<PlanBlueprint>;
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
  updateCurrentPlanBlueprint,
} satisfies TrainingPlanDraftAcceptanceDependencies &
  TrainingPlanDraftGenerationDependencies &
  TrainingPlanDraftSetupSaveDependencies &
  TrainingPlanGenerationDependencies;

/** Creates or reuses the current Plan Blueprint's persisted Training Plan Draft. */
export async function generateTrainingPlanDraftFromCurrentPlanBlueprint(
  dependencies: TrainingPlanDraftGenerationDependencies = defaultTrainingPlanGenerationDependencies,
): Promise<TrainingPlanDraft> {
  const { normalizedBlueprint, resolution } = await getReadyResolvedPlanBlueprint(dependencies);

  if (normalizedBlueprint.trainingPlanDraft) {
    return normalizedBlueprint.trainingPlanDraft;
  }

  const trainingPlanDraft: TrainingPlanDraft = {
    content: generateTrainingPlanContentFromBlueprint({
      blueprint: resolution.resolvedBlueprint,
    }),
  };

  await dependencies.savePlanBlueprint({
    ...normalizedBlueprint,
    trainingPlanDraft,
    updatedAt: dependencies.getTimestamp(),
  });

  return trainingPlanDraft;
}

/**
 * Saves one draft setup field onto the current persisted Training Plan Draft.
 *
 * The merge happens against the latest Plan Blueprint in a write transaction so independent setup
 * edits do not replace each other with stale draft snapshots.
 */
export async function saveTrainingPlanDraftSetupFromCurrentPlanBlueprint({
  dependencies = defaultTrainingPlanGenerationDependencies,
  update,
}: {
  dependencies?: TrainingPlanDraftSetupSaveDependencies;
  update: TrainingPlanDraftSetupUpdate;
}): Promise<TrainingPlanDraft> {
  const savedBlueprint = await dependencies.updateCurrentPlanBlueprint((blueprint) => {
    if (!blueprint) {
      throw new Error("Cannot save a Training Plan Draft without a Plan Blueprint.");
    }

    const normalizedBlueprint = normalizePlanBlueprint(blueprint);
    const trainingPlanDraft = normalizedBlueprint.trainingPlanDraft;

    if (!trainingPlanDraft) {
      throw new Error("Cannot save Training Plan Draft setup before a draft exists.");
    }

    return {
      ...normalizedBlueprint,
      trainingPlanDraft: applyTrainingPlanDraftSetupUpdate({
        trainingPlanDraft,
        update,
      }),
      updatedAt: dependencies.getTimestamp(),
    };
  });

  if (!savedBlueprint.trainingPlanDraft) {
    throw new Error("Expected saved Plan Blueprint to include a Training Plan Draft.");
  }

  return savedBlueprint.trainingPlanDraft;
}

/**
 * Regenerates the current Training Plan Draft from the latest Plan Blueprint choices.
 *
 * This discards draft-local setup edits such as Baseline Bodyweight and edited starting loads.
 */
export async function resetTrainingPlanDraftFromCurrentPlanBlueprint(
  dependencies: TrainingPlanDraftGenerationDependencies = defaultTrainingPlanGenerationDependencies,
): Promise<TrainingPlanDraft> {
  const { normalizedBlueprint, resolution } = await getReadyResolvedPlanBlueprint(dependencies);
  const trainingPlanDraft: TrainingPlanDraft = {
    content: generateTrainingPlanContentFromBlueprint({
      blueprint: resolution.resolvedBlueprint,
    }),
  };

  await dependencies.savePlanBlueprint({
    ...normalizedBlueprint,
    trainingPlanDraft,
    updatedAt: dependencies.getTimestamp(),
  });

  return trainingPlanDraft;
}

function applyTrainingPlanDraftSetupUpdate({
  trainingPlanDraft,
  update,
}: {
  trainingPlanDraft: TrainingPlanDraft;
  update: TrainingPlanDraftSetupUpdate;
}): TrainingPlanDraft {
  switch (update.kind) {
    case "baseline_bodyweight":
      return {
        content: {
          ...trainingPlanDraft.content,
          baselineBodyweight: update.baselineBodyweight,
        },
      };
    case "starting_load_suggestions":
      return {
        content: {
          ...trainingPlanDraft.content,
          startingLoadSuggestions: update.startingLoadSuggestions,
        },
      };
  }
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
