import {
  exerciseCatalogExercises,
  getConcreteExerciseCatalogExerciseId,
  type MovementPatternId,
} from "./exercise-catalog";
import type { TrainingSplitId } from "./training-split";
import type { WeeklyRepTarget } from "./training-volume";

export type {
  ExerciseCatalogMuscleGroupId,
  MovementPatternId,
} from "./exercise-catalog";
export { exerciseCatalogMuscleGroups } from "./exercise-catalog";
export type ExerciseSelectionStrategyId = "balanced";
export type EquipmentPresetId = "full_gym";
export type IncludedEquipmentId =
  | "barbell"
  | "bodyweight"
  | "cables"
  | "dumbbells"
  | "machines"
  | "pull_up_bar";
export type AutomaticExerciseSelectionRuleId =
  | "compound_priority"
  | "targeted_isolation_support"
  | "movement_pattern_balance"
  | "weekly_volume_alignment"
  | "hard_avoid_exclusions"
  | "adaptive_rest_timing";
export type ExerciseSelectionPreferenceItem = {
  id: string;
  matchedExerciseId?: string;
  rawText: string;
};
export type ExerciseSelectionPreferenceListId = "avoidedExercises" | "preferredExercises";
export type ExerciseSelectionPreferences = {
  avoidedExercises: ReadonlyArray<ExerciseSelectionPreferenceItem>;
  equipmentPreset: EquipmentPresetId;
  preferredExercises: ReadonlyArray<ExerciseSelectionPreferenceItem>;
  strategy: ExerciseSelectionStrategyId;
};
export type ExerciseSelectionPendingInputId = "avoidedExercise" | "preferredExercise";
export type ExerciseSelectionPendingInputs = Record<ExerciseSelectionPendingInputId, string>;
export type ExerciseSelectionPreferenceValidationErrors = Partial<
  Record<ExerciseSelectionPendingInputId, string>
>;
type CommitPendingExerciseSelectionPreferencesResult = {
  exerciseSelectionPreferences: ExerciseSelectionPreferences;
  pendingInputs: ExerciseSelectionPendingInputs;
  validationErrors: ExerciseSelectionPreferenceValidationErrors;
};
export type IncludedEquipment = {
  id: IncludedEquipmentId;
  label: string;
};
export type EquipmentPreset = {
  id: EquipmentPresetId;
  includedEquipment: ReadonlyArray<IncludedEquipment>;
  title: string;
};
export type AutomaticExerciseSelectionRule = {
  description: string;
  id: AutomaticExerciseSelectionRuleId;
  label: string;
};
type ExerciseSelectionStrategy = {
  description: string;
  id: ExerciseSelectionStrategyId;
  isRecommended: boolean;
  title: string;
};
export type MovementPatternCoverageGroupId = "upper_body" | "lower_body";
export type MovementPatternCoveragePattern = {
  id: MovementPatternId;
  isDirectlyTargeted: boolean;
  label: string;
};
export type MovementPatternCoverageGroup = {
  id: MovementPatternCoverageGroupId;
  patterns: ReadonlyArray<MovementPatternCoveragePattern>;
  sessionBias: string;
  title: string;
};
type MovementPatternCoverageDefinition = {
  id: MovementPatternId;
  label: string;
  volumeTargets: ReadonlyArray<WeeklyRepTarget["muscleGroup"]>;
};
type MovementPatternCoverageStrategyDefinition = Record<
  MovementPatternCoverageGroupId,
  ReadonlyArray<MovementPatternCoverageDefinition>
>;
const movementPatternCoverageGroupOrder = [
  "upper_body",
  "lower_body",
] as const satisfies ReadonlyArray<MovementPatternCoverageGroupId>;
const movementPatternCoverageGroupTitles = {
  lower_body: "Lower body movement patterns",
  upper_body: "Upper body movement patterns",
} satisfies Record<MovementPatternCoverageGroupId, string>;
const movementPatternCoverageDefinitionsByStrategy = {
  balanced: {
    lower_body: [
      { id: "quad_dominant", label: "Quad dominant", volumeTargets: ["quads"] },
      {
        id: "hip_hamstring_dominant",
        label: "Hip/hamstring dominant",
        volumeTargets: ["hamstrings"],
      },
      {
        id: "calves_accessories",
        label: "Calves/accessories",
        volumeTargets: ["calves", "abs"],
      },
    ],
    upper_body: [
      { id: "horizontal_push", label: "Horizontal push", volumeTargets: ["chest"] },
      { id: "horizontal_pull", label: "Horizontal pull", volumeTargets: ["back"] },
      { id: "vertical_push", label: "Vertical push", volumeTargets: ["shoulders"] },
      { id: "vertical_pull", label: "Vertical pull", volumeTargets: ["back"] },
      { id: "elbow_flexion", label: "Elbow flexion", volumeTargets: ["biceps"] },
      { id: "elbow_extension", label: "Elbow extension", volumeTargets: ["triceps"] },
    ],
  },
} as const satisfies Record<ExerciseSelectionStrategyId, MovementPatternCoverageStrategyDefinition>;
const movementPatternSessionBiasBySplit = {
  "alternating-full-body-a-b": {
    lower_body:
      "Covered across alternating full-body sessions, with accessory work layered in as needed.",
    upper_body:
      "Covered across alternating full-body sessions so upper-body work stays distributed.",
  },
  "full-body-2-day": {
    lower_body:
      "Covered across the week's full-body sessions without separate lower-only training days.",
    upper_body:
      "Covered across the week's full-body sessions so upper-body work stays distributed.",
  },
  "full-body-3-day": {
    lower_body:
      "Covered across the week's full-body sessions without separate lower-only training days.",
    upper_body:
      "Covered across the week's full-body sessions so upper-body work stays distributed.",
  },
  "rotating-push-pull-legs": {
    lower_body:
      "Covered when legs sessions come up in the rotation, with accessory work added as needed.",
    upper_body: "Covered across push and pull sessions in the rotation instead of one fixed week.",
  },
  "upper-lower-4-day": {
    lower_body: "Covered across the split's lower sessions with room for direct accessory work.",
    upper_body: "Covered across the split's upper sessions while lower days stay focused.",
  },
  "upper-lower-full-body": {
    lower_body:
      "Covered across the split's lower and full-body sessions with accessory work added as needed.",
    upper_body:
      "Covered across the split's upper and full-body sessions so upper-body work stays balanced.",
  },
} as const satisfies Record<TrainingSplitId, Record<MovementPatternCoverageGroupId, string>>;
const defaultExerciseSelectionStrategyId = "balanced" satisfies ExerciseSelectionStrategyId;
const defaultEquipmentPresetId = "full_gym" satisfies EquipmentPresetId;
export const emptyExerciseSelectionPendingInputs = {
  avoidedExercise: "",
  preferredExercise: "",
} as const satisfies ExerciseSelectionPendingInputs;
const exerciseSelectionStrategies = [
  {
    description:
      "A strong v1 default that prioritizes productive compounds, keeps movement coverage balanced, and uses isolation work when Weekly Rep Targets need it.",
    id: defaultExerciseSelectionStrategyId,
    isRecommended: true,
    title: "Balanced",
  },
] as const satisfies ReadonlyArray<ExerciseSelectionStrategy>;

const equipmentPresets = [
  {
    id: defaultEquipmentPresetId,
    includedEquipment: [
      { id: "barbell", label: "Barbell" },
      { id: "dumbbells", label: "Dumbbells" },
      { id: "machines", label: "Machines" },
      { id: "cables", label: "Cables" },
      { id: "pull_up_bar", label: "Pull-up bar" },
      { id: "bodyweight", label: "Bodyweight" },
    ],
    title: "Full gym",
  },
] as const satisfies ReadonlyArray<EquipmentPreset>;

export function createDefaultExerciseSelectionPreferences(): ExerciseSelectionPreferences {
  return {
    avoidedExercises: [],
    equipmentPreset: defaultEquipmentPresetId,
    preferredExercises: [],
    strategy: defaultExerciseSelectionStrategyId,
  };
}

function normalizeExerciseSelectionPreferenceText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeExerciseSelectionPreferences(
  candidate: unknown,
): ExerciseSelectionPreferences {
  const preferences = getRecord(candidate);

  return {
    avoidedExercises: normalizeExerciseSelectionPreferenceItems(preferences?.avoidedExercises),
    equipmentPreset: isEquipmentPresetId(preferences?.equipmentPreset)
      ? preferences.equipmentPreset
      : defaultEquipmentPresetId,
    preferredExercises: normalizeExerciseSelectionPreferenceItems(preferences?.preferredExercises),
    strategy: isExerciseSelectionStrategyId(preferences?.strategy)
      ? preferences.strategy
      : defaultExerciseSelectionStrategyId,
  };
}

export function getExerciseSelectionPreferenceExerciseId(
  preference: ExerciseSelectionPreferenceItem,
): string | null {
  if (typeof preference.matchedExerciseId === "string") {
    return preference.matchedExerciseId;
  }

  const comparisonKey = getExerciseSelectionPreferenceComparisonKey(preference.rawText);

  return comparisonKey ? (concreteExerciseIdByComparisonKey.get(comparisonKey) ?? null) : null;
}

export function getAvoidedExerciseIds(exerciseSelectionPreferences: unknown): ReadonlySet<string> {
  return new Set(
    normalizeExerciseSelectionPreferences(exerciseSelectionPreferences)
      .avoidedExercises.map(getExerciseSelectionPreferenceExerciseId)
      .filter((exerciseId): exerciseId is string => exerciseId !== null),
  );
}

function isExerciseSelectionStrategyId(value: unknown): value is ExerciseSelectionStrategyId {
  return exerciseSelectionStrategies.some((strategy) => strategy.id === value);
}

function isEquipmentPresetId(value: unknown): value is EquipmentPresetId {
  return equipmentPresets.some((preset) => preset.id === value);
}

function getExerciseSelectionStrategy(
  strategyId: ExerciseSelectionStrategyId,
): ExerciseSelectionStrategy {
  const strategy = exerciseSelectionStrategies.find(({ id }) => id === strategyId);

  if (!strategy) {
    throw new Error(`Unknown Exercise Selection Strategy "${strategyId}".`);
  }

  return strategy;
}

export function getEquipmentPreset(equipmentPresetId: EquipmentPresetId): EquipmentPreset {
  const preset = equipmentPresets.find(({ id }) => id === equipmentPresetId);

  if (!preset) {
    throw new Error(`Unknown Equipment Preset "${equipmentPresetId}".`);
  }

  return preset;
}

export function deriveAutomaticExerciseSelectionRules(
  strategyId: ExerciseSelectionStrategyId,
): ReadonlyArray<AutomaticExerciseSelectionRule> {
  getExerciseSelectionStrategy(strategyId);

  return [
    {
      description:
        "Main work favors stable compound lifts before smaller isolation choices fill gaps.",
      id: "compound_priority",
      label: "Prioritize compounds for main work",
    },
    {
      description:
        "Isolation exercises can support weekly rep targets when direct muscle work is needed.",
      id: "targeted_isolation_support",
      label: "Use isolation work for targeted volume",
    },
    {
      description:
        "Exercise picks stay distributed across key movement patterns instead of overloading one pattern.",
      id: "movement_pattern_balance",
      label: "Keep movement-pattern coverage balanced",
    },
    {
      description: "Weekly muscle-group targets shape how much direct work each area receives.",
      id: "weekly_volume_alignment",
      label: "Align exercise selection with Weekly Rep Targets",
    },
    {
      description:
        "Marked avoided exercises stay excluded so painful, unavailable, or unsuitable movements are not silently included later.",
      id: "hard_avoid_exclusions",
      label: "Respect avoided exercises as hard exclusions",
    },
    {
      description: "Rest times adapt to exercise demand and rep range.",
      id: "adaptive_rest_timing",
      label: "Apply rest timing automatically",
    },
  ];
}

export function deriveMovementPatternCoverage({
  split,
  strategy,
  weeklyRepTargets,
}: {
  split: TrainingSplitId;
  strategy: ExerciseSelectionStrategyId;
  weeklyRepTargets: ReadonlyArray<WeeklyRepTarget>;
}): ReadonlyArray<MovementPatternCoverageGroup> {
  const strategyDefinition = movementPatternCoverageDefinitionsByStrategy[strategy];
  const splitBias = movementPatternSessionBiasBySplit[split];

  return movementPatternCoverageGroupOrder.map((groupId) => ({
    id: groupId,
    patterns: strategyDefinition[groupId].map((pattern) =>
      deriveMovementPatternCoveragePattern({ pattern, weeklyRepTargets }),
    ),
    sessionBias: splitBias[groupId],
    title: movementPatternCoverageGroupTitles[groupId],
  }));
}

function deriveMovementPatternCoveragePattern({
  pattern,
  weeklyRepTargets,
}: {
  pattern: MovementPatternCoverageDefinition;
  weeklyRepTargets: ReadonlyArray<WeeklyRepTarget>;
}): MovementPatternCoveragePattern {
  return {
    id: pattern.id,
    isDirectlyTargeted: pattern.volumeTargets.some((volumeTarget) =>
      isVolumeTargetEnabled(weeklyRepTargets, volumeTarget),
    ),
    label: pattern.label,
  };
}

function normalizeExerciseSelectionPreferenceItems(
  value: unknown,
): ReadonlyArray<ExerciseSelectionPreferenceItem> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isExerciseSelectionPreferenceItemCandidate(item)) {
      return [];
    }

    const normalizedItem: ExerciseSelectionPreferenceItem = {
      id: item.id,
      rawText: item.rawText,
    };

    if (typeof item.matchedExerciseId === "string") {
      normalizedItem.matchedExerciseId = item.matchedExerciseId;
    }

    return normalizedItem;
  });
}

export function commitPendingExerciseSelectionPreferences({
  createId,
  exerciseSelectionPreferences,
  pendingInputs,
}: {
  createId: () => string;
  exerciseSelectionPreferences: ExerciseSelectionPreferences;
  pendingInputs: ExerciseSelectionPendingInputs;
}): CommitPendingExerciseSelectionPreferencesResult {
  const validationErrors = getExerciseSelectionPreferenceValidationErrors({
    exerciseSelectionPreferences,
    pendingInputs,
  });

  if (hasExerciseSelectionPreferenceValidationErrors(validationErrors)) {
    return {
      exerciseSelectionPreferences,
      pendingInputs,
      validationErrors,
    };
  }

  let nextExerciseSelectionPreferences = exerciseSelectionPreferences;

  for (const definition of exerciseSelectionPendingInputDefinitions) {
    const normalizedText = normalizeExerciseSelectionPreferenceText(
      pendingInputs[definition.inputId],
    );

    if (!normalizedText) {
      continue;
    }

    nextExerciseSelectionPreferences = {
      ...nextExerciseSelectionPreferences,
      [definition.listId]: [
        ...nextExerciseSelectionPreferences[definition.listId],
        { id: createId(), rawText: normalizedText },
      ],
    };
  }

  return {
    exerciseSelectionPreferences: nextExerciseSelectionPreferences,
    pendingInputs: {
      avoidedExercise: "",
      preferredExercise: "",
    },
    validationErrors: {},
  };
}

export function isExerciseSelectionPreferencesConfirmationReady({
  exerciseSelectionPreferences,
  pendingInputs,
}: {
  exerciseSelectionPreferences: ExerciseSelectionPreferences;
  pendingInputs: ExerciseSelectionPendingInputs;
}): boolean {
  return !hasExerciseSelectionPreferenceValidationErrors(
    getExerciseSelectionPreferenceValidationErrors({
      exerciseSelectionPreferences,
      pendingInputs,
    }),
  );
}

export function hasExerciseSelectionPreferenceValidationErrors(
  validationErrors: ExerciseSelectionPreferenceValidationErrors,
): boolean {
  return Object.keys(validationErrors).length > 0;
}

export function removeExerciseSelectionPreferenceItem({
  exerciseSelectionPreferences,
  itemId,
  listId,
}: {
  exerciseSelectionPreferences: ExerciseSelectionPreferences;
  itemId: string;
  listId: ExerciseSelectionPreferenceListId;
}): ExerciseSelectionPreferences {
  return {
    ...exerciseSelectionPreferences,
    [listId]: exerciseSelectionPreferences[listId].filter((item) => item.id !== itemId),
  };
}

function isExerciseSelectionPreferenceItemCandidate(value: unknown): value is {
  id: string;
  matchedExerciseId?: unknown;
  rawText: string;
} {
  const candidate = getRecord(value);

  if (!candidate) {
    return false;
  }

  return typeof candidate.id === "string" && typeof candidate.rawText === "string";
}

function getRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function isVolumeTargetEnabled(
  weeklyRepTargets: ReadonlyArray<WeeklyRepTarget>,
  muscleGroup: WeeklyRepTarget["muscleGroup"],
): boolean {
  const weeklyRepTarget = weeklyRepTargets.find((target) => target.muscleGroup === muscleGroup);

  return weeklyRepTarget?.isEnabled === true && weeklyRepTarget.target !== null;
}

const exerciseSelectionPendingInputDefinitions = [
  {
    inputId: "preferredExercise",
    listId: "preferredExercises",
    oppositeListId: "avoidedExercises",
  },
  {
    inputId: "avoidedExercise",
    listId: "avoidedExercises",
    oppositeListId: "preferredExercises",
  },
] as const satisfies ReadonlyArray<{
  inputId: ExerciseSelectionPendingInputId;
  listId: ExerciseSelectionPreferenceListId;
  oppositeListId: ExerciseSelectionPreferenceListId;
}>;

const exerciseSelectionPreferenceListLabels = {
  avoidedExercises: "Avoided Exercises",
  preferredExercises: "Preferred Exercises",
} as const satisfies Record<ExerciseSelectionPreferenceListId, string>;

function getExerciseSelectionPreferenceValidationErrors({
  exerciseSelectionPreferences,
  pendingInputs,
}: {
  exerciseSelectionPreferences: ExerciseSelectionPreferences;
  pendingInputs: ExerciseSelectionPendingInputs;
}): ExerciseSelectionPreferenceValidationErrors {
  const pendingComparisonKeys = {
    avoidedExercise: getExerciseSelectionPreferenceComparisonKey(pendingInputs.avoidedExercise),
    preferredExercise: getExerciseSelectionPreferenceComparisonKey(pendingInputs.preferredExercise),
  } satisfies Record<ExerciseSelectionPendingInputId, string | null>;
  const validationErrors: ExerciseSelectionPreferenceValidationErrors = {};

  for (const { inputId, listId, oppositeListId } of exerciseSelectionPendingInputDefinitions) {
    const comparisonKey = pendingComparisonKeys[inputId];

    if (!comparisonKey) {
      continue;
    }

    const listLabel = exerciseSelectionPreferenceListLabels[listId];
    const hasSameListDuplicate = listHasExerciseSelectionPreferenceComparisonKey({
      comparisonKey,
      items: exerciseSelectionPreferences[listId],
    });

    if (hasSameListDuplicate) {
      validationErrors[inputId] = `This exercise is already in ${listLabel}.`;
      continue;
    }

    const oppositeInputId = getOppositeExerciseSelectionPendingInputId(inputId);
    const oppositeListLabel = exerciseSelectionPreferenceListLabels[oppositeListId];
    const hasCommittedOppositeListConflict = listHasExerciseSelectionPreferenceComparisonKey({
      comparisonKey,
      items: exerciseSelectionPreferences[oppositeListId],
    });
    const hasPendingOppositeInputConflict =
      pendingComparisonKeys[oppositeInputId] === comparisonKey;

    if (hasCommittedOppositeListConflict || hasPendingOppositeInputConflict) {
      validationErrors[inputId] =
        `This exercise is already in ${oppositeListLabel}. Remove it there or change this entry.`;
    }
  }

  return validationErrors;
}

function getExerciseSelectionPreferenceComparisonKey(rawText: string): string | null {
  const normalizedText = normalizeExerciseSelectionPreferenceText(rawText);

  return normalizedText ? normalizedText.toLocaleLowerCase() : null;
}

function listHasExerciseSelectionPreferenceComparisonKey({
  comparisonKey,
  items,
}: {
  comparisonKey: string;
  items: ReadonlyArray<ExerciseSelectionPreferenceItem>;
}): boolean {
  return items.some(
    (item) => getExerciseSelectionPreferenceComparisonKey(item.rawText) === comparisonKey,
  );
}

function getOppositeExerciseSelectionPendingInputId(
  inputId: ExerciseSelectionPendingInputId,
): ExerciseSelectionPendingInputId {
  return inputId === "preferredExercise" ? "avoidedExercise" : "preferredExercise";
}

const concreteExerciseIdByComparisonKey = new Map<string, string>(
  exerciseCatalogExercises.map((exercise) => [
    getExerciseSelectionPreferenceComparisonKey(exercise.name) ?? exercise.name.toLowerCase(),
    getConcreteExerciseCatalogExerciseId(exercise.id),
  ]),
);
