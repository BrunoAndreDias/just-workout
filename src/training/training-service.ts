import { createBackup, restoreBackup, validateBackup } from "./backup";
import type { DashboardSnapshot } from "./training-model";
import {
  createStarterTrainingPlan,
  getDashboardSnapshot,
  recordCompletedStarterWorkout,
} from "./training-repository";

export const trainingService = {
  async createBackupFile() {
    return createBackup();
  },

  createStarterTrainingPlan,

  getDashboardSnapshot(): Promise<DashboardSnapshot> {
    return getDashboardSnapshot();
  },

  recordCompletedStarterWorkout,

  async restoreBackupFile(file: File) {
    const text = await file.text();
    const parsed = JSON.parse(text) as unknown;
    const backup = validateBackup(parsed);

    await restoreBackup(backup);
  },
};
