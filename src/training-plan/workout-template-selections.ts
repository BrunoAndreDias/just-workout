import type { MainCompoundSelection } from "../training-taxonomy";

export type WorkoutTemplateSelections = {
  hipHamstringDominant: MainCompoundSelection | null;
  primaryUpperPull: MainCompoundSelection | null;
  primaryUpperPush: MainCompoundSelection | null;
  quadDominant: MainCompoundSelection | null;
  secondaryUpperPull: MainCompoundSelection | null;
  secondaryUpperPush: MainCompoundSelection | null;
};

export function getWorkoutTemplateSelections(
  assignedSelections: ReadonlyArray<MainCompoundSelection>,
): WorkoutTemplateSelections {
  const horizontalPull = getSelectionForPattern(assignedSelections, "horizontal_pull");
  const verticalPull = getSelectionForPattern(assignedSelections, "vertical_pull");
  const horizontalPush = getSelectionForPattern(assignedSelections, "horizontal_push");
  const verticalPush = getSelectionForPattern(assignedSelections, "vertical_push");
  const primaryUpperPull = horizontalPull ?? verticalPull;
  const secondaryUpperPull = getAlternateUpperSelection({
    firstSelection: primaryUpperPull,
    secondSelection: verticalPull ?? horizontalPull,
  });
  const primaryUpperPush = horizontalPush ?? verticalPush;
  const secondaryUpperPush = getAlternateUpperSelection({
    firstSelection: primaryUpperPush,
    secondSelection: verticalPush ?? horizontalPush,
  });
  const quadDominant = getSelectionForPattern(assignedSelections, "quad_dominant");
  const hipHamstringDominant = getSelectionForPattern(assignedSelections, "hip_hamstring_dominant");

  return {
    hipHamstringDominant,
    primaryUpperPull,
    primaryUpperPush,
    quadDominant,
    secondaryUpperPull,
    secondaryUpperPush,
  };
}

function getSelectionForPattern(
  selections: ReadonlyArray<MainCompoundSelection>,
  movementPattern: MainCompoundSelection["movementPattern"],
): MainCompoundSelection | null {
  return selections.find((selection) => selection.movementPattern === movementPattern) ?? null;
}

function getAlternateUpperSelection({
  firstSelection,
  secondSelection,
}: {
  firstSelection: MainCompoundSelection | null;
  secondSelection: MainCompoundSelection | null;
}): MainCompoundSelection | null {
  if (!secondSelection || secondSelection.exerciseId === firstSelection?.exerciseId) {
    return null;
  }

  return secondSelection;
}
