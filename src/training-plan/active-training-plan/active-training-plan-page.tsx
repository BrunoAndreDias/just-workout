import { useNavigate } from "@tanstack/react-router";
import { History, Play } from "lucide-react";
import { useState } from "react";
import { PageHeader, PageMain } from "../../design-system/typography";
import type { NextTrainingBlockTransitionWorkflow } from "../training-block-transition";
import type { TrainingPlan } from "../training-plan";
import type { TrainingSession } from "../training-session";
import {
  type ActiveTrainingPlanPageActionsReadModel,
  type ActiveTrainingPlanPageReadModel,
  type ActiveTrainingPlanPageTabReadModel,
  type ActiveTrainingPlanTabId,
  getActiveTrainingPlanPageReadModel,
} from "./active-training-plan-read-model";
import { CompareTab } from "./compare-tab";
import { OverviewTab } from "./overview-tab";
import { TrainingBlockProgress } from "./training-block-progress";
import { WorkoutBlueprint } from "./workout-blueprint";
import "../training-plan-loading.css";
import "./active-training-plan-page.css";

export function ActiveTrainingPlanPage({
  nextTrainingBlockTransition,
  trainingPlan,
  trainingSessions = [],
}: {
  nextTrainingBlockTransition?: NextTrainingBlockTransitionWorkflow;
  trainingPlan: TrainingPlan;
  trainingSessions?: ReadonlyArray<TrainingSession>;
}) {
  const [activeTabId, setActiveTabId] = useState<ActiveTrainingPlanTabId>("overview");
  const readModel = getActiveTrainingPlanPageReadModel({
    activeTabId,
    trainingPlan,
    trainingSessions,
  });

  return (
    <section className="active-training-plan-page-shell" aria-label="Active Training Plan">
      <PageHeader description={readModel.header.description} title={readModel.header.title} />
      <PageMain>
        <ActiveTrainingPlanActions
          nextTrainingBlockTransition={nextTrainingBlockTransition}
          readModel={readModel}
        />
        <ActiveTrainingPlanTabs readModel={readModel} setActiveTabId={setActiveTabId} />
        <MobileStartWorkoutCta action={readModel.actions.startNextWorkout} />
      </PageMain>
    </section>
  );
}

export function ActiveTrainingPlanLoading({ children }: { children: string }) {
  return (
    <section className="active-training-plan-page-shell" aria-label="Active Training Plan">
      <p className="active-training-plan-loading">{children}</p>
    </section>
  );
}

function ActiveTrainingPlanActions({
  nextTrainingBlockTransition,
  readModel,
}: {
  nextTrainingBlockTransition?: NextTrainingBlockTransitionWorkflow;
  readModel: ActiveTrainingPlanPageReadModel;
}) {
  const navigate = useNavigate();

  return (
    <div className="active-training-plan-actions-panel">
      <div className="active-training-plan-hero__actions">
        <button
          className="active-training-plan-hero__cta"
          onClick={() => {
            void navigate(readModel.actions.startNextWorkout.routeTarget);
          }}
          type="button"
        >
          <Play
            aria-hidden="true"
            className="active-training-plan-hero__cta-icon"
            fill="currentColor"
          />
          <span>{readModel.actions.startNextWorkout.label}</span>
        </button>
        <button
          className="active-training-plan-hero__settings"
          onClick={() => {
            void navigate(readModel.actions.trainingHistory.routeTarget);
          }}
          type="button"
        >
          <History aria-hidden="true" className="active-training-plan-hero__settings-icon" />
          <span>{readModel.actions.trainingHistory.label}</span>
        </button>
      </div>
      <TrainingBlockProgress
        blockProgressPercent={readModel.progress.blockProgressPercent}
        blockWeek={readModel.progress.blockWeek}
        cycleNumber={readModel.progress.cycleNumber}
        nextTrainingBlockTransition={nextTrainingBlockTransition}
        trainingWeekProgress={readModel.progress.trainingWeekProgress}
        trainingBlockWeeks={readModel.progress.trainingBlockWeeks}
      />
    </div>
  );
}

function MobileStartWorkoutCta({
  action,
}: {
  action: ActiveTrainingPlanPageActionsReadModel["startNextWorkout"];
}) {
  const navigate = useNavigate();

  return (
    <div className="active-training-plan-mobile-cta" aria-hidden="false">
      <button
        className="active-training-plan-mobile-cta__button"
        onClick={() => {
          void navigate(action.routeTarget);
        }}
        type="button"
      >
        <Play
          aria-hidden="true"
          className="active-training-plan-mobile-cta__icon"
          fill="currentColor"
        />
        <span>{action.label}</span>
      </button>
    </div>
  );
}

function ActiveTrainingPlanTabs({
  readModel,
  setActiveTabId,
}: {
  readModel: ActiveTrainingPlanPageReadModel;
  setActiveTabId: (activeTabId: ActiveTrainingPlanTabId) => void;
}) {
  const activePanel = readModel.activeTab.panel;

  return (
    <div
      className={
        "active-training-plan-tabs" +
        (activePanel.kind === "workout" ? " active-training-plan-tabs--workout" : "")
      }
    >
      <div className="active-training-plan-tabs__bar">
        <ActiveTrainingPlanTabList setActiveTabId={setActiveTabId} tabs={readModel.tabs} />
        {activePanel.kind === "workout" ? <WorkoutSummaryPills /> : null}
      </div>

      <ActiveTrainingPlanTabPanel readModel={readModel} />
    </div>
  );
}

function ActiveTrainingPlanTabList({
  setActiveTabId,
  tabs,
}: {
  setActiveTabId: (activeTabId: ActiveTrainingPlanTabId) => void;
  tabs: ActiveTrainingPlanPageTabReadModel[];
}) {
  return (
    <div
      className="active-training-plan-tabs__list"
      role="tablist"
      aria-label="Training Plan sections"
    >
      {tabs.map((tab) => (
        <button
          aria-controls={`active-training-plan-tabpanel-${tab.id}`}
          aria-selected={tab.isActive}
          className="active-training-plan-tabs__trigger"
          id={`active-training-plan-tab-${tab.id}`}
          key={tab.id}
          onClick={() => setActiveTabId(tab.id)}
          role="tab"
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function ActiveTrainingPlanTabPanel({ readModel }: { readModel: ActiveTrainingPlanPageReadModel }) {
  const navigate = useNavigate();
  const activeTab = readModel.activeTab;
  const panel = activeTab.panel;

  return (
    <div className="active-training-plan-content-grid">
      <div
        aria-labelledby={`active-training-plan-tab-${activeTab.id}`}
        className="active-training-plan-tabs__panel"
        id={`active-training-plan-tabpanel-${activeTab.id}`}
        role="tabpanel"
      >
        {panel.kind === "workout" ? (
          <>
            <div className="workout-session-start">
              <button
                className="workout-session-start__button"
                onClick={() => {
                  void navigate(panel.startAction.routeTarget);
                }}
                type="button"
              >
                <Play aria-hidden="true" fill="currentColor" />
                <span>{panel.startAction.label}</span>
              </button>
            </div>
            <WorkoutBlueprint workoutTemplate={panel.workoutTemplate} />
          </>
        ) : panel.kind === "overview" ? (
          <OverviewTab readModel={readModel.overview} />
        ) : panel.kind === "compare" ? (
          <CompareTab readModel={readModel.compare} />
        ) : null}
      </div>
    </div>
  );
}

function WorkoutSummaryPills() {
  return (
    <div className="active-training-plan-tabs__summary">
      <span>3 sets</span>
      <span>8–12 reps</span>
    </div>
  );
}
