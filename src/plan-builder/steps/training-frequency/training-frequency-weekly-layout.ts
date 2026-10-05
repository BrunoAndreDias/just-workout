import type { TrainingFrequencyDaysPerWeek } from "../../plan-blueprint";
import type { TrainingSplitDefinition } from "../../training-split";

/** Colour family for a session, so the same kind of session reads the same everywhere. */
export type TrainingSessionFamily = "full-body" | "upper" | "lower" | "push" | "pull" | "legs";

export type CompactWeeklyLayoutDay = {
  dayLabel: string;
  isRestDay: boolean;
  sessionFamily: TrainingSessionFamily | null;
  sessionLabel: string;
};

export type CompactWeeklyLayout = {
  cycleNote: string | null;
  /** Session labels for the first two weeks of a rotating cycle that carries over; null otherwise. */
  cycleWeeks: ReadonlyArray<ReadonlyArray<string>> | null;
  days: ReadonlyArray<CompactWeeklyLayoutDay>;
  helperText: string;
};

const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const rotatingCycleTrainingDayIndexesByFrequency = {
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 4, 5],
} as const satisfies Record<TrainingFrequencyDaysPerWeek, ReadonlyArray<number>>;

export function getCompactWeeklyLayout(
  split: TrainingSplitDefinition,
  trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek,
): CompactWeeklyLayout {
  const days = getCompactWeeklyLayoutDays(split, trainingFrequencyDaysPerWeek);
  const cycleWeeks = getRotatingCycleWeeks(split, trainingFrequencyDaysPerWeek);

  return {
    cycleNote: cycleWeeks
      ? `The cycle carries over to the next week: ${cycleWeeks
          .map((week, weekIndex) => `week ${weekIndex + 1} ${week.join(" / ")}`)
          .join(", ")}.`
      : null,
    cycleWeeks,
    days,
    helperText: formatWeeklyLayoutHelperText(days),
  };
}

/** Weekday indexes (Mon = 0) that hold a training session by default for each frequency. */
export function getDefaultTrainingDayIndexes(
  trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek,
): ReadonlyArray<number> {
  return rotatingCycleTrainingDayIndexesByFrequency[trainingFrequencyDaysPerWeek];
}

export function getTrainingSessionFamily(sessionLabel: string): TrainingSessionFamily {
  const label = sessionLabel.toLowerCase();

  if (label.startsWith("upper")) return "upper";
  if (label.startsWith("lower")) return "lower";
  if (label.startsWith("push")) return "push";
  if (label.startsWith("pull")) return "pull";
  if (label.startsWith("legs")) return "legs";

  return "full-body";
}

function getCompactWeeklyLayoutDays(
  split: TrainingSplitDefinition,
  trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek,
): ReadonlyArray<CompactWeeklyLayoutDay> {
  if (split.schedule.kind === "rotating-cycle") {
    const cycle = split.schedule.cycle;
    const trainingDayIndexes: ReadonlyArray<number> =
      rotatingCycleTrainingDayIndexesByFrequency[trainingFrequencyDaysPerWeek];

    return weekdayLabels.map((dayLabel, dayIndex) => {
      const sessionIndex = trainingDayIndexes.indexOf(dayIndex);

      const sessionLabel =
        sessionIndex === -1 ? undefined : cycle[sessionIndex % cycle.length]?.sessionLabel;

      if (!sessionLabel) {
        return { dayLabel, isRestDay: true, sessionFamily: null, sessionLabel: "Rest" };
      }

      return {
        dayLabel,
        isRestDay: false,
        sessionFamily: getTrainingSessionFamily(sessionLabel),
        sessionLabel,
      };
    });
  }

  return split.schedule.week.map((session, index) => {
    const isRestDay = session.sessionLabel.toLowerCase().includes("rest");

    return {
      dayLabel: weekdayLabels[index] ?? session.dayLabel,
      isRestDay,
      sessionFamily: isRestDay ? null : getTrainingSessionFamily(session.sessionLabel),
      sessionLabel: isRestDay ? "Rest" : session.sessionLabel,
    };
  });
}

function formatWeeklyLayoutHelperText(days: ReadonlyArray<CompactWeeklyLayoutDay>): string {
  const trainingDays = days.filter((day) => !day.isRestDay).map((day) => day.dayLabel);

  return `Training on ${formatList(trainingDays)} with recovery days between sessions.`;
}

function formatList(items: ReadonlyArray<string>): string {
  if (items.length <= 1) {
    return items.join("");
  }

  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

function getRotatingCycleWeeks(
  split: TrainingSplitDefinition,
  trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek,
): ReadonlyArray<ReadonlyArray<string>> | null {
  if (split.schedule.kind !== "rotating-cycle") {
    return null;
  }

  const cycle = split.schedule.cycle;

  if (trainingFrequencyDaysPerWeek % cycle.length === 0) {
    return null;
  }

  return [0, 1].map((weekIndex) =>
    Array.from({ length: trainingFrequencyDaysPerWeek }, (_, dayIndex) => {
      const sessionIndex = weekIndex * trainingFrequencyDaysPerWeek + dayIndex;

      return cycle[sessionIndex % cycle.length]?.sessionLabel ?? "";
    }),
  );
}
