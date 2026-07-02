import type { TrainingPlan, TrainingPlanSlot, WorkoutTemplate } from "../training-plan";
import { createLegacyDefaultTrainingPrescription } from "../training-prescription";
import { formatTargetMuscle } from "./workout-template-summary";

type WeeklyRepTarget = TrainingPlan["weeklyRepTargets"][number];
type VolumeTargetMuscleGroup = WeeklyRepTarget["muscleGroup"];
type PrimaryTargetMuscle = TrainingPlanSlot["targetMuscles"][number];

export type ActiveTrainingPlanVolumeTargetNoticeReadModel = {
  muscleGroup: string;
  prescribedTopEndReps: number;
  shortfallReps: number;
  targetReps: number;
};

const volumeTargetMuscleByPrimaryTargetMuscle = {
  abs: "abs",
  back: "back",
  biceps: "biceps",
  calves: "calves",
  chest: "chest",
  hamstrings: "hamstrings",
  quadriceps: "quads",
  shoulders: "shoulders",
  triceps: "triceps",
} as const satisfies Partial<Record<PrimaryTargetMuscle, VolumeTargetMuscleGroup>>;

export function getVolumeTargetNoticesReadModel(
  trainingPlan: TrainingPlan,
): ActiveTrainingPlanVolumeTargetNoticeReadModel[] {
  const prescribedTopEndRepsByMuscleGroup = getPrescribedTopEndRepsByMuscleGroup(trainingPlan);

  return trainingPlan.weeklyRepTargets.flatMap((weeklyRepTarget) =>
    getVolumeTargetNoticeReadModel({
      prescribedTopEndReps: prescribedTopEndRepsByMuscleGroup.get(weeklyRepTarget.muscleGroup) ?? 0,
      weeklyRepTarget,
    }),
  );
}

function getVolumeTargetNoticeReadModel({
  prescribedTopEndReps,
  weeklyRepTarget,
}: {
  prescribedTopEndReps: number;
  weeklyRepTarget: WeeklyRepTarget;
}): ActiveTrainingPlanVolumeTargetNoticeReadModel[] {
  if (
    !weeklyRepTarget.isEnabled ||
    weeklyRepTarget.target === null ||
    prescribedTopEndReps >= weeklyRepTarget.target
  ) {
    return [];
  }

  return [
    {
      muscleGroup: formatVolumeTargetMuscleGroup(weeklyRepTarget.muscleGroup),
      prescribedTopEndReps,
      shortfallReps: weeklyRepTarget.target - prescribedTopEndReps,
      targetReps: weeklyRepTarget.target,
    },
  ];
}

function getPrescribedTopEndRepsByMuscleGroup(
  trainingPlan: TrainingPlan,
): Map<VolumeTargetMuscleGroup, number> {
  const prescribedTopEndRepsByMuscleGroup = new Map<VolumeTargetMuscleGroup, number>();

  for (const slot of getTrainingPlanSlots(trainingPlan.workoutTemplates)) {
    addSlotTopEndReps({
      prescribedTopEndRepsByMuscleGroup,
      slot,
    });
  }

  return prescribedTopEndRepsByMuscleGroup;
}

function addSlotTopEndReps({
  prescribedTopEndRepsByMuscleGroup,
  slot,
}: {
  prescribedTopEndRepsByMuscleGroup: Map<VolumeTargetMuscleGroup, number>;
  slot: TrainingPlanSlot;
}) {
  const topEndPrescribedReps = getTopEndPrescribedReps(slot);

  for (const muscleGroup of getVolumeTargetMuscleGroupsForSlot(slot)) {
    prescribedTopEndRepsByMuscleGroup.set(
      muscleGroup,
      (prescribedTopEndRepsByMuscleGroup.get(muscleGroup) ?? 0) + topEndPrescribedReps,
    );
  }
}

function formatVolumeTargetMuscleGroup(muscleGroup: VolumeTargetMuscleGroup): string {
  if (muscleGroup === "quads") {
    return "Quads";
  }

  return formatTargetMuscle(muscleGroup);
}

function getVolumeTargetMuscleGroupForPrimaryTargetMuscle(
  targetMuscle: PrimaryTargetMuscle,
): VolumeTargetMuscleGroup | null {
  return targetMuscle in volumeTargetMuscleByPrimaryTargetMuscle
    ? volumeTargetMuscleByPrimaryTargetMuscle[
        targetMuscle as keyof typeof volumeTargetMuscleByPrimaryTargetMuscle
      ]
    : null;
}

function getTrainingPlanSlots(
  workoutTemplates: ReadonlyArray<WorkoutTemplate>,
): TrainingPlanSlot[] {
  return workoutTemplates.flatMap((workoutTemplate) =>
    workoutTemplate.supersetGroups.flatMap((supersetGroup) => supersetGroup.slots),
  );
}

function getTopEndPrescribedReps(slot: TrainingPlanSlot): number {
  const trainingPrescription =
    slot.trainingPrescription ?? createLegacyDefaultTrainingPrescription();

  return trainingPrescription.setCount * trainingPrescription.repRange.max;
}

function getVolumeTargetMuscleGroupsForSlot(slot: TrainingPlanSlot): VolumeTargetMuscleGroup[] {
  return slot.targetMuscles.flatMap((targetMuscle) => {
    const muscleGroup = getVolumeTargetMuscleGroupForPrimaryTargetMuscle(targetMuscle);

    return muscleGroup ? [muscleGroup] : [];
  });
}
