import type { TrainingPlan, TrainingPlanSlot, WorkoutTemplate } from "../training-plan";
import {
  getTrainingSessionHistoryRouteTarget,
  type TrainingSessionHistoryRouteTarget,
} from "../training-plan-paths";
import { createLegacyDefaultTrainingPrescription } from "../training-prescription";
import {
  getStartNextWorkoutRouteTarget,
  getStartWorkoutRouteTarget,
  type StartWorkoutRouteTarget,
} from "./active-training-plan-navigation";
import {
  type ActiveTrainingPlanTab,
  type ActiveTrainingPlanTabId,
  getActiveTrainingPlanTabs,
  getWorkoutTemplateForTab,
} from "./active-training-plan-tabs";
import { type CompareReadModel, getCompareReadModel } from "./compare-read-model";
import {
  formatWeeklyCoverageCount,
  hasMovementCoverage,
  type MovementCoverageRow,
  movementCoverageRows,
} from "./movement-coverage-read-model";
import { getPlanSummaryReadModel, type PlanSummaryReadModel } from "./plan-summary-read-model";
import { getBlockProgressPercent, getCurrentBlockWeek } from "./training-block-progress";
import {
  formatTargetMuscle,
  getWorkoutSplitSummaryReadModel,
  type WorkoutSplitSummaryReadModel,
} from "./workout-template-summary";

export { formatExerciseRole, formatMovementPattern } from "../training-plan-presentation";
export {
  type ActiveTrainingPlanTab,
  type ActiveTrainingPlanTabId,
  getActiveTrainingPlanTabs,
  getWorkoutTemplateForTab,
} from "./active-training-plan-tabs";
export {
  hasMovementCoverage,
  type MovementCoverageRow,
  movementCoverageRows,
} from "./movement-coverage-read-model";

export type ActiveTrainingPlanPageReadModel = {
  actions: ActiveTrainingPlanPageActionsReadModel;
  activeTab: ActiveTrainingPlanPageTabReadModel;
  compare: ActiveTrainingPlanPageCompareReadModel;
  header: ActiveTrainingPlanPageHeaderReadModel;
  overview: ActiveTrainingPlanPageOverviewReadModel;
  progress: ActiveTrainingPlanPageProgressReadModel;
  tabs: ActiveTrainingPlanPageTabReadModel[];
};

export type ActiveTrainingPlanPageHeaderReadModel = {
  description: string;
  title: string;
};

export type ActiveTrainingPlanPageActionsReadModel = {
  startNextWorkout: ActiveTrainingPlanRouteActionReadModel<StartWorkoutRouteTarget>;
  trainingHistory: ActiveTrainingPlanRouteActionReadModel<TrainingSessionHistoryRouteTarget>;
};

export type ActiveTrainingPlanRouteActionReadModel<RouteTarget> = {
  label: string;
  routeTarget: RouteTarget;
};

export type ActiveTrainingPlanPageProgressReadModel = {
  blockProgressPercent: number;
  blockWeek: number;
  cycleNumber: number | undefined;
  trainingBlockWeeks: number;
};

export type ActiveTrainingPlanPageTabReadModel = ActiveTrainingPlanTab & {
  isActive: boolean;
  panel: ActiveTrainingPlanPageTabPanelReadModel;
};

export type ActiveTrainingPlanPageTabPanelReadModel =
  | {
      id: "overview";
      kind: "overview";
      label: string;
    }
  | {
      id: "compare";
      kind: "compare";
      label: string;
    }
  | {
      id: ActiveTrainingPlanTabId;
      kind: "workout";
      label: string;
      startAction: ActiveTrainingPlanRouteActionReadModel<StartWorkoutRouteTarget>;
      workoutTemplate: WorkoutTemplate;
    };

export type ActiveTrainingPlanPageOverviewReadModel = {
  movementCoverage: ActiveTrainingPlanMovementCoverageTableReadModel;
  summary: PlanSummaryReadModel;
  volumeTargetNotices: ActiveTrainingPlanVolumeTargetNoticeReadModel[];
  workoutSplitSummary: WorkoutSplitSummaryReadModel;
};

export type ActiveTrainingPlanVolumeTargetNoticeReadModel = {
  muscleGroup: string;
  prescribedTopEndReps: number;
  shortfallReps: number;
  targetReps: number;
};

export type ActiveTrainingPlanPageCompareReadModel = CompareReadModel & {
  movementCoverage: ActiveTrainingPlanCompareMovementCoverageTableReadModel;
};

export type ActiveTrainingPlanMovementCoverageTableReadModel = {
  columns: ActiveTrainingPlanMovementCoverageColumnReadModel[];
  rows: ActiveTrainingPlanMovementCoverageRowReadModel[];
};

export type ActiveTrainingPlanCompareMovementCoverageTableReadModel =
  ActiveTrainingPlanMovementCoverageTableReadModel & {
    rows: ActiveTrainingPlanCompareMovementCoverageRowReadModel[];
  };

export type ActiveTrainingPlanMovementCoverageColumnReadModel = {
  id: WorkoutTemplate["id"];
  label: WorkoutTemplate["label"];
};

export type ActiveTrainingPlanMovementCoverageRowReadModel = {
  cells: ActiveTrainingPlanMovementCoverageCellReadModel[];
  label: MovementCoverageRow["label"];
  patterns: ReadonlyArray<TrainingPlanSlot["movementPattern"]>;
};

export type ActiveTrainingPlanCompareMovementCoverageRowReadModel =
  ActiveTrainingPlanMovementCoverageRowReadModel & {
    weeklyCoverage: string;
  };

export type ActiveTrainingPlanMovementCoverageCellReadModel = {
  covered: boolean;
  templateId: WorkoutTemplate["id"];
};

export function getActiveTrainingPlanPageReadModel({
  activeTabId = "overview",
  trainingPlan,
}: {
  activeTabId?: ActiveTrainingPlanTabId;
  trainingPlan: TrainingPlan;
}): ActiveTrainingPlanPageReadModel {
  const tabs = getActiveTrainingPlanTabs(trainingPlan);
  const resolvedActiveTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];
  const resolvedActiveTabId = resolvedActiveTab?.id ?? "overview";
  const blockWeek = getCurrentBlockWeek(trainingPlan);
  const movementCoverage = getMovementCoverageTableReadModel(trainingPlan.workoutTemplates);

  return {
    actions: getActionsReadModel(trainingPlan),
    activeTab: getPageTabReadModel({
      activeTabId: resolvedActiveTabId,
      tab: resolvedActiveTab ?? { id: "overview", label: "Overview" },
      trainingPlan,
    }),
    compare: getCompareTabReadModel(trainingPlan, movementCoverage),
    header: getHeaderReadModel(trainingPlan),
    overview: getOverviewReadModel(trainingPlan, movementCoverage),
    progress: getProgressReadModel(trainingPlan, blockWeek),
    tabs: tabs.map((tab) =>
      getPageTabReadModel({
        activeTabId: resolvedActiveTabId,
        tab,
        trainingPlan,
      }),
    ),
  };
}

function getActionsReadModel(trainingPlan: TrainingPlan): ActiveTrainingPlanPageActionsReadModel {
  return {
    startNextWorkout: {
      label: "Start next workout",
      routeTarget: getStartNextWorkoutRouteTarget(trainingPlan),
    },
    trainingHistory: {
      label: "View training history",
      routeTarget: getTrainingSessionHistoryRouteTarget(trainingPlan.id),
    },
  };
}

function getCompareTabReadModel(
  trainingPlan: TrainingPlan,
  movementCoverage: ActiveTrainingPlanMovementCoverageTableReadModel,
): ActiveTrainingPlanPageCompareReadModel {
  return {
    ...getCompareReadModel(trainingPlan),
    movementCoverage: getCompareMovementCoverageTableReadModel(
      trainingPlan.workoutTemplates,
      movementCoverage,
    ),
  };
}

function getHeaderReadModel(trainingPlan: TrainingPlan): ActiveTrainingPlanPageHeaderReadModel {
  return {
    description: `${trainingPlan.trainingFrequencyDaysPerWeek} days/week with ${trainingPlan.workoutTemplates.length} workout templates configured.`,
    title: trainingPlan.split,
  };
}

function getOverviewReadModel(
  trainingPlan: TrainingPlan,
  movementCoverage: ActiveTrainingPlanMovementCoverageTableReadModel,
): ActiveTrainingPlanPageOverviewReadModel {
  return {
    movementCoverage,
    summary: getPlanSummaryReadModel(trainingPlan),
    volumeTargetNotices: getVolumeTargetNoticesReadModel(trainingPlan),
    workoutSplitSummary: getWorkoutSplitSummaryReadModel(trainingPlan.workoutTemplates),
  };
}

function getProgressReadModel(
  trainingPlan: TrainingPlan,
  blockWeek: number,
): ActiveTrainingPlanPageProgressReadModel {
  return {
    blockProgressPercent: getBlockProgressPercent({
      blockWeek,
      trainingBlockWeeks: trainingPlan.trainingBlockWeeks,
    }),
    blockWeek,
    cycleNumber: trainingPlan.trainingBlock?.cycleNumber,
    trainingBlockWeeks: trainingPlan.trainingBlockWeeks,
  };
}

function getPageTabReadModel({
  activeTabId,
  tab,
  trainingPlan,
}: {
  activeTabId: ActiveTrainingPlanTabId;
  tab: ActiveTrainingPlanTab;
  trainingPlan: TrainingPlan;
}): ActiveTrainingPlanPageTabReadModel {
  return {
    ...tab,
    isActive: tab.id === activeTabId,
    panel: getTabPanelReadModel({ tab, trainingPlan }),
  };
}

function getTabPanelReadModel({
  tab,
  trainingPlan,
}: {
  tab: ActiveTrainingPlanTab;
  trainingPlan: TrainingPlan;
}): ActiveTrainingPlanPageTabPanelReadModel {
  if (tab.id === "overview") {
    return {
      id: tab.id,
      kind: "overview",
      label: tab.label,
    };
  }

  if (tab.id === "compare") {
    return {
      id: tab.id,
      kind: "compare",
      label: tab.label,
    };
  }

  const workoutTemplate = getWorkoutTemplateForTab(trainingPlan, tab.id);

  if (!workoutTemplate) {
    return {
      id: "overview",
      kind: "overview",
      label: "Overview",
    };
  }

  return {
    id: tab.id,
    kind: "workout",
    label: tab.label,
    startAction: {
      label: `Start ${workoutTemplate.label} session`,
      routeTarget: getStartWorkoutRouteTarget({
        planId: trainingPlan.id,
        workoutTemplateId: workoutTemplate.id,
      }),
    },
    workoutTemplate,
  };
}

function getMovementCoverageTableReadModel(
  workoutTemplates: ReadonlyArray<WorkoutTemplate>,
): ActiveTrainingPlanMovementCoverageTableReadModel {
  return {
    columns: workoutTemplates.map((template) => ({
      id: template.id,
      label: template.label,
    })),
    rows: movementCoverageRows.map((row) => ({
      cells: workoutTemplates.map((template) => ({
        covered: hasMovementCoverage(template, row.patterns),
        templateId: template.id,
      })),
      label: row.label,
      patterns: row.patterns,
    })),
  };
}

function getCompareMovementCoverageTableReadModel(
  workoutTemplates: ReadonlyArray<WorkoutTemplate>,
  movementCoverage: ActiveTrainingPlanMovementCoverageTableReadModel,
): ActiveTrainingPlanCompareMovementCoverageTableReadModel {
  return {
    ...movementCoverage,
    rows: movementCoverage.rows.map((row) => ({
      ...row,
      weeklyCoverage: formatWeeklyCoverageCount(workoutTemplates, row.patterns),
    })),
  };
}

const volumeTargetMuscleByPrimaryTargetMuscle = {
  abs: "abs",
  back: "back",
  biceps: "biceps",
  calves: "calves",
  chest: "chest",
  hamstrings: "hamstrings",
  quadriceps: "quads",
  shoulders: "shoulders",
  triceps: "triceps",
} as const satisfies Partial<
  Record<
    TrainingPlanSlot["targetMuscles"][number],
    TrainingPlan["weeklyRepTargets"][number]["muscleGroup"]
  >
>;

function getVolumeTargetNoticesReadModel(
  trainingPlan: TrainingPlan,
): ActiveTrainingPlanVolumeTargetNoticeReadModel[] {
  const prescribedTopEndRepsByMuscleGroup = getPrescribedTopEndRepsByMuscleGroup(trainingPlan);

  return trainingPlan.weeklyRepTargets.flatMap((weeklyRepTarget) => {
    if (!weeklyRepTarget.isEnabled || weeklyRepTarget.target === null) {
      return [];
    }

    const prescribedTopEndReps =
      prescribedTopEndRepsByMuscleGroup.get(weeklyRepTarget.muscleGroup) ?? 0;

    if (prescribedTopEndReps >= weeklyRepTarget.target) {
      return [];
    }

    return [
      {
        muscleGroup: formatVolumeTargetMuscleGroup(weeklyRepTarget.muscleGroup),
        prescribedTopEndReps,
        shortfallReps: weeklyRepTarget.target - prescribedTopEndReps,
        targetReps: weeklyRepTarget.target,
      },
    ];
  });
}

function getPrescribedTopEndRepsByMuscleGroup(trainingPlan: TrainingPlan): Map<string, number> {
  const prescribedTopEndRepsByMuscleGroup = new Map<string, number>();

  for (const slot of getTrainingPlanSlots(trainingPlan.workoutTemplates)) {
    const topEndPrescribedReps = getTopEndPrescribedReps(slot);

    for (const muscleGroup of getVolumeTargetMuscleGroupsForSlot(slot)) {
      prescribedTopEndRepsByMuscleGroup.set(
        muscleGroup,
        (prescribedTopEndRepsByMuscleGroup.get(muscleGroup) ?? 0) + topEndPrescribedReps,
      );
    }
  }

  return prescribedTopEndRepsByMuscleGroup;
}

function formatVolumeTargetMuscleGroup(
  muscleGroup: TrainingPlan["weeklyRepTargets"][number]["muscleGroup"],
): string {
  if (muscleGroup === "quads") {
    return "Quads";
  }

  return formatTargetMuscle(muscleGroup);
}

function getVolumeTargetMuscleGroupForPrimaryTargetMuscle(
  targetMuscle: TrainingPlanSlot["targetMuscles"][number],
): TrainingPlan["weeklyRepTargets"][number]["muscleGroup"] | null {
  return targetMuscle in volumeTargetMuscleByPrimaryTargetMuscle
    ? volumeTargetMuscleByPrimaryTargetMuscle[
        targetMuscle as keyof typeof volumeTargetMuscleByPrimaryTargetMuscle
      ]
    : null;
}

function getTrainingPlanSlots(
  workoutTemplates: ReadonlyArray<WorkoutTemplate>,
): TrainingPlanSlot[] {
  return workoutTemplates.flatMap((workoutTemplate) =>
    workoutTemplate.supersetGroups.flatMap((supersetGroup) => supersetGroup.slots),
  );
}

function getTopEndPrescribedReps(slot: TrainingPlanSlot): number {
  const trainingPrescription =
    slot.trainingPrescription ?? createLegacyDefaultTrainingPrescription();

  return trainingPrescription.setCount * trainingPrescription.repRange.max;
}

function getVolumeTargetMuscleGroupsForSlot(
  slot: TrainingPlanSlot,
): TrainingPlan["weeklyRepTargets"][number]["muscleGroup"][] {
  return slot.targetMuscles.flatMap((targetMuscle) => {
    const muscleGroup = getVolumeTargetMuscleGroupForPrimaryTargetMuscle(targetMuscle);

    return muscleGroup ? [muscleGroup] : [];
  });
}
