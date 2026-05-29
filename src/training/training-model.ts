export type LoadUnit = "kg" | "lb";

export type MovementPattern =
  | "squat"
  | "hinge"
  | "horizontal-push"
  | "horizontal-pull"
  | "vertical-push"
  | "vertical-pull"
  | "isolation"
  | "carry"
  | "core";

export type SyncMetadata = {
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type Exercise = SyncMetadata & {
  id: string;
  name: string;
  movementPattern: MovementPattern;
  equipment: string;
};

export type ExercisePrescription = {
  id: string;
  exerciseId: string;
  targetSets: number;
  targetRepMin: number;
  targetRepMax: number;
  loadStep: number;
};

export type WorkoutTemplate = {
  id: string;
  name: string;
  prescriptions: ExercisePrescription[];
};

export type TrainingPlan = SyncMetadata & {
  id: string;
  name: string;
  active: boolean;
  loadUnit: LoadUnit;
  templates: WorkoutTemplate[];
};

export type PerformedSet = {
  id: string;
  prescriptionId: string;
  reps: number;
  load: number;
};

export type WorkoutSession = SyncMetadata & {
  id: string;
  templateId: string;
  planId: string;
  performedAt: string;
  sets: PerformedSet[];
  notes: string;
};

export type DashboardSnapshot = {
  activePlan: TrainingPlan | null;
  exercises: Exercise[];
  recentSessions: WorkoutSession[];
};
