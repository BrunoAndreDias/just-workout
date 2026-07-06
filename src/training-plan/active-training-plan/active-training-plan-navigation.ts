import type { TrainingPlan, WorkoutTemplate } from "../training-plan";
import {
  getTrainingSessionStartChoiceRouteTarget,
  getTrainingSessionStartRouteTarget,
  type TrainingSessionStartChoiceRouteTarget,
  type TrainingSessionStartRouteTarget,
} from "../training-plan-paths";
import type { TrainingSession } from "../training-session";
import { getTrainingSessionSequenceState } from "../training-session-sequencing";

export type StartWorkoutRouteTarget =
  | TrainingSessionStartChoiceRouteTarget
  | TrainingSessionStartRouteTarget;

export function getStartNextWorkoutRouteTarget(
  trainingPlan: Pick<TrainingPlan, "id" | "workoutTemplates"> &
    Partial<
      Pick<TrainingPlan, "generatedAt" | "trainingBlock" | "trainingFrequencyDaysPerWeek">
    > & {
      now?: Date;
      trainingSessions?: ReadonlyArray<TrainingSession>;
    },
): StartWorkoutRouteTarget {
  if (
    !trainingPlan.trainingFrequencyDaysPerWeek ||
    (!trainingPlan.generatedAt && !trainingPlan.trainingBlock?.startDate)
  ) {
    return getStartWorkoutRouteTarget({
      planId: trainingPlan.id,
      workoutTemplateId: trainingPlan.workoutTemplates[0]?.id ?? "template-1",
    });
  }

  const sequenceState = getTrainingSessionSequenceState({
    now: trainingPlan.now,
    trainingPlan: {
      generatedAt: trainingPlan.generatedAt,
      trainingBlock: trainingPlan.trainingBlock,
      trainingFrequencyDaysPerWeek: trainingPlan.trainingFrequencyDaysPerWeek,
      workoutTemplates: trainingPlan.workoutTemplates,
    },
    trainingSessions: trainingPlan.trainingSessions ?? [],
  });

  if (sequenceState.isExtraSessionAvailable) {
    return getTrainingSessionStartChoiceRouteTarget({
      intent: "extra",
      planId: trainingPlan.id,
    });
  }

  return getStartWorkoutRouteTarget({
    planId: trainingPlan.id,
    workoutTemplateId: sequenceState.nextPlannedTemplateId,
  });
}

export function getStartWorkoutRouteTarget({
  intent,
  planId,
  workoutTemplateId,
}: {
  intent?: "extra";
  planId: string;
  workoutTemplateId: string;
}): StartWorkoutRouteTarget {
  return getTrainingSessionStartRouteTarget({
    ...(intent ? { intent } : {}),
    planId,
    templateId: workoutTemplateId,
  });
}

export function getNextWorkoutTemplateId({
  now,
  trainingFrequencyDaysPerWeek,
  trainingSessions = [],
  trainingBlock,
  generatedAt,
  workoutTemplates,
}: Partial<
  Pick<
    TrainingPlan,
    "generatedAt" | "trainingBlock" | "trainingFrequencyDaysPerWeek" | "workoutTemplates"
  >
> & {
  now?: Date;
  trainingSessions?: ReadonlyArray<TrainingSession>;
}): WorkoutTemplate["id"] {
  const resolvedWorkoutTemplates = workoutTemplates ?? [];

  if (
    resolvedWorkoutTemplates.length === 0 ||
    !trainingFrequencyDaysPerWeek ||
    (!generatedAt && !trainingBlock?.startDate)
  ) {
    return resolvedWorkoutTemplates[0]?.id ?? "template-1";
  }

  return getTrainingSessionSequenceState({
    now,
    trainingPlan: {
      generatedAt,
      trainingBlock,
      trainingFrequencyDaysPerWeek,
      workoutTemplates: resolvedWorkoutTemplates,
    },
    trainingSessions,
  }).nextPlannedTemplateId;
}
