import type { TrainingFrequencyDaysPerWeek } from "../../plan-blueprint";
import type { TrainingSplitDefinition } from "../../training-split";

export type CompactWeeklyLayoutDay = {
  dayLabel: string;
  isRestDay: boolean;
  sessionLabel: string;
};

export type CompactWeeklyLayout = {
  cycleNote: string | null;
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

  return {
    cycleNote: getRotatingCycleNote(split, trainingFrequencyDaysPerWeek),
    days,
    helperText: formatWeeklyLayoutHelperText(days),
  };
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

      if (sessionIndex === -1) {
        return { dayLabel, isRestDay: true, sessionLabel: "Rest" };
      }

      return {
        dayLabel,
        isRestDay: false,
        sessionLabel: cycle[sessionIndex % cycle.length]?.sessionLabel ?? "Rest",
      };
    });
  }

  return split.schedule.week.map((session, index) => {
    const isRestDay = session.sessionLabel.toLowerCase().includes("rest");

    return {
      dayLabel: weekdayLabels[index] ?? session.dayLabel,
      isRestDay,
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

function getRotatingCycleNote(
  split: TrainingSplitDefinition,
  trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek,
): string | null {
  if (split.schedule.kind !== "rotating-cycle") {
    return null;
  }

  const cycle = split.schedule.cycle;

  if (trainingFrequencyDaysPerWeek % cycle.length === 0) {
    return null;
  }

  const weekSessions = (weekIndex: number) =>
    Array.from({ length: trainingFrequencyDaysPerWeek }, (_, dayIndex) => {
      const sessionIndex = weekIndex * trainingFrequencyDaysPerWeek + dayIndex;

      return cycle[sessionIndex % cycle.length]?.sessionLabel ?? "";
    }).join(" / ");

  return `The cycle carries over to the next week: week 1 ${weekSessions(0)}, week 2 ${weekSessions(1)}.`;
}
