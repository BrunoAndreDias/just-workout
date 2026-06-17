import type { SupersetGroup } from "./training-plan";
import { createIsolationFinisher, createWorkoutBlock } from "./workout-blocks";
import { createSelectionSlot } from "./workout-exercise-slots";
import type { WorkoutTemplateSelections } from "./workout-template-selections";

export function createUpperSupersetGroups(
  templateId: string,
  selections: WorkoutTemplateSelections,
): ReadonlyArray<SupersetGroup> {
  const groups: SupersetGroup[] = [
    createWorkoutBlock({
      id: `${templateId}-upper-superset-1`,
      slots: [
        createSelectionSlot(selections.primaryUpperPush, "horizontal_push", "main_compound"),
        createSelectionSlot(selections.primaryUpperPull, "upper_pull_1", "secondary_compound"),
        createSelectionSlot(null, "abs_1", "abs"),
      ],
      title: "Upper superset 1",
      type: "superset",
    }),
    createWorkoutBlock({
      id: `${templateId}-upper-superset-2`,
      slots: [
        createSelectionSlot(selections.secondaryUpperPull, "upper_pull_2", "main_compound"),
        createSelectionSlot(selections.secondaryUpperPush, "vertical_push", "secondary_compound"),
        createSelectionSlot(null, "abs_2", "abs"),
      ],
      title: "Upper superset 2",
      type: "superset",
    }),
  ];

  if (selections.quadDominant || selections.hipHamstringDominant) {
    groups.push(
      createWorkoutBlock({
        id: `${templateId}-lower-superset`,
        slots: [
          createSelectionSlot(selections.quadDominant, "quad_dominant", "main_compound"),
          createSelectionSlot(
            selections.hipHamstringDominant,
            "hip_hamstring_dominant",
            "main_compound",
          ),
        ],
        title: "Lower superset",
        type: "superset",
      }),
    );
  }

  groups.push(createIsolationFinisher(templateId, "Upper isolation", false));

  return groups;
}
