import type { ReactNode } from "react";
import type {
  ActiveTrainingPlanMovementCoverageCellReadModel,
  ActiveTrainingPlanMovementCoverageRowReadModel,
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
