import type { PlanBlueprint } from "../plan-builder/plan-blueprint";
import { createFullBodySupersetGroups } from "./full-body-template";
import { createLowerSupersetGroups } from "./lower-superset-template";
import type { WorkoutTemplateDraft } from "./template-draft-assignment";
import type { SupersetGroup, WorkoutTemplate } from "./training-plan";
import { createUpperSupersetGroups } from "./upper-superset-template";
import { getWorkoutTemplateSelections } from "./workout-template-selections";

type CreateWorkoutTemplatesOptions = {
  split: NonNullable<PlanBlueprint["split"]>;
  templateDrafts: ReadonlyArray<WorkoutTemplateDraft>;
};

export function createWorkoutTemplates({
  split,
  templateDrafts,
}: CreateWorkoutTemplatesOptions): ReadonlyArray<WorkoutTemplate> {
  return templateDrafts.map((template) => ({
    id: template.id,
    label: template.label,
    supersetGroups: createSupersetGroups({
      fullBodyFocus: "upper",
      isAlternatingFullBodyAB: split === "alternating-full-body-a-b",
      isAllFullBodyPlan: isAllFullBodySplit(split),
      template,
    }),
  }));
}

function createSupersetGroups({
  fullBodyFocus,
  isAlternatingFullBodyAB,
  isAllFullBodyPlan,
  template,
}: {
  // TODO: expose Full-Body Template Focus as a Plan Builder configuration once the UI supports it.
  fullBodyFocus: "upper" | "lower";
  isAlternatingFullBodyAB: boolean;
  isAllFullBodyPlan: boolean;
  template: WorkoutTemplateDraft;
}): ReadonlyArray<SupersetGroup> {
  const selections = getWorkoutTemplateSelections(template.assignedSelections);

  if (template.bucket === "Full Body") {
    return createFullBodySupersetGroups({
      fullBodyFocus,
      isAlternatingFullBodyAB,
      isAllFullBodyPlan,
      selections,
      templateId: template.id,
      templateLabel: template.label,
    });
  }

  if (template.bucket === "Lower" || template.bucket === "Legs") {
    return createLowerSupersetGroups(template.id, selections);
  }

  return createUpperSupersetGroups(template.id, selections);
}

function isAllFullBodySplit(split: NonNullable<PlanBlueprint["split"]>): boolean {
  return (
    split === "alternating-full-body-a-b" ||
    split === "full-body-2-day" ||
    split === "full-body-3-day"
  );
}
