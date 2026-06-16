import { useNavigate } from "@tanstack/react-router";
import { History, Play } from "lucide-react";
import { useState } from "react";
import { PageHeader, PageMain } from "../../design-system/typography";
import {
  acceptNextTrainingBlockTransition,
  createNextTrainingBlockTransitionPreview,
  type TrainingPlan,
  type TrainingSession,
} from "../index";
import {
  getStartNextWorkoutRouteTarget,
  getStartWorkoutRouteTarget,
} from "./active-training-plan-navigation";
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
import "../training-plan-loading.css";
import "./active-training-plan-page.css";

export function ActiveTrainingPlanPage({
  onAcceptNextTrainingPlan,
  trainingPlan,
  trainingSessions = [],
}: {
  onAcceptNextTrainingPlan?: (nextTrainingPlan: TrainingPlan) => Promise<TrainingPlan>;
  trainingPlan: TrainingPlan;
  trainingSessions?: ReadonlyArray<TrainingSession>;
}) {
  const [activeTabId, setActiveTabId] = useState<ActiveTrainingPlanTabId>("overview");

  return (
    <section className="active-training-plan-page-shell" aria-label="Active Training Plan">
      <PageHeader
        description={`${trainingPlan.trainingFrequencyDaysPerWeek} days/week with ${trainingPlan.workoutTemplates.length} workout templates configured.`}
        title={trainingPlan.split}
      />
      <PageMain>
        <ActiveTrainingPlanActions
          onAcceptNextTrainingPlan={onAcceptNextTrainingPlan}
          trainingPlan={trainingPlan}
          trainingSessions={trainingSessions}
        />
        <ActiveTrainingPlanTabs
          activeTabId={activeTabId}
          setActiveTabId={setActiveTabId}
          trainingPlan={trainingPlan}
        />
        <MobileStartWorkoutCta trainingPlan={trainingPlan} />
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
  onAcceptNextTrainingPlan,
  trainingPlan,
  trainingSessions,
}: {
  onAcceptNextTrainingPlan?: (nextTrainingPlan: TrainingPlan) => Promise<TrainingPlan>;
  trainingPlan: TrainingPlan;
  trainingSessions: ReadonlyArray<TrainingSession>;
}) {
  const navigate = useNavigate();
  const blockWeek = getCurrentBlockWeek(trainingPlan);
  const blockProgressPercent = getBlockProgressPercent({
    blockWeek,
    trainingBlockWeeks: trainingPlan.trainingBlockWeeks,
  });
  const nextBlockPreview = createNextTrainingBlockTransitionPreview({
    availableLoadIncrement: 2.5,
    trainingPlan,
    trainingSessions,
  });

  return (
    <div className="active-training-plan-actions-panel">
      <div className="active-training-plan-hero__actions">
        <button
          className="active-training-plan-hero__cta"
          onClick={() => {
            void navigate(getStartNextWorkoutRouteTarget(trainingPlan));
          }}
          type="button"
        >
          <Play
            aria-hidden="true"
            className="active-training-plan-hero__cta-icon"
            fill="currentColor"
          />
          <span>Start next workout</span>
        </button>
        <button
          className="active-training-plan-hero__settings"
          onClick={() => {
            void navigate({
              params: {
                planId: trainingPlan.id,
              },
              to: "/training-plans/$planId/sessions",
            });
          }}
          type="button"
        >
          <History aria-hidden="true" className="active-training-plan-hero__settings-icon" />
          <span>View training history</span>
        </button>
      </div>
      <TrainingBlockProgress
        blockProgressPercent={blockProgressPercent}
        blockWeek={blockWeek}
        cycleNumber={trainingPlan.trainingBlock?.cycleNumber}
        nextBlockPreview={nextBlockPreview ?? undefined}
        onAcceptNextTrainingBlock={
          onAcceptNextTrainingPlan
            ? async ({ preview, suggestions }) => {
                const savedTrainingPlan = await onAcceptNextTrainingPlan(
                  acceptNextTrainingBlockTransition({ preview, suggestions }),
                );

                await navigate({
                  params: { planId: savedTrainingPlan.id },
                  to: "/training-plans/$planId",
                });
              }
            : undefined
        }
        trainingBlockWeeks={trainingPlan.trainingBlockWeeks}
      />
    </div>
  );
}

function MobileStartWorkoutCta({ trainingPlan }: { trainingPlan: TrainingPlan }) {
  const navigate = useNavigate();

  return (
    <div className="active-training-plan-mobile-cta" aria-hidden="false">
      <button
        className="active-training-plan-mobile-cta__button"
        onClick={() => {
          void navigate(getStartNextWorkoutRouteTarget(trainingPlan));
        }}
        type="button"
      >
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
  const navigate = useNavigate();

  return (
    <div className="active-training-plan-content-grid">
      <div
        aria-labelledby={`active-training-plan-tab-${activeTabId}`}
        className="active-training-plan-tabs__panel"
        id={`active-training-plan-tabpanel-${activeTabId}`}
        role="tabpanel"
      >
        {activeWorkoutTemplate ? (
          <>
            <div className="workout-session-start">
              <button
                className="workout-session-start__button"
                onClick={() => {
                  void navigate(
                    getStartWorkoutRouteTarget({
                      planId: trainingPlan.id,
                      workoutTemplateId: activeWorkoutTemplate.id,
                    }),
                  );
                }}
                type="button"
              >
                <Play aria-hidden="true" fill="currentColor" />
                <span>Start {activeWorkoutTemplate.label} session</span>
              </button>
            </div>
            <WorkoutBlueprint workoutTemplate={activeWorkoutTemplate} />
          </>
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
