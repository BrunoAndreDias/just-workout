import type { ReactNode } from "react";
import type { WorkoutTemplate } from "../index";
import {
  hasMovementCoverage,
  type MovementCoverageRow,
  movementCoverageRows,
} from "./active-training-plan-read-model";

type MovementCoverageRowsProps = {
  renderCell: (template: WorkoutTemplate, row: MovementCoverageRow) => ReactNode;
  renderTrailingCell?: (row: MovementCoverageRow) => ReactNode;
  workoutTemplates: ReadonlyArray<WorkoutTemplate>;
};

export function MovementCoverageRows({
  renderCell,
  renderTrailingCell,
  workoutTemplates,
}: MovementCoverageRowsProps) {
  return movementCoverageRows.map((row) => (
    <tr key={row.label}>
      <th scope="row">{row.label}</th>
      {workoutTemplates.map((template) => (
        <td key={`${row.label}-${template.id}`}>{renderCell(template, row)}</td>
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
  workoutTemplates,
}: {
  workoutTemplates: ReadonlyArray<WorkoutTemplate>;
}) {
  return (
    <div className="movement-coverage-table-wrap">
      <table className="movement-coverage-table">
        <thead>
          <tr>
            <th scope="col">Pattern</th>
            {workoutTemplates.map((template) => (
              <th key={template.id} scope="col">
                {template.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <MovementCoverageRows
            renderCell={(template, row) => (
              <MovementCoverageDot covered={hasMovementCoverage(template, row.patterns)} />
            )}
            workoutTemplates={workoutTemplates}
          />
        </tbody>
      </table>
    </div>
  );
}
