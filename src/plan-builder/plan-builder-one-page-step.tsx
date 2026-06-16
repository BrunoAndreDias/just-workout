import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { PlanBuilderStep } from "./components/plan-builder-config";
import {
  useInitializeTrainingVolumeMutation,
  useUpdateRepRangeStyleMutation,
} from "./components/plan-builder-mutations";
import {
  defaultRepRangeStyleId,
  getRepRangeStyle,
  getValidRepRangeStyleId,
  type PlanBlueprint,
  type PlanBlueprintDefaultResolution,
  type PlanBlueprintSummary,
} from "./plan-blueprint";
import { hasCompatibleSelectedTrainingSplit } from "./plan-builder-one-page-overview";
import {
  useOnePageExercisesStep,
  useOnePageGenerateStep,
  useOnePageRepRangeStep,
  useOnePageTrainingScheduleStep,
  useOnePageVolumeStep,
  useRepRangeDefaultSelection,
  useTrainingVolumeDefaultSelection,
} from "./plan-builder-one-page-step-adapters";
import {
  ExerciseFoundationSetupState,
  OnePageExercisesStep,
  OnePageRepRangeStep,
  OnePageTrainingScheduleStep,
  OnePageVolumeStep,
} from "./plan-builder-one-page-step-panels";
import { GenerateTrainingPlanStep } from "./steps/generate-training-plan-step";
import { getRecommendedTrainingSplitId, type TrainingSplitId } from "./training-split";
import { isTrainingVolumeConfiguration, type TrainingVolumeConfiguration } from "./training-volume";
import "./plan-builder-one-page-step.css";

export function PlanBuilderOnePageStepContent({
  activeStep,
  blueprint,
  setActiveStep,
  summary,
}: {
  activeStep: PlanBuilderStep;
  blueprint: PlanBlueprint | undefined;
  setActiveStep: (step: PlanBuilderStep) => void;
  summary: PlanBlueprintSummary | null;
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
    />
  );
}

function PlanBuilderOnePageUnlockedStep({
  activeStep,
  blueprint,
  setActiveStep,
  summary,
}: {
  activeStep: PlanBuilderStep;
  blueprint: PlanBlueprint;
  setActiveStep: (step: PlanBuilderStep) => void;
  summary: PlanBlueprintSummary;
}) {
  const navigate = useNavigate();
  const { mutate: updateRepRangeStyle } = useUpdateRepRangeStyleMutation();
  const { mutate: initializeTrainingVolumeDefaults } = useInitializeTrainingVolumeMutation();
  const savedRepRangeStyleId = getValidRepRangeStyleId(blueprint.repRanges);
  const selectedRepRangeStyleId = savedRepRangeStyleId ?? defaultRepRangeStyleId;
  const selectedRepRangeStyle = getRepRangeStyle(selectedRepRangeStyleId);
  const trainingVolumeConfiguration = isTrainingVolumeConfiguration(blueprint) ? blueprint : null;
  const [pendingDefaultResolution, setPendingDefaultResolution] =
    useState<PlanBlueprintDefaultResolution | null>(null);
  const frequencyStep = useOnePageTrainingScheduleStep({
    blueprint,
    getVisibleTrainingSplitId,
    setActiveStep,
  });
  const repRangeStep = useOnePageRepRangeStep({ selectedRepRangeStyleId, setActiveStep });
  const volumeStep = useOnePageVolumeStep({ setActiveStep, trainingVolumeConfiguration });
  const exercisesStep = useOnePageExercisesStep({ setActiveStep });
  const generateStep = useOnePageGenerateStep({
    blueprint,
    navigate,
    onPendingDefaultResolutionChange: setPendingDefaultResolution,
  });

  useRepRangeDefaultSelection({
    activeStep,
    savedRepRangeStyleId,
    updateRepRangeStyle,
  });
  useTrainingVolumeDefaultSelection({
    activeStep,
    initializeTrainingVolumeDefaults,
    trainingVolumeConfiguration,
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
    savedRepRangeStyleId,
    setActiveStep,
    summary,
    trainingVolumeConfiguration,
    volumeStep,
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
  savedRepRangeStyleId,
  setActiveStep,
  summary,
  trainingVolumeConfiguration,
  volumeStep,
}: {
  activeStep: PlanBuilderStep;
  blueprint: PlanBlueprint;
  exercisesStep: ReturnType<typeof useOnePageExercisesStep>;
  frequencyStep: ReturnType<typeof useOnePageTrainingScheduleStep>;
  generateStep: ReturnType<typeof useOnePageGenerateStep>;
  pendingDefaultResolution: PlanBlueprintDefaultResolution | null;
  repRangeStep: ReturnType<typeof useOnePageRepRangeStep>;
  selectedRepRangeStyle: ReturnType<typeof getRepRangeStyle>;
  savedRepRangeStyleId: ReturnType<typeof getValidRepRangeStyleId>;
  setActiveStep: (step: PlanBuilderStep) => void;
  summary: PlanBlueprintSummary;
  trainingVolumeConfiguration: TrainingVolumeConfiguration | null;
  volumeStep: ReturnType<typeof useOnePageVolumeStep>;
}) {
  switch (activeStep) {
    case "frequency":
      return (
        <OnePageTrainingScheduleStep
          blueprint={blueprint}
          getVisibleTrainingSplitId={getVisibleTrainingSplitId}
          {...frequencyStep}
        />
      );
    case "rep-ranges":
      return (
        <OnePageRepRangeStep
          onBackToTrainingSchedule={() => setActiveStep("frequency")}
          savedRepRangeStyleId={savedRepRangeStyleId}
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
      const requiresTrainingSchedule = !hasCompatibleSelectedTrainingSplit(blueprint);
      const requiresVolume = !trainingVolumeConfiguration;

      if (requiresTrainingSchedule || requiresVolume) {
        return (
          <ExerciseFoundationSetupState
            onOpenTrainingSchedule={() => setActiveStep("frequency")}
            onOpenVolume={() => setActiveStep("volume")}
            requiresTrainingSchedule={requiresTrainingSchedule}
            requiresVolume={requiresVolume}
          />
        );
      }

      return (
        <OnePageExercisesStep
          blueprint={blueprint}
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

function getVisibleTrainingSplitId(blueprint: PlanBlueprint): TrainingSplitId {
  if (hasCompatibleSelectedTrainingSplit(blueprint)) {
    return blueprint.split;
  }

  return getRecommendedTrainingSplitId(blueprint.trainingFrequencyDaysPerWeek);
}
