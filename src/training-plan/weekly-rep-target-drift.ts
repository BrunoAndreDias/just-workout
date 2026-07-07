import type { TrainingPlanContent, TrainingPlanSlot, WorkoutTemplate } from "./training-plan";
import { createLegacyDefaultTrainingPrescription } from "./training-prescription";

type WeeklyRepTarget = TrainingPlanContent["weeklyRepTargets"][number];
type VolumeTargetMuscleGroup = WeeklyRepTarget["muscleGroup"];
type PrimaryTargetMuscle = TrainingPlanSlot["targetMuscles"][number];

export type WeeklyRepTargetDriftNotice = {
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

export function getWeeklyRepTargetDriftNotices(
  content: Pick<TrainingPlanContent, "weeklyRepTargets" | "workoutTemplates">,
): WeeklyRepTargetDriftNotice[] {
  const prescribedTopEndRepsByMuscleGroup = getPrescribedTopEndRepsByMuscleGroup(
    content.workoutTemplates,
  );

  return content.weeklyRepTargets.flatMap((weeklyRepTarget) => {
    const prescribedTopEndReps =
      prescribedTopEndRepsByMuscleGroup.get(weeklyRepTarget.muscleGroup) ?? 0;

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
  });
}

function getPrescribedTopEndRepsByMuscleGroup(
  workoutTemplates: ReadonlyArray<WorkoutTemplate>,
): Map<VolumeTargetMuscleGroup, number> {
  const prescribedTopEndRepsByMuscleGroup = new Map<VolumeTargetMuscleGroup, number>();

  for (const slot of getTrainingPlanSlots(workoutTemplates)) {
    const topEndPrescribedReps = getTopEndPrescribedReps(slot);

    for (const muscleGroup of getVolumeTargetMuscleGroupsForSlot(slot)) {
      prescribedTopEndRepsByMuscleGroup.set(
        muscleGroup,
        (prescribedTopEndRepsByMuscleGroup.get(muscleGroup) ?? 0) + topEndPrescribedReps,
      );
    }
  }

  return prescribedTopEndRepsByMuscleGroup;
}

function formatVolumeTargetMuscleGroup(muscleGroup: VolumeTargetMuscleGroup): string {
  if (muscleGroup === "quads") {
    return "Quads";
  }

  return `${muscleGroup.charAt(0).toUpperCase()}${muscleGroup.slice(1)}`;
}

function getTrainingPlanSlots(
  workoutTemplates: ReadonlyArray<WorkoutTemplate>,
): ReadonlyArray<TrainingPlanSlot> {
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

function getVolumeTargetMuscleGroupForPrimaryTargetMuscle(
  targetMuscle: PrimaryTargetMuscle,
): VolumeTargetMuscleGroup | null {
  return targetMuscle in volumeTargetMuscleByPrimaryTargetMuscle
    ? volumeTargetMuscleByPrimaryTargetMuscle[
        targetMuscle as keyof typeof volumeTargetMuscleByPrimaryTargetMuscle
      ]
    : null;
}
