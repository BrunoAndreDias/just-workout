import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { CheckCircle2, Dumbbell, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageLead, PageTitle } from "../design-system/typography";
import {
  formatExerciseRole,
  formatMovementPattern,
} from "./active-training-plan/active-training-plan-read-model";
import type { TrainingPlanSlot, WorkoutTemplate } from "./training-plan";
import { trainingPlanService } from "./training-plan-service";
import {
  calculateVolumeByMovementPattern,
  formatSessionMovementPattern,
  type TrainingSession,
  type TrainingSessionExerciseEntry,
} from "./training-session";

type SetDraft = {
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
  const trainingPlan = trainingPlanQuery.data;
  const workoutTemplate = trainingPlan
    ? getWorkoutTemplate(trainingPlan.workoutTemplates, routeParams?.templateId ?? null)
    : null;
  const sessionExercises = useMemo(
    () => (workoutTemplate ? getSessionExercises(workoutTemplate) : []),
    [workoutTemplate],
  );
  const [drafts, setDrafts] = useState<ExerciseDrafts>(() => createInitialDrafts([]));
  const [completedSession, setCompletedSession] = useState<TrainingSession | null>(null);
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

  if (trainingPlanQuery.isLoading) {
    return <TrainingSessionShell>Loading Training Session...</TrainingSessionShell>;
  }

  if (!trainingPlan || !workoutTemplate) {
    return <TrainingSessionShell>Training Session not found.</TrainingSessionShell>;
  }

  const entries = createSessionEntries(sessionExercises, drafts);
  const volumeByMovementPattern = completedSession
    ? completedSession.volumeByMovementPattern
    : calculateVolumeByMovementPattern(entries);

  async function handleCompleteSession() {
    await completeSession.mutateAsync(entries);
  }

  return (
    <section className="training-session-page" aria-label="Training Session">
      <header className="training-session-hero">
        <div>
          <p className="training-session-hero__label">Training Session</p>
          <PageTitle>{workoutTemplate.label} session</PageTitle>
          <PageLead className="training-session-hero__lead">
            Follow the planned supersets and record the load used for each set.
          </PageLead>
        </div>
        <div className="training-session-hero__status">
          <Dumbbell aria-hidden="true" />
          <span>{trainingPlan.split}</span>
        </div>
      </header>

      {completedSession ? (
        <section className="training-session-complete" aria-labelledby="session-complete-title">
          <CheckCircle2 aria-hidden="true" />
          <div>
            <h2 id="session-complete-title">Session completed</h2>
            <p>The Training Session was stored with movement-pattern volume.</p>
          </div>
        </section>
      ) : null}

      <div className="training-session-layout">
        <div className="training-session-work">
          {workoutTemplate.supersetGroups.map((group) => (
            <section
              aria-labelledby={`training-session-group-${group.id}`}
              className="training-session-group"
              key={group.id}
            >
              <header className="training-session-group__header">
                <h2 id={`training-session-group-${group.id}`}>{formatGroupTitle(group.title)}</h2>
                <span>{group.type === "superset" ? "Superset" : "Finisher"}</span>
              </header>

              <div className="training-session-group__rows">
                {group.slots.map((slot) => {
                  const exerciseKey = getExerciseKey(group.id, slot);

                  return (
                    <ExerciseSessionRow
                      drafts={drafts[exerciseKey] ?? createDefaultSetDrafts()}
                      exerciseKey={exerciseKey}
                      key={exerciseKey}
                      onDraftChange={(setIndex, field, value) => {
                        setDrafts((currentDrafts) => ({
                          ...currentDrafts,
                          [exerciseKey]: (
                            currentDrafts[exerciseKey] ?? createDefaultSetDrafts()
                          ).map((draft) =>
                            draft.setIndex === setIndex ? { ...draft, [field]: value } : draft,
                          ),
                        }));
                      }}
                      slot={slot}
                    />
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <aside className="training-session-volume" aria-labelledby="training-session-volume-title">
          <h2 id="training-session-volume-title">Volume by movement pattern</h2>
          <div className="training-session-volume__rows">
            {volumeByMovementPattern.length > 0 ? (
              volumeByMovementPattern.map((row) => (
                <div className="training-session-volume__row" key={row.movementPattern}>
                  <span>{row.movementPatternLabel}</span>
                  <strong>{row.volume} kg</strong>
                </div>
              ))
            ) : (
              <p>Enter weight and reps to calculate session volume.</p>
            )}
          </div>
          <button
            className="training-session-complete-button"
            disabled={completeSession.isPending || completedSession !== null}
            onClick={handleCompleteSession}
            type="button"
          >
            <Save aria-hidden="true" />
            <span>{completedSession ? "Session stored" : "Complete session"}</span>
          </button>
        </aside>
      </div>
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

function ExerciseSessionRow({
  drafts,
  exerciseKey,
  onDraftChange,
  slot,
}: {
  drafts: SetDraft[];
  exerciseKey: string;
  onDraftChange: (setIndex: number, field: keyof SetDraft, value: string) => void;
  slot: TrainingPlanSlot;
}) {
  const movementPatternLabel = formatSessionMovementPattern(slot.movementPattern);
  const roleLabel = formatExerciseRole(slot.role);

  return (
    <fieldset
      aria-label={`${slot.exerciseName} ${movementPatternLabel} ${roleLabel} 3 x 8-12`}
      className="training-session-exercise"
    >
      <legend>
        <span>{slot.exerciseName}</span>
        <small>
          {formatMovementPattern(slot.movementPattern)} · {roleLabel}
          <span className="training-session-prescription">3 x 8-12</span>
        </small>
      </legend>
      <div className="training-session-sets">
        {drafts.map((draft) => (
          <div className="training-session-set" key={`${exerciseKey}-set-${draft.setIndex}`}>
            <span>Set {draft.setIndex}</span>
            <label>
              <span>Weight</span>
              <input
                aria-label={`Set ${draft.setIndex} weight`}
                inputMode="decimal"
                min="0"
                onChange={(event) => onDraftChange(draft.setIndex, "weight", event.target.value)}
                type="number"
                value={draft.weight}
              />
            </label>
            <label>
              <span>Reps</span>
              <input
                aria-label={`Set ${draft.setIndex} reps`}
                inputMode="numeric"
                min="0"
                onChange={(event) => onDraftChange(draft.setIndex, "reps", event.target.value)}
                type="number"
                value={draft.reps}
              />
            </label>
          </div>
        ))}
      </div>
    </fieldset>
  );
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
      createDefaultSetDrafts(),
    ]),
  );
}

function createDefaultSetDrafts(): SetDraft[] {
  return [
    { reps: "8", setIndex: 1, weight: "" },
    { reps: "8", setIndex: 2, weight: "" },
    { reps: "8", setIndex: 3, weight: "" },
  ];
}

function createSessionEntries(
  sessionExercises: ReturnType<typeof getSessionExercises>,
  drafts: ExerciseDrafts,
): TrainingSessionExerciseEntry[] {
  return sessionExercises.map(({ groupId, slot }) => ({
    exerciseId: slot.exerciseId,
    exerciseName: slot.exerciseName,
    movementPattern: slot.movementPattern,
    sets: (drafts[getExerciseKey(groupId, slot)] ?? createDefaultSetDrafts()).map((draft) => ({
      reps: Number(draft.reps) || 0,
      setIndex: draft.setIndex,
      weight: Number(draft.weight) || 0,
    })),
  }));
}

function getExerciseKey(groupId: string, slot: TrainingPlanSlot): string {
  return `${groupId}-${slot.exerciseId}-${slot.role}`;
}

function formatGroupTitle(title: string): string {
  return title.replace(/Full-body superset /i, "Superset ");
}
