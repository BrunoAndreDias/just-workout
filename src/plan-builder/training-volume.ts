export type VolumePresetId = "conservative" | "balanced" | "higher_volume";
export type VolumePresetSource = "recommended_default" | "user_selected";
export type WeeklyRepTargetSource = "preset" | "custom";
export type VolumeMuscleGroupId =
  | "chest"
  | "back"
  | "quads"
  | "hamstrings"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "calves"
  | "abs";
export type WeeklyRepTarget = {
  isEnabled: boolean;
  muscleGroup: VolumeMuscleGroupId;
  source: WeeklyRepTargetSource;
  target: number | null;
};
export type VolumePreset = {
  id: VolumePresetId;
  isRecommended: boolean;
  largerMuscleTarget: number;
  smallerMuscleTarget: number;
  title: string;
};
export type TrainingVolumeConfiguration = {
  volumePreset: VolumePresetId;
  volumePresetSource: VolumePresetSource;
  weeklyRepTargets: ReadonlyArray<WeeklyRepTarget>;
};
export type TrainingVolumeConfigurationCandidate = {
  volumePreset?: unknown;
  volumePresetSource?: unknown;
  weeklyRepTargets?: unknown;
};
export type NullableTrainingVolumeConfiguration = {
  volumePreset: VolumePresetId | null;
  volumePresetSource: VolumePresetSource | null;
  weeklyRepTargets: ReadonlyArray<WeeklyRepTarget> | null;
};
export type VolumeEstimationRepRange = {
  max: number;
  min: number;
};
export type EstimatedSetRange = {
  max: number;
  min: number;
};

const largerVolumeTargetMuscleGroups = ["chest", "back", "quads", "hamstrings"] as const;
const smallerVolumeTargetMuscleGroups = ["shoulders", "biceps", "triceps"] as const;
const optionalVolumeMuscleGroups = ["calves", "abs"] as const;

export const defaultVolumePresetId = "balanced" satisfies VolumePresetId;

export const volumePresets = [
  {
    id: "conservative",
    isRecommended: false,
    largerMuscleTarget: 60,
    smallerMuscleTarget: 30,
    title: "Conservative",
  },
  {
    id: defaultVolumePresetId,
    isRecommended: true,
    largerMuscleTarget: 90,
    smallerMuscleTarget: 45,
    title: "Balanced",
  },
  {
    id: "higher_volume",
    isRecommended: false,
    largerMuscleTarget: 120,
    smallerMuscleTarget: 60,
    title: "Higher volume",
  },
] as const satisfies ReadonlyArray<VolumePreset>;

export function isVolumePresetId(value: unknown): value is VolumePresetId {
  return volumePresets.some((preset) => preset.id === value);
}

export function isVolumePresetSource(value: unknown): value is VolumePresetSource {
  return value === "recommended_default" || value === "user_selected";
}

export function isTrainingVolumeConfiguration(
  value: TrainingVolumeConfigurationCandidate,
): value is TrainingVolumeConfiguration {
  return (
    isVolumePresetId(value.volumePreset) &&
    isVolumePresetSource(value.volumePresetSource) &&
    Array.isArray(value.weeklyRepTargets)
  );
}

export function normalizeTrainingVolumeConfiguration({
  volumePreset,
  volumePresetSource,
  weeklyRepTargets,
}: TrainingVolumeConfigurationCandidate): NullableTrainingVolumeConfiguration {
  return {
    volumePreset: isVolumePresetId(volumePreset) ? volumePreset : null,
    volumePresetSource: isVolumePresetSource(volumePresetSource) ? volumePresetSource : null,
    weeklyRepTargets: Array.isArray(weeklyRepTargets) ? weeklyRepTargets : null,
  };
}

export function getVolumePreset(volumePresetId: VolumePresetId): VolumePreset {
  const preset = volumePresets.find(({ id }) => id === volumePresetId);

  if (!preset) {
    throw new Error(`Unknown Volume Preset "${volumePresetId}".`);
  }

  return preset;
}

export function createPresetWeeklyRepTargets(
  volumePresetId: VolumePresetId,
): ReadonlyArray<WeeklyRepTarget> {
  const preset = getVolumePreset(volumePresetId);

  return [
    ...largerVolumeTargetMuscleGroups.map((muscleGroup) => ({
      isEnabled: true,
      muscleGroup,
      source: "preset" as const,
      target: preset.largerMuscleTarget,
    })),
    ...smallerVolumeTargetMuscleGroups.map((muscleGroup) => ({
      isEnabled: true,
      muscleGroup,
      source: "preset" as const,
      target: preset.smallerMuscleTarget,
    })),
    ...optionalVolumeMuscleGroups.map((muscleGroup) => ({
      isEnabled: false,
      muscleGroup,
      source: "preset" as const,
      target: null,
    })),
  ];
}

export function createTrainingVolumeConfiguration({
  volumePreset,
  volumePresetSource,
}: {
  volumePreset: VolumePresetId;
  volumePresetSource: VolumePresetSource;
}): TrainingVolumeConfiguration {
  return {
    volumePreset,
    volumePresetSource,
    weeklyRepTargets: createPresetWeeklyRepTargets(volumePreset),
  };
}

export function createRecommendedTrainingVolumeConfiguration(): TrainingVolumeConfiguration {
  return createTrainingVolumeConfiguration({
    volumePreset: defaultVolumePresetId,
    volumePresetSource: "recommended_default",
  });
}

export function selectTrainingVolumeConfiguration({
  trainingVolumeConfiguration,
  volumePreset,
}: {
  trainingVolumeConfiguration: TrainingVolumeConfiguration;
  volumePreset: VolumePresetId;
}): TrainingVolumeConfiguration {
  return {
    volumePreset,
    volumePresetSource: "user_selected",
    weeklyRepTargets: trainingVolumeConfiguration.weeklyRepTargets.map((weeklyRepTarget) =>
      updatePresetWeeklyRepTarget({
        volumePreset,
        weeklyRepTarget,
      }),
    ),
  };
}

export function estimateWeeklySetRange({
  target,
  volumeEstimationRepRange,
}: {
  target: number;
  volumeEstimationRepRange: VolumeEstimationRepRange;
}): EstimatedSetRange {
  return {
    max: Math.ceil(target / volumeEstimationRepRange.min),
    min: Math.ceil(target / volumeEstimationRepRange.max),
  };
}

export function estimateWeeklySetRangeForTarget({
  volumeEstimationRepRange,
  weeklyRepTarget,
}: {
  volumeEstimationRepRange: VolumeEstimationRepRange;
  weeklyRepTarget: WeeklyRepTarget;
}): EstimatedSetRange | null {
  if (!weeklyRepTarget.isEnabled || weeklyRepTarget.target === null) {
    return null;
  }

  return estimateWeeklySetRange({
    target: weeklyRepTarget.target,
    volumeEstimationRepRange,
  });
}

function updatePresetWeeklyRepTarget({
  volumePreset,
  weeklyRepTarget,
}: {
  volumePreset: VolumePresetId;
  weeklyRepTarget: WeeklyRepTarget;
}): WeeklyRepTarget {
  if (weeklyRepTarget.source === "custom") {
    return weeklyRepTarget;
  }

  const target = getPresetWeeklyRepTargetValue({
    volumePreset,
    weeklyRepTarget,
  });

  return {
    ...weeklyRepTarget,
    target,
  };
}

function getPresetWeeklyRepTargetValue({
  volumePreset,
  weeklyRepTarget,
}: {
  volumePreset: VolumePresetId;
  weeklyRepTarget: WeeklyRepTarget;
}): number | null {
  const preset = getVolumePreset(volumePreset);

  if (largerVolumeTargetMuscleGroups.includes(weeklyRepTarget.muscleGroup as never)) {
    return preset.largerMuscleTarget;
  }

  if (smallerVolumeTargetMuscleGroups.includes(weeklyRepTarget.muscleGroup as never)) {
    return preset.smallerMuscleTarget;
  }

  if (optionalVolumeMuscleGroups.includes(weeklyRepTarget.muscleGroup as never)) {
    return weeklyRepTarget.isEnabled ? preset.smallerMuscleTarget : null;
  }

  return weeklyRepTarget.target;
}
