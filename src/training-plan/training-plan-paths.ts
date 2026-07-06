export const trainingPlanPaths = {
  list: "/training-plans",
  plan: "/training-plans/$planId",
  sessionHistory: "/training-plans/$planId/sessions",
  sessionStartChoice: "/training-plans/$planId/sessions/new",
  sessionStart: "/training-plans/$planId/sessions/new/$templateId",
} as const;

export type TrainingPlanRouteParams = {
  planId: string;
};

export type TrainingSessionRouteParams = TrainingPlanRouteParams & {
  templateId: string;
};

export type TrainingSessionStartSearch = {
  intent?: "extra";
};

export type TrainingPlanRouteTarget = {
  params: TrainingPlanRouteParams;
  to: typeof trainingPlanPaths.plan;
};

export type TrainingSessionHistoryRouteTarget = {
  params: TrainingPlanRouteParams;
  to: typeof trainingPlanPaths.sessionHistory;
};

export type TrainingSessionStartChoiceRouteTarget = {
  params: TrainingPlanRouteParams;
  search?: TrainingSessionStartSearch;
  to: typeof trainingPlanPaths.sessionStartChoice;
};

export type TrainingSessionStartRouteTarget = {
  params: TrainingSessionRouteParams;
  search?: TrainingSessionStartSearch;
  to: typeof trainingPlanPaths.sessionStart;
};

export function getTrainingPlanRouteTarget(planId: string): TrainingPlanRouteTarget {
  return {
    params: { planId },
    to: trainingPlanPaths.plan,
  };
}

export function getTrainingSessionHistoryRouteTarget(
  planId: string,
): TrainingSessionHistoryRouteTarget {
  return {
    params: { planId },
    to: trainingPlanPaths.sessionHistory,
  };
}

export function getTrainingSessionStartChoiceRouteTarget({
  intent,
  planId,
}: TrainingPlanRouteParams & TrainingSessionStartSearch): TrainingSessionStartChoiceRouteTarget {
  return {
    params: { planId },
    ...(intent ? { search: { intent } } : {}),
    to: trainingPlanPaths.sessionStartChoice,
  };
}

export function getTrainingSessionStartRouteTarget({
  intent,
  planId,
  templateId,
}: TrainingSessionRouteParams & TrainingSessionStartSearch): TrainingSessionStartRouteTarget {
  return {
    params: { planId, templateId },
    ...(intent ? { search: { intent } } : {}),
    to: trainingPlanPaths.sessionStart,
  };
}

function getTrainingPlanHref(planId: string): string {
  return `${trainingPlanPaths.list}/${encodeURIComponent(planId)}`;
}

export function getTrainingSessionHistoryHref(planId: string): string {
  return `${getTrainingPlanHref(planId)}/sessions`;
}

export function getTrainingSessionStartChoiceHref(planId: string): string {
  return `${getTrainingSessionHistoryHref(planId)}/new`;
}

export function getTrainingSessionStartHref({
  planId,
  templateId,
}: TrainingSessionRouteParams): string {
  return `${getTrainingSessionStartChoiceHref(planId)}/${encodeURIComponent(templateId)}`;
}

export function parseTrainingPlanPathname(pathname: string): TrainingPlanRouteParams | null {
  const match = /^\/training-plans\/([^/]+)$/.exec(pathname);
  const planId = match?.[1];

  return planId ? { planId: decodeURIComponent(planId) } : null;
}

export function parseTrainingSessionHistoryPathname(
  pathname: string,
): TrainingPlanRouteParams | null {
  const match = /^\/training-plans\/([^/]+)\/sessions$/.exec(pathname);
  const planId = match?.[1];

  return planId ? { planId: decodeURIComponent(planId) } : null;
}

export function parseTrainingSessionStartChoicePathname(
  pathname: string,
): TrainingPlanRouteParams | null {
  const match = /^\/training-plans\/([^/]+)\/sessions\/new$/.exec(pathname);
  const planId = match?.[1];

  return planId ? { planId: decodeURIComponent(planId) } : null;
}

export function parseTrainingSessionStartPathname(
  pathname: string,
): TrainingSessionRouteParams | null {
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

export function parseTrainingSessionStartIntentSearch(search?: string): "extra" | null {
  const value = new URLSearchParams(search ?? "").get("intent");

  return value === "extra" ? "extra" : null;
}

export function isTrainingPlansNavigationPathname(pathname: string): boolean {
  return pathname === trainingPlanPaths.list || parseTrainingPlanPathname(pathname) !== null;
}
