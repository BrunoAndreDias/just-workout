import type { TrainingFrequencyDaysPerWeek } from "../plan-builder/plan-blueprint";
import {
  getWeeklyMovementCoverage,
  type MainCompoundSelection,
  type TrainingSplitId,
  type TrainingSplitSchedule,
} from "../training-taxonomy";

export type WorkoutTemplateBucket = "Full Body" | "Legs" | "Lower" | "Pull" | "Push" | "Upper";

export type WorkoutTemplateDraft = {
  assignedSelections: MainCompoundSelection[];
  bucket: WorkoutTemplateBucket;
  id: string;
  label: string;
};

type CreateAssignedTemplateDraftsOptions = {
  mainCompoundSelections: ReadonlyArray<MainCompoundSelection>;
  schedule: TrainingSplitSchedule;
  split: TrainingSplitId;
  trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek;
};

export function createAssignedTemplateDrafts({
  mainCompoundSelections,
  schedule,
  split,
  trainingFrequencyDaysPerWeek,
}: CreateAssignedTemplateDraftsOptions): WorkoutTemplateDraft[] {
  const templateDrafts = createTemplateDrafts(schedule);
  const coverage = getWeeklyMovementCoverage({
    mainCompoundSelections,
    split,
    trainingFrequencyDaysPerWeek,
  });

  for (const selection of mainCompoundSelections) {
    const coverageRow = coverage.rows.find(
      (row) => row.movementPattern === selection.movementPattern,
    );
    const matchingTemplates = templateDrafts.filter((template) =>
      shouldAssignSelectionToTemplate(template, coverageRow?.bucket),
    );
    const targetTemplates = matchingTemplates.length > 0 ? matchingTemplates : templateDrafts;
    const targetTemplate = getLeastAssignedTemplate(targetTemplates);

    targetTemplate?.assignedSelections.push(selection);
  }

  return templateDrafts;
}

function createTemplateDrafts(schedule: TrainingSplitSchedule): WorkoutTemplateDraft[] {
  const sessionLabels =
    schedule.kind === "fixed-week"
      ? schedule.week
          .map((day) => day.sessionLabel)
          .filter((sessionLabel) => !/rest/i.test(sessionLabel))
      : schedule.cycle.map((session) => session.sessionLabel);
  const labelCounts = sessionLabels.reduce((counts, sessionLabel) => {
    counts.set(sessionLabel, (counts.get(sessionLabel) ?? 0) + 1);

    return counts;
  }, new Map<string, number>());
  const seenLabels = new Map<string, number>();
  const templateDrafts: WorkoutTemplateDraft[] = [];
  const templateLabels = new Set<string>();

  for (const sessionLabel of sessionLabels) {
    const seenCount = seenLabels.get(sessionLabel) ?? 0;
    seenLabels.set(sessionLabel, seenCount + 1);
    const label = getTemplateLabel(sessionLabel, seenCount, labelCounts.get(sessionLabel) ?? 1);

    if (templateLabels.has(label)) {
      continue;
    }

    templateLabels.add(label);
    templateDrafts.push({
      assignedSelections: [],
      bucket: getTemplateBucket(sessionLabel),
      id: `template-${templateDrafts.length + 1}`,
      label,
    });
  }

  return templateDrafts;
}

function getTemplateBucket(sessionLabel: string): WorkoutTemplateBucket {
  if (/upper/i.test(sessionLabel)) {
    return "Upper";
  }

  if (/lower/i.test(sessionLabel)) {
    return "Lower";
  }

  if (/push/i.test(sessionLabel)) {
    return "Push";
  }

  if (/pull/i.test(sessionLabel)) {
    return "Pull";
  }

  if (/legs/i.test(sessionLabel)) {
    return "Legs";
  }

  return "Full Body";
}

function getTemplateLabel(sessionLabel: string, seenCount: number, totalCount: number): string {
  if (hasExplicitTemplateSuffix(sessionLabel)) {
    return sessionLabel;
  }

  if (totalCount === 1 && !/^full body$/i.test(sessionLabel)) {
    return sessionLabel;
  }

  if (/^full body$/i.test(sessionLabel)) {
    return `Full Body ${String.fromCharCode(65 + seenCount)}`;
  }

  return `${sessionLabel} ${String.fromCharCode(65 + seenCount)}`;
}

function hasExplicitTemplateSuffix(sessionLabel: string): boolean {
  return /\s[A-Z]$/.test(sessionLabel);
}

function shouldAssignSelectionToTemplate(template: WorkoutTemplateDraft, bucket?: string): boolean {
  if (!bucket) {
    return false;
  }

  if (template.bucket === "Full Body") {
    return true;
  }

  return template.bucket === bucket;
}

function getLeastAssignedTemplate(
  templates: ReadonlyArray<WorkoutTemplateDraft>,
): WorkoutTemplateDraft | null {
  return (
    [...templates].sort(
      (firstTemplate, secondTemplate) =>
        firstTemplate.assignedSelections.length - secondTemplate.assignedSelections.length,
    )[0] ?? null
  );
}
