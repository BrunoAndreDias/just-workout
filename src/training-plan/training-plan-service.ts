import type { TrainingPlan } from "./training-plan";
import { generateActiveTrainingPlanFromCurrentPlanBlueprint } from "./training-plan-generation";
import {
  getTrainingPlan,
  getTrainingPlans,
  getTrainingSessionsForPlan,
  saveAcceptedTrainingPlan as saveAcceptedTrainingPlanRecord,
  saveCompletedTrainingSession,
  saveHistoricalTrainingSessionBodyweight,
  saveTrainingPlanBaselineBodyweight,
  saveTrainingWeekBodyweight as saveTrainingWeekBodyweightRecord,
} from "./training-plan-repository";
import {
  createCompletedTrainingSession,
  type TrainingSessionBodyweightSource,
  type TrainingSessionExerciseEntry,
} from "./training-session";

async function generateTrainingPlan() {
  return generateActiveTrainingPlanFromCurrentPlanBlueprint();
}

async function completeTrainingSession({
  entries,
  planId,
  sessionBodyweight,
  sessionBodyweightSource,
  templateId,
}: {
  entries: ReadonlyArray<TrainingSessionExerciseEntry>;
  planId: string;
  sessionBodyweight?: number | null;
  sessionBodyweightSource?: TrainingSessionBodyweightSource | null;
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
  const trainingSession = createCompletedTrainingSession({
    entries,
    id: crypto.randomUUID(),
    plan: trainingPlan,
    sessionBodyweight,
    sessionBodyweightSource,
    template: workoutTemplate,
    timestamp,
  });

  return saveCompletedTrainingSession(trainingSession);
}

async function saveAcceptedTrainingPlan(trainingPlan: TrainingPlan) {
  return saveAcceptedTrainingPlanRecord(trainingPlan);
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
  saveBaselineBodyweight,
  saveAcceptedTrainingPlan,
  saveHistoricalBodyweightCorrection,
  saveTrainingWeekBodyweight,
};
