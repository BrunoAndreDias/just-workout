import type { TrainingPlan, TrainingPlanSlot, WorkoutTemplate } from "../training-plan";
import {
  getTrainingSessionHistoryRouteTarget,
  type TrainingSessionHistoryRouteTarget,
} from "../training-plan-paths";
import type { TrainingSession } from "../training-session";
import { getTrainingSessionSequenceState } from "../training-session-sequencing";
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
  type ActiveTrainingPlanWeekProgressReadModel,
  getTrainingWeekProgressReadModel,
} from "./training-week-progress-read-model";
import {
  type ActiveTrainingPlanVolumeTargetNoticeReadModel,
  getVolumeTargetNoticesReadModel,
} from "./volume-target-notice-read-model";
import {
  getWorkoutSplitSummaryReadModel,
  type WorkoutSplitSummaryReadModel,
} from "./workout-template-summary";

export type { ActiveTrainingPlanTab, ActiveTrainingPlanTabId } from "./active-training-plan-tabs";
export type { MovementCoverageRow } from "./movement-coverage-read-model";
export type { ActiveTrainingPlanVolumeTargetNoticeReadModel } from "./volume-target-notice-read-model";

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
  trainingWeekProgress: ActiveTrainingPlanWeekProgressReadModel;
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
  now = new Date(),
  trainingPlan,
  trainingSessions = [],
}: {
  activeTabId?: ActiveTrainingPlanTabId;
  now?: Date;
  trainingPlan: TrainingPlan;
  trainingSessions?: ReadonlyArray<TrainingSession>;
}): ActiveTrainingPlanPageReadModel {
  const tabs = getActiveTrainingPlanTabs(trainingPlan);
  const resolvedActiveTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];
  const resolvedActiveTabId = resolvedActiveTab?.id ?? "overview";
  const blockWeek = getCurrentBlockWeek(trainingPlan);
  const movementCoverage = getMovementCoverageTableReadModel(trainingPlan.workoutTemplates);
  const sessionSequenceState = getTrainingSessionSequenceState({
    now,
    trainingPlan,
    trainingSessions,
  });

  return {
    actions: getActionsReadModel({
      now,
      sessionSequenceState,
      trainingPlan,
      trainingSessions,
    }),
    activeTab: getPageTabReadModel({
      activeTabId: resolvedActiveTabId,
      isExtraSessionAvailable: sessionSequenceState.isExtraSessionAvailable,
      tab: resolvedActiveTab ?? { id: "overview", label: "Overview" },
      trainingPlan,
    }),
    compare: getCompareTabReadModel(trainingPlan, movementCoverage),
    header: getHeaderReadModel(trainingPlan),
    overview: getOverviewReadModel(trainingPlan, movementCoverage),
    progress: getProgressReadModel({
      blockWeek,
      now,
      trainingPlan,
      trainingSessions,
    }),
    tabs: tabs.map((tab) =>
      getPageTabReadModel({
        activeTabId: resolvedActiveTabId,
        isExtraSessionAvailable: sessionSequenceState.isExtraSessionAvailable,
        tab,
        trainingPlan,
      }),
    ),
  };
}

function getActionsReadModel({
  now,
  sessionSequenceState,
  trainingPlan,
  trainingSessions,
}: {
  now: Date;
  sessionSequenceState: ReturnType<typeof getTrainingSessionSequenceState>;
  trainingPlan: TrainingPlan;
  trainingSessions: ReadonlyArray<TrainingSession>;
}): ActiveTrainingPlanPageActionsReadModel {
  return {
    startNextWorkout: {
      label: sessionSequenceState.isExtraSessionAvailable
        ? "Start Extra Training Session"
        : "Start next workout",
      routeTarget: getStartNextWorkoutRouteTarget({
        ...trainingPlan,
        now,
        trainingSessions,
      }),
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

function getProgressReadModel({
  blockWeek,
  now,
  trainingPlan,
  trainingSessions,
}: {
  blockWeek: number;
  now: Date;
  trainingPlan: TrainingPlan;
  trainingSessions: ReadonlyArray<TrainingSession>;
}): ActiveTrainingPlanPageProgressReadModel {
  return {
    blockProgressPercent: getBlockProgressPercent({
      blockWeek,
      trainingBlockWeeks: trainingPlan.trainingBlockWeeks,
    }),
    blockWeek,
    cycleNumber: trainingPlan.trainingBlock?.cycleNumber,
    trainingWeekProgress: getTrainingWeekProgressReadModel({
      now,
      trainingPlan,
      trainingSessions,
    }),
    trainingBlockWeeks: trainingPlan.trainingBlockWeeks,
  };
}

function getPageTabReadModel({
  activeTabId,
  isExtraSessionAvailable,
  tab,
  trainingPlan,
}: {
  activeTabId: ActiveTrainingPlanTabId;
  isExtraSessionAvailable: boolean;
  tab: ActiveTrainingPlanTab;
  trainingPlan: TrainingPlan;
}): ActiveTrainingPlanPageTabReadModel {
  return {
    ...tab,
    isActive: tab.id === activeTabId,
    panel: getTabPanelReadModel({ isExtraSessionAvailable, tab, trainingPlan }),
  };
}

function getTabPanelReadModel({
  isExtraSessionAvailable,
  tab,
  trainingPlan,
}: {
  isExtraSessionAvailable: boolean;
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
      label: isExtraSessionAvailable
        ? `Start ${workoutTemplate.label} extra session`
        : `Start ${workoutTemplate.label} session`,
      routeTarget: getStartWorkoutRouteTarget({
        ...(isExtraSessionAvailable ? { intent: "extra" as const } : {}),
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
