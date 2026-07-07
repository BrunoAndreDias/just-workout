import {
  type TrainingPlanContent,
  validateTrainingPlanDraftContent,
  type WorkoutTemplate,
  type WorkoutTemplatePurpose,
} from "../training-plan/training-plan";
import { normalizeExerciseSelectionPreferences } from "./exercise-selection-preferences";
import { normalizeIsolationExercisePreferences } from "./isolation-exercise-preferences";
import { isRepRangeStyleId, isTrainingFrequencyDaysPerWeek } from "./plan-blueprint-options";
import type {
  AddTrainingPlanDraftSupersetGroupOptions,
  DeleteTrainingPlanDraftSupersetGroupOptions,
  MoveTrainingPlanDraftSlotToSupersetGroupOptions,
  PlanBlueprint,
  RenameTrainingPlanDraftSupersetGroupOptions,
  RenameTrainingPlanDraftWorkoutTemplateOptions,
  ReorderTrainingPlanDraftSupersetGroupOptions,
  ReorderTrainingPlanDraftWorkoutTemplateOptions,
  ReplaceTrainingPlanDraftWorkoutTemplateWithCustomFocusOptions,
  UpdateTrainingPlanDraftOptions,
  UpdateTrainingPlanDraftWorkoutTemplatePurposeOptions,
} from "./plan-blueprint-types";

export function markTrainingPlanDraftStale(
  trainingPlanDraft: PlanBlueprint["trainingPlanDraft"],
): PlanBlueprint["trainingPlanDraft"] {
  return trainingPlanDraft
    ? {
        ...trainingPlanDraft,
        isStale: true,
      }
    : null;
}

export function normalizeTrainingPlanDraft(
  trainingPlanDraft: unknown,
): PlanBlueprint["trainingPlanDraft"] {
  if (!isRecord(trainingPlanDraft) || !isRecord(trainingPlanDraft.content)) {
    return null;
  }

  const content = normalizeTrainingPlanDraftContent(trainingPlanDraft.content);

  return content
    ? {
        content,
        isStale: trainingPlanDraft.isStale === true,
        validation: validateTrainingPlanDraftContent({ content }),
      }
    : null;
}

function normalizeTrainingPlanDraftContent(
  content: Record<string, unknown>,
): TrainingPlanContent | null {
  const normalizedContent = normalizeRequiredTrainingPlanDraftContent(content);

  if (!normalizedContent) {
    return null;
  }

  return applyOptionalTrainingPlanDraftContent(content, normalizedContent);
}

function normalizeRequiredTrainingPlanDraftContent(
  content: Record<string, unknown>,
): TrainingPlanContent | null {
  const {
    mainCompoundRotationPools,
    repRangeStyle,
    split,
    trainingBlockWeeks,
    trainingFrequencyDaysPerWeek,
    trainingGoal,
    weeklyRepTargets,
  } = content;
  const workoutTemplates = normalizeDraftWorkoutTemplates(content.workoutTemplates);

  if (
    !Array.isArray(mainCompoundRotationPools) ||
    !isRepRangeStyleId(repRangeStyle) ||
    typeof split !== "string" ||
    !isPositiveInteger(trainingBlockWeeks) ||
    !isTrainingFrequencyDaysPerWeek(trainingFrequencyDaysPerWeek) ||
    trainingGoal !== "build-muscle" ||
    !Array.isArray(weeklyRepTargets) ||
    !workoutTemplates
  ) {
    return null;
  }

  return {
    mainCompoundRotationPools:
      mainCompoundRotationPools as TrainingPlanContent["mainCompoundRotationPools"],
    repRangeStyle,
    split,
    trainingBlockWeeks,
    trainingFrequencyDaysPerWeek,
    trainingGoal,
    weeklyRepTargets: weeklyRepTargets as TrainingPlanContent["weeklyRepTargets"],
    workoutTemplates,
  };
}

function applyOptionalTrainingPlanDraftContent(
  content: Record<string, unknown>,
  normalizedContent: TrainingPlanContent,
): TrainingPlanContent | null {
  if (
    !applyDraftBaselineBodyweight(content, normalizedContent) ||
    !applyDraftStartingLoadSuggestions(content, normalizedContent) ||
    !applyDraftTrainingBlock(content, normalizedContent)
  ) {
    return null;
  }

  if (hasDefinedContentField(content, "exerciseSelectionPreferences")) {
    normalizedContent.exerciseSelectionPreferences = normalizeExerciseSelectionPreferences(
      content.exerciseSelectionPreferences,
    );
  }

  if (hasDefinedContentField(content, "isolationExercisePreferences")) {
    normalizedContent.isolationExercisePreferences = normalizeIsolationExercisePreferences(
      content.isolationExercisePreferences,
    );
  }

  return normalizedContent;
}

function applyDraftBaselineBodyweight(
  content: Record<string, unknown>,
  normalizedContent: TrainingPlanContent,
): boolean {
  if (!hasDefinedContentField(content, "baselineBodyweight")) {
    return true;
  }

  if (typeof content.baselineBodyweight !== "number" && content.baselineBodyweight !== null) {
    return false;
  }

  normalizedContent.baselineBodyweight = content.baselineBodyweight;
  return true;
}

function applyDraftStartingLoadSuggestions(
  content: Record<string, unknown>,
  normalizedContent: TrainingPlanContent,
): boolean {
  if (!hasDefinedContentField(content, "startingLoadSuggestions")) {
    return true;
  }

  if (!Array.isArray(content.startingLoadSuggestions)) {
    return false;
  }

  normalizedContent.startingLoadSuggestions =
    content.startingLoadSuggestions as TrainingPlanContent["startingLoadSuggestions"];
  return true;
}

function applyDraftTrainingBlock(
  content: Record<string, unknown>,
  normalizedContent: TrainingPlanContent,
): boolean {
  if (!hasDefinedContentField(content, "trainingBlock")) {
    return true;
  }

  if (!isRecord(content.trainingBlock)) {
    return false;
  }

  normalizedContent.trainingBlock = content.trainingBlock as TrainingPlanContent["trainingBlock"];
  return true;
}

function hasDefinedContentField(
  content: Record<string, unknown>,
  field: keyof TrainingPlanContent,
): boolean {
  return Object.hasOwn(content, field) && content[field] !== undefined;
}

function normalizeDraftWorkoutTemplates(
  workoutTemplates: unknown,
): ReadonlyArray<WorkoutTemplate> | null {
  if (!Array.isArray(workoutTemplates)) {
    return null;
  }

  const normalizedWorkoutTemplates: WorkoutTemplate[] = [];

  for (const workoutTemplate of workoutTemplates) {
    const normalizedWorkoutTemplate = normalizeDraftWorkoutTemplate(workoutTemplate);

    if (!normalizedWorkoutTemplate) {
      return null;
    }

    normalizedWorkoutTemplates.push(normalizedWorkoutTemplate);
  }

  return normalizedWorkoutTemplates;
}

function normalizeDraftWorkoutTemplate(workoutTemplate: unknown): WorkoutTemplate | null {
  if (
    !isRecord(workoutTemplate) ||
    typeof workoutTemplate.id !== "string" ||
    typeof workoutTemplate.label !== "string" ||
    !Array.isArray(workoutTemplate.supersetGroups) ||
    (workoutTemplate.purpose !== undefined &&
      workoutTemplate.purpose !== null &&
      workoutTemplate.purpose !== "strength" &&
      workoutTemplate.purpose !== "custom-focus")
  ) {
    return null;
  }

  return {
    id: workoutTemplate.id,
    label: workoutTemplate.label,
    purpose: normalizeWorkoutTemplatePurpose(workoutTemplate.purpose),
    supersetGroups: workoutTemplate.supersetGroups as WorkoutTemplate["supersetGroups"],
  };
}

/** Renames a Workout Template inside the saved Training Plan Draft. */
export function renameTrainingPlanDraftWorkoutTemplate({
  blueprint,
  label,
  templateId,
  timestamp,
}: RenameTrainingPlanDraftWorkoutTemplateOptions): PlanBlueprint {
  return updateTrainingPlanDraft({
    blueprint,
    timestamp,
    workoutTemplates: blueprint.trainingPlanDraft?.content.workoutTemplates.map((template) =>
      template.id === templateId ? { ...template, label } : template,
    ),
  });
}

/** Moves a Workout Template inside the saved Training Plan Draft. */
export function reorderTrainingPlanDraftWorkoutTemplate({
  blueprint,
  targetIndex,
  templateId,
  timestamp,
}: ReorderTrainingPlanDraftWorkoutTemplateOptions): PlanBlueprint {
  const workoutTemplates = blueprint.trainingPlanDraft?.content.workoutTemplates;

  if (!workoutTemplates) {
    return blueprint;
  }

  const currentIndex = workoutTemplates.findIndex((template) => template.id === templateId);

  if (currentIndex === -1 || targetIndex < 0 || targetIndex >= workoutTemplates.length) {
    return blueprint;
  }

  const reorderedTemplates = [...workoutTemplates];
  const [movedTemplate] = reorderedTemplates.splice(currentIndex, 1);

  if (!movedTemplate) {
    return blueprint;
  }

  reorderedTemplates.splice(targetIndex, 0, movedTemplate);

  return updateTrainingPlanDraft({
    blueprint,
    timestamp,
    workoutTemplates: reorderedTemplates,
  });
}

/** Updates the purpose of a Workout Template inside the saved Training Plan Draft. */
export function updateTrainingPlanDraftWorkoutTemplatePurpose({
  blueprint,
  purpose,
  templateId,
  timestamp,
}: UpdateTrainingPlanDraftWorkoutTemplatePurposeOptions): PlanBlueprint {
  return updateTrainingPlanDraft({
    blueprint,
    timestamp,
    workoutTemplates: blueprint.trainingPlanDraft?.content.workoutTemplates.map((template) =>
      template.id === templateId ? { ...template, purpose } : template,
    ),
  });
}

/** Replaces a draft Workout Template with an empty custom-focus template. */
export function replaceTrainingPlanDraftWorkoutTemplateWithCustomFocus({
  blueprint,
  templateId,
  timestamp,
}: ReplaceTrainingPlanDraftWorkoutTemplateWithCustomFocusOptions): PlanBlueprint {
  return updateTrainingPlanDraft({
    blueprint,
    timestamp,
    workoutTemplates: blueprint.trainingPlanDraft?.content.workoutTemplates.map((template) =>
      template.id === templateId
        ? {
            ...template,
            label: `${template.label} Cardio Focus`,
            purpose: "custom-focus",
            supersetGroups: [],
          }
        : template,
    ),
  });
}

/** Adds an empty Superset Group to a draft Workout Template. */
export function addTrainingPlanDraftSupersetGroup({
  blueprint,
  groupId,
  targetIndex,
  templateId,
  timestamp,
}: AddTrainingPlanDraftSupersetGroupOptions): PlanBlueprint {
  return updateTrainingPlanDraftTemplate({
    blueprint,
    templateId,
    timestamp,
    updateTemplate: (template) => {
      if (targetIndex < 0 || targetIndex > template.supersetGroups.length) {
        return template;
      }

      const nextGroupIndex = targetIndex + 1;
      const supersetGroups = [...template.supersetGroups];
      supersetGroups.splice(targetIndex, 0, {
        id: groupId,
        slots: [],
        title: `Superset Group ${nextGroupIndex}`,
        type: "superset",
      });

      return { ...template, supersetGroups };
    },
  });
}

/** Renames a Superset Group in a draft Workout Template. */
export function renameTrainingPlanDraftSupersetGroup({
  blueprint,
  groupId,
  templateId,
  timestamp,
  title,
}: RenameTrainingPlanDraftSupersetGroupOptions): PlanBlueprint {
  return updateTrainingPlanDraftTemplate({
    blueprint,
    templateId,
    timestamp,
    updateTemplate: (template) => ({
      ...template,
      supersetGroups: template.supersetGroups.map((group) =>
        group.id === groupId ? { ...group, title } : group,
      ),
    }),
  });
}

/** Deletes an empty Superset Group from a draft Workout Template when structure remains valid. */
export function deleteTrainingPlanDraftSupersetGroup({
  blueprint,
  groupId,
  templateId,
  timestamp,
}: DeleteTrainingPlanDraftSupersetGroupOptions): PlanBlueprint {
  return updateTrainingPlanDraftTemplate({
    blueprint,
    templateId,
    timestamp,
    updateTemplate: (template) => {
      const group = template.supersetGroups.find((candidate) => candidate.id === groupId);
      const deletesLastRequiredStrengthGroup =
        template.purpose === "strength" && template.supersetGroups.length === 1;

      if (!group || group.slots.length > 0 || deletesLastRequiredStrengthGroup) {
        return template;
      }

      return {
        ...template,
        supersetGroups: template.supersetGroups.filter((candidate) => candidate.id !== groupId),
      };
    },
  });
}

/** Reorders Superset Groups within a draft Workout Template. */
export function reorderTrainingPlanDraftSupersetGroup({
  blueprint,
  groupId,
  targetIndex,
  templateId,
  timestamp,
}: ReorderTrainingPlanDraftSupersetGroupOptions): PlanBlueprint {
  return updateTrainingPlanDraftTemplate({
    blueprint,
    templateId,
    timestamp,
    updateTemplate: (template) => {
      const currentIndex = template.supersetGroups.findIndex((group) => group.id === groupId);

      if (currentIndex === -1 || targetIndex < 0 || targetIndex >= template.supersetGroups.length) {
        return template;
      }

      const supersetGroups = [...template.supersetGroups];
      const [movedGroup] = supersetGroups.splice(currentIndex, 1);

      if (!movedGroup) {
        return template;
      }

      supersetGroups.splice(targetIndex, 0, movedGroup);

      return { ...template, supersetGroups };
    },
  });
}

/** Moves an exercise slot between Superset Groups in a draft Workout Template. */
export function moveTrainingPlanDraftSlotToSupersetGroup({
  blueprint,
  sourceGroupId,
  slotIndex,
  targetGroupId,
  targetSlotIndex,
  templateId,
  timestamp,
}: MoveTrainingPlanDraftSlotToSupersetGroupOptions): PlanBlueprint {
  return updateTrainingPlanDraftTemplate({
    blueprint,
    templateId,
    timestamp,
    updateTemplate: (template) =>
      moveSlotBetweenDraftSupersetGroups({
        sourceGroupId,
        slotIndex,
        targetGroupId,
        targetSlotIndex,
        template,
      }),
  });
}

function moveSlotBetweenDraftSupersetGroups({
  sourceGroupId,
  slotIndex,
  targetGroupId,
  targetSlotIndex,
  template,
}: {
  sourceGroupId: string;
  slotIndex: number;
  targetGroupId: string;
  targetSlotIndex: number;
  template: WorkoutTemplate;
}): WorkoutTemplate {
  const moveContext = getDraftSlotMoveContext({
    sourceGroupId,
    slotIndex,
    targetGroupId,
    targetSlotIndex,
    template,
  });

  if (!moveContext) {
    return template;
  }

  const supersetGroups = cloneDraftSupersetGroups(template);
  const adjustedTargetIndex = getAdjustedTargetSlotIndex({
    sourceGroupId,
    slotIndex,
    targetGroupId,
    targetSlotIndex,
  });

  supersetGroups[moveContext.sourceGroupIndex]?.slots.splice(slotIndex, 1);
  supersetGroups[moveContext.targetGroupIndex]?.slots.splice(
    adjustedTargetIndex,
    0,
    moveContext.movedSlot,
  );

  return { ...template, supersetGroups };
}

function getDraftSlotMoveContext({
  sourceGroupId,
  slotIndex,
  targetGroupId,
  targetSlotIndex,
  template,
}: {
  sourceGroupId: string;
  slotIndex: number;
  targetGroupId: string;
  targetSlotIndex: number;
  template: WorkoutTemplate;
}) {
  const sourceGroupIndex = template.supersetGroups.findIndex((group) => group.id === sourceGroupId);
  const targetGroupIndex = template.supersetGroups.findIndex((group) => group.id === targetGroupId);
  const sourceGroup = template.supersetGroups[sourceGroupIndex];
  const targetGroup = template.supersetGroups[targetGroupIndex];

  if (!sourceGroup || !targetGroup) {
    return null;
  }

  if (!hasValidDraftSlotMoveIndexes({ slotIndex, sourceGroup, targetGroup, targetSlotIndex })) {
    return null;
  }

  const movedSlot = sourceGroup.slots[slotIndex];

  return movedSlot ? { movedSlot, sourceGroupIndex, targetGroupIndex } : null;
}

function hasValidDraftSlotMoveIndexes({
  slotIndex,
  sourceGroup,
  targetGroup,
  targetSlotIndex,
}: {
  slotIndex: number;
  sourceGroup: WorkoutTemplate["supersetGroups"][number];
  targetGroup: WorkoutTemplate["supersetGroups"][number];
  targetSlotIndex: number;
}) {
  return (
    slotIndex >= 0 &&
    slotIndex < sourceGroup.slots.length &&
    targetSlotIndex >= 0 &&
    targetSlotIndex <= targetGroup.slots.length
  );
}

function cloneDraftSupersetGroups(template: WorkoutTemplate) {
  return template.supersetGroups.map((group) => ({
    ...group,
    slots: [...group.slots],
  }));
}

function getAdjustedTargetSlotIndex({
  sourceGroupId,
  slotIndex,
  targetGroupId,
  targetSlotIndex,
}: {
  sourceGroupId: string;
  slotIndex: number;
  targetGroupId: string;
  targetSlotIndex: number;
}) {
  return sourceGroupId === targetGroupId && slotIndex < targetSlotIndex
    ? targetSlotIndex - 1
    : targetSlotIndex;
}

function updateTrainingPlanDraft({
  blueprint,
  timestamp,
  workoutTemplates,
}: UpdateTrainingPlanDraftOptions): PlanBlueprint {
  if (!blueprint.trainingPlanDraft || !workoutTemplates) {
    return blueprint;
  }

  const content = {
    ...blueprint.trainingPlanDraft.content,
    workoutTemplates,
  };

  return {
    ...blueprint,
    trainingPlanDraft: {
      ...blueprint.trainingPlanDraft,
      content,
      isStale: blueprint.trainingPlanDraft.isStale === true,
      validation: validateTrainingPlanDraftContent({ content }),
    },
    updatedAt: timestamp,
  };
}

function updateTrainingPlanDraftTemplate({
  blueprint,
  templateId,
  timestamp,
  updateTemplate,
}: {
  blueprint: PlanBlueprint;
  templateId: string;
  timestamp: string;
  updateTemplate: (template: WorkoutTemplate) => WorkoutTemplate;
}): PlanBlueprint {
  return updateTrainingPlanDraft({
    blueprint,
    timestamp,
    workoutTemplates: blueprint.trainingPlanDraft?.content.workoutTemplates.map((template) =>
      template.id === templateId ? updateTemplate(template) : template,
    ),
  });
}

function isRecord(candidate: unknown): candidate is Record<string, unknown> {
  return typeof candidate === "object" && candidate !== null;
}

function normalizeWorkoutTemplatePurpose(purpose: unknown): WorkoutTemplatePurpose {
  return purpose === "custom-focus" ? "custom-focus" : "strength";
}

function isPositiveInteger(candidate: unknown): candidate is number {
  return typeof candidate === "number" && Number.isInteger(candidate) && candidate > 0;
}
