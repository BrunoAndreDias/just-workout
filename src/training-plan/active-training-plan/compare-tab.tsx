import type {
  ActiveTrainingPlanCompareMovementCoverageTableReadModel,
  ActiveTrainingPlanMovementCoverageCellReadModel,
  ActiveTrainingPlanPageCompareReadModel,
} from "./active-training-plan-read-model";
import type { CompareSessionSnapshotReadModel } from "./compare-read-model";
import { MovementCoverageRows } from "./movement-coverage-table";
import "./compare-tab.css";

export function CompareTab({ readModel }: { readModel: ActiveTrainingPlanPageCompareReadModel }) {
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
            <p className="training-plan-compare-card__helper">{readModel.movementPatternHelper}</p>
          </div>
          <span className="training-plan-compare-card__chip">{readModel.sessionCountLabel}</span>
        </div>
        <CompareMovementTable readModel={readModel.movementCoverage} />
      </section>

      <section
        className="training-plan-compare-card"
        aria-labelledby="training-plan-session-snapshots"
      >
        <h2 className="training-plan-compare-card__title" id="training-plan-session-snapshots">
          Session snapshots
        </h2>
        <div className="compare-snapshot-grid">
          {readModel.sessionSnapshots.map((snapshot) => (
            <CompareSessionSnapshot key={snapshot.id} snapshot={snapshot} />
          ))}
        </div>
        <p className="compare-balance-callout">{readModel.balanceCallout}</p>
      </section>
    </div>
  );
}

function CompareMovementTable({
  readModel,
}: {
  readModel: ActiveTrainingPlanCompareMovementCoverageTableReadModel;
}) {
  return (
    <div className="compare-table-wrap">
      <table className="compare-table">
        <thead>
          <tr>
            <th scope="col">Movement pattern</th>
            {readModel.columns.map((column) => (
              <th key={column.id} scope="col">
                {column.label}
              </th>
            ))}
            <th scope="col">Weekly coverage</th>
          </tr>
        </thead>
        <tbody>
          <MovementCoverageRows
            readModel={readModel}
            renderCell={(cell) => <CompareCoverageIndicator covered={cell.covered} />}
            renderTrailingCell={(row) => row.weeklyCoverage}
          />
        </tbody>
      </table>
    </div>
  );
}

function CompareCoverageIndicator({
  covered,
}: Pick<ActiveTrainingPlanMovementCoverageCellReadModel, "covered">) {
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
