import { isBodyweightLoadExercise } from "./bodyweight-load";
import { calculateVolumeByMovementPattern } from "./completed-load-volume";
import type {
  TrainingPlanSlot,
  TrainingPlanStartingLoadSuggestion,
  WorkoutTemplate,
} from "./training-plan";
import {
  formatExerciseRole,
  formatMovementPattern,
  type PresentedCompletedLoadVolumeMovementRow,
  presentCompletedLoadVolumeMovementRows,
} from "./training-plan-presentation";
import {
  createLegacyDefaultTrainingPrescription,
  type TrainingPrescription,
} from "./training-prescription";
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

export type TrainingSessionDraftChange = {
  exerciseKey: string;
  field: keyof TrainingSessionSetDraft;
  setIndex: number;
  slot: TrainingPlanSlot;
  value: boolean | string;
};

export type TrainingSessionGroupProgress = {
  completedSetCount: number;
  isComplete: boolean;
  plannedSetCount: number;
};

export type TrainingSessionExecutionState = {
  drafts: TrainingSessionExerciseDrafts;
  expandedGroupIds: ReadonlyArray<string>;
};

export type TrainingSessionExecutionAction =
  | {
      setId: string;
      type: "change-set-done";
      value: boolean;
    }
  | {
      setId: string;
      type: "change-set-reps";
      value: string;
    }
  | {
      setId: string;
      type: "change-set-weight";
      value: string;
    }
  | {
      groupId: string;
      type: "toggle-group";
    };

export type TrainingSessionExecutionSetRow = {
  done: boolean;
  doneLabel: string;
  exerciseName: string;
  inputId: string;
  movementPatternLabel: string;
  prescriptionLabel: string;
  previousSetLabel: string;
  reps: string;
  setId: string;
  setIndex: number;
  weight: string;
  weightInputMin: string;
};

export type TrainingSessionExecutionRound = {
  roundIndex: number;
  rows: ReadonlyArray<TrainingSessionExecutionSetRow>;
};

export type TrainingSessionExecutionGroupSummary = TrainingSessionGroupProgress & {
  exerciseCount: number;
};

export type TrainingSessionExecutionNow = {
  exerciseName: string;
  movementPatternLabel: string;
  prescriptionLabel: string;
  roleLabel: string;
  setLabel: string;
  targetRepsLabel: string;
};

export type TrainingSessionExecutionGroup = {
  accessibleTitle: string;
  groupId: string;
  isOpen: boolean;
  now: TrainingSessionExecutionNow | null;
  rounds: ReadonlyArray<TrainingSessionExecutionRound>;
  summary: TrainingSessionExecutionGroupSummary;
  title: string;
};

export type TrainingSessionExecutionReadModel = {
  completedSetCount: number;
  entries: ReadonlyArray<TrainingSessionExerciseEntry>;
  groups: ReadonlyArray<TrainingSessionExecutionGroup>;
  plannedSetCount: number;
  volumeByMovementPattern: ReadonlyArray<PresentedCompletedLoadVolumeMovementRow>;
};

export function createEmptyTrainingSessionExecutionState(): TrainingSessionExecutionState {
  return {
    drafts: createInitialTrainingSessionDrafts([]),
    expandedGroupIds: [],
  };
}

export function createInitialTrainingSessionExecutionState({
  startingLoadSuggestions = [],
  workoutTemplate,
}: {
  startingLoadSuggestions?: ReadonlyArray<TrainingPlanStartingLoadSuggestion>;
  workoutTemplate: WorkoutTemplate;
}): TrainingSessionExecutionState {
  return {
    drafts: createInitialTrainingSessionDrafts(
      createTrainingSessionExercises(workoutTemplate),
      startingLoadSuggestions,
    ),
    expandedGroupIds: getInitialTrainingSessionExpandedGroupIds(workoutTemplate),
  };
}

export function hasTrainingSessionExecutionDrafts(state: TrainingSessionExecutionState): boolean {
  return Object.keys(state.drafts).length > 0;
}

export function changeTrainingSessionExecutionSetDone(
  row: Pick<TrainingSessionExecutionSetRow, "setId">,
  value: boolean,
): TrainingSessionExecutionAction {
  return {
    setId: row.setId,
    type: "change-set-done",
    value,
  };
}

export function changeTrainingSessionExecutionSetReps(
  row: Pick<TrainingSessionExecutionSetRow, "setId">,
  value: string,
): TrainingSessionExecutionAction {
  return {
    setId: row.setId,
    type: "change-set-reps",
    value,
  };
}

export function changeTrainingSessionExecutionSetWeight(
  row: Pick<TrainingSessionExecutionSetRow, "setId">,
  value: string,
): TrainingSessionExecutionAction {
  return {
    setId: row.setId,
    type: "change-set-weight",
    value,
  };
}

export function toggleTrainingSessionExecutionGroup(
  group: Pick<TrainingSessionExecutionGroup, "groupId">,
): TrainingSessionExecutionAction {
  return {
    groupId: group.groupId,
    type: "toggle-group",
  };
}

export function createTrainingSessionExecutionReadModel({
  completedSession,
  previousTrainingSessions,
  state,
  workoutTemplate,
}: {
  completedSession: TrainingSession | null;
  previousTrainingSessions: ReadonlyArray<TrainingSession>;
  state: TrainingSessionExecutionState;
  workoutTemplate: WorkoutTemplate;
}): TrainingSessionExecutionReadModel {
  const sessionExercises = createTrainingSessionExercises(workoutTemplate);
  const entries = createTrainingSessionEntries(sessionExercises, state.drafts);
  const completedSetCount = countCompletedTrainingSessionSets(state.drafts);
  const plannedSetCount = getTrainingSessionPlannedSetCount(sessionExercises);

  return {
    completedSetCount,
    entries,
    groups: workoutTemplate.supersetGroups.map((group, groupIndex) =>
      createTrainingSessionExecutionGroup({
        drafts: state.drafts,
        expandedGroupIds: state.expandedGroupIds,
        group,
        groupIndex,
        previousTrainingSessions,
        workoutTemplateLabel: workoutTemplate.label,
      }),
    ),
    plannedSetCount,
    volumeByMovementPattern: presentCompletedLoadVolumeMovementRows(
      completedSession
        ? completedSession.volumeByMovementPattern
        : calculateVolumeByMovementPattern(entries),
    ),
  };
}

export function applyTrainingSessionExecutionAction({
  action,
  state,
  workoutTemplate,
}: {
  action: TrainingSessionExecutionAction;
  state: TrainingSessionExecutionState;
  workoutTemplate: WorkoutTemplate;
}): TrainingSessionExecutionState {
  if (action.type === "toggle-group") {
    return applyTrainingSessionExecutionGroupToggle({
      groupId: action.groupId,
      state,
    });
  }

  const target = findTrainingSessionExecutionSetActionTarget({
    setId: action.setId,
    workoutTemplate,
  });

  if (!target) {
    return state;
  }

  const drafts = applyTrainingSessionDraftChange({
    drafts: state.drafts,
    exerciseKey: target.exerciseKey,
    field: getTrainingSessionExecutionDraftField(action),
    setIndex: target.setIndex,
    slot: target.slot,
    value: action.value,
  });
  const groupProgress = getTrainingSessionGroupProgress({
    drafts,
    groupId: target.group.id,
    slots: target.group.slots,
  });
  const expandedGroupIds =
    action.type === "change-set-done" && action.value === true && groupProgress.isComplete
      ? getExpandedTrainingSessionGroupIdsAfterCompletion({
          completedGroupId: target.group.id,
          currentGroupIds: state.expandedGroupIds,
          drafts,
          groups: workoutTemplate.supersetGroups,
        })
      : state.expandedGroupIds;

  return {
    drafts,
    expandedGroupIds,
  };
}

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

  return getTrainingSessionSetIndexes(slot).map((setIndex) => ({
    done: false,
    reps,
    setIndex,
    weight: startingLoad ?? "",
  }));
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

export function getTrainingSessionGroupProgress({
  drafts,
  groupId,
  slots,
}: {
  drafts: TrainingSessionExerciseDrafts;
  groupId: string;
  slots: ReadonlyArray<TrainingPlanSlot>;
}): TrainingSessionGroupProgress {
  const plannedSetCount = getTrainingSessionGroupPlannedSetCount(slots);
  const completedSetCount = countCompletedTrainingSessionGroupSets({ drafts, groupId, slots });

  return {
    completedSetCount,
    isComplete: completedSetCount === plannedSetCount,
    plannedSetCount,
  };
}

export function applyTrainingSessionDraftChange({
  drafts,
  exerciseKey,
  field,
  setIndex,
  slot,
  value,
}: {
  drafts: TrainingSessionExerciseDrafts;
} & TrainingSessionDraftChange): TrainingSessionExerciseDrafts {
  return {
    ...drafts,
    [exerciseKey]: (drafts[exerciseKey] ?? createDefaultTrainingSessionSetDrafts(slot)).map(
      (draft) => (draft.setIndex === setIndex ? { ...draft, [field]: value } : draft),
    ),
  };
}

function applyTrainingSessionExecutionGroupToggle({
  groupId,
  state,
}: {
  groupId: string;
  state: TrainingSessionExecutionState;
}): TrainingSessionExecutionState {
  return {
    ...state,
    expandedGroupIds: state.expandedGroupIds.includes(groupId)
      ? state.expandedGroupIds.filter((currentGroupId) => currentGroupId !== groupId)
      : [...state.expandedGroupIds, groupId],
  };
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
        getTrainingSessionGroupPlannedSetCount(group.slots),
    );
  const nextGroupId = nextIncompleteGroup?.id;
  const updatedGroupIds = currentGroupIds.filter((groupId) => groupId !== completedGroupId);

  if (!nextGroupId || updatedGroupIds.includes(nextGroupId)) {
    return updatedGroupIds;
  }

  return [...updatedGroupIds, nextGroupId];
}

export function getTrainingSessionDefaultReps(slot?: TrainingPlanSlot): number {
  return getTrainingSessionPrescription(slot).repRange.min;
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

function getInitialTrainingSessionExpandedGroupIds(
  workoutTemplate: WorkoutTemplate,
): ReadonlyArray<string> {
  return workoutTemplate.supersetGroups[0]?.id ? [workoutTemplate.supersetGroups[0].id] : [];
}

function createTrainingSessionExecutionGroup({
  drafts,
  expandedGroupIds,
  group,
  groupIndex,
  previousTrainingSessions,
  workoutTemplateLabel,
}: {
  drafts: TrainingSessionExerciseDrafts;
  expandedGroupIds: ReadonlyArray<string>;
  group: WorkoutTemplate["supersetGroups"][number];
  groupIndex: number;
  previousTrainingSessions: ReadonlyArray<TrainingSession>;
  workoutTemplateLabel: string;
}): TrainingSessionExecutionGroup {
  const isOpen = expandedGroupIds.includes(group.id);
  const summary = getTrainingSessionGroupProgress({
    drafts,
    groupId: group.id,
    slots: group.slots,
  });

  return {
    accessibleTitle: formatAccessibleGroupTitle(group.title),
    groupId: group.id,
    isOpen,
    now: createTrainingSessionExecutionNow(group.slots[0]),
    rounds: getTrainingSessionGroupRoundIndexes(group.slots).map((roundIndex) => ({
      roundIndex,
      rows: createTrainingSessionExecutionRoundRows({
        drafts,
        groupId: group.id,
        previousTrainingSessions,
        roundIndex,
        slots: group.slots,
      }),
    })),
    summary: {
      ...summary,
      exerciseCount: group.slots.length,
    },
    title: formatGroupTitle(group.title, workoutTemplateLabel, groupIndex),
  };
}

function createTrainingSessionExecutionNow(
  slot: TrainingPlanSlot | undefined,
): TrainingSessionExecutionNow | null {
  if (!slot) {
    return null;
  }

  return {
    exerciseName: slot.exerciseName,
    movementPatternLabel: formatMovementPattern(slot.movementPattern),
    prescriptionLabel: getTrainingSessionPrescriptionLabel(slot),
    roleLabel: formatExerciseRole(slot.role),
    setLabel: `Set 1 of ${getTrainingSessionSetCount(slot)}`,
    targetRepsLabel: getTrainingSessionTargetRepsLabel(slot),
  };
}

function createTrainingSessionExecutionRoundRows({
  drafts,
  groupId,
  previousTrainingSessions,
  roundIndex,
  slots,
}: {
  drafts: TrainingSessionExerciseDrafts;
  groupId: string;
  previousTrainingSessions: ReadonlyArray<TrainingSession>;
  roundIndex: number;
  slots: ReadonlyArray<TrainingPlanSlot>;
}): ReadonlyArray<TrainingSessionExecutionSetRow> {
  return slots
    .filter((slot) => roundIndex <= getTrainingSessionSetCount(slot))
    .map((slot) =>
      createTrainingSessionExecutionSetRow({
        drafts,
        groupId,
        previousTrainingSessions,
        roundIndex,
        slot,
      }),
    );
}

function createTrainingSessionExecutionSetRow({
  drafts,
  groupId,
  previousTrainingSessions,
  roundIndex,
  slot,
}: {
  drafts: TrainingSessionExerciseDrafts;
  groupId: string;
  previousTrainingSessions: ReadonlyArray<TrainingSession>;
  roundIndex: number;
  slot: TrainingPlanSlot;
}): TrainingSessionExecutionSetRow {
  const exerciseKey = getTrainingSessionExerciseKey(groupId, slot);
  const setId = getTrainingSessionExecutionSetId({
    groupId,
    setIndex: roundIndex,
    slot,
  });
  const draft =
    (drafts[exerciseKey] ?? createDefaultTrainingSessionSetDrafts(slot)).find(
      (setDraft) => setDraft.setIndex === roundIndex,
    ) ?? getDefaultTrainingSessionSetDraft(slot);

  return {
    done: draft.done,
    doneLabel: `Mark ${slot.exerciseName} set ${draft.setIndex} ${
      draft.done ? "not done" : "done"
    }`,
    exerciseName: slot.exerciseName,
    inputId: `${setId}-input`,
    movementPatternLabel: formatMovementPattern(slot.movementPattern),
    prescriptionLabel: getTrainingSessionPrescriptionLabel(slot),
    previousSetLabel: getPreviousTrainingSessionSetLabel({
      previousTrainingSessions,
      setIndex: draft.setIndex,
      slot,
    }),
    reps: draft.reps || String(getTrainingSessionDefaultReps(slot)),
    setId,
    setIndex: draft.setIndex,
    weight: draft.weight,
    weightInputMin: isBodyweightLoadExercise(slot) ? "-200" : "0",
  };
}

function findTrainingSessionExecutionSetActionTarget({
  setId,
  workoutTemplate,
}: {
  setId: string;
  workoutTemplate: WorkoutTemplate;
}): {
  exerciseKey: string;
  group: WorkoutTemplate["supersetGroups"][number];
  setIndex: number;
  slot: TrainingPlanSlot;
} | null {
  for (const group of workoutTemplate.supersetGroups) {
    for (const slot of group.slots) {
      for (const setIndex of getTrainingSessionSetIndexes(slot)) {
        if (
          getTrainingSessionExecutionSetId({
            groupId: group.id,
            setIndex,
            slot,
          }) !== setId
        ) {
          continue;
        }

        return {
          exerciseKey: getTrainingSessionExerciseKey(group.id, slot),
          group,
          setIndex,
          slot,
        };
      }
    }
  }

  return null;
}

function getTrainingSessionExecutionDraftField(
  action: Exclude<TrainingSessionExecutionAction, { type: "toggle-group" }>,
): keyof TrainingSessionSetDraft {
  if (action.type === "change-set-done") {
    return "done";
  }

  if (action.type === "change-set-reps") {
    return "reps";
  }

  return "weight";
}

function getTrainingSessionExecutionSetId({
  groupId,
  setIndex,
  slot,
}: {
  groupId: string;
  setIndex: number;
  slot: TrainingPlanSlot;
}): string {
  return `${getTrainingSessionExerciseKey(groupId, slot)}-set-${setIndex}`;
}

function getTrainingSessionPrescriptionLabel(slot: TrainingPlanSlot): string {
  const { repRange, setCount } = getTrainingSessionPrescription(slot);

  return `${setCount} x ${formatTrainingSessionRepRange(repRange)}`;
}

function getTrainingSessionTargetRepsLabel(slot: TrainingPlanSlot): string {
  return `Target ${formatTrainingSessionRepRange(getTrainingSessionPrescription(slot).repRange)} reps`;
}

function getTrainingSessionPlannedSetCount(
  sessionExercises: ReadonlyArray<TrainingSessionExercise>,
): number {
  return sessionExercises.reduce((total, { slot }) => total + getTrainingSessionSetCount(slot), 0);
}

function getTrainingSessionGroupPlannedSetCount(slots: ReadonlyArray<TrainingPlanSlot>): number {
  return slots.reduce((total, slot) => total + getTrainingSessionSetCount(slot), 0);
}

function getTrainingSessionGroupRoundIndexes(
  slots: ReadonlyArray<TrainingPlanSlot>,
): ReadonlyArray<number> {
  return getSetIndexes(getTrainingSessionGroupRoundCount(slots));
}

function getTrainingSessionGroupRoundCount(slots: ReadonlyArray<TrainingPlanSlot>): number {
  return Math.max(...slots.map((slot) => getTrainingSessionSetCount(slot)), 0);
}

function getTrainingSessionSetIndexes(slot?: TrainingPlanSlot): ReadonlyArray<number> {
  return getSetIndexes(getTrainingSessionSetCount(slot));
}

function getTrainingSessionSetCount(slot?: TrainingPlanSlot): number {
  return getTrainingSessionPrescription(slot).setCount;
}

function getTrainingSessionPrescription(slot?: TrainingPlanSlot): TrainingPrescription {
  return slot?.trainingPrescription ?? createLegacyDefaultTrainingPrescription();
}

function getSetIndexes(setCount: number): ReadonlyArray<number> {
  return Array.from({ length: setCount }, (_, index) => index + 1);
}

function formatTrainingSessionRepRange(repRange: { max: number; min: number }): string {
  return `${repRange.min}-${repRange.max}`;
}

function formatAccessibleGroupTitle(title: string): string {
  return title.replace(/Full-body superset /i, "Superset ");
}

function formatGroupTitle(title: string, templateLabel: string, groupIndex: number): string {
  const baseTitle = title.replace(/Full-body superset /i, "superset ");

  if (groupIndex >= 2 || /isolation/i.test(title)) {
    return "Isolation work";
  }

  if (/upper|full body a/i.test(templateLabel)) {
    return `Upper ${baseTitle}`;
  }

  if (/lower|full body b/i.test(templateLabel)) {
    return `Lower ${baseTitle}`;
  }

  return baseTitle.replace(/^\w/, (letter) => letter.toUpperCase());
}
