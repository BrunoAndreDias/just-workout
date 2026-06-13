import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { CheckCircle2, ChevronDown, ChevronUp, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  formatExerciseRole,
  formatMovementPattern,
} from "./active-training-plan/active-training-plan-read-model";
import type { TrainingPlanSlot, WorkoutTemplate } from "./training-plan";
import { trainingPlanService } from "./training-plan-service";
import {
  calculateVolumeByMovementPattern,
  type TrainingSession,
  type TrainingSessionExerciseEntry,
} from "./training-session";

type SetDraft = {
  done: boolean;
  reps: string;
  setIndex: number;
  weight: string;
};

type ExerciseDrafts = Record<string, SetDraft[]>;

export function TrainingSessionRoute() {
  const routeParams = useTrainingSessionRouteParams();
  const trainingPlanQuery = useQuery({
    enabled: routeParams !== null,
    queryFn: () => {
      if (!routeParams) {
        return null;
      }

      return trainingPlanService.getTrainingPlan(routeParams.planId);
    },
    queryKey: ["training-plan", routeParams?.planId],
  });
  const trainingSessionsQuery = useQuery({
    enabled: routeParams !== null,
    queryFn: () => {
      if (!routeParams) {
        return [];
      }

      return trainingPlanService.getTrainingSessionsForPlan(routeParams.planId);
    },
    queryKey: ["training-sessions", routeParams?.planId],
  });
  const trainingPlan = trainingPlanQuery.data;
  const previousTrainingSessions = trainingSessionsQuery.data ?? [];
  const workoutTemplate = trainingPlan
    ? getWorkoutTemplate(trainingPlan.workoutTemplates, routeParams?.templateId ?? null)
    : null;
  const sessionExercises = useMemo(
    () => (workoutTemplate ? getSessionExercises(workoutTemplate) : []),
    [workoutTemplate],
  );
  const [drafts, setDrafts] = useState<ExerciseDrafts>(() => createInitialDrafts([]));
  const [completedSession, setCompletedSession] = useState<TrainingSession | null>(null);
  const [expandedGroupIds, setExpandedGroupIds] = useState<ReadonlyArray<string>>([]);
  const completeSession = useMutation({
    mutationFn: (entries: ReadonlyArray<TrainingSessionExerciseEntry>) => {
      if (!routeParams || !workoutTemplate) {
        throw new Error("Cannot complete this Training Session yet.");
      }

      return trainingPlanService.completeTrainingSession({
        entries,
        planId: routeParams.planId,
        templateId: workoutTemplate.id,
      });
    },
    onSuccess: (session) => setCompletedSession(session),
  });

  useEffect(() => {
    setDrafts((currentDrafts) =>
      Object.keys(currentDrafts).length > 0 ? currentDrafts : createInitialDrafts(sessionExercises),
    );
  }, [sessionExercises]);

  useEffect(() => {
    setExpandedGroupIds(
      workoutTemplate?.supersetGroups[0]?.id ? [workoutTemplate.supersetGroups[0].id] : [],
    );
  }, [workoutTemplate]);

  if (trainingPlanQuery.isLoading) {
    return <TrainingSessionShell>Loading Training Session...</TrainingSessionShell>;
  }

  if (!trainingPlan || !workoutTemplate) {
    return <TrainingSessionShell>Training Session not found.</TrainingSessionShell>;
  }

  const entries = createSessionEntries(sessionExercises, drafts);
  const completedSetCount = countCompletedSets(drafts);
  const plannedSetCount = sessionExercises.length * 3;
  const volumeByMovementPattern = completedSession
    ? completedSession.volumeByMovementPattern
    : calculateVolumeByMovementPattern(entries);

  async function handleCompleteSession() {
    await completeSession.mutateAsync(entries);
  }

  return (
    <section className="training-session-page" aria-label="Training Session">
      <h1 className="training-session-sr">{workoutTemplate.label} session</h1>
      {completedSession ? (
        <section className="training-session-complete" aria-labelledby="session-complete-title">
          <CheckCircle2 aria-hidden="true" />
          <div>
            <h2 id="session-complete-title">Session completed</h2>
            <p>The Training Session was stored with movement-pattern volume.</p>
          </div>
        </section>
      ) : null}

      <div className="training-session-work">
        {workoutTemplate.supersetGroups.map((group, groupIndex) => {
          const isOpen = expandedGroupIds.includes(group.id);
          const groupSetCount = group.slots.length * 3;
          const groupCompletedSets = countCompletedGroupSets(group.id, group.slots, drafts);
          const isGroupComplete = groupCompletedSets === groupSetCount;
          const groupTitle = formatGroupTitle(group.title, workoutTemplate.label, groupIndex);
          const toggleGroup = () => {
            setExpandedGroupIds((currentGroupIds) =>
              currentGroupIds.includes(group.id)
                ? currentGroupIds.filter((groupId) => groupId !== group.id)
                : [...currentGroupIds, group.id],
            );
          };

          return (
            <section
              aria-labelledby={`training-session-group-${group.id}`}
              className={getTrainingSessionGroupClassName(isGroupComplete, isOpen)}
              key={group.id}
            >
              <header className="training-session-group__header">
                <div>
                  <h2
                    aria-label={formatAccessibleGroupTitle(group.title)}
                    id={`training-session-group-${group.id}`}
                  >
                    {groupTitle}
                  </h2>
                  <p>
                    {isGroupComplete && !isOpen ? (
                      <>
                        <strong className="training-session-group__complete-state">
                          <CheckCircle2 aria-hidden="true" />
                          Complete
                        </strong>
                        <span>{groupSetCount} sets logged</span>
                      </>
                    ) : isOpen ? (
                      <>
                        <span>Superset</span>
                        <span>3 rounds</span>
                        <strong className="training-session-group__sets-completed">
                          {groupCompletedSets}/{groupSetCount} sets completed
                        </strong>
                      </>
                    ) : (
                      <>
                        <span>{group.slots.length} exercises</span>
                        <span>{groupSetCount} planned sets</span>
                      </>
                    )}
                  </p>
                </div>
                <button
                  aria-expanded={isOpen}
                  aria-label={`${isOpen ? "Collapse" : "Expand"} ${groupTitle}`}
                  className="training-session-group__toggle"
                  onClick={toggleGroup}
                  type="button"
                >
                  {isOpen ? (
                    <ChevronUp aria-hidden="true" className="training-session-group__chevron" />
                  ) : (
                    <ChevronDown aria-hidden="true" className="training-session-group__chevron" />
                  )}
                </button>
              </header>

              {isOpen ? (
                <>
                  <p className="training-session-now">
                    <span>Now</span>
                    <strong
                      className="training-session-now__exercise"
                      data-exercise={group.slots[0]?.exerciseName ?? "Exercise"}
                    />
                    <small>
                      {formatMovementPattern(group.slots[0]?.movementPattern ?? "horizontal_push")}{" "}
                      · {formatExerciseRole(group.slots[0]?.role ?? "main_compound")} · Set 1 of 3 ·
                      Target 8-12 reps
                      <span className="training-session-prescription">3 x 8-12</span>
                    </small>
                  </p>
                  <div className="training-session-table-wrap">
                    <table className="training-session-table">
                      <thead>
                        <tr>
                          <th scope="col">Round</th>
                          <th scope="col">Exercise</th>
                          <th scope="col">Pattern</th>
                          <th scope="col">Previous</th>
                          <th scope="col">Weight</th>
                          <th scope="col">Reps</th>
                          <th scope="col">Done</th>
                        </tr>
                      </thead>
                      {[1, 2, 3].map((roundIndex) => (
                        <RoundSessionRows
                          drafts={drafts}
                          groupId={group.id}
                          key={`${group.id}-round-${roundIndex}`}
                          onDraftChange={(exerciseKey, setIndex, field, value) => {
                            setDrafts((currentDrafts) => {
                              const slot = group.slots.find(
                                (groupSlot) => getExerciseKey(group.id, groupSlot) === exerciseKey,
                              );

                              if (!slot) {
                                return currentDrafts;
                              }

                              const updatedDrafts = {
                                ...currentDrafts,
                                [exerciseKey]: (
                                  currentDrafts[exerciseKey] ?? createDefaultSetDrafts(slot)
                                ).map((draft) =>
                                  draft.setIndex === setIndex
                                    ? { ...draft, [field]: value }
                                    : draft,
                                ),
                              };

                              if (
                                field === "done" &&
                                value === true &&
                                countCompletedGroupSets(group.id, group.slots, updatedDrafts) ===
                                  groupSetCount
                              ) {
                                setExpandedGroupIds((currentGroupIds) =>
                                  getExpandedGroupIdsAfterGroupCompletion({
                                    completedGroupId: group.id,
                                    currentGroupIds,
                                    drafts: updatedDrafts,
                                    groups: workoutTemplate.supersetGroups,
                                  }),
                                );
                              }

                              return updatedDrafts;
                            });
                          }}
                          previousTrainingSessions={previousTrainingSessions}
                          roundIndex={roundIndex}
                          slots={group.slots}
                        />
                      ))}
                    </table>
                  </div>
                </>
              ) : null}
            </section>
          );
        })}
      </div>

      <footer className="training-session-footer">
        <span>
          {completedSetCount}/{plannedSetCount} planned sets completed
        </span>
        {volumeByMovementPattern.length > 0 ? (
          <div className="training-session-volume-inline">
            {volumeByMovementPattern.map((row) => (
              <span key={row.movementPattern}>
                {row.movementPatternLabel}{" "}
                <strong className="training-session-volume-inline__value">{row.volume} kg</strong>
              </span>
            ))}
          </div>
        ) : null}
        <button
          className="training-session-complete-button"
          disabled={completeSession.isPending || completedSession !== null}
          onClick={handleCompleteSession}
          type="button"
        >
          <Save aria-hidden="true" />
          <span>{completedSession ? "Session stored" : "Complete session"}</span>
        </button>
      </footer>
    </section>
  );
}

function TrainingSessionShell({ children }: { children: string }) {
  return (
    <section className="training-session-page" aria-label="Training Session">
      <p className="active-training-plan-loading">{children}</p>
    </section>
  );
}

function RoundSessionRows({
  drafts,
  groupId,
  onDraftChange,
  previousTrainingSessions,
  roundIndex,
  slots,
}: {
  drafts: ExerciseDrafts;
  groupId: string;
  onDraftChange: (
    exerciseKey: string,
    setIndex: number,
    field: keyof SetDraft,
    value: boolean | string,
  ) => void;
  previousTrainingSessions: ReadonlyArray<TrainingSession>;
  roundIndex: number;
  slots: ReadonlyArray<TrainingPlanSlot>;
}) {
  return (
    <tbody aria-label={`Round ${roundIndex} superset`} className="training-session-round">
      {slots.map((slot) => {
        const exerciseKey = getExerciseKey(groupId, slot);
        const draft =
          (drafts[exerciseKey] ?? createDefaultSetDrafts(slot)).find(
            (setDraft) => setDraft.setIndex === roundIndex,
          ) ?? getDefaultSetDraft(slot);

        return (
          <tr
            className={getTrainingSessionRowClassName(draft)}
            key={`${exerciseKey}-set-${roundIndex}`}
          >
            <TrainingSessionSetCells
              draft={draft}
              exerciseKey={exerciseKey}
              onDraftChange={(setIndex, field, value) =>
                onDraftChange(exerciseKey, setIndex, field, value)
              }
              previousTrainingSessions={previousTrainingSessions}
              slot={slot}
            />
          </tr>
        );
      })}
    </tbody>
  );
}

function TrainingSessionSetCells({
  draft,
  exerciseKey,
  onDraftChange,
  previousTrainingSessions,
  slot,
}: {
  draft: SetDraft;
  exerciseKey: string;
  onDraftChange: (setIndex: number, field: keyof SetDraft, value: boolean | string) => void;
  previousTrainingSessions: ReadonlyArray<TrainingSession>;
  slot: TrainingPlanSlot;
}) {
  const inputId = `${exerciseKey}-set-${draft.setIndex}`;
  const repsTarget = getDefaultReps(slot);

  return (
    <>
      <td>{draft.setIndex}</td>
      <td>
        {slot.exerciseName}
        <span className="training-session-prescription">3 x 8-12</span>
      </td>
      <td>{formatMovementPattern(slot.movementPattern)}</td>
      <td>{getPreviousSetLabel(slot, draft.setIndex, previousTrainingSessions)}</td>
      <td>
        <label className="training-session-sr" htmlFor={`${inputId}-weight`}>
          Set {draft.setIndex} weight
        </label>
        <div className="training-session-weight-input">
          <input
            aria-label={`Set ${draft.setIndex} weight`}
            id={`${inputId}-weight`}
            inputMode="decimal"
            min="0"
            onChange={(event) => onDraftChange(draft.setIndex, "weight", event.target.value)}
            type="number"
            value={draft.weight}
          />
          <span>kg</span>
        </div>
      </td>
      <td>
        <label className="training-session-sr" htmlFor={`${inputId}-reps`}>
          Set {draft.setIndex} reps
        </label>
        <input
          aria-label={`Set ${draft.setIndex} reps`}
          className="training-session-reps-input"
          id={`${inputId}-reps`}
          inputMode="numeric"
          min="0"
          onChange={(event) => onDraftChange(draft.setIndex, "reps", event.target.value)}
          type="number"
          value={draft.reps || String(repsTarget)}
        />
      </td>
      <td>
        <label className="training-session-done">
          <input
            aria-label={`Mark ${slot.exerciseName} set ${draft.setIndex} ${
              draft.done ? "not done" : "done"
            }`}
            checked={draft.done}
            onChange={(event) => onDraftChange(draft.setIndex, "done", event.target.checked)}
            type="checkbox"
          />
          <span aria-hidden="true" className="training-session-done__control">
            <span className="training-session-done__mark" />
          </span>
        </label>
      </td>
    </>
  );
}
function getTrainingSessionRowClassName(draft: SetDraft): string {
  return [
    "training-session-exercise-row",
    draft.done ? "training-session-exercise-row--done" : "",
    draft.setIndex === 3 ? "training-session-exercise-row--future" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function getTrainingSessionGroupClassName(isComplete: boolean, isOpen: boolean): string {
  return [
    "training-session-group",
    isComplete ? "training-session-group--complete" : "",
    isComplete && !isOpen ? "training-session-group--complete-closed" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function useTrainingSessionRouteParams(): { planId: string; templateId: string } | null {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const match = /^\/training-plans\/([^/]+)\/sessions\/new\/([^/]+)$/.exec(pathname);

  const planId = match?.[1];
  const templateId = match?.[2];

  if (!planId || !templateId) {
    return null;
  }

  return {
    planId: decodeURIComponent(planId),
    templateId: decodeURIComponent(templateId),
  };
}

function getWorkoutTemplate(
  workoutTemplates: ReadonlyArray<WorkoutTemplate>,
  templateId: string | null,
): WorkoutTemplate | null {
  return workoutTemplates.find((template) => template.id === templateId) ?? null;
}

function getSessionExercises(workoutTemplate: WorkoutTemplate) {
  return workoutTemplate.supersetGroups.flatMap((group) =>
    group.slots.map((slot) => ({
      groupId: group.id,
      slot,
    })),
  );
}

function createInitialDrafts(
  sessionExercises: ReturnType<typeof getSessionExercises>,
): ExerciseDrafts {
  return Object.fromEntries(
    sessionExercises.map(({ groupId, slot }) => [
      getExerciseKey(groupId, slot),
      createDefaultSetDrafts(slot),
    ]),
  );
}

function createDefaultSetDrafts(slot?: TrainingPlanSlot): SetDraft[] {
  const reps = String(getDefaultReps(slot));

  return [
    { done: false, reps, setIndex: 1, weight: "" },
    { done: false, reps, setIndex: 2, weight: "" },
    { done: false, reps, setIndex: 3, weight: "" },
  ];
}

function getDefaultSetDraft(slot?: TrainingPlanSlot): SetDraft {
  return createDefaultSetDrafts(slot)[0] ?? { done: false, reps: "8", setIndex: 1, weight: "" };
}

function createSessionEntries(
  sessionExercises: ReturnType<typeof getSessionExercises>,
  drafts: ExerciseDrafts,
): TrainingSessionExerciseEntry[] {
  return sessionExercises.map(({ groupId, slot }) => ({
    exerciseId: slot.exerciseId,
    exerciseName: slot.exerciseName,
    movementPattern: slot.movementPattern,
    sets: (drafts[getExerciseKey(groupId, slot)] ?? createDefaultSetDrafts(slot)).map((draft) => ({
      reps: Number(draft.reps) || 0,
      setIndex: draft.setIndex,
      weight: Number(draft.weight) || 0,
    })),
  }));
}

function getExerciseKey(groupId: string, slot: TrainingPlanSlot): string {
  return `${groupId}-${slot.exerciseId}-${slot.role}`;
}

function countCompletedSets(drafts: ExerciseDrafts): number {
  return Object.values(drafts).reduce(
    (total, exerciseDrafts) => total + exerciseDrafts.filter((draft) => draft.done).length,
    0,
  );
}

function countCompletedGroupSets(
  groupId: string,
  slots: ReadonlyArray<TrainingPlanSlot>,
  drafts: ExerciseDrafts,
): number {
  return slots.reduce((total, slot) => {
    const exerciseDrafts = drafts[getExerciseKey(groupId, slot)] ?? createDefaultSetDrafts(slot);

    return total + exerciseDrafts.filter((draft) => draft.done).length;
  }, 0);
}

function getExpandedGroupIdsAfterGroupCompletion({
  completedGroupId,
  currentGroupIds,
  drafts,
  groups,
}: {
  completedGroupId: string;
  currentGroupIds: ReadonlyArray<string>;
  drafts: ExerciseDrafts;
  groups: WorkoutTemplate["supersetGroups"];
}): string[] {
  const nextIncompleteGroup = groups
    .slice(groups.findIndex((group) => group.id === completedGroupId) + 1)
    .find(
      (group) => countCompletedGroupSets(group.id, group.slots, drafts) < group.slots.length * 3,
    );
  const nextGroupId = nextIncompleteGroup?.id;
  const updatedGroupIds = currentGroupIds.filter((groupId) => groupId !== completedGroupId);

  if (!nextGroupId || updatedGroupIds.includes(nextGroupId)) {
    return updatedGroupIds;
  }

  return [...updatedGroupIds, nextGroupId];
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

function getDefaultReps(slot?: TrainingPlanSlot): number {
  return slot?.role === "abs" ? 12 : 8;
}

function getPreviousSetLabel(
  slot: TrainingPlanSlot,
  setIndex: number,
  previousTrainingSessions: ReadonlyArray<TrainingSession>,
): string {
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
