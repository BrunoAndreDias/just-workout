import type { PlanBlueprint } from "../plan-builder/plan-blueprint";
import type { WorkoutTemplate } from "./training-plan";

export type TrainingPrescriptionRole = "main_compound" | "secondary_compound" | "isolation" | "abs";

export type TrainingPrescription = {
  repRange: {
    max: number;
    min: number;
  };
  setCount: number;
};

const DEFAULT_SET_COUNT = 3;
const roleBasedRepRanges = {
  balanced_hypertrophy: {
    abs: { max: 15, min: 10 },
    isolation: { max: 15, min: 10 },
    main_compound: { max: 8, min: 6 },
    secondary_compound: { max: 10, min: 8 },
  },
  controlled_higher_reps: {
    abs: { max: 20, min: 12 },
    isolation: { max: 20, min: 12 },
    main_compound: { max: 10, min: 8 },
    secondary_compound: { max: 12, min: 10 },
  },
  strength_leaning: {
    abs: { max: 12, min: 8 },
    isolation: { max: 12, min: 8 },
    main_compound: { max: 6, min: 4 },
    secondary_compound: { max: 8, min: 6 },
  },
} satisfies Record<
  NonNullable<PlanBlueprint["repRanges"]>,
  Record<TrainingPrescriptionRole, TrainingPrescription["repRange"]>
>;

export function applyTrainingPrescriptionsToWorkoutTemplates({
  repRangeStyle,
  workoutTemplates,
}: {
  repRangeStyle: NonNullable<PlanBlueprint["repRanges"]>;
  workoutTemplates: ReadonlyArray<WorkoutTemplate>;
}): WorkoutTemplate[] {
  return workoutTemplates.map((workoutTemplate) => ({
    ...workoutTemplate,
    supersetGroups: workoutTemplate.supersetGroups.map((supersetGroup) => ({
      ...supersetGroup,
      slots: supersetGroup.slots.map((slot) => ({
        ...slot,
        trainingPrescription: buildTrainingPrescription({
          repRangeStyle,
          role: slot.role,
        }),
      })),
    })),
  }));
}

function buildTrainingPrescription({
  repRangeStyle,
  role,
}: {
  repRangeStyle: NonNullable<PlanBlueprint["repRanges"]>;
  role: TrainingPrescriptionRole;
}): TrainingPrescription {
  return {
    repRange: getRoleBasedRepRange({ repRangeStyle, role }),
    setCount: DEFAULT_SET_COUNT,
  };
}

export function createLegacyDefaultTrainingPrescription(): TrainingPrescription {
  return {
    repRange: {
      max: 12,
      min: 8,
    },
    setCount: DEFAULT_SET_COUNT,
  };
}

export function formatTrainingPrescriptionForBlueprint(
  trainingPrescription: TrainingPrescription,
): string {
  return `${trainingPrescription.setCount} × ${formatRepRange(trainingPrescription, "–")}`;
}

function getRoleBasedRepRange({
  repRangeStyle,
  role,
}: {
  repRangeStyle: NonNullable<PlanBlueprint["repRanges"]>;
  role: TrainingPrescriptionRole;
}): TrainingPrescription["repRange"] {
  return roleBasedRepRanges[repRangeStyle][role];
}

function formatRepRange(trainingPrescription: TrainingPrescription, separator: "–" | "-"): string {
  return `${trainingPrescription.repRange.min}${separator}${trainingPrescription.repRange.max}`;
}
