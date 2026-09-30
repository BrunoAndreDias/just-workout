import type { DefaultExerciseSlotKey } from "./default-exercise-slots";
import { createDefaultExerciseSlot } from "./default-exercise-slots";
import type { SupersetGroup } from "./training-plan";
import { createWorkoutBlock } from "./workout-blocks";
import { createSelectionSlot } from "./workout-exercise-slots";
import type { WorkoutTemplateSelections } from "./workout-template-selections";

type PushPullPattern = "horizontal_pull" | "horizontal_push" | "vertical_pull" | "vertical_push";

const defaultSlotKeyByPattern = {
  horizontal_pull: "upper_pull_2",
  horizontal_push: "horizontal_push",
  vertical_pull: "upper_pull_1",
  vertical_push: "vertical_push",
} as const satisfies Record<PushPullPattern, DefaultExerciseSlotKey>;

// B days use a variation for the secondary lift so it is not the same exercise as A's main lift.
const variationSlotKeyByPattern = {
  horizontal_pull: "horizontal_pull_variation",
  horizontal_push: "horizontal_push_variation",
  vertical_pull: "upper_pull_1",
  vertical_push: "vertical_push",
} as const satisfies Record<PushPullPattern, DefaultExerciseSlotKey>;

/**
 * Push days pair each press with abs, then finish with shoulders and triceps. Push A leads with
 * the horizontal press and Push B with the overhead press, so both get a main-compound slot.
 */
export function createPushSupersetGroups(
  templateId: string,
  selections: WorkoutTemplateSelections,
  variant: "A" | "B",
): ReadonlyArray<SupersetGroup> {
  const [mainPattern, secondaryPattern] =
    variant === "A"
      ? (["horizontal_push", "vertical_push"] as const)
      : (["vertical_push", "horizontal_push"] as const);

  return createPushPullGroups({
    finisher: ["lateral_raise", "upper_isolation_2"],
    mainPattern,
    variant,
    secondaryPattern,
    selections,
    templateId,
    title: "Push",
  });
}

/**
 * Pull days mirror push days: Pull A leads with the row and Pull B with the vertical pull, then
 * finish with rear delts and biceps.
 */
export function createPullSupersetGroups(
  templateId: string,
  selections: WorkoutTemplateSelections,
  variant: "A" | "B",
): ReadonlyArray<SupersetGroup> {
  const [mainPattern, secondaryPattern] =
    variant === "A"
      ? (["horizontal_pull", "vertical_pull"] as const)
      : (["vertical_pull", "horizontal_pull"] as const);

  return createPushPullGroups({
    finisher:
      variant === "A" ? ["rear_delt", "upper_isolation_1"] : ["rear_delt", "upper_isolation_b"],
    mainPattern,
    variant,
    secondaryPattern,
    selections,
    templateId,
    title: "Pull",
  });
}

function createPushPullGroups({
  finisher,
  mainPattern,
  secondaryPattern,
  selections,
  templateId,
  title,
  variant,
}: {
  finisher: readonly [DefaultExerciseSlotKey, DefaultExerciseSlotKey];
  mainPattern: PushPullPattern;
  secondaryPattern: PushPullPattern;
  selections: WorkoutTemplateSelections;
  templateId: string;
  title: "Pull" | "Push";
  variant: "A" | "B";
}): ReadonlyArray<SupersetGroup> {
  const prefix = title.toLowerCase();

  return [
    createWorkoutBlock({
      id: `${templateId}-${prefix}-superset-1`,
      slots: [
        createSelectionSlot(
          pickPattern(selections, mainPattern),
          defaultSlotKeyByPattern[mainPattern],
          "main_compound",
        ),
        createDefaultExerciseSlot("abs_1", "abs"),
      ],
      title: `${title} superset 1`,
      type: "superset",
    }),
    createWorkoutBlock({
      id: `${templateId}-${prefix}-superset-2`,
      slots: [
        variant === "B"
          ? createDefaultExerciseSlot(
              variationSlotKeyByPattern[secondaryPattern],
              "secondary_compound",
            )
          : createSelectionSlot(
              pickPattern(selections, secondaryPattern),
              defaultSlotKeyByPattern[secondaryPattern],
              "secondary_compound",
            ),
        createDefaultExerciseSlot("abs_2", "abs"),
      ],
      title: `${title} superset 2`,
      type: "superset",
    }),
    {
      id: `${templateId}-isolation`,
      slots: finisher.map((slotKey) => createDefaultExerciseSlot(slotKey, "isolation")),
      title: "Isolation finisher",
      type: "isolation",
    },
  ];
}

function pickPattern(selections: WorkoutTemplateSelections, movementPattern: PushPullPattern) {
  return (
    [
      selections.primaryUpperPull,
      selections.secondaryUpperPull,
      selections.primaryUpperPush,
      selections.secondaryUpperPush,
    ].find((selection) => selection?.movementPattern === movementPattern) ?? null
  );
}
