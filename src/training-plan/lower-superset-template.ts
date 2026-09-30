import { createDefaultExerciseSlot } from "./default-exercise-slots";
import type { SupersetGroup } from "./training-plan";
import { createIsolationFinisher, createWorkoutBlock } from "./workout-blocks";
import { createSelectionSlot } from "./workout-exercise-slots";
import type { WorkoutTemplateSelections } from "./workout-template-selections";

export function createLowerSupersetGroups(
  templateId: string,
  selections: WorkoutTemplateSelections,
  variant: "A" | "B" = "A",
): ReadonlyArray<SupersetGroup> {
  if (variant === "B") {
    // Lower B leads with the hip hinge while it is fresh, then the squat pattern.
    return [
      createWorkoutBlock({
        id: `${templateId}-lower-superset-1`,
        slots: [
          createSelectionSlot(
            selections.hipHamstringDominant,
            "hip_hamstring_dominant",
            "main_compound",
          ),
          createDefaultExerciseSlot("quad_secondary_b", "secondary_compound"),
          createDefaultExerciseSlot("abs_1", "abs"),
        ],
        title: "Lower superset 1",
        type: "superset",
      }),
      createWorkoutBlock({
        id: `${templateId}-lower-superset-2`,
        slots: [
          createSelectionSlot(selections.quadDominant, "quad_dominant", "main_compound"),
          createDefaultExerciseSlot("hip_hamstring_secondary", "secondary_compound"),
          createDefaultExerciseSlot("abs_2", "abs"),
        ],
        title: "Lower superset 2",
        type: "superset",
      }),
      createIsolationFinisher(templateId, "Lower isolation", false),
    ];
  }

  return [
    createWorkoutBlock({
      id: `${templateId}-lower-superset-1`,
      slots: [
        createSelectionSlot(selections.quadDominant, "quad_dominant", "main_compound"),
        createDefaultExerciseSlot("hip_hamstring_secondary", "secondary_compound"),
        createDefaultExerciseSlot("abs_1", "abs"),
      ],
      title: "Lower superset 1",
      type: "superset",
    }),
    createWorkoutBlock({
      id: `${templateId}-lower-superset-2`,
      slots: [
        createSelectionSlot(
          selections.hipHamstringDominant,
          "hip_hamstring_dominant",
          "main_compound",
        ),
        createDefaultExerciseSlot("quad_secondary", "secondary_compound"),
        createDefaultExerciseSlot("abs_2", "abs"),
      ],
      title: "Lower superset 2",
      type: "superset",
    }),
    createIsolationFinisher(templateId, "Lower isolation", false),
  ];
}
