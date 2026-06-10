import type { TrainingPlan, WorkoutTemplate } from "../index";
import {
  formatWeeklyCoverageCount,
  formatWorkoutTemplateList,
  getCompareSessionSummary,
  hasMovementCoverage,
} from "./active-training-plan-read-model";
import { MovementCoverageRows } from "./movement-coverage-table";

export function CompareTab({ trainingPlan }: { trainingPlan: TrainingPlan }) {
  const workoutTemplates = trainingPlan.workoutTemplates;
  const sessionCount = workoutTemplates.length;

  return (
    <div className="training-plan-compare">
      <section
        className="training-plan-compare-card"
        aria-labelledby="training-plan-compare-movement-patterns"
      >
        <div className="training-plan-compare-card__header">
          <div>
            <h2
              className="training-plan-compare-card__title"
              id="training-plan-compare-movement-patterns"
            >
              Movement patterns comparison
            </h2>
            <p className="training-plan-compare-card__helper">
              See how {formatWorkoutTemplateList(workoutTemplates)} distribute movement patterns
              across the week.
            </p>
          </div>
          <span className="training-plan-compare-card__chip">
            {sessionCount} {sessionCount === 1 ? "session" : "sessions"}
          </span>
        </div>
        <CompareMovementTable workoutTemplates={workoutTemplates} />
      </section>

      <section
        className="training-plan-compare-card"
        aria-labelledby="training-plan-session-snapshots"
      >
        <h2 className="training-plan-compare-card__title" id="training-plan-session-snapshots">
          Session snapshots
        </h2>
        <div className="compare-snapshot-grid">
          {workoutTemplates.map((workoutTemplate) => (
            <CompareSessionSnapshot key={workoutTemplate.id} workoutTemplate={workoutTemplate} />
          ))}
        </div>
        <p className="compare-balance-callout">
          This split distributes upper-body, lower-body, and accessory stress across the week so
          each session has a distinct role.
        </p>
      </section>
    </div>
  );
}

function CompareMovementTable({
  workoutTemplates,
}: {
  workoutTemplates: ReadonlyArray<WorkoutTemplate>;
}) {
  return (
    <div className="compare-table-wrap">
      <table className="compare-table">
        <thead>
          <tr>
            <th scope="col">Movement pattern</th>
            {workoutTemplates.map((template) => (
              <th key={template.id} scope="col">
                {template.label}
              </th>
            ))}
            <th scope="col">Weekly coverage</th>
          </tr>
        </thead>
        <tbody>
          <MovementCoverageRows
            renderCell={(template, row) => (
              <CompareCoverageIndicator covered={hasMovementCoverage(template, row.patterns)} />
            )}
            renderTrailingCell={(row) => formatWeeklyCoverageCount(workoutTemplates, row.patterns)}
            workoutTemplates={workoutTemplates}
          />
        </tbody>
      </table>
    </div>
  );
}

function CompareCoverageIndicator({ covered }: { covered: boolean }) {
  if (!covered) {
    return <span className="compare-coverage compare-coverage--no">No</span>;
  }

  return <span className="compare-coverage compare-coverage--yes">Yes</span>;
}

function CompareSessionSnapshot({ workoutTemplate }: { workoutTemplate: WorkoutTemplate }) {
  const summary = getCompareSessionSummary(workoutTemplate);

  return (
    <article className="compare-snapshot-column">
      <h3>{workoutTemplate.label}</h3>
      <dl className="compare-snapshot-summary">
        <CompareSnapshotFact label="Weekly role" value={summary.weeklyRole} />
        <CompareSnapshotFact label="Key focus" value={summary.keyFocus} />
        <CompareSnapshotFact label="Main patterns" value={summary.mainPatterns} />
        <CompareSnapshotFact label="Accessory work" value={summary.accessoryWork} />
      </dl>
      <CompareSnapshotGroup label="Emphasis" items={summary.emphasis} tone="accent" />
    </article>
  );
}

function CompareSnapshotFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="compare-snapshot-fact">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function CompareSnapshotGroup({
  items,
  label,
  tone = "default",
}: {
  items: string[];
  label: string;
  tone?: "accent" | "default";
}) {
  return (
    <div className="compare-snapshot-group">
      <p>{label}</p>
      <ul className={`compare-snapshot-list compare-snapshot-list--${tone}`}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
