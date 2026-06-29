import type { ReactNode } from "react";
import type {
  ActiveTrainingPlanMovementCoverageCellReadModel,
  ActiveTrainingPlanMovementCoverageRowReadModel,
  ActiveTrainingPlanMovementCoverageTableReadModel,
} from "./active-training-plan-read-model";

type MovementCoverageRowsProps<Row extends ActiveTrainingPlanMovementCoverageRowReadModel> = {
  readModel: {
    rows: ReadonlyArray<Row>;
  };
  renderCell: (cell: ActiveTrainingPlanMovementCoverageCellReadModel, row: Row) => ReactNode;
  renderTrailingCell?: (row: Row) => ReactNode;
};

export function MovementCoverageRows<Row extends ActiveTrainingPlanMovementCoverageRowReadModel>({
  readModel,
  renderCell,
  renderTrailingCell,
}: MovementCoverageRowsProps<Row>) {
  return readModel.rows.map((row) => (
    <tr key={row.label}>
      <th scope="row">{row.label}</th>
      {row.cells.map((cell) => (
        <td key={`${row.label}-${cell.templateId}`}>{renderCell(cell, row)}</td>
      ))}
      {renderTrailingCell ? <td>{renderTrailingCell(row)}</td> : null}
    </tr>
  ));
}

function MovementCoverageDot({ covered }: { covered: boolean }) {
  if (!covered) {
    return (
      <span className="movement-coverage-table__empty">
        <span className="sr-only">Not covered</span>
      </span>
    );
  }

  return (
    <span className="movement-coverage-table__dot">
      <span className="sr-only">Covered</span>
    </span>
  );
}

export function MovementCoverageTable({
  readModel,
}: {
  readModel: ActiveTrainingPlanMovementCoverageTableReadModel;
}) {
  return (
    <div className="movement-coverage-table-wrap">
      <table className="movement-coverage-table">
        <thead>
          <tr>
            <th scope="col">Pattern</th>
            {readModel.columns.map((column) => (
              <th key={column.id} scope="col">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <MovementCoverageRows
            readModel={readModel}
            renderCell={(cell) => <MovementCoverageDot covered={cell.covered} />}
          />
        </tbody>
      </table>
    </div>
  );
}
