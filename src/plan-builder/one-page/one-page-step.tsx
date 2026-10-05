import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { PlanBuilderStep } from "../builder-state/plan-builder-config";
import {
  useInitializeTrainingVolumeMutation,
  useUpdateRepRangeStyleMutation,
  useUpdateTrainingSplitMutation,
} from "../builder-state/plan-builder-mutations";
import {
  getRepRangeStyle,
  type PlanBlueprint,
  type PlanBlueprintDefaultResolution,
  type PlanBlueprintSummary,
} from "../plan-blueprint";
import type { PlanBuilderWorkflow } from "../plan-builder-workflow";
import {
  PlanBuilderStepFooter,
  PlanBuilderStepLayout,
} from "../shared-ui/step-layout/plan-builder-step-layout";
import { GenerateTrainingPlanStep } from "../steps/generate-training-plan/generate-training-plan-step";
import { planBuilderOnePageSections } from "./one-page-overview";
import {
  useOnePageExercisesStep,
  useOnePageGenerateStep,
  useOnePageRepRangeStep,
  useOnePageTrainingScheduleStep,
  useOnePageVolumeStep,
  useRepRangeDefaultSelection,
  useTrainingSplitDefaultSelection,
  useTrainingVolumeDefaultSelection,
} from "./one-page-step-adapters";
import {
  OnePageExercisesStep,
  OnePageRepRangeStep,
  OnePageTrainingScheduleStep,
  OnePageVolumeStep,
} from "./one-page-step-panels";
import { getPlanBuilderChoiceValue } from "./plan-builder-choice-values";

type PlanBuilderStepNavigation = {
  onCloseStep: () => void;
  onOpenStep: (step: PlanBuilderStep) => void;
};

const planBuilderChoiceStepCopy = {
  frequency: {
    title: "How many days can you train per week?",
    description:
      "Pick your days, then a split that fits them. The Recommended split is a good place to start.",
    next: { step: "rep-ranges", label: "Rep ranges" },
  },
  "rep-ranges": {
    title: "How many reps per set?",
    description:
      "Sets the rep range for each kind of exercise, from heavy main lifts to lighter accessories.",
    next: { step: "volume", label: "Volume" },
  },
  volume: {
    title: "How much weekly work do you want?",
    description:
      "More volume means more reps for each muscle every week, and more recovery between sessions.",
    next: { step: "exercises", label: "Exercises" },
  },
  exercises: {
    title: "Which exercises do you want?",
    description:
      "Every movement already has a recommended exercise. Change any you like, or keep ours.",
    next: { step: "generate", label: "Generate" },
  },
} as const satisfies Record<
  Exclude<PlanBuilderStep, "generate">,
  {
    description: string;
    next: { label: string; step: PlanBuilderStep };
    title: string;
  }
>;

export function PlanBuilderOnePageStepContent({
  activeStep,
  blueprint,
  navigation,
  summary,
  workflow,
}: {
  activeStep: PlanBuilderStep;
  blueprint: PlanBlueprint | undefined;
  navigation: PlanBuilderStepNavigation;
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
      navigation={navigation}
      summary={summary}
      workflow={workflow}
    />
  );
}

function PlanBuilderOnePageUnlockedStep({
  activeStep,
  blueprint,
  navigation,
  summary,
  workflow,
}: {
  activeStep: PlanBuilderStep;
  blueprint: PlanBlueprint;
  navigation: PlanBuilderStepNavigation;
  summary: PlanBlueprintSummary;
  workflow: PlanBuilderWorkflow;
}) {
  const navigate = useNavigate();
  const { mutate: updateRepRangeStyle } = useUpdateRepRangeStyleMutation();
  const { mutate: initializeTrainingVolumeDefaults } = useInitializeTrainingVolumeMutation();
  const { mutate: updateTrainingSplit } = useUpdateTrainingSplitMutation();
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
  useTrainingSplitDefaultSelection({
    defaultTrainingSplitId: visibleTrainingSplitId,
    shouldSelectDefaultTrainingSplit: workflow.defaultEntryActions.shouldSelectDefaultTrainingSplit,
    updateTrainingSplit,
  });

  const stepBody = renderOnePageActiveStep({
    activeStep,
    blueprint,
    navigation,
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

  if (activeStep === "generate") {
    return stepBody;
  }

  const stepCopy = planBuilderChoiceStepCopy[activeStep];

  return (
    <PlanBuilderStepLayout
      className={`pb-step--${activeStep}`}
      description={stepCopy.description}
      footer={
        <PlanBuilderStepFooter
          back={{ label: "Overview", onClick: navigation.onCloseStep }}
          next={{
            label: `Next: ${stepCopy.next.label}`,
            onClick: () => navigation.onOpenStep(stepCopy.next.step),
          }}
          status="Changes save automatically"
        />
      }
      title={stepCopy.title}
    >
      {stepBody}
    </PlanBuilderStepLayout>
  );
}

function renderOnePageActiveStep({
  activeStep,
  blueprint,
  navigation,
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
  navigation: PlanBuilderStepNavigation;
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
          choiceSummaries={planBuilderOnePageSections
            .filter((section) => section.id !== "generate")
            .map((section) => {
              const isConfigured = workflow.sectionStatuses[section.id]?.isComplete === true;

              return {
                isConfigured,
                step: section.id,
                title: section.title,
                value: getPlanBuilderChoiceValue({
                  blueprint,
                  isConfigured,
                  sectionId: section.id,
                  summary,
                }),
              };
            })}
          draftActions={{
            addDraftSlot: generateStep.onAddDraftSlot,
            acceptDraft: generateStep.onAcceptDraft,
            addSupersetGroup: generateStep.onAddSupersetGroup,
            deleteDraftSlot: generateStep.onDeleteDraftSlot,
            deleteSupersetGroup: generateStep.onDeleteSupersetGroup,
            discardDraft: generateStep.onDiscardDraft,
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
          onEditStep={navigation.onOpenStep}
          onGenerateTrainingPlan={generateStep.onGenerateTrainingPlan}
          pendingDraftAction={generateStep.pendingDraftAction}
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
