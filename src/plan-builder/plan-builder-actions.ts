import type { PlanBuilderStep } from "./builder-state/plan-builder-config";
import type { PlanBlueprint, TrainingFrequencyDaysPerWeek } from "./plan-blueprint";
import {
  type PlanBlueprintCommand,
  persistPlanBlueprintCommand,
  planBlueprintCommandBuilders,
} from "./plan-blueprint-command";
import type { TrainingSplitId } from "./training-split";

type ContinueTrainingScheduleOptions = {
  split: TrainingSplitId;
  trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek;
};

type PlanBuilderActionResult = {
  blueprint: PlanBlueprint;
  nextStep: PlanBuilderStep;
};

export type PlanBuilderActionsDependencies = {
  getTimestamp: () => string;
  persistPlanBlueprintCommand: (command: PlanBlueprintCommand) => Promise<PlanBlueprint>;
};

const defaultPlanBuilderActionsDependencies: PlanBuilderActionsDependencies = {
  getTimestamp: () => new Date().toISOString(),
  persistPlanBlueprintCommand,
};

export function createPlanBuilderActions(
  dependencies: PlanBuilderActionsDependencies = defaultPlanBuilderActionsDependencies,
) {
  return {
    continueTrainingSchedule: (options: ContinueTrainingScheduleOptions) =>
      continueTrainingSchedule({
        dependencies,
        options,
      }),
  };
}

async function continueTrainingSchedule({
  dependencies,
  options,
}: {
  dependencies: PlanBuilderActionsDependencies;
  options: ContinueTrainingScheduleOptions;
}): Promise<PlanBuilderActionResult> {
  const timestamp = dependencies.getTimestamp();
  const commands = [
    planBlueprintCommandBuilders.updateTrainingSplit({
      split: options.split,
      timestamp,
    }),
    planBlueprintCommandBuilders.confirmTrainingFrequency({
      timestamp,
      trainingFrequencyDaysPerWeek: options.trainingFrequencyDaysPerWeek,
    }),
    planBlueprintCommandBuilders.confirmTrainingSplit({
      split: options.split,
      timestamp,
    }),
  ] as const;
  let blueprint: PlanBlueprint | null = null;

  for (const command of commands) {
    blueprint = await dependencies.persistPlanBlueprintCommand(command);
  }

  if (!blueprint) {
    throw new Error("Training Schedule workflow did not persist a Plan Blueprint.");
  }

  return {
    blueprint,
    nextStep: "rep-ranges",
  };
}

export const planBuilderActions = createPlanBuilderActions();
