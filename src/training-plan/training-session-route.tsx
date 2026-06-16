import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { CheckCircle2, ChevronDown, ChevronUp, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  formatExerciseRole,
  formatMovementPattern,
} from "./active-training-plan/active-training-plan-read-model";
import { isBodyweightLoadExercise } from "./bodyweight-load";
import { calculateVolumeByMovementPattern } from "./completed-load-volume";
import type { SupersetGroup, TrainingPlanSlot } from "./training-plan";
import {
  trainingPlanQueryOptions,
  trainingPlanSessionsQueryOptions,
} from "./training-plan-query-options";
import { trainingPlanService } from "./training-plan-service";
import type { TrainingSession, TrainingSessionExerciseEntry } from "./training-session";
import {
  applyTrainingSessionDraftChange,
  countCompletedTrainingSessionSets,
  createDefaultTrainingSessionSetDrafts,
  createInitialTrainingSessionDrafts,
  createTrainingSessionEntries,
  createTrainingSessionExercises,
  getDefaultTrainingSessionSetDraft,
  getExpandedTrainingSessionGroupIdsAfterCompletion,
  getPreviousTrainingSessionSetLabel,
  getTrainingSessionDefaultReps,
  getTrainingSessionExerciseKey,
  getTrainingSessionGroupProgress,
  type TrainingSessionExerciseDrafts,
  type TrainingSessionSetDraft,
} from "./training-session-execution";
import {
  getWorkoutTemplateForTrainingSessionRoute,
  parseTrainingSessionRoutePathname,
} from "./training-session-route-read-model";

export function TrainingSessionRoute() {
  const routeParams = useTrainingSessionRouteParams();
  const trainingPlanQuery = useQuery(trainingPlanQueryOptions(routeParams?.planId ?? null));
  const trainingSessionsQuery = useQuery(
    trainingPlanSessionsQueryOptions(routeParams?.planId ?? null),
  );
  const trainingPlan = trainingPlanQuery.data;
  const previousTrainingSessions = trainingSessionsQuery.data ?? [];
  const workoutTemplate = trainingPlan
    ? getWorkoutTemplateForTrainingSessionRoute({
        templateId: routeParams?.templateId ?? null,
        workoutTemplates: trainingPlan.workoutTemplates,
      })
    : null;
  const sessionExercises = useMemo(
    () => (workoutTemplate ? createTrainingSessionExercises(workoutTemplate) : []),
    [workoutTemplate],
  );
  const [drafts, setDrafts] = useState<TrainingSessionExerciseDrafts>(() =>
    createInitialTrainingSessionDrafts([]),
  );
  const [completedSession, setCompletedSession] = useState<TrainingSession | null>(null);
  const [expandedGroupIds, setExpandedGroupIds] = useState<ReadonlyArray<string>>([]);
  const startingLoadSuggestions = trainingPlan?.startingLoadSuggestions ?? [];
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
      Object.keys(currentDrafts).length > 0
        ? currentDrafts
        : createInitialTrainingSessionDrafts(sessionExercises, startingLoadSuggestions),
    );
  }, [sessionExercises, startingLoadSuggestions]);

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

  const entries = createTrainingSessionEntries(sessionExercises, drafts);
  const completedSetCount = countCompletedTrainingSessionSets(drafts);
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
        {workoutTemplate.supersetGroups.map((group, groupIndex) => (
          <TrainingSessionGroup
            drafts={drafts}
            expandedGroupIds={expandedGroupIds}
            group={group}
            groupIndex={groupIndex}
            groups={workoutTemplate.supersetGroups}
            key={group.id}
            previousTrainingSessions={previousTrainingSessions}
            setDrafts={setDrafts}
            setExpandedGroupIds={setExpandedGroupIds}
            workoutTemplateLabel={workoutTemplate.label}
          />
        ))}
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

function TrainingSessionGroup({
  drafts,
  expandedGroupIds,
  group,
  groupIndex,
  groups,
  previousTrainingSessions,
  setDrafts,
  setExpandedGroupIds,
  workoutTemplateLabel,
}: {
  drafts: TrainingSessionExerciseDrafts;
  expandedGroupIds: ReadonlyArray<string>;
  group: SupersetGroup;
  groupIndex: number;
  groups: ReadonlyArray<SupersetGroup>;
  previousTrainingSessions: ReadonlyArray<TrainingSession>;
  setDrafts: (
    updater: (drafts: TrainingSessionExerciseDrafts) => TrainingSessionExerciseDrafts,
  ) => void;
  setExpandedGroupIds: (
    updater: (groupIds: ReadonlyArray<string>) => ReadonlyArray<string>,
  ) => void;
  workoutTemplateLabel: string;
}) {
  const isOpen = expandedGroupIds.includes(group.id);
  const groupProgress = getTrainingSessionGroupProgress({
    drafts,
    groupId: group.id,
    slots: group.slots,
  });
  const groupTitle = formatGroupTitle(group.title, workoutTemplateLabel, groupIndex);

  return (
    <section
      aria-labelledby={`training-session-group-${group.id}`}
      className={getTrainingSessionGroupClassName(groupProgress.isComplete, isOpen)}
    >
      <header className="training-session-group__header">
        <div>
          <h2
            aria-label={formatAccessibleGroupTitle(group.title)}
            id={`training-session-group-${group.id}`}
          >
            {groupTitle}
          </h2>
          <TrainingSessionGroupSummary
            group={group}
            groupProgress={groupProgress}
            isOpen={isOpen}
          />
        </div>
        <button
          aria-expanded={isOpen}
          aria-label={`${isOpen ? "Collapse" : "Expand"} ${groupTitle}`}
          className="training-session-group__toggle"
          onClick={() => toggleTrainingSessionGroup(group.id, setExpandedGroupIds)}
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
          <TrainingSessionNow group={group} />
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
                    updateTrainingSessionGroupDraft({
                      exerciseKey,
                      field,
                      group,
                      groups,
                      setDrafts,
                      setExpandedGroupIds,
                      setIndex,
                      value,
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
}

function TrainingSessionGroupSummary({
  group,
  groupProgress,
  isOpen,
}: {
  group: SupersetGroup;
  groupProgress: ReturnType<typeof getTrainingSessionGroupProgress>;
  isOpen: boolean;
}) {
  return (
    <p>
      {groupProgress.isComplete && !isOpen ? (
        <>
          <strong className="training-session-group__complete-state">
            <CheckCircle2 aria-hidden="true" />
            Complete
          </strong>
          <span>{groupProgress.plannedSetCount} sets logged</span>
        </>
      ) : isOpen ? (
        <>
          <span>Superset</span>
          <span>3 rounds</span>
          <strong className="training-session-group__sets-completed">
            {groupProgress.completedSetCount}/{groupProgress.plannedSetCount} sets completed
          </strong>
        </>
      ) : (
        <>
          <span>{group.slots.length} exercises</span>
          <span>{groupProgress.plannedSetCount} planned sets</span>
        </>
      )}
    </p>
  );
}

function TrainingSessionNow({ group }: { group: SupersetGroup }) {
  return (
    <p className="training-session-now">
      <span>Now</span>
      <strong
        className="training-session-now__exercise"
        data-exercise={group.slots[0]?.exerciseName ?? "Exercise"}
      />
      <small>
        {formatMovementPattern(group.slots[0]?.movementPattern ?? "horizontal_push")} ·{" "}
        {formatExerciseRole(group.slots[0]?.role ?? "main_compound")} · Set 1 of 3 · Target 8-12
        reps
        <span className="training-session-prescription">3 x 8-12</span>
      </small>
    </p>
  );
}

function toggleTrainingSessionGroup(
  groupId: string,
  setExpandedGroupIds: (
    updater: (groupIds: ReadonlyArray<string>) => ReadonlyArray<string>,
  ) => void,
) {
  setExpandedGroupIds((currentGroupIds) =>
    currentGroupIds.includes(groupId)
      ? currentGroupIds.filter((currentGroupId) => currentGroupId !== groupId)
      : [...currentGroupIds, groupId],
  );
}

function updateTrainingSessionGroupDraft({
  exerciseKey,
  field,
  group,
  groups,
  setDrafts,
  setExpandedGroupIds,
  setIndex,
  value,
}: {
  exerciseKey: string;
  field: keyof TrainingSessionSetDraft;
  group: SupersetGroup;
  groups: ReadonlyArray<SupersetGroup>;
  setDrafts: (
    updater: (drafts: TrainingSessionExerciseDrafts) => TrainingSessionExerciseDrafts,
  ) => void;
  setExpandedGroupIds: (
    updater: (groupIds: ReadonlyArray<string>) => ReadonlyArray<string>,
  ) => void;
  setIndex: number;
  value: boolean | string;
}) {
  setDrafts((currentDrafts) => {
    const slot = group.slots.find(
      (groupSlot) => getTrainingSessionExerciseKey(group.id, groupSlot) === exerciseKey,
    );

    if (!slot) {
      return currentDrafts;
    }

    const updatedDrafts = applyTrainingSessionDraftChange({
      drafts: currentDrafts,
      exerciseKey,
      field,
      setIndex,
      slot,
      value,
    });

    if (
      field === "done" &&
      value === true &&
      getTrainingSessionGroupProgress({
        drafts: updatedDrafts,
        groupId: group.id,
        slots: group.slots,
      }).isComplete
    ) {
      setExpandedGroupIds((currentGroupIds) =>
        getExpandedTrainingSessionGroupIdsAfterCompletion({
          completedGroupId: group.id,
          currentGroupIds,
          drafts: updatedDrafts,
          groups,
        }),
      );
    }

    return updatedDrafts;
  });
}

function RoundSessionRows({
  drafts,
  groupId,
  onDraftChange,
  previousTrainingSessions,
  roundIndex,
  slots,
}: {
  drafts: TrainingSessionExerciseDrafts;
  groupId: string;
  onDraftChange: (
    exerciseKey: string,
    setIndex: number,
    field: keyof TrainingSessionSetDraft,
    value: boolean | string,
  ) => void;
  previousTrainingSessions: ReadonlyArray<TrainingSession>;
  roundIndex: number;
  slots: ReadonlyArray<TrainingPlanSlot>;
}) {
  return (
    <tbody aria-label={`Round ${roundIndex} superset`} className="training-session-round">
      {slots.map((slot) => {
        const exerciseKey = getTrainingSessionExerciseKey(groupId, slot);
        const draft =
          (drafts[exerciseKey] ?? createDefaultTrainingSessionSetDrafts(slot)).find(
            (setDraft) => setDraft.setIndex === roundIndex,
          ) ?? getDefaultTrainingSessionSetDraft(slot);

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
  draft: TrainingSessionSetDraft;
  exerciseKey: string;
  onDraftChange: (
    setIndex: number,
    field: keyof TrainingSessionSetDraft,
    value: boolean | string,
  ) => void;
  previousTrainingSessions: ReadonlyArray<TrainingSession>;
  slot: TrainingPlanSlot;
}) {
  const inputId = `${exerciseKey}-set-${draft.setIndex}`;
  const repsTarget = getTrainingSessionDefaultReps(slot);

  return (
    <>
      <td>{draft.setIndex}</td>
      <td>
        {slot.exerciseName}
        <span className="training-session-prescription">3 x 8-12</span>
      </td>
      <td>{formatMovementPattern(slot.movementPattern)}</td>
      <td>
        {getPreviousTrainingSessionSetLabel({
          previousTrainingSessions,
          setIndex: draft.setIndex,
          slot,
        })}
      </td>
      <td>
        <label className="training-session-sr" htmlFor={`${inputId}-weight`}>
          Set {draft.setIndex} weight
        </label>
        <div className="training-session-weight-input">
          <input
            aria-label={`Set ${draft.setIndex} weight`}
            id={`${inputId}-weight`}
            inputMode="decimal"
            min={isBodyweightLoadExercise(slot) ? "-200" : "0"}
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
function getTrainingSessionRowClassName(draft: TrainingSessionSetDraft): string {
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

  return parseTrainingSessionRoutePathname(pathname);
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
