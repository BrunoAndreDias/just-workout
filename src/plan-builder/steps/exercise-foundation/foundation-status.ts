import type { ExerciseFoundationRowStatus } from "../../exercise-foundation-read-model";

export function getFoundationStatusClassName(status: ExerciseFoundationRowStatus): string {
  switch (status) {
    case "required":
      return "bg-emerald-100 text-emerald-900";
    case "missing":
      return "bg-amber-100 text-amber-900";
    case "recommended":
      return "bg-stone-200 text-stone-800";
    case "suggested":
      return "bg-sky-100 text-sky-900";
  }
}
