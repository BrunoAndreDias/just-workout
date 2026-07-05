export type BodyweightLoadExercise = {
  exerciseId: string;
  exerciseName: string;
};

export function isBodyweightLoadExercise({
  exerciseId,
  exerciseName,
}: BodyweightLoadExercise): boolean {
  return (
    BODYWEIGHT_LOAD_EXERCISE_IDS.has(exerciseId) ||
    BODYWEIGHT_LOAD_EXERCISE_NAME_PATTERN.test(exerciseName)
  );
}

export function hasBodyweightLoadExercise(
  exercises: ReadonlyArray<BodyweightLoadExercise>,
): boolean {
  return exercises.some((exercise) => isBodyweightLoadExercise(exercise));
}

const BODYWEIGHT_LOAD_EXERCISE_IDS = new Set([
  "assisted-pull-ups",
  "chin-ups",
  "dips-parallel-bars-slight-forward-lean",
  "dips-parallel-bars-upright",
  "glute-ham-raises",
  "hanging-leg-raises",
  "inverted-rows",
  "pull-ups",
  "push-ups",
]);
const BODYWEIGHT_LOAD_EXERCISE_NAME_PATTERN =
  /\b(assisted pull-ups|chin-ups|dips|glute-ham raises|hanging leg raises|inverted rows|pull-ups|push-ups)\b/i;
