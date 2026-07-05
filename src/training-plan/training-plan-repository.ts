import { db } from "../app/local-database";
import type { TrainingPlan } from "./training-plan";
import type { TrainingSession } from "./training-session";
import {
  getTrainingWeekRangeForReferenceDate,
  isTrainingSessionInWeekRange,
  updateTrainingSessionBodyweight,
  upsertTrainingWeekBodyweightUpdate,
} from "./training-week-bodyweight";

type PersistedTrainingPlan = Omit<TrainingPlan, "baselineBodyweight" | "weeklyBodyweightUpdates"> &
  Partial<Pick<TrainingPlan, "baselineBodyweight" | "weeklyBodyweightUpdates">>;

type PersistedTrainingSession = Omit<
  TrainingSession,
  | "sessionBodyweight"
  | "sessionBodyweightSource"
  | "trainingBlockCycleNumber"
  | "trainingBlockId"
  | "trainingBlockWeekNumber"
> &
  Partial<
    Pick<
      TrainingSession,
      | "sessionBodyweight"
      | "sessionBodyweightSource"
      | "trainingBlockCycleNumber"
      | "trainingBlockId"
      | "trainingBlockWeekNumber"
    >
  >;

type SeedTrainingPlanDataOptions = {
  deactivateActivePlansAt?: string;
  trainingPlans?: ReadonlyArray<TrainingPlan>;
  trainingSessions?: ReadonlyArray<TrainingSession>;
};

export async function getTrainingPlan(trainingPlanId: string): Promise<TrainingPlan | null> {
  const trainingPlan = await db.trainingPlans.get(trainingPlanId);

  return trainingPlan ? normalizeTrainingPlan(trainingPlan) : null;
}

export async function getTrainingPlans(): Promise<ReadonlyArray<TrainingPlan>> {
  const trainingPlans = await db.trainingPlans.toArray();

  return sortTrainingPlansByMostRecentlyUpdated(trainingPlans.map(normalizeTrainingPlan));
}

export async function getActiveTrainingPlans(): Promise<ReadonlyArray<TrainingPlan>> {
  const trainingPlans = await db.trainingPlans.filter((plan) => plan.active).toArray();

  return sortTrainingPlansByMostRecentlyUpdated(trainingPlans.map(normalizeTrainingPlan));
}

export async function getTrainingSessionsForPlan(
  trainingPlanId: string,
): Promise<ReadonlyArray<TrainingSession>> {
  const trainingSessions = await db.trainingSessions
    .where("planId")
    .equals(trainingPlanId)
    .toArray();

  return sortTrainingSessionsByMostRecentlyUpdated(trainingSessions.map(normalizeTrainingSession));
}

export async function saveGeneratedTrainingPlan(trainingPlan: TrainingPlan): Promise<TrainingPlan> {
  const normalizedTrainingPlan = normalizeTrainingPlan(trainingPlan);

  await db.transaction("rw", db.trainingPlans, async () => {
    await deactivateActiveTrainingPlans(normalizedTrainingPlan.generatedAt);
    await db.trainingPlans.put(normalizedTrainingPlan);
  });

  return normalizedTrainingPlan;
}

/**
 * Persists an accepted next Training Block onto the existing Training Plan identity.
 *
 * Unlike generated-plan saves, accepting a next block does not deactivate or clone plans.
 */
export async function saveAcceptedTrainingPlan(trainingPlan: TrainingPlan): Promise<TrainingPlan> {
  const normalizedTrainingPlan = normalizeTrainingPlan(trainingPlan);

  await db.trainingPlans.put(normalizedTrainingPlan);

  return normalizedTrainingPlan;
}

/** Restores the saved pre-acceptance Training Block state while undo is still available. */
export async function undoAcceptedTrainingBlockTransition({
  planId,
  timestamp,
}: {
  planId: string;
  timestamp: string;
}): Promise<TrainingPlan> {
  const trainingPlan = await getTrainingPlan(planId);

  if (!trainingPlan) {
    throw new Error("Cannot undo an accepted Training Block without a Training Plan.");
  }

  const transition = trainingPlan.undoableTrainingBlockTransition;

  if (!transition) {
    throw new Error("Cannot undo a Training Block transition that is no longer available.");
  }

  const restoredTrainingPlan = normalizeTrainingPlan({
    ...trainingPlan,
    generatedAt: transition.previousState.generatedAt,
    startingLoadSuggestions:
      transition.previousState.startingLoadSuggestions.length > 0
        ? transition.previousState.startingLoadSuggestions
        : undefined,
    trainingBlock: transition.previousState.trainingBlock,
    undoableTrainingBlockTransition: null,
    updatedAt: timestamp,
    workoutTemplates: transition.previousState.workoutTemplates,
  });

  await db.trainingPlans.put(restoredTrainingPlan);

  return restoredTrainingPlan;
}

/** Removes the undo marker once the first Training Session in the accepted block has started. */
export async function clearUndoableTrainingBlockTransition({
  planId,
  timestamp,
}: {
  planId: string;
  timestamp: string;
}): Promise<TrainingPlan> {
  const trainingPlan = await getTrainingPlan(planId);

  if (!trainingPlan) {
    throw new Error("Cannot clear Training Block transition state without a Training Plan.");
  }

  if (!trainingPlan.undoableTrainingBlockTransition) {
    return trainingPlan;
  }

  const updatedTrainingPlan = normalizeTrainingPlan({
    ...trainingPlan,
    undoableTrainingBlockTransition: null,
    updatedAt: timestamp,
  });

  await db.trainingPlans.put(updatedTrainingPlan);

  return updatedTrainingPlan;
}

export async function saveTrainingPlanBaselineBodyweight({
  bodyweight,
  planId,
  timestamp,
}: {
  bodyweight: number;
  planId: string;
  timestamp: string;
}): Promise<TrainingPlan> {
  const trainingPlan = await getTrainingPlan(planId);

  if (!trainingPlan) {
    throw new Error("Cannot save Baseline Bodyweight without a Training Plan.");
  }

  const updatedTrainingPlan = normalizeTrainingPlan({
    ...trainingPlan,
    baselineBodyweight: bodyweight,
    updatedAt: timestamp,
  });

  await db.trainingPlans.put(updatedTrainingPlan);

  return updatedTrainingPlan;
}

export async function saveTrainingWeekBodyweight({
  bodyweight,
  planId,
  referenceDate,
  timestamp,
}: {
  bodyweight: number;
  planId: string;
  referenceDate: string;
  timestamp: string;
}): Promise<TrainingPlan> {
  let updatedTrainingPlan: TrainingPlan | null = null;

  await db.transaction("rw", db.trainingPlans, db.trainingSessions, async () => {
    const persistedTrainingPlan = await db.trainingPlans.get(planId);

    if (!persistedTrainingPlan) {
      throw new Error("Cannot save Training Week Bodyweight without a Training Plan.");
    }

    const trainingPlan = normalizeTrainingPlan(persistedTrainingPlan);
    const weekRange = getTrainingWeekRangeForReferenceDate({
      referenceDate,
      trainingPlan,
    });
    updatedTrainingPlan = normalizeTrainingPlan({
      ...trainingPlan,
      updatedAt: timestamp,
      weeklyBodyweightUpdates: upsertTrainingWeekBodyweightUpdate({
        bodyweight,
        timestamp,
        trainingPlan,
        weekRange,
      }),
    });
    await db.trainingPlans.put(updatedTrainingPlan);

    const trainingSessions = await db.trainingSessions.where("planId").equals(planId).toArray();

    await Promise.all(
      trainingSessions
        .map(normalizeTrainingSession)
        .filter(
          (trainingSession) =>
            isTrainingSessionInWeekRange({ trainingSession, weekRange }) &&
            (trainingSession.sessionBodyweightSource === "baseline" ||
              trainingSession.sessionBodyweightSource === "inherited_weekly"),
        )
        .map((trainingSession) =>
          db.trainingSessions.put(
            updateTrainingSessionBodyweight({
              bodyweight,
              source: "inherited_weekly",
              timestamp,
              trainingSession,
            }),
          ),
        ),
    );
  });

  if (!updatedTrainingPlan) {
    throw new Error("Training Week Bodyweight could not be saved.");
  }

  return updatedTrainingPlan;
}

export async function saveHistoricalTrainingSessionBodyweight({
  bodyweight,
  sessionId,
  timestamp,
}: {
  bodyweight: number;
  sessionId: string;
  timestamp: string;
}): Promise<TrainingSession> {
  const persistedTrainingSession = await db.trainingSessions.get(sessionId);

  if (!persistedTrainingSession) {
    throw new Error("Cannot save Historical Bodyweight Correction without a Training Session.");
  }

  const updatedTrainingSession = normalizeTrainingSession(
    updateTrainingSessionBodyweight({
      bodyweight,
      source: "historical_correction",
      timestamp,
      trainingSession: normalizeTrainingSession(persistedTrainingSession),
    }),
  );

  await db.trainingSessions.put(updatedTrainingSession);

  return updatedTrainingSession;
}

export async function seedTrainingPlanData({
  deactivateActivePlansAt,
  trainingPlans = [],
  trainingSessions = [],
}: SeedTrainingPlanDataOptions): Promise<void> {
  await db.transaction("rw", db.trainingPlans, db.trainingSessions, async () => {
    if (deactivateActivePlansAt) {
      await deactivateActiveTrainingPlans(deactivateActivePlansAt);
    }

    if (trainingPlans.length > 0) {
      await db.trainingPlans.bulkPut(trainingPlans.map(normalizeTrainingPlan));
    }

    if (trainingSessions.length > 0) {
      await db.trainingSessions.bulkPut(trainingSessions.map(normalizeTrainingSession));
    }
  });
}

export async function saveCompletedTrainingSession(
  trainingSession: TrainingSession,
): Promise<TrainingSession> {
  const normalizedTrainingSession = normalizeTrainingSession(trainingSession);

  await db.trainingSessions.put(normalizedTrainingSession);

  return normalizedTrainingSession;
}

async function deactivateActiveTrainingPlans(updatedAt: string): Promise<void> {
  const activeTrainingPlans = await db.trainingPlans.filter((plan) => plan.active).toArray();

  await Promise.all(
    activeTrainingPlans.map((activeTrainingPlan) =>
      db.trainingPlans.put({
        ...activeTrainingPlan,
        active: false,
        updatedAt,
      }),
    ),
  );
}

function sortTrainingPlansByMostRecentlyUpdated(
  trainingPlans: Array<TrainingPlan>,
): ReadonlyArray<TrainingPlan> {
  return trainingPlans.sort((firstPlan, secondPlan) =>
    secondPlan.updatedAt.localeCompare(firstPlan.updatedAt),
  );
}

function sortTrainingSessionsByMostRecentlyUpdated(
  trainingSessions: Array<TrainingSession>,
): ReadonlyArray<TrainingSession> {
  return trainingSessions.sort((firstSession, secondSession) =>
    secondSession.updatedAt.localeCompare(firstSession.updatedAt),
  );
}

function normalizeTrainingPlan(trainingPlan: PersistedTrainingPlan): TrainingPlan {
  return {
    ...trainingPlan,
    baselineBodyweight: trainingPlan.baselineBodyweight ?? null,
    undoableTrainingBlockTransition: trainingPlan.undoableTrainingBlockTransition ?? null,
    weeklyBodyweightUpdates: trainingPlan.weeklyBodyweightUpdates ?? [],
  };
}

function normalizeTrainingSession(trainingSession: PersistedTrainingSession): TrainingSession {
  return {
    ...trainingSession,
    sessionBodyweight: trainingSession.sessionBodyweight ?? null,
    sessionBodyweightSource: trainingSession.sessionBodyweightSource ?? null,
    trainingBlockCycleNumber: trainingSession.trainingBlockCycleNumber ?? null,
    trainingBlockId: trainingSession.trainingBlockId ?? null,
    trainingBlockWeekNumber: trainingSession.trainingBlockWeekNumber ?? null,
  };
}
