import type { MovementPatternId } from "../plan-builder/exercise-catalog";
import type {
  CompletedLoadVolumeExerciseReport,
  CompletedLoadVolumeMovementRow,
  CompletedLoadVolumeSummary,
} from "./completed-load-volume";
import type { TrainingPlanSlot } from "./training-plan";

export type PresentedCompletedLoadVolumeExerciseReport = CompletedLoadVolumeExerciseReport & {
  movementPatternLabel: string;
};

export type PresentedCompletedLoadVolumeMovementRow = CompletedLoadVolumeMovementRow & {
  movementPatternLabel: string;
};

export type PresentedCompletedLoadVolumeSummary = Omit<
  CompletedLoadVolumeSummary,
  "exercises" | "volumeByMovementPattern"
> & {
  exercises: ReadonlyArray<PresentedCompletedLoadVolumeExerciseReport>;
  volumeByMovementPattern: ReadonlyArray<PresentedCompletedLoadVolumeMovementRow>;
};

const movementPatternLabels = {
  calves_accessories: "Calves/accessories",
  core: "Core",
  elbow_extension: "Elbow extension",
  elbow_flexion: "Elbow flexion",
  hip_hamstring_dominant: "Hip/hamstring dominant",
  horizontal_pull: "Horizontal pull",
  horizontal_push: "Horizontal push",
  quad_dominant: "Quad dominant",
  vertical_pull: "Vertical pull",
  vertical_push: "Vertical push",
} as const satisfies Record<MovementPatternId, string>;

export function formatMovementPattern(movementPattern: MovementPatternId): string {
  return movementPatternLabels[movementPattern];
}

export function formatMovementPatternVolumeLabel(movementPattern: MovementPatternId): string {
  return toTitleCase(formatMovementPattern(movementPattern));
}

export function formatExerciseRole(role: TrainingPlanSlot["role"]): string {
  switch (role) {
    case "main_compound":
      return "Main";
    case "abs":
    case "secondary_compound":
      return "Accessory";
    case "isolation":
      return "Isolation";
  }
}

export function presentCompletedLoadVolumeSummary(
  summary: CompletedLoadVolumeSummary,
): PresentedCompletedLoadVolumeSummary {
  return {
    ...summary,
    exercises: summary.exercises.map(presentCompletedLoadVolumeExerciseReport),
    volumeByMovementPattern: presentCompletedLoadVolumeMovementRows(
      summary.volumeByMovementPattern,
    ),
  };
}

function presentCompletedLoadVolumeExerciseReport(
  exerciseReport: CompletedLoadVolumeExerciseReport,
): PresentedCompletedLoadVolumeExerciseReport {
  return {
    ...exerciseReport,
    movementPatternLabel: formatMovementPatternVolumeLabel(exerciseReport.movementPattern),
  };
}

export function presentCompletedLoadVolumeMovementRows(
  rows: ReadonlyArray<CompletedLoadVolumeMovementRow>,
): PresentedCompletedLoadVolumeMovementRow[] {
  return rows
    .map((row) => ({
      ...row,
      movementPatternLabel: formatMovementPatternVolumeLabel(row.movementPattern),
    }))
    .sort((firstRow, secondRow) =>
      firstRow.movementPatternLabel.localeCompare(secondRow.movementPatternLabel),
    );
}

function toTitleCase(label: string): string {
  return label.replace(/\b\w/g, (letter) => letter.toUpperCase());
}
