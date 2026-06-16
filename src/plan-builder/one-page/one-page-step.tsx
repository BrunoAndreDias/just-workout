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
import type { TrainingVolumeConfiguration } from "../training-volume";
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
  ExerciseFoundationSetupState,
  OnePageExercisesStep,
  OnePageRepRangeStep,
  OnePageTrainingScheduleStep,
  OnePageVolumeStep,
} from "./one-page-step-panels";
import "./one-page-step.css";

export function PlanBuilderOnePageStepContent({
  activeStep,
  blueprint,
  setActiveStep,
  summary,
  workflow,
}: {
  activeStep: PlanBuilderStep;
  blueprint: PlanBlueprint | undefined;
  setActiveStep: (step: PlanBuilderStep) => void;
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
      setActiveStep={setActiveStep}
      summary={summary}
      workflow={workflow}
    />
  );
}

function PlanBuilderOnePageUnlockedStep({
  activeStep,
  blueprint,
  setActiveStep,
  summary,
  workflow,
}: {
  activeStep: PlanBuilderStep;
  blueprint: PlanBlueprint;
  setActiveStep: (step: PlanBuilderStep) => void;
  summary: PlanBlueprintSummary;
  workflow: PlanBuilderWorkflow;
}) {
  const navigate = useNavigate();
  const { mutate: updateRepRangeStyle } = useUpdateRepRangeStyleMutation();
  const { mutate: initializeTrainingVolumeDefaults } = useInitializeTrainingVolumeMutation();
  const selectedRepRangeStyle = getRepRangeStyle(workflow.selectedRepRangeStyleId);
  const trainingVolumeConfiguration = workflow.trainingVolumeConfiguration;
  const visibleTrainingSplitId = workflow.visibleTrainingSplitId;
  const [pendingDefaultResolution, setPendingDefaultResolution] =
    useState<PlanBlueprintDefaultResolution | null>(null);

  const frequencyStep = useOnePageTrainingScheduleStep({
    blueprint,
    selectedTrainingSplitId: visibleTrainingSplitId,
    setActiveStep,
  });
  const repRangeStep = useOnePageRepRangeStep({
    selectedRepRangeStyleId: workflow.selectedRepRangeStyleId,
    setActiveStep,
  });
  const volumeStep = useOnePageVolumeStep({ setActiveStep, trainingVolumeConfiguration });
  const exercisesStep = useOnePageExercisesStep({ setActiveStep });
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
    setActiveStep,
    summary,
    trainingVolumeConfiguration,
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
  setActiveStep,
  summary,
  trainingVolumeConfiguration,
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
  setActiveStep: (step: PlanBuilderStep) => void;
  summary: PlanBlueprintSummary;
  trainingVolumeConfiguration: TrainingVolumeConfiguration | null;
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
          onBackToTrainingSchedule={() => setActiveStep("frequency")}
          savedRepRangeStyleId={workflow.savedRepRangeStyleId}
          selectedRepRangeStyle={selectedRepRangeStyle}
          {...repRangeStep}
        />
      );
    case "volume":
      return (
        <OnePageVolumeStep
          blueprint={blueprint}
          onBackToRepRanges={() => setActiveStep("rep-ranges")}
          repRangeStyle={selectedRepRangeStyle}
          trainingVolumeConfiguration={trainingVolumeConfiguration}
          {...volumeStep}
        />
      );
    case "exercises": {
      const configuredBlueprint = workflow.exerciseSetup.configuredBlueprint;

      if (!configuredBlueprint || !trainingVolumeConfiguration) {
        return (
          <ExerciseFoundationSetupState
            onOpenTrainingSchedule={() => setActiveStep("frequency")}
            onOpenVolume={() => setActiveStep("volume")}
            requiresTrainingSchedule={workflow.exerciseSetup.requiresTrainingSchedule}
            requiresVolume={workflow.exerciseSetup.requiresVolume}
          />
        );
      }

      return (
        <OnePageExercisesStep
          blueprint={configuredBlueprint}
          onBackToVolume={() => setActiveStep("volume")}
          trainingVolumeConfiguration={trainingVolumeConfiguration}
          {...exercisesStep}
        />
      );
    }
    case "generate":
      return (
        <GenerateTrainingPlanStep
          isGenerating={generateStep.isGenerating}
          onBackToExercises={() => setActiveStep("exercises")}
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
        />
      );
  }

  return null;
}
