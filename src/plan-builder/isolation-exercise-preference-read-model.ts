import {
  type ExerciseCatalogExercise,
  type ExerciseCatalogMuscleGroupId,
  exerciseCatalogExercises,
  exerciseCatalogMuscleGroups,
} from "./exercise-catalog";
import {
  getIsolationExercisePreferenceExerciseIds,
  isolationPreferencePrimaryMuscleGroups,
  normalizeIsolationExercisePreferences,
} from "./isolation-exercise-preferences";
import type { PlanBlueprint } from "./plan-blueprint";
import { getRankedExercisePreferenceDetails } from "./ranked-exercise-preferences";

export type IsolationExercisePreferenceOption = ExerciseCatalogExercise & {
  metadata: string;
};

export type IsolationExercisePreferenceRowReadModel = {
  helperText: string;
  isolationOptions: ReadonlyArray<IsolationExercisePreferenceOption>;
  metadata: string;
  preferences: ReadonlyArray<{ exerciseId: string; exerciseName: string }>;
  primaryMuscleGroup: ExerciseCatalogMuscleGroupId;
  primaryMuscleGroupLabel: string;
  topPreference: { exerciseId: string; exerciseName: string } | null;
};

export type IsolationExercisePreferenceReadModel = {
  guidance: string;
  rankedBucketCount: number;
  rows: ReadonlyArray<IsolationExercisePreferenceRowReadModel>;
  summary: string;
};

export function getIsolationExercisePreferenceReadModel({
  blueprint,
}: {
  blueprint: Pick<PlanBlueprint, "isolationExercisePreferences">;
}): IsolationExercisePreferenceReadModel {
  const normalizedPreferences = normalizeIsolationExercisePreferences(
    blueprint.isolationExercisePreferences,
  );
  const rows = isolationPreferencePrimaryMuscleGroups.map((primaryMuscleGroup) => {
    const preferenceExerciseIds = getIsolationExercisePreferenceExerciseIds({
      preferences: normalizedPreferences,
      primaryMuscleGroup,
    });
    const { metadata, preferences, topPreference } =
      getRankedExercisePreferenceDetails(preferenceExerciseIds);

    return {
      helperText: getIsolationPreferenceHelperText(primaryMuscleGroup),
      isolationOptions: getIsolationOptions({
        preferenceExerciseIds,
        primaryMuscleGroup,
      }),
      metadata,
      preferences,
      primaryMuscleGroup,
      primaryMuscleGroupLabel: getPrimaryMuscleGroupLabel(primaryMuscleGroup),
      topPreference: topPreference ?? null,
    } satisfies IsolationExercisePreferenceRowReadModel;
  });
  const rankedBucketCount = rows.filter((row) => row.preferences.length > 0).length;

  return {
    guidance:
      rankedBucketCount === 0
        ? "Rank any isolation exercises you want Just Workout to use when accessory slots fit. Empty buckets stay valid."
        : "Ranked isolation preferences guide accessory work before Recommended Defaults fill any gaps.",
    rankedBucketCount,
    rows,
    summary: `${rankedBucketCount} of ${rows.length} primary muscle group buckets ranked`,
  };
}

function getIsolationOptions({
  preferenceExerciseIds,
  primaryMuscleGroup,
}: {
  preferenceExerciseIds: ReadonlyArray<string>;
  primaryMuscleGroup: ExerciseCatalogMuscleGroupId;
}): ReadonlyArray<IsolationExercisePreferenceOption> {
  return exerciseCatalogExercises
    .filter(
      (exercise) =>
        exercise.role === "isolation" &&
        exercise.primaryMuscleGroups.some((muscleGroup) => muscleGroup === primaryMuscleGroup),
    )
    .map((exercise) => {
      const preferenceIndex = preferenceExerciseIds.indexOf(exercise.id);

      return {
        ...exercise,
        metadata:
          preferenceIndex === -1
            ? "Available isolation exercise"
            : `Preference #${preferenceIndex + 1}`,
      };
    });
}

function getPrimaryMuscleGroupLabel(primaryMuscleGroup: ExerciseCatalogMuscleGroupId): string {
  return (
    exerciseCatalogMuscleGroups.find((muscleGroup) => muscleGroup.id === primaryMuscleGroup)
      ?.title ?? primaryMuscleGroup
  );
}

function getIsolationPreferenceHelperText(
  primaryMuscleGroup: ExerciseCatalogMuscleGroupId,
): string {
  return isolationPreferenceHelperTextByMuscleGroup[primaryMuscleGroup];
}

const isolationPreferenceHelperTextByMuscleGroup: Record<ExerciseCatalogMuscleGroupId, string> = {
  abs: "Direct trunk work when accessory slots leave room for it.",
  back: "Direct lat and upper-back work when accessories call for it.",
  biceps: "Elbow-flexion accessory work.",
  calves: "Lower-leg accessory work when calf volume is enabled.",
  chest: "Direct chest work when accessory slots fit.",
  forearms: "Grip and forearm accessory work.",
  glutes: "Direct glute accessory work.",
  hamstrings: "Direct hamstring work when accessory slots fit.",
  quadriceps: "Knee-dominant accessory work.",
  shoulders: "Direct delt work when accessory slots fit.",
  triceps: "Elbow-extension accessory work.",
};
