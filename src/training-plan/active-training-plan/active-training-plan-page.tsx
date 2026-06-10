import { CircleCheck, Play, Settings } from "lucide-react";
import { useState } from "react";
import type { TrainingPlan } from "../index";
import {
  type ActiveTrainingPlanTab,
  type ActiveTrainingPlanTabId,
  getActiveTrainingPlanTabs,
  getWorkoutTemplateForTab,
} from "./active-training-plan-read-model";
import { CompareTab } from "./compare-tab";
import { OverviewTab } from "./overview-tab";
import {
  getBlockProgressPercent,
  getCurrentBlockWeek,
  TrainingBlockProgress,
} from "./training-block-progress";
import { WorkoutBlueprint } from "./workout-blueprint";

export function ActiveTrainingPlanPage({ trainingPlan }: { trainingPlan: TrainingPlan }) {
  const [activeTabId, setActiveTabId] = useState<ActiveTrainingPlanTabId>("overview");

  return (
    <section className="active-training-plan-page-shell" aria-label="Active Training Plan">
      <ActiveTrainingPlanHero trainingPlan={trainingPlan} />
      <ActiveTrainingPlanTabs
        activeTabId={activeTabId}
        setActiveTabId={setActiveTabId}
        trainingPlan={trainingPlan}
      />
      <MobileStartWorkoutCta />
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

function ActiveTrainingPlanHero({ trainingPlan }: { trainingPlan: TrainingPlan }) {
  const blockWeek = getCurrentBlockWeek();
  const blockProgressPercent = getBlockProgressPercent({
    blockWeek,
    trainingBlockWeeks: trainingPlan.trainingBlockWeeks,
  });

  return (
    <header className="active-training-plan-hero">
      <div className="active-training-plan-hero__copy">
        <p className="active-training-plan-hero__label">Active Training Plan</p>
        <h1 className="active-training-plan-hero__title">{trainingPlan.split}</h1>
        <p className="active-training-plan-hero__status">
          <CircleCheck aria-hidden="true" className="active-training-plan-hero__status-icon" />
          <span>Rotation pools configured</span>
        </p>
      </div>

      <div className="active-training-plan-hero__side">
        <div className="active-training-plan-hero__actions">
          <button className="active-training-plan-hero__cta" type="button">
            <Play
              aria-hidden="true"
              className="active-training-plan-hero__cta-icon"
              fill="currentColor"
            />
            <span>Start next workout</span>
          </button>
          <button className="active-training-plan-hero__settings" type="button">
            <Settings aria-hidden="true" className="active-training-plan-hero__settings-icon" />
            <span>View plan settings</span>
          </button>
        </div>
        <TrainingBlockProgress
          blockProgressPercent={blockProgressPercent}
          blockWeek={blockWeek}
          trainingBlockWeeks={trainingPlan.trainingBlockWeeks}
        />
      </div>
    </header>
  );
}

function MobileStartWorkoutCta() {
  return (
    <div className="active-training-plan-mobile-cta" aria-hidden="false">
      <button className="active-training-plan-mobile-cta__button" type="button">
        <Play
          aria-hidden="true"
          className="active-training-plan-mobile-cta__icon"
          fill="currentColor"
        />
        <span>Start next workout</span>
      </button>
    </div>
  );
}

function ActiveTrainingPlanTabs({
  activeTabId,
  setActiveTabId,
  trainingPlan,
}: {
  activeTabId: ActiveTrainingPlanTabId;
  setActiveTabId: (activeTabId: ActiveTrainingPlanTabId) => void;
  trainingPlan: TrainingPlan;
}) {
  const activeTrainingPlanTabs = getActiveTrainingPlanTabs(trainingPlan);
  const activeTab = activeTrainingPlanTabs.find((tab) => tab.id === activeTabId);
  const activeWorkoutTemplate = getWorkoutTemplateForTab(trainingPlan, activeTabId);

  return (
    <div
      className={
        "active-training-plan-tabs" +
        (activeWorkoutTemplate ? " active-training-plan-tabs--workout" : "")
      }
    >
      <div className="active-training-plan-tabs__bar">
        <ActiveTrainingPlanTabList
          activeTabId={activeTabId}
          setActiveTabId={setActiveTabId}
          tabs={activeTrainingPlanTabs}
        />
        {activeWorkoutTemplate ? <WorkoutSummaryPills /> : null}
      </div>

      <ActiveTrainingPlanTabPanel
        activeTab={activeTab}
        activeTabId={activeTabId}
        trainingPlan={trainingPlan}
      />
    </div>
  );
}

function ActiveTrainingPlanTabList({
  activeTabId,
  setActiveTabId,
  tabs,
}: {
  activeTabId: ActiveTrainingPlanTabId;
  setActiveTabId: (activeTabId: ActiveTrainingPlanTabId) => void;
  tabs: ActiveTrainingPlanTab[];
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
          aria-selected={tab.id === activeTabId}
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

function ActiveTrainingPlanTabPanel({
  activeTab,
  activeTabId,
  trainingPlan,
}: {
  activeTab: ActiveTrainingPlanTab | undefined;
  activeTabId: ActiveTrainingPlanTabId;
  trainingPlan: TrainingPlan;
}) {
  const activeWorkoutTemplate = getWorkoutTemplateForTab(trainingPlan, activeTabId);

  return (
    <div className="active-training-plan-content-grid">
      <div
        aria-labelledby={`active-training-plan-tab-${activeTabId}`}
        className="active-training-plan-tabs__panel"
        id={`active-training-plan-tabpanel-${activeTabId}`}
        role="tabpanel"
      >
        {activeWorkoutTemplate ? (
          <WorkoutBlueprint workoutTemplate={activeWorkoutTemplate} />
        ) : activeTabId === "overview" ? (
          <OverviewTab trainingPlan={trainingPlan} />
        ) : activeTabId === "compare" ? (
          <CompareTab trainingPlan={trainingPlan} />
        ) : (
          <p>{activeTab?.label} content placeholder</p>
        )}
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
