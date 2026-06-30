import {
  getMainCompoundPreferenceExerciseIds,
  type MainCompoundPreferenceBucket,
  normalizeMainCompoundPreferences,
  updateMainCompoundPreferenceBucket,
} from "./main-compound-preferences";

export type MainCompoundRotationPreferenceBucket = MainCompoundPreferenceBucket;

export const normalizeMainCompoundRotationPreferences = normalizeMainCompoundPreferences;

export const getMainCompoundRotationPreferenceExerciseIds = getMainCompoundPreferenceExerciseIds;

export const updateMainCompoundRotationPreferenceBucket = updateMainCompoundPreferenceBucket;
