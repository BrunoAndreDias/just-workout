import type { TrainingSplitId } from "./training-split";
import type { WeeklyRepTarget } from "./training-volume";

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
export type MovementPatternId =
  | "horizontal_push"
  | "horizontal_pull"
  | "vertical_push"
  | "vertical_pull"
  | "elbow_flexion"
  | "elbow_extension"
  | "quad_dominant"
  | "hip_hamstring_dominant"
  | "calves_accessories";
export type ExerciseSelectionPreferenceItem = {
  id: string;
  matchedExerciseId?: string;
  rawText: string;
};
export type ExerciseSelectionPreferences = {
  avoidedExercises: ReadonlyArray<ExerciseSelectionPreferenceItem>;
  equipmentPreset: EquipmentPresetId;
  preferredExercises: ReadonlyArray<ExerciseSelectionPreferenceItem>;
  strategy: ExerciseSelectionStrategyId;
};
export type ExerciseSelectionPreferencesCandidate = {
  avoidedExercises?: unknown;
  equipmentPreset?: unknown;
  preferredExercises?: unknown;
  strategy?: unknown;
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
export type ExerciseSelectionStrategy = {
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

const defaultMovementPatternCoverageByStrategy = {
  balanced: {
    lowerBodyPatterns: [
      { id: "quad_dominant", label: "Quad dominant", volumeTarget: "quads" },
      {
        id: "hip_hamstring_dominant",
        label: "Hip/hamstring dominant",
        volumeTarget: "hamstrings",
      },
      {
        id: "calves_accessories",
        label: "Calves/accessories",
        volumeTargets: ["calves", "abs"],
      },
    ],
    upperBodyPatterns: [
      { id: "horizontal_push", label: "Horizontal push", volumeTarget: "chest" },
      { id: "horizontal_pull", label: "Horizontal pull", volumeTarget: "back" },
      { id: "vertical_push", label: "Vertical push", volumeTarget: "shoulders" },
      { id: "vertical_pull", label: "Vertical pull", volumeTarget: "back" },
      { id: "elbow_flexion", label: "Elbow flexion", volumeTarget: "biceps" },
      { id: "elbow_extension", label: "Elbow extension", volumeTarget: "triceps" },
    ],
  },
} as const;

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

export const defaultExerciseSelectionStrategyId = "balanced" satisfies ExerciseSelectionStrategyId;
export const defaultEquipmentPresetId = "full_gym" satisfies EquipmentPresetId;

export const exerciseSelectionStrategies = [
  {
    description:
      "A strong v1 default that prioritizes productive compounds, keeps movement coverage balanced, and uses isolation work when Weekly Rep Targets need it.",
    id: defaultExerciseSelectionStrategyId,
    isRecommended: true,
    title: "Balanced",
  },
] as const satisfies ReadonlyArray<ExerciseSelectionStrategy>;

export const equipmentPresets = [
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

export function normalizeExerciseSelectionPreferences(
  candidate: unknown,
): ExerciseSelectionPreferences {
  const normalizedCandidate = isExerciseSelectionPreferencesCandidate(candidate) ? candidate : null;

  return {
    avoidedExercises: normalizeExerciseSelectionPreferenceItems(
      normalizedCandidate?.avoidedExercises,
    ),
    equipmentPreset: isEquipmentPresetId(normalizedCandidate?.equipmentPreset)
      ? normalizedCandidate.equipmentPreset
      : defaultEquipmentPresetId,
    preferredExercises: normalizeExerciseSelectionPreferenceItems(
      normalizedCandidate?.preferredExercises,
    ),
    strategy: isExerciseSelectionStrategyId(normalizedCandidate?.strategy)
      ? normalizedCandidate.strategy
      : defaultExerciseSelectionStrategyId,
  };
}

export function isExerciseSelectionStrategyId(
  value: unknown,
): value is ExerciseSelectionStrategyId {
  return exerciseSelectionStrategies.some((strategy) => strategy.id === value);
}

export function isEquipmentPresetId(value: unknown): value is EquipmentPresetId {
  return equipmentPresets.some((preset) => preset.id === value);
}

export function getExerciseSelectionStrategy(
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
        "Marked avoided exercises stay excluded so painful or unsuitable movements are not included later.",
      id: "hard_avoid_exclusions",
      label: "Respect avoided exercises as hard exclusions",
    },
    {
      description:
        "Rest times adapt later based on exercise demand and the selected Rep Range Style.",
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
  const strategyDefinition = defaultMovementPatternCoverageByStrategy[strategy];
  const splitBias = movementPatternSessionBiasBySplit[split];

  return [
    {
      id: "upper_body",
      patterns: strategyDefinition.upperBodyPatterns.map((pattern) => ({
        id: pattern.id,
        isDirectlyTargeted: isVolumeTargetEnabled(weeklyRepTargets, pattern.volumeTarget),
        label: pattern.label,
      })),
      sessionBias: splitBias.upper_body,
      title: "Upper body movement patterns",
    },
    {
      id: "lower_body",
      patterns: strategyDefinition.lowerBodyPatterns.map((pattern) => ({
        id: pattern.id,
        isDirectlyTargeted:
          "volumeTarget" in pattern
            ? isVolumeTargetEnabled(weeklyRepTargets, pattern.volumeTarget)
            : pattern.volumeTargets.some((volumeTarget) =>
                isVolumeTargetEnabled(weeklyRepTargets, volumeTarget),
              ),
        label: pattern.label,
      })),
      sessionBias: splitBias.lower_body,
      title: "Lower body movement patterns",
    },
  ];
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

function isExerciseSelectionPreferencesCandidate(
  value: unknown,
): value is ExerciseSelectionPreferencesCandidate {
  return getRecord(value) !== null;
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
