import type {
  TrainingPlanSlot,
  TrainingPlanStartingLoadSuggestion,
  WorkoutTemplate,
} from "./training-plan";
import type { TrainingSession, TrainingSessionExerciseEntry } from "./training-session";

export type TrainingSessionSetDraft = {
  done: boolean;
  reps: string;
  setIndex: number;
  weight: string;
};

export type TrainingSessionExerciseDrafts = Record<string, TrainingSessionSetDraft[]>;

export type TrainingSessionExercise = {
  groupId: string;
  slot: TrainingPlanSlot;
};

export function createTrainingSessionExercises(
  workoutTemplate: WorkoutTemplate,
): TrainingSessionExercise[] {
  return workoutTemplate.supersetGroups.flatMap((group) =>
    group.slots.map((slot) => ({
      groupId: group.id,
      slot,
    })),
  );
}

export function createInitialTrainingSessionDrafts(
  sessionExercises: ReadonlyArray<TrainingSessionExercise>,
  startingLoadSuggestions: ReadonlyArray<TrainingPlanStartingLoadSuggestion> = [],
): TrainingSessionExerciseDrafts {
  const startingLoadByExerciseId = new Map(
    startingLoadSuggestions.map((suggestion) => [
      suggestion.exerciseId,
      String(suggestion.effectiveLoad),
    ]),
  );

  return Object.fromEntries(
    sessionExercises.map(({ groupId, slot }) => [
      getTrainingSessionExerciseKey(groupId, slot),
      createDefaultTrainingSessionSetDrafts(slot, startingLoadByExerciseId.get(slot.exerciseId)),
    ]),
  );
}

export function createDefaultTrainingSessionSetDrafts(
  slot?: TrainingPlanSlot,
  startingLoad?: string,
): TrainingSessionSetDraft[] {
  const reps = String(getTrainingSessionDefaultReps(slot));

  return [
    { done: false, reps, setIndex: 1, weight: startingLoad ?? "" },
    { done: false, reps, setIndex: 2, weight: startingLoad ?? "" },
    { done: false, reps, setIndex: 3, weight: startingLoad ?? "" },
  ];
}

export function getDefaultTrainingSessionSetDraft(
  slot?: TrainingPlanSlot,
): TrainingSessionSetDraft {
  return (
    createDefaultTrainingSessionSetDrafts(slot)[0] ?? {
      done: false,
      reps: "8",
      setIndex: 1,
      weight: "",
    }
  );
}

export function createTrainingSessionEntries(
  sessionExercises: ReadonlyArray<TrainingSessionExercise>,
  drafts: TrainingSessionExerciseDrafts,
): TrainingSessionExerciseEntry[] {
  return sessionExercises.map(({ groupId, slot }) => ({
    exerciseId: slot.exerciseId,
    exerciseName: slot.exerciseName,
    movementPattern: slot.movementPattern,
    sets: (
      drafts[getTrainingSessionExerciseKey(groupId, slot)] ??
      createDefaultTrainingSessionSetDrafts(slot)
    ).map((draft) => ({
      reps: Number(draft.reps) || 0,
      setIndex: draft.setIndex,
      weight: Number(draft.weight) || 0,
    })),
  }));
}

export function getTrainingSessionExerciseKey(groupId: string, slot: TrainingPlanSlot): string {
  return `${groupId}-${slot.exerciseId}-${slot.role}`;
}

export function countCompletedTrainingSessionSets(drafts: TrainingSessionExerciseDrafts): number {
  return Object.values(drafts).reduce(
    (total, exerciseDrafts) => total + exerciseDrafts.filter((draft) => draft.done).length,
    0,
  );
}

export function countCompletedTrainingSessionGroupSets({
  drafts,
  groupId,
  slots,
}: {
  drafts: TrainingSessionExerciseDrafts;
  groupId: string;
  slots: ReadonlyArray<TrainingPlanSlot>;
}): number {
  return slots.reduce((total, slot) => {
    const exerciseDrafts =
      drafts[getTrainingSessionExerciseKey(groupId, slot)] ??
      createDefaultTrainingSessionSetDrafts(slot);

    return total + exerciseDrafts.filter((draft) => draft.done).length;
  }, 0);
}

export function getExpandedTrainingSessionGroupIdsAfterCompletion({
  completedGroupId,
  currentGroupIds,
  drafts,
  groups,
}: {
  completedGroupId: string;
  currentGroupIds: ReadonlyArray<string>;
  drafts: TrainingSessionExerciseDrafts;
  groups: WorkoutTemplate["supersetGroups"];
}): string[] {
  const nextIncompleteGroup = groups
    .slice(groups.findIndex((group) => group.id === completedGroupId) + 1)
    .find(
      (group) =>
        countCompletedTrainingSessionGroupSets({ drafts, groupId: group.id, slots: group.slots }) <
        group.slots.length * 3,
    );
  const nextGroupId = nextIncompleteGroup?.id;
  const updatedGroupIds = currentGroupIds.filter((groupId) => groupId !== completedGroupId);

  if (!nextGroupId || updatedGroupIds.includes(nextGroupId)) {
    return updatedGroupIds;
  }

  return [...updatedGroupIds, nextGroupId];
}

export function getTrainingSessionDefaultReps(slot?: TrainingPlanSlot): number {
  return slot?.role === "abs" ? 12 : 8;
}

export function getPreviousTrainingSessionSetLabel({
  previousTrainingSessions,
  setIndex,
  slot,
}: {
  previousTrainingSessions: ReadonlyArray<TrainingSession>;
  setIndex: number;
  slot: TrainingPlanSlot;
}): string {
  for (const session of previousTrainingSessions) {
    const previousExercise = session.exercises.find(
      (exercise) => exercise.exerciseId === slot.exerciseId,
    );
    const previousSet = previousExercise?.sets.find((set) => set.setIndex === setIndex);

    if (!previousSet || previousSet.reps <= 0) {
      continue;
    }

    if (previousSet.weight <= 0) {
      return /pull-ups/i.test(slot.exerciseName) ? `BW x ${previousSet.reps}` : "-";
    }

    return `${previousSet.weight}kg x ${previousSet.reps}`;
  }

  return "-";
}
