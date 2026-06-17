import type { TrainingPlan, WorkoutTemplate } from "../index";
import { type CompareSessionSnapshotReadModel, getCompareReadModel } from "./compare-read-model";
import { formatWeeklyCoverageCount, hasMovementCoverage } from "./movement-coverage-read-model";
import { MovementCoverageRows } from "./movement-coverage-table";
import "./compare-tab.css";

export function CompareTab({ trainingPlan }: { trainingPlan: TrainingPlan }) {
  const workoutTemplates = trainingPlan.workoutTemplates;
  const compareReadModel = getCompareReadModel(trainingPlan);

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
              {compareReadModel.movementPatternHelper}
            </p>
          </div>
          <span className="training-plan-compare-card__chip">
            {compareReadModel.sessionCountLabel}
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
          {compareReadModel.sessionSnapshots.map((snapshot) => (
            <CompareSessionSnapshot key={snapshot.id} snapshot={snapshot} />
          ))}
        </div>
        <p className="compare-balance-callout">{compareReadModel.balanceCallout}</p>
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

function CompareSessionSnapshot({ snapshot }: { snapshot: CompareSessionSnapshotReadModel }) {
  return (
    <article className="compare-snapshot-column">
      <h3>{snapshot.label}</h3>
      <dl className="compare-snapshot-summary">
        <CompareSnapshotFact label="Weekly role" value={snapshot.weeklyRole} />
        <CompareSnapshotFact label="Key focus" value={snapshot.keyFocus} />
        <CompareSnapshotFact label="Main patterns" value={snapshot.mainPatterns} />
        <CompareSnapshotFact label="Accessory work" value={snapshot.accessoryWork} />
      </dl>
      <CompareSnapshotGroup label="Emphasis" items={snapshot.emphasis} tone="accent" />
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
