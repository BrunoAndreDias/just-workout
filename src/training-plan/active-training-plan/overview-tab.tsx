import {
  CalendarDays,
  Clock3,
  ListChecks,
  Repeat2,
  RotateCw,
  SlidersHorizontal,
} from "lucide-react";
import type { ReactNode } from "react";
import type { TrainingPlan } from "../index";
import { MovementCoverageTable } from "./movement-coverage-table";
import { getPlanSummaryReadModel } from "./plan-summary-read-model";
import {
  getWorkoutSplitSummaryReadModel,
  type WorkoutTemplateMuscleEmphasisReadModel,
} from "./workout-template-summary";
import "./overview-tab.css";

export function OverviewTab({ trainingPlan }: { trainingPlan: TrainingPlan }) {
  const workoutTemplates = trainingPlan.workoutTemplates;
  const workoutSplitSummary = getWorkoutSplitSummaryReadModel(workoutTemplates);

  return (
    <div className="training-plan-overview">
      <PlanSummaryCard trainingPlan={trainingPlan} />

      <div className="training-plan-overview__main-grid">
        <section
          className="training-plan-overview-card"
          aria-labelledby="training-plan-movement-coverage"
        >
          <h2 className="training-plan-overview-card__title" id="training-plan-movement-coverage">
            Movement pattern coverage
          </h2>
          <MovementCoverageTable workoutTemplates={workoutTemplates} />
        </section>

        <section
          className="training-plan-overview-card training-plan-overview-card--muscle-emphasis"
          aria-labelledby="training-plan-muscle-emphasis"
        >
          <h2 className="training-plan-overview-card__title" id="training-plan-muscle-emphasis">
            Workout split at a glance
          </h2>
          <div className="muscle-emphasis-list">
            {workoutSplitSummary.templates.map((templateSummary) => (
              <MuscleEmphasisPanel key={templateSummary.id} templateSummary={templateSummary} />
            ))}
          </div>
          <footer className="training-plan-overview-card__footer">
            <p className="training-plan-overview-card__support">
              <RotateCw aria-hidden="true" />
              <span>{workoutSplitSummary.support}</span>
            </p>
            <div className="muscle-emphasis-legend">
              <span>
                <span className="muscle-emphasis-legend__dot muscle-emphasis-legend__dot--primary" />
                Primary emphasis
              </span>
              <span>
                <span className="muscle-emphasis-legend__dot muscle-emphasis-legend__dot--secondary" />
                Secondary emphasis
              </span>
            </div>
          </footer>
        </section>
      </div>
    </div>
  );
}

function MuscleEmphasisPanel({
  templateSummary,
}: {
  templateSummary: WorkoutTemplateMuscleEmphasisReadModel;
}) {
  return (
    <article className="muscle-emphasis-panel">
      <div className="muscle-emphasis-panel__content">
        <div className="muscle-emphasis-panel__header">
          <div>
            <p className="muscle-emphasis-panel__day">Day {templateSummary.dayIndex}</p>
            <h3>{templateSummary.label}</h3>
          </div>
        </div>
        <EmphasisChipGroup
          label="Primary emphasis"
          muscles={templateSummary.primaryEmphasis}
          tone="primary"
        />
        <EmphasisChipGroup
          label="Secondary emphasis"
          muscles={templateSummary.secondaryEmphasis}
          tone="secondary"
        />
      </div>
    </article>
  );
}

function EmphasisChipGroup({
  label,
  muscles,
  tone,
}: {
  label: string;
  muscles: string[];
  tone: "primary" | "secondary";
}) {
  return (
    <div className="emphasis-chip-group">
      <p>{label}</p>
      <div className="emphasis-chip-group__chips">
        {muscles.map((muscle) => (
          <span className={`emphasis-chip emphasis-chip--${tone}`} key={muscle}>
            {muscle}
          </span>
        ))}
      </div>
    </div>
  );
}

function PlanSummaryCard({ trainingPlan }: { trainingPlan: TrainingPlan }) {
  const summary = getPlanSummaryReadModel(trainingPlan);

  return (
    <aside
      className="active-training-plan-summary"
      aria-labelledby="active-training-plan-summary-title"
    >
      <h2 className="active-training-plan-summary__title" id="active-training-plan-summary-title">
        Plan summary
      </h2>

      <dl className="active-training-plan-summary__rows">
        <PlanSummaryRow
          icon={<CalendarDays aria-hidden="true" />}
          label="Current plan"
          value={summary.currentPlan}
        />
        <PlanSummaryRow
          icon={<Clock3 aria-hidden="true" />}
          label="Block length"
          value={summary.blockLength}
        />
        <PlanSummaryRow
          icon={<ListChecks aria-hidden="true" />}
          label="Volume targets"
          value={summary.volumeTargets}
        />
        <PlanSummaryRow
          icon={<RotateCw aria-hidden="true" />}
          label="Rotation pools"
          value={summary.rotationPools}
        />
        <PlanSummaryRow
          icon={<CalendarDays aria-hidden="true" />}
          label="Frequency"
          value={summary.frequency}
        />
        <PlanSummaryRow
          icon={<Repeat2 aria-hidden="true" />}
          label="Next workout"
          value={summary.nextWorkout}
        />
        <PlanSummaryRow
          icon={<SlidersHorizontal aria-hidden="true" />}
          label="Rep range style"
          value={summary.repRangeStyle}
        />
      </dl>
    </aside>
  );
}

function PlanSummaryRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="active-training-plan-summary__row">
      <dt>
        <span className="active-training-plan-summary__icon">{icon}</span>
        <span>{label}</span>
      </dt>
      <dd>{value}</dd>
    </div>
  );
}
