import type { DefaultExerciseSlotKey } from "./default-exercise-slots";
import type { SupersetGroup } from "./training-plan";
import {
  createAbsFinisher,
  createFullBodyIsolationFinisher,
  createWorkoutBlock,
} from "./workout-blocks";
import { createNamedExerciseSlot, createSelectionSlot } from "./workout-exercise-slots";
import type { WorkoutTemplateSelections } from "./workout-template-selections";

export function createFullBodySupersetGroups({
  fullBodyFocus,
  isAlternatingFullBodyAB,
  isAllFullBodyPlan,
  selections,
  templateId,
  templateLabel,
}: {
  fullBodyFocus: "upper" | "lower";
  isAlternatingFullBodyAB: boolean;
  isAllFullBodyPlan: boolean;
  selections: WorkoutTemplateSelections;
  templateId: string;
  templateLabel: string;
}): ReadonlyArray<SupersetGroup> {
  if (fullBodyFocus === "lower") {
    // TODO: implement lower-focused Full Body defaults when full-body focus becomes configurable.
  }

  const alternatingFullBodyGroups = isAlternatingFullBodyAB
    ? createAlternatingFullBodySupersetGroups(templateId, templateLabel)
    : null;

  if (alternatingFullBodyGroups) {
    return alternatingFullBodyGroups;
  }

  const groups: SupersetGroup[] = [
    createWorkoutBlock({
      id: `${templateId}-full-body-superset-1`,
      slots: [
        createSelectionSlot(selections.primaryUpperPush, "horizontal_push", "main_compound"),
        createSelectionSlot(selections.primaryUpperPull, "upper_pull_1", "secondary_compound"),
        createSelectionSlot(selections.quadDominant, "quad_dominant", "main_compound"),
      ],
      title: "Full-body superset 1",
      type: "superset",
    }),
    createWorkoutBlock({
      id: `${templateId}-full-body-superset-2`,
      slots: [
        createSelectionSlot(
          selections.secondaryUpperPull,
          getSecondaryUpperPullDefaultSlotKey(selections),
          "main_compound",
        ),
        createSelectionSlot(
          selections.secondaryUpperPush,
          getSecondaryUpperPushDefaultSlotKey(selections),
          "secondary_compound",
        ),
        createSelectionSlot(
          selections.hipHamstringDominant,
          "hip_hamstring_dominant",
          "main_compound",
        ),
      ],
      title: "Full-body superset 2",
      type: "superset",
    }),
    createFullBodyIsolationFinisher(templateId),
  ];

  if (isAllFullBodyPlan) {
    groups.push(createAbsFinisher(templateId));
  }

  return groups;
}

function getSecondaryUpperPullDefaultSlotKey(
  selections: WorkoutTemplateSelections,
): DefaultExerciseSlotKey {
  return selections.primaryUpperPull?.movementPattern === "horizontal_pull"
    ? "upper_pull_1"
    : "upper_pull_2";
}

function getSecondaryUpperPushDefaultSlotKey(
  selections: WorkoutTemplateSelections,
): DefaultExerciseSlotKey {
  return selections.primaryUpperPush?.movementPattern === "vertical_push"
    ? "horizontal_push"
    : "vertical_push";
}

function createAlternatingFullBodySupersetGroups(
  templateId: string,
  templateLabel: string,
): ReadonlyArray<SupersetGroup> | null {
  if (templateLabel === "Full Body A") {
    return [
      createWorkoutBlock({
        id: `${templateId}-full-body-superset-1`,
        slots: [
          createNamedExerciseSlot({
            exerciseId: "flat-dumbbell-bench-press",
            exerciseName: "Flat Dumbbell Bench Press",
            role: "main_compound",
            slotLabel: "Horizontal push",
          }),
          createNamedExerciseSlot({
            exerciseId: "pull-ups",
            exerciseName: "Pull-Ups",
            role: "secondary_compound",
            slotLabel: "Vertical pull",
          }),
          createNamedExerciseSlot({
            exerciseId: "barbell-or-dumbbell-lunges",
            exerciseName: "Barbell or Dumbbell Lunges",
            role: "main_compound",
            slotLabel: "Quad dominant",
          }),
        ],
        title: "Full-body superset 1",
        type: "superset",
      }),
      createWorkoutBlock({
        id: `${templateId}-full-body-superset-2`,
        slots: [
          createNamedExerciseSlot({
            exerciseId: "bent-over-barbell-rows",
            exerciseName: "Bent Over Barbell Rows",
            role: "main_compound",
            slotLabel: "Horizontal pull",
          }),
          createNamedExerciseSlot({
            exerciseId: "standing-overhead-barbell-or-dumbbell-press",
            exerciseName: "Standing Overhead Barbell or Dumbbell Press",
            role: "secondary_compound",
            slotLabel: "Vertical push",
          }),
          createNamedExerciseSlot({
            exerciseId: "barbell-romanian-deadlifts",
            exerciseName: "Barbell Romanian Deadlifts",
            role: "main_compound",
            slotLabel: "Hip/hamstring dominant",
          }),
        ],
        title: "Full-body superset 2",
        type: "superset",
      }),
      createFullBodyIsolationFinisher(templateId),
    ];
  }

  if (templateLabel === "Full Body B") {
    return [
      createWorkoutBlock({
        id: `${templateId}-full-body-superset-1`,
        slots: [
          createNamedExerciseSlot({
            exerciseId: "flat-barbell-bench-press",
            exerciseName: "Flat Barbell Bench Press",
            role: "main_compound",
            slotLabel: "Horizontal push",
          }),
          createNamedExerciseSlot({
            exerciseId: "bent-over-barbell-rows",
            exerciseName: "Bent Over Barbell Rows",
            role: "secondary_compound",
            slotLabel: "Horizontal pull",
          }),
          createNamedExerciseSlot({
            exerciseId: "barbell-squats",
            exerciseName: "Barbell Squats",
            role: "main_compound",
            slotLabel: "Quad dominant",
          }),
        ],
        title: "Full-body superset 1",
        type: "superset",
      }),
      createWorkoutBlock({
        id: `${templateId}-full-body-superset-2`,
        slots: [
          createNamedExerciseSlot({
            exerciseId: "pull-ups",
            exerciseName: "Pull-Ups",
            role: "main_compound",
            slotLabel: "Vertical pull",
          }),
          createNamedExerciseSlot({
            exerciseId: "standing-overhead-barbell-press",
            exerciseName: "Standing Overhead Barbell Press",
            role: "secondary_compound",
            slotLabel: "Vertical push",
          }),
          createNamedExerciseSlot({
            exerciseId: "hyperextensions",
            exerciseName: "Hyperextensions",
            role: "main_compound",
            slotLabel: "Hip/hamstring dominant",
          }),
        ],
        title: "Full-body superset 2",
        type: "superset",
      }),
      createFullBodyIsolationFinisher(templateId),
    ];
  }

  return null;
}
