import {
  type CompoundCapableMovementPatternId,
  type ExerciseCatalogExercise,
  getExerciseCatalogExercisesByMovementPattern,
  isMainCompoundEligible,
} from "./exercise-catalog";
import type {
  ExerciseFoundationCompoundOption,
  MainCompoundPickerFilterId,
} from "./exercise-foundation-read-model";

type PickerFilterRule = {
  id: MainCompoundPickerFilterId;
  nameIncludes?: ReadonlyArray<string>;
  namePatterns?: ReadonlyArray<RegExp>;
  textIncludes?: ReadonlyArray<string>;
};

const pickerFilterLabels = {
  all: "Equipment",
  barbell: "Barbell",
  beginner_friendly: "Beginner-friendly",
  bodyweight: "Bodyweight",
  dumbbells: "Dumbbells",
  joint_friendly: "Joint-friendly",
  machine: "Machine",
} as const satisfies Record<MainCompoundPickerFilterId, string>;

const pickerFilterRules: ReadonlyArray<PickerFilterRule> = [
  {
    id: "barbell",
    namePatterns: [/\bbarbell\b/],
    textIncludes: ["barbell"],
  },
  {
    id: "dumbbells",
    namePatterns: [/\bdumbbell\b/],
    textIncludes: ["dumbbell"],
  },
  {
    id: "machine",
    nameIncludes: ["machine"],
    textIncludes: ["machine"],
  },
  {
    id: "bodyweight",
    textIncludes: ["pull-up", "push-up", "chin-up", "inverted-rows", "dips"],
  },
  {
    id: "beginner_friendly",
    textIncludes: ["machine", "assisted", "leg-press", "lat-pull", "pulldown", "cable"],
  },
  {
    id: "joint_friendly",
    textIncludes: ["machine", "neutral", "assisted", "chest-supported", "seated"],
  },
];

export function getMainCompoundOptionList({
  getMetadata,
  movementPattern,
}: {
  getMetadata: (exercise: ExerciseCatalogExercise & { role: "compound" }) => string;
  movementPattern: CompoundCapableMovementPatternId;
}): ReadonlyArray<ExerciseFoundationCompoundOption> {
  return getExerciseCatalogExercisesByMovementPattern(movementPattern)
    .filter((exercise): exercise is ExerciseCatalogExercise & { role: "compound" } =>
      isMainCompoundEligible(exercise),
    )
    .map((exercise) =>
      decorateCompoundOption({
        exercise,
        metadata: getMetadata(exercise),
      }),
    );
}

export function getMainCompoundMovementPatternHelperText(
  movementPattern: CompoundCapableMovementPatternId,
): string {
  switch (movementPattern) {
    case "horizontal_push":
      return "Chest, shoulders, triceps.";
    case "horizontal_pull":
      return "Mid-back and upper-back balance.";
    case "vertical_pull":
      return "Lats and upper back.";
    case "vertical_push":
      return "Overhead push balance.";
    case "quad_dominant":
      return "Knee-dominant leg work.";
    case "hip_hamstring_dominant":
      return "Hamstrings, glutes, posterior chain.";
  }
}

function decorateCompoundOption({
  exercise,
  metadata,
}: {
  exercise: ExerciseCatalogExercise & { role: "compound" };
  metadata: string;
}): ExerciseFoundationCompoundOption {
  const filterIds = getPickerOptionFilterIds(exercise);

  return {
    ...exercise,
    filterIds,
    filterTags: getPickerOptionFilterTags(filterIds),
    metadata,
  };
}

function getPickerOptionFilterIds(
  exercise: ExerciseCatalogExercise,
): ReadonlyArray<MainCompoundPickerFilterId> {
  const normalizedName = exercise.name.toLowerCase();
  const normalizedId = exercise.id.toLowerCase();

  return pickerFilterRules
    .filter((rule) =>
      doesPickerFilterRuleMatch({
        normalizedId,
        normalizedName,
        rule,
      }),
    )
    .map((rule) => rule.id);
}

function doesPickerFilterRuleMatch({
  normalizedId,
  normalizedName,
  rule,
}: {
  normalizedId: string;
  normalizedName: string;
  rule: PickerFilterRule;
}): boolean {
  return (
    hasAnyTextMatch(normalizedName, rule.nameIncludes) ||
    hasAnyTextMatch(normalizedId, rule.textIncludes) ||
    hasAnyPatternMatch(normalizedName, rule.namePatterns)
  );
}

function hasAnyTextMatch(value: string, matches: ReadonlyArray<string> = []): boolean {
  return matches.some((match) => value.includes(match));
}

function hasAnyPatternMatch(value: string, patterns: ReadonlyArray<RegExp> = []): boolean {
  return patterns.some((pattern) => pattern.test(value));
}

function getPickerOptionFilterTags(
  filterIds: ReadonlyArray<MainCompoundPickerFilterId>,
): ReadonlyArray<string> {
  const tags = filterIds
    .filter((filterId) => filterId !== "all")
    .map((filterId) => pickerFilterLabels[filterId]);

  return tags.length > 0 ? tags.slice(0, 2) : ["Compound"];
}
