import type { Exercise, TrainingPlan } from "../domain/training";

function now() {
  return new Date().toISOString();
}

function metadata() {
  const timestamp = now();

  return {
    createdAt: timestamp,
    deletedAt: null,
    updatedAt: timestamp,
  };
}

export function createStarterExercises(): Exercise[] {
  return [
    {
      id: "exercise-squat",
      equipment: "barbell",
      movementPattern: "squat",
      name: "Back Squat",
      ...metadata(),
    },
    {
      id: "exercise-bench-press",
      equipment: "barbell",
      movementPattern: "horizontal-push",
      name: "Bench Press",
      ...metadata(),
    },
    {
      id: "exercise-row",
      equipment: "barbell",
      movementPattern: "horizontal-pull",
      name: "Barbell Row",
      ...metadata(),
    },
    {
      id: "exercise-deadlift",
      equipment: "barbell",
      movementPattern: "hinge",
      name: "Deadlift",
      ...metadata(),
    },
  ];
}

export function createStarterPlan(name: string): TrainingPlan {
  return {
    id: crypto.randomUUID(),
    active: true,
    loadUnit: "kg",
    name,
    templates: [
      {
        id: crypto.randomUUID(),
        name: "Full Body A",
        prescriptions: [
          {
            id: crypto.randomUUID(),
            exerciseId: "exercise-squat",
            loadStep: 2.5,
            targetRepMax: 8,
            targetRepMin: 6,
            targetSets: 3,
          },
          {
            id: crypto.randomUUID(),
            exerciseId: "exercise-bench-press",
            loadStep: 2.5,
            targetRepMax: 8,
            targetRepMin: 6,
            targetSets: 3,
          },
          {
            id: crypto.randomUUID(),
            exerciseId: "exercise-row",
            loadStep: 2.5,
            targetRepMax: 10,
            targetRepMin: 8,
            targetSets: 3,
          },
        ],
      },
      {
        id: crypto.randomUUID(),
        name: "Full Body B",
        prescriptions: [
          {
            id: crypto.randomUUID(),
            exerciseId: "exercise-deadlift",
            loadStep: 5,
            targetRepMax: 5,
            targetRepMin: 5,
            targetSets: 1,
          },
          {
            id: crypto.randomUUID(),
            exerciseId: "exercise-bench-press",
            loadStep: 2.5,
            targetRepMax: 8,
            targetRepMin: 6,
            targetSets: 3,
          },
          {
            id: crypto.randomUUID(),
            exerciseId: "exercise-row",
            loadStep: 2.5,
            targetRepMax: 10,
            targetRepMin: 8,
            targetSets: 3,
          },
        ],
      },
    ],
    ...metadata(),
  };
}
