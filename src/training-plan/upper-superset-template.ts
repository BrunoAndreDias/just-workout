import { createDefaultExerciseSlot } from "./default-exercise-slots";
import type { SupersetGroup } from "./training-plan";
import { createIsolationFinisher, createWorkoutBlock } from "./workout-blocks";
import { createSelectionSlot } from "./workout-exercise-slots";
import type { WorkoutTemplateSelections } from "./workout-template-selections";

export function createUpperSupersetGroups(
  templateId: string,
  selections: WorkoutTemplateSelections,
  variant: "A" | "B" = "A",
): ReadonlyArray<SupersetGroup> {
  if (variant === "B") {
    return createUpperBSupersetGroups(templateId, selections);
  }

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

/**
 * Upper B leads with the vertical patterns (overhead press, pull-ups) that Upper A trains as
 * secondary work, pairs them with horizontal variations of Upper A's main lifts, and finishes
 * with shoulders and a different curl, mirroring the classic Upper A/B layout.
 */
function createUpperBSupersetGroups(
  templateId: string,
  selections: WorkoutTemplateSelections,
): ReadonlyArray<SupersetGroup> {
  const verticalPull = pickPattern(selections, "vertical_pull");
  const verticalPush = pickPattern(selections, "vertical_push");

  return [
    createWorkoutBlock({
      id: `${templateId}-upper-superset-1`,
      slots: [
        createSelectionSlot(verticalPush, "vertical_push", "main_compound"),
        createDefaultExerciseSlot("horizontal_pull_variation", "secondary_compound"),
        createSelectionSlot(null, "abs_1", "abs"),
      ],
      title: "Upper superset 1",
      type: "superset",
    }),
    createWorkoutBlock({
      id: `${templateId}-upper-superset-2`,
      slots: [
        createSelectionSlot(verticalPull, "upper_pull_1", "main_compound"),
        createDefaultExerciseSlot("horizontal_push_variation", "secondary_compound"),
        createSelectionSlot(null, "abs_2", "abs"),
      ],
      title: "Upper superset 2",
      type: "superset",
    }),
    {
      id: `${templateId}-isolation`,
      slots: [
        createDefaultExerciseSlot("lateral_raise", "isolation"),
        createDefaultExerciseSlot("upper_isolation_b", "isolation"),
      ],
      title: "Isolation finisher",
      type: "isolation",
    },
  ];
}

function pickPattern(
  selections: WorkoutTemplateSelections,
  movementPattern: "vertical_pull" | "vertical_push",
) {
  return (
    [
      selections.primaryUpperPull,
      selections.secondaryUpperPull,
      selections.primaryUpperPush,
      selections.secondaryUpperPush,
    ].find((selection) => selection?.movementPattern === movementPattern) ?? null
  );
}
