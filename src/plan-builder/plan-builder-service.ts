import {
  getOrCreatePlanBlueprint as getOrCreateCurrentPlanBlueprint,
  persistPlanBlueprintCommand,
  planBlueprintCommandBuilders,
} from "./plan-blueprint-command";

async function updateTrainingFrequency(
  options: Parameters<typeof planBlueprintCommandBuilders.updateTrainingFrequency>[0],
) {
  return persistPlanBlueprintCommand(planBlueprintCommandBuilders.updateTrainingFrequency(options));
}

async function updateTrainingSplit(
  options: Parameters<typeof planBlueprintCommandBuilders.updateTrainingSplit>[0],
) {
  return persistPlanBlueprintCommand(planBlueprintCommandBuilders.updateTrainingSplit(options));
}

async function updateRepRangeStyle(
  options: Parameters<typeof planBlueprintCommandBuilders.updateRepRangeStyle>[0],
) {
  return persistPlanBlueprintCommand(planBlueprintCommandBuilders.updateRepRangeStyle(options));
}

async function updateTrainingVolumePreset(
  options: Parameters<typeof planBlueprintCommandBuilders.updateTrainingVolumePreset>[0],
) {
  return persistPlanBlueprintCommand(
    planBlueprintCommandBuilders.updateTrainingVolumePreset(options),
  );
}

async function updateOptionalVolumeTarget(
  options: Parameters<typeof planBlueprintCommandBuilders.updateOptionalVolumeTarget>[0],
) {
  return persistPlanBlueprintCommand(
    planBlueprintCommandBuilders.updateOptionalVolumeTarget(options),
  );
}

async function updateExerciseSelectionPreferences(
  options: Parameters<typeof planBlueprintCommandBuilders.updateExerciseSelectionPreferences>[0],
) {
  return persistPlanBlueprintCommand(
    planBlueprintCommandBuilders.updateExerciseSelectionPreferences(options),
  );
}

async function updateMainCompoundSelection(
  options: Parameters<typeof planBlueprintCommandBuilders.updateMainCompoundSelection>[0],
) {
  return persistPlanBlueprintCommand(
    planBlueprintCommandBuilders.updateMainCompoundSelection(options),
  );
}

async function updateMainCompoundRotationPool(
  options: Parameters<typeof planBlueprintCommandBuilders.updateMainCompoundRotationPool>[0],
) {
  return persistPlanBlueprintCommand(
    planBlueprintCommandBuilders.updateMainCompoundRotationPool(options),
  );
}

async function updateMainCompoundRotationPreferences(
  options: Parameters<typeof planBlueprintCommandBuilders.updateMainCompoundRotationPreferences>[0],
) {
  return persistPlanBlueprintCommand(
    planBlueprintCommandBuilders.updateMainCompoundRotationPreferences(options),
  );
}

async function updateMainCompoundPreferences(
  options: Parameters<typeof planBlueprintCommandBuilders.updateMainCompoundPreferences>[0],
) {
  return persistPlanBlueprintCommand(
    planBlueprintCommandBuilders.updateMainCompoundPreferences(options),
  );
}

async function updateIsolationExercisePreferences(
  options: Parameters<typeof planBlueprintCommandBuilders.updateIsolationExercisePreferences>[0],
) {
  return persistPlanBlueprintCommand(
    planBlueprintCommandBuilders.updateIsolationExercisePreferences(options),
  );
}

async function confirmSelectedTrainingFrequency(
  options: Parameters<typeof planBlueprintCommandBuilders.confirmTrainingFrequency>[0],
) {
  return persistPlanBlueprintCommand(
    planBlueprintCommandBuilders.confirmTrainingFrequency(options),
  );
}

async function confirmSelectedTrainingSplit(
  options: Parameters<typeof planBlueprintCommandBuilders.confirmTrainingSplit>[0],
) {
  return persistPlanBlueprintCommand(planBlueprintCommandBuilders.confirmTrainingSplit(options));
}

async function confirmSelectedRepRangeStyle(
  options: Parameters<typeof planBlueprintCommandBuilders.confirmRepRangeStyle>[0],
) {
  return persistPlanBlueprintCommand(planBlueprintCommandBuilders.confirmRepRangeStyle(options));
}

async function confirmSelectedTrainingVolume(
  options: Parameters<typeof planBlueprintCommandBuilders.confirmTrainingVolume>[0],
) {
  return persistPlanBlueprintCommand(planBlueprintCommandBuilders.confirmTrainingVolume(options));
}

async function confirmSelectedExerciseSelectionPreferences(
  options?: Parameters<typeof planBlueprintCommandBuilders.confirmExerciseSelectionPreferences>[0],
) {
  return persistPlanBlueprintCommand(
    planBlueprintCommandBuilders.confirmExerciseSelectionPreferences(options),
  );
}

async function initializeTrainingVolume(
  options?: Parameters<typeof planBlueprintCommandBuilders.initializeTrainingVolume>[0],
) {
  return persistPlanBlueprintCommand(
    planBlueprintCommandBuilders.initializeTrainingVolume(options),
  );
}

async function applyResolvedPlanBlueprint(
  options: Parameters<typeof planBlueprintCommandBuilders.applyResolvedPlanBlueprint>[0],
) {
  return persistPlanBlueprintCommand(
    planBlueprintCommandBuilders.applyResolvedPlanBlueprint(options),
  );
}

export const planBuilderService = {
  applyResolvedPlanBlueprint,
  confirmSelectedExerciseSelectionPreferences,
  confirmSelectedRepRangeStyle,
  confirmSelectedTrainingFrequency,
  confirmSelectedTrainingSplit,
  confirmSelectedTrainingVolume,
  getOrCreatePlanBlueprint: getOrCreateCurrentPlanBlueprint,
  initializeTrainingVolume,
  updateIsolationExercisePreferences,
  updateMainCompoundPreferences,
  updateMainCompoundRotationPreferences,
  updateExerciseSelectionPreferences,
  updateMainCompoundRotationPool,
  updateMainCompoundSelection,
  updateOptionalVolumeTarget,
  updateRepRangeStyle,
  updateTrainingSplit,
  updateTrainingFrequency,
  updateTrainingVolumePreset,
};
