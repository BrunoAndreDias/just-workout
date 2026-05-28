import type { DashboardSnapshot } from "../domain/training";
import { createBackup, restoreBackup, validateBackup } from "../persistence/backup";
import {
  createStarterTrainingPlan,
  getDashboardSnapshot,
  recordCompletedStarterWorkout,
} from "../persistence/trainingRepository";

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
