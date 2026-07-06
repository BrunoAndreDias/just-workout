import type { TrainingPlan, TrainingPlanDraftSetupUpdate } from "./training-plan";
import {
  acceptTrainingPlanDraftFromCurrentPlanBlueprint,
  generateActiveTrainingPlanFromCurrentPlanBlueprint,
  generateTrainingPlanDraftFromCurrentPlanBlueprint,
  resetTrainingPlanDraftFromCurrentPlanBlueprint,
  saveTrainingPlanDraftSetupFromCurrentPlanBlueprint,
} from "./training-plan-generation";
import {
  clearUndoableTrainingBlockTransition as clearUndoableTrainingBlockTransitionRecord,
  getTrainingPlan,
  getTrainingPlans,
  getTrainingSessionsForPlan,
  saveAcceptedTrainingPlan as saveAcceptedTrainingPlanRecord,
  saveCompletedTrainingSession,
  saveHistoricalTrainingSessionBodyweight,
  saveTrainingPlanBaselineBodyweight,
  saveTrainingPlan as saveTrainingPlanRecord,
  saveTrainingWeekBodyweight as saveTrainingWeekBodyweightRecord,
  undoAcceptedTrainingBlockTransition as undoAcceptedTrainingBlockTransitionRecord,
} from "./training-plan-repository";
import {
  createCompletedTrainingSession,
  type TrainingSessionBodyweight,
  type TrainingSessionExerciseEntry,
  type TrainingSessionIntent,
} from "./training-session";
import { resolveRequestedTrainingSessionIntent } from "./training-session-sequencing";

async function generateTrainingPlan() {
  return generateActiveTrainingPlanFromCurrentPlanBlueprint();
}

async function generateTrainingPlanDraft() {
  return generateTrainingPlanDraftFromCurrentPlanBlueprint();
}

async function acceptTrainingPlanDraft() {
  return acceptTrainingPlanDraftFromCurrentPlanBlueprint();
}

async function saveTrainingPlanDraftSetup(update: TrainingPlanDraftSetupUpdate) {
  return saveTrainingPlanDraftSetupFromCurrentPlanBlueprint({ update });
}

async function resetTrainingPlanDraft() {
  return resetTrainingPlanDraftFromCurrentPlanBlueprint();
}

async function completeTrainingSession({
  entries,
  planId,
  sessionIntent,
  sessionBodyweight,
  templateId,
}: {
  entries: ReadonlyArray<TrainingSessionExerciseEntry>;
  planId: string;
  sessionIntent?: TrainingSessionIntent;
  sessionBodyweight?: TrainingSessionBodyweight | null;
  templateId: string;
}) {
  const trainingPlan = await getTrainingPlan(planId);

  if (!trainingPlan) {
    throw new Error("Cannot complete a Training Session without a Training Plan.");
  }

  const workoutTemplate = trainingPlan.workoutTemplates.find(
    (template) => template.id === templateId,
  );

  if (!workoutTemplate) {
    throw new Error("Cannot complete a Training Session without a Workout Template.");
  }

  const timestamp = new Date().toISOString();
  const trainingSessions = await getTrainingSessionsForPlan(planId);
  const trainingSession = createCompletedTrainingSession({
    entries,
    id: crypto.randomUUID(),
    plan: trainingPlan,
    sessionIntent: resolveRequestedTrainingSessionIntent({
      now: new Date(timestamp),
      requestedIntent: sessionIntent,
      trainingPlan,
      trainingSessions,
    }),
    sessionBodyweight,
    template: workoutTemplate,
    timestamp,
  });

  return saveCompletedTrainingSession(trainingSession);
}

async function saveAcceptedTrainingPlan(trainingPlan: TrainingPlan) {
  return saveAcceptedTrainingPlanRecord(trainingPlan);
}

async function saveTrainingPlan(trainingPlan: TrainingPlan) {
  return saveTrainingPlanRecord(trainingPlan);
}

async function undoAcceptedTrainingBlockTransition({ planId }: { planId: string }) {
  return undoAcceptedTrainingBlockTransitionRecord({
    planId,
    timestamp: new Date().toISOString(),
  });
}

async function clearUndoableTrainingBlockTransition({ planId }: { planId: string }) {
  return clearUndoableTrainingBlockTransitionRecord({
    planId,
    timestamp: new Date().toISOString(),
  });
}

async function saveBaselineBodyweight({
  bodyweight,
  planId,
}: {
  bodyweight: number;
  planId: string;
}) {
  return saveTrainingPlanBaselineBodyweight({
    bodyweight,
    planId,
    timestamp: new Date().toISOString(),
  });
}

async function saveTrainingWeekBodyweight({
  bodyweight,
  planId,
}: {
  bodyweight: number;
  planId: string;
}) {
  const timestamp = new Date().toISOString();

  return saveTrainingWeekBodyweightRecord({
    bodyweight,
    planId,
    referenceDate: timestamp,
    timestamp,
  });
}

async function saveHistoricalBodyweightCorrection({
  bodyweight,
  sessionId,
}: {
  bodyweight: number;
  sessionId: string;
}) {
  return saveHistoricalTrainingSessionBodyweight({
    bodyweight,
    sessionId,
    timestamp: new Date().toISOString(),
  });
}

export const trainingPlanService = {
  completeTrainingSession,
  generateTrainingPlan,
  getTrainingPlan,
  getTrainingPlans,
  getTrainingSessionsForPlan,
  clearUndoableTrainingBlockTransition,
  saveBaselineBodyweight,
  acceptTrainingPlanDraft,
  saveTrainingPlanDraftSetup,
  resetTrainingPlanDraft,
  saveAcceptedTrainingPlan,
  saveTrainingPlan,
  generateTrainingPlanDraft,
  saveHistoricalBodyweightCorrection,
  saveTrainingWeekBodyweight,
  undoAcceptedTrainingBlockTransition,
};
