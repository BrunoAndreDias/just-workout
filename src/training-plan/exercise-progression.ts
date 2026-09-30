/**
 * Suggests the next load and rep target for one exercise from its last completed sets.
 *
 * Each set's rep capacity is estimated as reps + Reps In Reserve (falling back to the target RIR
 * the set was performed at when RIR was not logged). The next rep target is that capacity minus
 * the next Training Week's target RIR, so a set that was harder than planned lowers the rep target
 * and a set with reps to spare raises it. Double progression keeps the target inside the
 * prescribed rep range: going past the top adds the smallest load increment, and falling below
 * the bottom removes one. Load changes re-estimate rep capacity with the Epley formula.
 */

export type ExerciseProgressionSet = {
  reps: number;
  rir: number | null;
  weight: number;
};

export type ExerciseProgressionLoadChange = "increase" | "keep" | "reduce";

export type ExerciseProgressionTarget = {
  load: number;
  loadChange: ExerciseProgressionLoadChange;
  note: string;
  reps: number;
};

type RepRange = { max: number; min: number };

const MAX_LOAD_STEPS = 4;

export function suggestNextExerciseTarget({
  availableLoadIncrement,
  isBodyweightLoad,
  nextTargetRir,
  previousSets,
  previousTargetRir,
  repRange,
}: {
  availableLoadIncrement: number;
  /** Bodyweight exercises record a signed load adjustment rather than the full load. */
  isBodyweightLoad: boolean;
  nextTargetRir: number;
  previousSets: ReadonlyArray<ExerciseProgressionSet>;
  previousTargetRir: number;
  repRange: RepRange;
}): ExerciseProgressionTarget | null {
  const completedSets = previousSets.filter((set) => set.reps > 0);
  const lastSet = completedSets.at(-1);

  if (!lastSet) {
    return null;
  }

  const load = lastSet.weight;
  const setsAtLoad = completedSets.filter((set) => set.weight === load);
  const repCapacity = Math.min(
    ...setsAtLoad.map((set) => set.reps + (set.rir ?? previousTargetRir)),
  );
  const wasHarderThanPlanned = setsAtLoad.some(
    (set) => set.rir !== null && set.rir < previousTargetRir,
  );
  const repNudge = !wasHarderThanPlanned && nextTargetRir === previousTargetRir ? 1 : 0;
  const repsAtSameLoad = repCapacity - nextTargetRir + repNudge;
  const lastSetSummary = [
    formatLastSetSummary({ load, setsAtLoad, isBodyweightLoad }),
    describeEffortChange({ nextTargetRir, previousTargetRir }),
  ]
    .filter(Boolean)
    .join(" ");

  if (repsAtSameLoad >= repRange.min && repsAtSameLoad <= repRange.max) {
    return {
      load,
      loadChange: "keep",
      note: `${lastSetSummary} ${describeKeepLoad({
        lastReps: Math.min(...setsAtLoad.map((set) => set.reps)),
        previousTargetRir,
        reps: repsAtSameLoad,
        wasHarderThanPlanned,
      })}`,
      reps: repsAtSameLoad,
    };
  }

  const direction = repsAtSameLoad > repRange.max ? 1 : -1;
  const next = isBodyweightLoad
    ? stepBodyweightLoad({ availableLoadIncrement, direction, load, repRange })
    : stepExternalLoad({
        availableLoadIncrement,
        direction,
        load,
        nextTargetRir,
        repCapacity,
        repRange,
      });

  if (!next) {
    const reps = clamp(repsAtSameLoad, repRange);

    return {
      load,
      loadChange: "keep",
      note: `${lastSetSummary} Aim for ${reps} reps at the same load.`,
      reps,
    };
  }

  return {
    load: next.load,
    loadChange: direction > 0 ? "increase" : "reduce",
    note: `${lastSetSummary} ${
      direction > 0
        ? `Reps to spare past the top of the ${formatRange(repRange)} range, so go to ${formatLoad(
            next.load,
            isBodyweightLoad,
          )} and aim for ${next.reps} reps.`
        : `At that effort you would land below the ${formatRange(repRange)} range, so drop to ${formatLoad(
            next.load,
            isBodyweightLoad,
          )} and aim for ${next.reps} reps.`
    }`,
    reps: next.reps,
  };
}

function stepExternalLoad({
  availableLoadIncrement,
  direction,
  load,
  nextTargetRir,
  repCapacity,
  repRange,
}: {
  availableLoadIncrement: number;
  direction: 1 | -1;
  load: number;
  nextTargetRir: number;
  repCapacity: number;
  repRange: RepRange;
}): { load: number; reps: number } | null {
  if (load <= 0) {
    return null;
  }

  const estimatedOneRepMax = load * (1 + repCapacity / 30);
  const repsAtLoad = (candidateLoad: number) =>
    Math.floor(30 * (estimatedOneRepMax / candidateLoad - 1) - nextTargetRir + 1e-6);
  let candidateLoad = load;

  for (let step = 0; step < MAX_LOAD_STEPS; step += 1) {
    const nextLoad = roundToNearestIncrement(
      candidateLoad + direction * availableLoadIncrement,
      availableLoadIncrement,
    );

    if (nextLoad <= 0) {
      break;
    }

    const reps = repsAtLoad(nextLoad);

    if (direction > 0 && reps < repRange.min) {
      break;
    }

    candidateLoad = nextLoad;

    if (direction > 0 ? reps <= repRange.max : reps >= repRange.min) {
      break;
    }
  }

  if (candidateLoad === load) {
    return null;
  }

  return { load: candidateLoad, reps: clamp(repsAtLoad(candidateLoad), repRange) };
}

function stepBodyweightLoad({
  availableLoadIncrement,
  direction,
  load,
  repRange,
}: {
  availableLoadIncrement: number;
  direction: 1 | -1;
  load: number;
  repRange: RepRange;
}): { load: number; reps: number } {
  return {
    load: roundToNearestIncrement(
      load + direction * availableLoadIncrement,
      availableLoadIncrement,
    ),
    reps: repRange.min,
  };
}

function describeEffortChange({
  nextTargetRir,
  previousTargetRir,
}: {
  nextTargetRir: number;
  previousTargetRir: number;
}): string {
  if (nextTargetRir > previousTargetRir) {
    return `Easier week: ${nextTargetRir} RIR target (was ${previousTargetRir}).`;
  }

  if (nextTargetRir < previousTargetRir) {
    return `Effort goes up: ${nextTargetRir} RIR target (was ${previousTargetRir}).`;
  }

  return "";
}

function describeKeepLoad({
  lastReps,
  previousTargetRir,
  reps,
  wasHarderThanPlanned,
}: {
  lastReps: number;
  previousTargetRir: number;
  reps: number;
  wasHarderThanPlanned: boolean;
}): string {
  if (wasHarderThanPlanned) {
    return `That was harder than the ${previousTargetRir} RIR target, so aim for ${reps} reps at the same load.`;
  }

  if (reps > lastReps) {
    const extraReps = reps - lastReps;

    return `Aim for ${reps} reps at the same load (${extraReps} more ${extraReps === 1 ? "rep" : "reps"}).`;
  }

  if (reps === lastReps) {
    return `Repeat ${reps} reps at the same load.`;
  }

  return `Aim for ${reps} reps at the same load.`;
}

function formatLastSetSummary({
  isBodyweightLoad,
  load,
  setsAtLoad,
}: {
  isBodyweightLoad: boolean;
  load: number;
  setsAtLoad: ReadonlyArray<ExerciseProgressionSet>;
}): string {
  const reps = setsAtLoad.map((set) => set.reps).join("/");
  const rirValues = setsAtLoad.map((set) => set.rir).filter((rir) => rir !== null);
  const rirSummary = rirValues.length > 0 ? ` @ ${Math.min(...rirValues)} RIR` : "";

  return `Last time ${formatLoad(load, isBodyweightLoad)} × ${reps}${rirSummary}.`;
}

function formatLoad(load: number, isBodyweightLoad: boolean): string {
  if (!isBodyweightLoad) {
    return `${load} kg`;
  }

  if (load === 0) {
    return "bodyweight";
  }

  return load > 0 ? `BW +${load} kg` : `BW ${load} kg`;
}

function formatRange(repRange: RepRange): string {
  return `${repRange.min}–${repRange.max}`;
}

function clamp(value: number, repRange: RepRange): number {
  return Math.min(Math.max(value, repRange.min), repRange.max);
}

export function roundToNearestIncrement(value: number, increment: number): number {
  return Math.round(value / increment) * increment;
}
