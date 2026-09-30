import type { TrainingPlan, WorkoutTemplate } from "../training-plan";
import {
  getTrainingSessionStartChoiceRouteTarget,
  getTrainingSessionStartRouteTarget,
  type TrainingSessionStartChoiceRouteTarget,
  type TrainingSessionStartRouteTarget,
} from "../training-plan-paths";
import type { TrainingSession } from "../training-session";
import {
  getTrainingSessionSequenceState,
  type TrainingSessionSequenceState,
} from "../training-session-sequencing";

export type StartWorkoutRouteTarget =
  | TrainingSessionStartChoiceRouteTarget
  | TrainingSessionStartRouteTarget;

type NextWorkoutSequencePlan = Partial<
  Pick<
    TrainingPlan,
    | "generatedAt"
    | "trainingBlock"
    | "trainingBlockWeeks"
    | "trainingFrequencyDaysPerWeek"
    | "workoutTemplates"
  >
> & {
  now?: Date;
  trainingSessions?: ReadonlyArray<TrainingSession>;
};

export function getStartNextWorkoutRouteTarget(
  trainingPlan: Pick<TrainingPlan, "id" | "workoutTemplates"> & NextWorkoutSequencePlan,
): StartWorkoutRouteTarget {
  const sequenceState = getNextWorkoutSequenceState(trainingPlan);

  if (sequenceState?.isExtraSessionAvailable) {
    return getTrainingSessionStartChoiceRouteTarget({
      intent: "extra",
      planId: trainingPlan.id,
    });
  }

  return getStartWorkoutRouteTarget({
    planId: trainingPlan.id,
    workoutTemplateId:
      sequenceState?.nextPlannedTemplateId ?? trainingPlan.workoutTemplates[0]?.id ?? "template-1",
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

export function getNextWorkoutTemplateId(
  trainingPlan: NextWorkoutSequencePlan,
): WorkoutTemplate["id"] {
  return (
    getNextWorkoutSequenceState(trainingPlan)?.nextPlannedTemplateId ??
    trainingPlan.workoutTemplates?.[0]?.id ??
    "template-1"
  );
}

/** Without templates, a weekly target, or a calendar anchor, sequencing falls back to the first template. */
function getNextWorkoutSequenceState({
  generatedAt,
  now,
  trainingBlock,
  trainingBlockWeeks,
  trainingFrequencyDaysPerWeek,
  trainingSessions = [],
  workoutTemplates = [],
}: NextWorkoutSequencePlan): TrainingSessionSequenceState | null {
  const calendarAnchor = generatedAt ?? trainingBlock?.startDate;

  if (
    workoutTemplates.length === 0 ||
    !trainingFrequencyDaysPerWeek ||
    !trainingBlockWeeks ||
    !calendarAnchor
  ) {
    return null;
  }

  return getTrainingSessionSequenceState({
    now,
    trainingPlan: {
      generatedAt: calendarAnchor,
      trainingBlock,
      trainingBlockWeeks,
      trainingFrequencyDaysPerWeek,
      workoutTemplates,
    },
    trainingSessions,
  });
}
