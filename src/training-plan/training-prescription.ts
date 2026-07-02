import type { PlanBlueprint } from "../plan-builder/plan-blueprint";
import type { WorkoutTemplate } from "./training-plan";

export type WorkoutExerciseRole = "main_compound" | "secondary_compound" | "isolation" | "abs";

export type TrainingPrescription = {
  repRange: TrainingPrescriptionRepRange;
  setCount: number;
};

type RepRangeStyle = NonNullable<PlanBlueprint["repRanges"]>;
type TrainingPrescriptionRepRange = {
  max: number;
  min: number;
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
} satisfies Record<RepRangeStyle, Record<WorkoutExerciseRole, TrainingPrescriptionRepRange>>;

export function applyTrainingPrescriptionsToWorkoutTemplates({
  repRangeStyle,
  workoutTemplates,
}: {
  repRangeStyle: RepRangeStyle;
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
  repRangeStyle: RepRangeStyle;
  role: WorkoutExerciseRole;
}): TrainingPrescription {
  return createTrainingPrescription(getRoleBasedRepRange({ repRangeStyle, role }));
}

export function createLegacyDefaultTrainingPrescription(): TrainingPrescription {
  return createTrainingPrescription({ max: 12, min: 8 });
}

export function formatTrainingPrescriptionForBlueprint(
  trainingPrescription: TrainingPrescription,
): string {
  return `${trainingPrescription.setCount} × ${formatRepRange(trainingPrescription.repRange)}`;
}

function createTrainingPrescription(repRange: TrainingPrescriptionRepRange): TrainingPrescription {
  return {
    repRange: { ...repRange },
    setCount: DEFAULT_SET_COUNT,
  };
}

function getRoleBasedRepRange({
  repRangeStyle,
  role,
}: {
  repRangeStyle: RepRangeStyle;
  role: WorkoutExerciseRole;
}): TrainingPrescriptionRepRange {
  return roleBasedRepRanges[repRangeStyle][role];
}

function formatRepRange(repRange: TrainingPrescriptionRepRange): string {
  return `${repRange.min}–${repRange.max}`;
}
