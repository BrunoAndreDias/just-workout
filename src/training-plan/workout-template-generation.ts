import type { PlanBlueprint } from "../plan-builder/plan-blueprint";
import type { MainCompoundSelection } from "../training-taxonomy";
import { createFullBodySupersetGroups } from "./full-body-template";
import { createLowerSupersetGroups } from "./lower-superset-template";
import { createPullSupersetGroups, createPushSupersetGroups } from "./push-pull-template";
import type { WorkoutTemplateDraft } from "./template-draft-assignment";
import type { SupersetGroup, WorkoutTemplate } from "./training-plan";
import { createUpperSupersetGroups } from "./upper-superset-template";
import {
  getWorkoutTemplateSelections,
  type WorkoutTemplateSelections,
} from "./workout-template-selections";

type CreateWorkoutTemplatesOptions = {
  split: NonNullable<PlanBlueprint["split"]>;
  templateDrafts: ReadonlyArray<WorkoutTemplateDraft>;
};

export function createWorkoutTemplates({
  split,
  templateDrafts,
}: CreateWorkoutTemplatesOptions): ReadonlyArray<WorkoutTemplate> {
  const planSelections = templateDrafts.flatMap((template) => template.assignedSelections);

  return templateDrafts.map((template) => ({
    id: template.id,
    label: template.label,
    purpose: "strength",
    supersetGroups: createSupersetGroups({
      fullBodyFocus: "upper",
      isAlternatingFullBodyAB: split === "alternating-full-body-a-b",
      isMixedUpperLowerFullBody: split === "upper-lower-full-body",
      planSelections,
      template,
    }),
  }));
}

function createSupersetGroups({
  fullBodyFocus,
  isAlternatingFullBodyAB,
  isMixedUpperLowerFullBody,
  planSelections,
  template,
}: {
  // TODO: expose Full-Body Template Focus as a Plan Builder configuration once the UI supports it.
  fullBodyFocus: "upper" | "lower";
  isAlternatingFullBodyAB: boolean;
  isMixedUpperLowerFullBody: boolean;
  planSelections: ReadonlyArray<MainCompoundSelection>;
  template: WorkoutTemplateDraft;
}): ReadonlyArray<SupersetGroup> {
  const selections = getWorkoutTemplateSelections(template.assignedSelections);
  const variant = / B$/.test(template.label) ? "B" : "A";
  const { lowerSelections, upperSelections } = getRegionSelections(planSelections);

  switch (template.bucket) {
    case "Full Body":
      return createFullBodySupersetGroups({
        fullBodyFocus,
        isAlternatingFullBodyAB,
        selections: isMixedUpperLowerFullBody
          ? getMixedFullBodySelections(planSelections)
          : selections,
        templateId: template.id,
        templateLabel: template.label,
      });
    case "Push":
      return createPushSupersetGroups(template.id, upperSelections, variant);
    case "Pull":
      return createPullSupersetGroups(template.id, upperSelections, variant);
    case "Legs":
      return createLowerSupersetGroups(template.id, lowerSelections, variant);
    case "Lower":
      return createLowerSupersetGroups(
        template.id,
        getSplitDaySelections(variant, lowerSelections, selections),
        variant,
      );
    case "Upper":
      return createUpperSupersetGroups(
        template.id,
        getSplitDaySelections(variant, upperSelections, selections),
        variant,
      );
  }
}

// The Upper day already leads with the horizontal press, so the Full Body day leads with the
// overhead press.
function getMixedFullBodySelections(
  planSelections: ReadonlyArray<MainCompoundSelection>,
): WorkoutTemplateSelections {
  return swapUpperPushEmphasis(getWorkoutTemplateSelections(planSelections));
}

// Upper/Lower A days use the template's own selections; B days lead with the region's other lifts.
function getSplitDaySelections(
  variant: "A" | "B",
  regionSelections: WorkoutTemplateSelections,
  templateSelections: WorkoutTemplateSelections,
): WorkoutTemplateSelections {
  return variant === "B" ? regionSelections : templateSelections;
}

// Split-day templates reuse the plan's chosen lifts for their region; A and B variants lead
// with different main patterns so every Movement Pattern gets a main-compound slot.
function getRegionSelections(planSelections: ReadonlyArray<MainCompoundSelection>): {
  lowerSelections: WorkoutTemplateSelections;
  upperSelections: WorkoutTemplateSelections;
} {
  const lower: MainCompoundSelection[] = [];
  const upper: MainCompoundSelection[] = [];
  for (const selection of planSelections) {
    (isLowerMovementPattern(selection.movementPattern) ? lower : upper).push(selection);
  }

  return {
    lowerSelections: getWorkoutTemplateSelections(lower),
    upperSelections: getWorkoutTemplateSelections(upper),
  };
}

function swapUpperPushEmphasis(selections: WorkoutTemplateSelections): WorkoutTemplateSelections {
  if (!selections.primaryUpperPush || !selections.secondaryUpperPush) {
    return selections;
  }

  return {
    ...selections,
    primaryUpperPush: selections.secondaryUpperPush,
    secondaryUpperPush: selections.primaryUpperPush,
  };
}

function isLowerMovementPattern(
  movementPattern: MainCompoundSelection["movementPattern"],
): boolean {
  return movementPattern === "quad_dominant" || movementPattern === "hip_hamstring_dominant";
}
