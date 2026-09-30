import type { TrainingSessionExecutionState } from "./training-session-execution";

/** In-progress sets older than this are treated as abandoned rather than resumed. */
const MAX_DRAFT_AGE_MS = 18 * 60 * 60 * 1000;
const STORAGE_KEY_PREFIX = "just-workout:training-session-draft";

type StoredTrainingSessionDraft = {
  savedAt: number;
  state: TrainingSessionExecutionState;
};

export function getTrainingSessionDraftStorageKey({
  planId,
  templateId,
}: {
  planId: string;
  templateId: string;
}): string {
  return `${STORAGE_KEY_PREFIX}:${planId}:${templateId}`;
}

/** Restores the in-progress session so a phone reload or tab eviction does not lose logged sets. */
export function loadTrainingSessionDraft(
  key: string,
  now: number = Date.now(),
): TrainingSessionExecutionState | null {
  try {
    const rawDraft = globalThis.localStorage?.getItem(key);

    if (!rawDraft) {
      return null;
    }

    const draft = JSON.parse(rawDraft) as Partial<StoredTrainingSessionDraft>;

    if (
      typeof draft.savedAt !== "number" ||
      now - draft.savedAt > MAX_DRAFT_AGE_MS ||
      !draft.state ||
      typeof draft.state.drafts !== "object" ||
      !Array.isArray(draft.state.expandedGroupIds)
    ) {
      globalThis.localStorage?.removeItem(key);
      return null;
    }

    return draft.state;
  } catch {
    return null;
  }
}

export function saveTrainingSessionDraft(
  key: string,
  state: TrainingSessionExecutionState,
  now: number = Date.now(),
): void {
  try {
    globalThis.localStorage?.setItem(
      key,
      JSON.stringify({ savedAt: now, state } satisfies StoredTrainingSessionDraft),
    );
  } catch {
    // Storage can be unavailable in private windows; the session still works in memory.
  }
}

export function clearTrainingSessionDraft(key: string): void {
  try {
    globalThis.localStorage?.removeItem(key);
  } catch {
    // Nothing to clear when storage is unavailable.
  }
}
