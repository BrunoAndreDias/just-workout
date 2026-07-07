import type { TrainingSession } from "./training-session";

export function getCompletedTrainingSessionsNewestFirst(
  sessions: ReadonlyArray<TrainingSession>,
): Array<TrainingSession> {
  return [...sessions]
    .filter((session) => session.completedAt !== null)
    .sort((firstSession, secondSession) =>
      (secondSession.completedAt ?? "").localeCompare(firstSession.completedAt ?? ""),
    );
}
