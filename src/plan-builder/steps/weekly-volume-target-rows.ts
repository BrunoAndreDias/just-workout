import type { RepRangeStyle } from "../plan-blueprint";
import {
  type EstimatedSetRange,
  estimateWeeklySetRangeForTarget,
  type OptionalVolumeMuscleGroupId,
  type VolumeMuscleGroupId,
  type WeeklyRepTarget,
} from "../training-volume";

type WeeklyVolumeTargetStatusTone = "accessory" | "main-target" | "moderate" | "optional";

type WeeklyVolumeTargetRowDefinition = {
  label: string;
  muscleGroupId: VolumeMuscleGroupId;
  statusLabel: string;
  statusTone: WeeklyVolumeTargetStatusTone;
};

type OptionalWeeklyVolumeTargetRowDefinition = {
  label: string;
  muscleGroupId: OptionalVolumeMuscleGroupId;
};

export type WeeklyVolumeTargetDisplayRow = WeeklyVolumeTargetRowDefinition & {
  estimatedSetRangeLabel: string;
  weeklyRepTargetLabel: string;
};

export type OptionalWeeklyVolumeTargetDisplayRow = OptionalWeeklyVolumeTargetRowDefinition & {
  actionLabel: "Add" | "Remove";
  estimatedSetRangeLabel: string;
  isEnabled: boolean;
  weeklyRepTargetLabel: string;
};

const requiredWeeklyVolumeTargetRowDefinitions = [
  {
    label: "Chest",
    muscleGroupId: "chest",
    statusLabel: "Main target",
    statusTone: "main-target",
  },
  {
    label: "Back",
    muscleGroupId: "back",
    statusLabel: "Main target",
    statusTone: "main-target",
  },
  {
    label: "Shoulders",
    muscleGroupId: "shoulders",
    statusLabel: "Moderate",
    statusTone: "moderate",
  },
  {
    label: "Quads",
    muscleGroupId: "quads",
    statusLabel: "Main target",
    statusTone: "main-target",
  },
  {
    label: "Hamstrings/Glutes",
    muscleGroupId: "hamstrings",
    statusLabel: "Main target",
    statusTone: "main-target",
  },
  {
    label: "Biceps",
    muscleGroupId: "biceps",
    statusLabel: "Accessory",
    statusTone: "accessory",
  },
  {
    label: "Triceps",
    muscleGroupId: "triceps",
    statusLabel: "Accessory",
    statusTone: "accessory",
  },
] as const satisfies ReadonlyArray<WeeklyVolumeTargetRowDefinition>;

const optionalWeeklyVolumeTargetRowDefinitions = [
  {
    label: "Calves",
    muscleGroupId: "calves",
  },
  {
    label: "Abs",
    muscleGroupId: "abs",
  },
] as const satisfies ReadonlyArray<OptionalWeeklyVolumeTargetRowDefinition>;

type RequiredWeeklyVolumeTargetRowsOptions = {
  repRangeStyle: RepRangeStyle | null;
  weeklyRepTargets: ReadonlyArray<WeeklyRepTarget> | null;
};

type OptionalWeeklyVolumeTargetRowsOptions = {
  repRangeStyle: RepRangeStyle | null;
  weeklyRepTargets: ReadonlyArray<WeeklyRepTarget> | null;
};

export function getRequiredWeeklyVolumeTargetRows({
  repRangeStyle,
  weeklyRepTargets,
}: RequiredWeeklyVolumeTargetRowsOptions): Array<WeeklyVolumeTargetDisplayRow> {
  if (!repRangeStyle || !weeklyRepTargets) {
    return [];
  }

  const rows: Array<WeeklyVolumeTargetDisplayRow> = [];

  for (const definition of requiredWeeklyVolumeTargetRowDefinitions) {
    const weeklyRepTarget = weeklyRepTargets.find(
      ({ muscleGroup }) => muscleGroup === definition.muscleGroupId,
    );

    if (!weeklyRepTarget) {
      continue;
    }

    const row = createWeeklyVolumeTargetDisplayRow({
      definition,
      repRangeStyle,
      weeklyRepTarget,
    });

    if (row) {
      rows.push(row);
    }
  }

  return rows;
}

export function getOptionalWeeklyVolumeTargetRows({
  repRangeStyle,
  weeklyRepTargets,
}: OptionalWeeklyVolumeTargetRowsOptions): Array<OptionalWeeklyVolumeTargetDisplayRow> {
  if (!weeklyRepTargets) {
    return [];
  }

  const rows: Array<OptionalWeeklyVolumeTargetDisplayRow> = [];

  for (const definition of optionalWeeklyVolumeTargetRowDefinitions) {
    const weeklyRepTarget = weeklyRepTargets.find(
      ({ muscleGroup }) => muscleGroup === definition.muscleGroupId,
    );

    if (!weeklyRepTarget) {
      continue;
    }

    rows.push(
      createOptionalWeeklyVolumeTargetDisplayRow({
        definition,
        repRangeStyle,
        weeklyRepTarget,
      }),
    );
  }

  return rows;
}

function createWeeklyVolumeTargetDisplayRow({
  definition,
  repRangeStyle,
  weeklyRepTarget,
}: {
  definition: WeeklyVolumeTargetRowDefinition;
  repRangeStyle: RepRangeStyle;
  weeklyRepTarget: WeeklyRepTarget;
}): WeeklyVolumeTargetDisplayRow | null {
  const weeklyRepTargetValue = weeklyRepTarget.target;

  if (weeklyRepTargetValue === null) {
    return null;
  }

  const estimatedSetRange = estimateWeeklySetRangeForTarget({
    volumeEstimationRepRange: repRangeStyle.volumeEstimationRepRange,
    weeklyRepTarget,
  });

  if (!estimatedSetRange) {
    return null;
  }

  return {
    ...definition,
    estimatedSetRangeLabel: formatEstimatedSetRange(estimatedSetRange),
    weeklyRepTargetLabel: `${weeklyRepTargetValue} reps/week`,
  };
}

function createOptionalWeeklyVolumeTargetDisplayRow({
  definition,
  repRangeStyle,
  weeklyRepTarget,
}: {
  definition: OptionalWeeklyVolumeTargetRowDefinition;
  repRangeStyle: RepRangeStyle | null;
  weeklyRepTarget: WeeklyRepTarget;
}): OptionalWeeklyVolumeTargetDisplayRow {
  const optionalLabel = "Optional";
  const hasVisibleTarget = weeklyRepTarget.isEnabled && weeklyRepTarget.target !== null;
  let estimatedSetRange: EstimatedSetRange | null = null;

  if (hasVisibleTarget && repRangeStyle) {
    estimatedSetRange = estimateWeeklySetRangeForTarget({
      volumeEstimationRepRange: repRangeStyle.volumeEstimationRepRange,
      weeklyRepTarget,
    });
  }

  return {
    ...definition,
    actionLabel: weeklyRepTarget.isEnabled ? "Remove" : "Add",
    estimatedSetRangeLabel: estimatedSetRange
      ? formatEstimatedSetRange(estimatedSetRange)
      : optionalLabel,
    isEnabled: weeklyRepTarget.isEnabled,
    weeklyRepTargetLabel: hasVisibleTarget ? `${weeklyRepTarget.target} reps/week` : optionalLabel,
  };
}

function formatEstimatedSetRange({ max, min }: EstimatedSetRange): string {
  return `${min}-${max} sets/week`;
}
