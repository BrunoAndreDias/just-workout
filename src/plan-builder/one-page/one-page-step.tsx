import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { PlanBuilderStep } from "../builder-state/plan-builder-config";
import {
  useInitializeTrainingVolumeMutation,
  useUpdateRepRangeStyleMutation,
} from "../builder-state/plan-builder-mutations";
import {
  getRepRangeStyle,
  type PlanBlueprint,
  type PlanBlueprintDefaultResolution,
  type PlanBlueprintSummary,
} from "../plan-blueprint";
import type { PlanBuilderWorkflow } from "../plan-builder-workflow";
import { GenerateTrainingPlanStep } from "../steps/generate-training-plan/generate-training-plan-step";
import {
  useOnePageExercisesStep,
  useOnePageGenerateStep,
  useOnePageRepRangeStep,
  useOnePageTrainingScheduleStep,
  useOnePageVolumeStep,
  useRepRangeDefaultSelection,
  useTrainingVolumeDefaultSelection,
} from "./one-page-step-adapters";
import {
  OnePageExercisesStep,
  OnePageRepRangeStep,
  OnePageTrainingScheduleStep,
  OnePageVolumeStep,
} from "./one-page-step-panels";
import "./one-page-step.css";

export function PlanBuilderOnePageStepContent({
  activeStep,
  blueprint,
  summary,
  workflow,
}: {
  activeStep: PlanBuilderStep;
  blueprint: PlanBlueprint | undefined;
  summary: PlanBlueprintSummary | null;
  workflow: PlanBuilderWorkflow;
}) {
  if (!blueprint || !summary) {
    return <p className="plan-builder-one-page__loading">Loading Plan Blueprint...</p>;
  }

  return (
    <PlanBuilderOnePageUnlockedStep
      activeStep={activeStep}
      blueprint={blueprint}
      summary={summary}
      workflow={workflow}
    />
  );
}

function PlanBuilderOnePageUnlockedStep({
  activeStep,
  blueprint,
  summary,
  workflow,
}: {
  activeStep: PlanBuilderStep;
  blueprint: PlanBlueprint;
  summary: PlanBlueprintSummary;
  workflow: PlanBuilderWorkflow;
}) {
  const navigate = useNavigate();
  const { mutate: updateRepRangeStyle } = useUpdateRepRangeStyleMutation();
  const { mutate: initializeTrainingVolumeDefaults } = useInitializeTrainingVolumeMutation();
  const selectedRepRangeStyle = getRepRangeStyle(workflow.selectedRepRangeStyleId);
  const visibleTrainingSplitId = workflow.visibleTrainingSplitId;
  const [pendingDefaultResolution, setPendingDefaultResolution] =
    useState<PlanBlueprintDefaultResolution | null>(null);

  const frequencyStep = useOnePageTrainingScheduleStep();
  const repRangeStep = useOnePageRepRangeStep();
  const volumeStep = useOnePageVolumeStep();
  const exercisesStep = useOnePageExercisesStep();
  const generateStep = useOnePageGenerateStep({
    defaultResolution: workflow.generation.defaultResolution,
    navigate,
    onPendingDefaultResolutionChange: setPendingDefaultResolution,
  });

  useRepRangeDefaultSelection({
    defaultRepRangeStyleId: workflow.selectedRepRangeStyleId,
    shouldSelectDefaultRepRangeStyle: workflow.defaultEntryActions.shouldSelectDefaultRepRangeStyle,
    updateRepRangeStyle,
  });
  useTrainingVolumeDefaultSelection({
    initializeTrainingVolumeDefaults,
    shouldInitializeTrainingVolume: workflow.defaultEntryActions.shouldInitializeTrainingVolume,
  });

  return renderOnePageActiveStep({
    activeStep,
    blueprint,
    exercisesStep,
    frequencyStep,
    generateStep,
    pendingDefaultResolution,
    repRangeStep,
    selectedRepRangeStyle,
    summary,
    visibleTrainingSplitId,
    volumeStep,
    workflow,
  });
}

function renderOnePageActiveStep({
  activeStep,
  blueprint,
  exercisesStep,
  frequencyStep,
  generateStep,
  pendingDefaultResolution,
  repRangeStep,
  selectedRepRangeStyle,
  summary,
  visibleTrainingSplitId,
  volumeStep,
  workflow,
}: {
  activeStep: PlanBuilderStep;
  blueprint: PlanBlueprint;
  exercisesStep: ReturnType<typeof useOnePageExercisesStep>;
  frequencyStep: ReturnType<typeof useOnePageTrainingScheduleStep>;
  generateStep: ReturnType<typeof useOnePageGenerateStep>;
  pendingDefaultResolution: PlanBlueprintDefaultResolution | null;
  repRangeStep: ReturnType<typeof useOnePageRepRangeStep>;
  selectedRepRangeStyle: ReturnType<typeof getRepRangeStyle>;
  summary: PlanBlueprintSummary;
  visibleTrainingSplitId: PlanBuilderWorkflow["visibleTrainingSplitId"];
  volumeStep: ReturnType<typeof useOnePageVolumeStep>;
  workflow: PlanBuilderWorkflow;
}) {
  switch (activeStep) {
    case "frequency":
      return (
        <OnePageTrainingScheduleStep
          blueprint={blueprint}
          selectedTrainingSplitId={visibleTrainingSplitId}
          {...frequencyStep}
        />
      );
    case "rep-ranges":
      return (
        <OnePageRepRangeStep
          savedRepRangeStyleId={workflow.savedRepRangeStyleId}
          selectedRepRangeStyle={selectedRepRangeStyle}
          {...repRangeStep}
        />
      );
    case "volume":
      return (
        <OnePageVolumeStep
          blueprint={blueprint}
          repRangeStyle={selectedRepRangeStyle}
          {...volumeStep}
        />
      );
    case "exercises": {
      return <OnePageExercisesStep blueprint={blueprint} {...exercisesStep} />;
    }
    case "generate":
      return (
        <GenerateTrainingPlanStep
          blockingIssues={workflow.generation.defaultResolution?.blockingIssues}
          draftActions={{
            addDraftSlot: generateStep.onAddDraftSlot,
            acceptDraft: generateStep.onAcceptDraft,
            addSupersetGroup: generateStep.onAddSupersetGroup,
            deleteDraftSlot: generateStep.onDeleteDraftSlot,
            deleteSupersetGroup: generateStep.onDeleteSupersetGroup,
            moveWorkoutTemplate: generateStep.onMoveWorkoutTemplate,
            moveDraftSlotToSupersetGroup: generateStep.onMoveDraftSlotToSupersetGroup,
            moveSupersetGroup: generateStep.onMoveSupersetGroup,
            renameWorkoutTemplate: generateStep.onRenameWorkoutTemplate,
            renameSupersetGroup: generateStep.onRenameSupersetGroup,
            reorderDraftSlot: generateStep.onReorderDraftSlot,
            replaceDraftSlotExercise: generateStep.onReplaceDraftSlotExercise,
            replaceWorkoutTemplateWithCustomFocus:
              generateStep.onReplaceWorkoutTemplateWithCustomFocus,
            resetDraft: generateStep.onResetDraft,
            saveDraftSetup: generateStep.onSaveDraftSetup,
            updateDraftSlotTrainingPrescription: generateStep.onUpdateDraftSlotTrainingPrescription,
            setWorkoutTemplatePurpose: generateStep.onSetWorkoutTemplatePurpose,
          }}
          generationInputs={{
            blueprint,
            onOptionalVolumeTargetToggle: volumeStep.onOptionalVolumeTargetToggle,
            onRepRangeStyleChange: repRangeStep.onRepRangeStyleChange,
            onTrainingFrequencyChange: frequencyStep.onTrainingFrequencyChange,
            onTrainingSplitChange: frequencyStep.onTrainingSplitChange,
            onVolumePresetChange: volumeStep.onVolumePresetChange,
            repRangeStyle: selectedRepRangeStyle,
            savedRepRangeStyleId: workflow.savedRepRangeStyleId,
            visibleTrainingSplitId,
          }}
          isGenerating={generateStep.isGenerating}
          onGenerateTrainingPlan={generateStep.onGenerateTrainingPlan}
          recommendedDefaultsConfirmation={
            pendingDefaultResolution
              ? {
                  onAcceptRecommendedDefaults: generateStep.onAcceptRecommendedDefaults,
                  onCancelRecommendedDefaults: generateStep.onCancelRecommendedDefaults,
                  resolution: pendingDefaultResolution,
                }
              : null
          }
          summary={summary}
          trainingPlanDraft={blueprint.trainingPlanDraft}
        />
      );
  }

  return null;
}
