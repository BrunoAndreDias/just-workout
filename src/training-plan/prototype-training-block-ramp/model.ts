export type RampScenarioId =
  | "exact-history"
  | "first-time-rotation"
  | "partial-bodyweight"
  | "missing-history";

export type RampResultMode = "steady" | "top-range" | "missed-range";

export type RampExerciseRole = "main_compound" | "secondary_compound" | "isolation" | "abs";

export type RampLoadKind = "external" | "bodyweight_adjustment";

export type VolumeReference =
  | {
      caveats: ReadonlyArray<string>;
      kind: "known";
      volumeKg: number;
    }
  | {
      caveats: ReadonlyArray<string>;
      kind: "partial";
      missing: ReadonlyArray<string>;
      volumeKg: number;
    }
  | {
      kind: "none";
      reason: string;
    };

export type RampSlotState = {
  bodyweightKg?: number;
  bodyweightKnown?: boolean;
  firstCompletionLoadKg?: number;
  id: string;
  loadKg: number | null;
  loadKind: RampLoadKind;
  name: string;
  origin: string;
  repRange: {
    maxReps: number;
    minReps: number;
  };
  role: RampExerciseRole;
  sets: number;
};

export type WeekCompletion = {
  caveats: ReadonlyArray<string>;
  isPartial: boolean;
  resultMode: RampResultMode;
  volumeKg: number;
  weekNumber: number;
};

export type RampState = {
  completedWeeks: ReadonlyArray<WeekCompletion>;
  currentWeek: number;
  previousWeekReference: VolumeReference;
  resultMode: RampResultMode;
  scenarioId: RampScenarioId;
  slots: ReadonlyArray<RampSlotState>;
};

export type WeeklyRampTarget = {
  intent: string;
  label: string;
  maxTargetRir: number;
  minTargetRir: number;
  weekNumber: number;
};

export type RampSlotPreview = {
  action: string;
  load: string;
  name: string;
  origin: string;
  role: RampExerciseRole;
  targetRir: number;
};

export type RampSnapshot = {
  bodyweightKnown: boolean;
  completedWeeks: ReadonlyArray<WeekCompletion>;
  currentWeek: number;
  loadIncrementKg: number;
  pendingCompletion: {
    caveats: ReadonlyArray<string>;
    isPartial: boolean;
    nextReference: VolumeReference;
    resultMode: RampResultMode;
    volumeKg: number;
  };
  previousWeekReference: VolumeReference;
  question: string;
  resultModeLabel: string;
  scenario: {
    id: RampScenarioId;
    label: string;
    notes: ReadonlyArray<string>;
  };
  slots: ReadonlyArray<RampSlotPreview>;
  weeklyTargets: ReadonlyArray<WeeklyRampTarget>;
};

const LOAD_INCREMENT_KG = 2.5;
const DEFAULT_REPS = 10;

const QUESTION =
  "Does the next Training Block ramp stay useful when planned Training Volume remains stable, " +
  "Completed Load Volume is only informational, and first-time rotated exercises start with empty load fields?";

const WEEKLY_TARGETS: ReadonlyArray<WeeklyRampTarget> = [
  {
    intent: "Reset effort while preserving the generated prescription.",
    label: "3 RIR",
    maxTargetRir: 3,
    minTargetRir: 3,
    weekNumber: 1,
  },
  {
    intent: "Nudge effort upward without chasing a volume gate.",
    label: "2-3 RIR",
    maxTargetRir: 3,
    minTargetRir: 2,
    weekNumber: 2,
  },
  {
    intent: "Make the block feel like normal productive work.",
    label: "2 RIR",
    maxTargetRir: 2,
    minTargetRir: 2,
    weekNumber: 3,
  },
  {
    intent: "Continue double progression from completed set data.",
    label: "1-2 RIR",
    maxTargetRir: 2,
    minTargetRir: 1,
    weekNumber: 4,
  },
  {
    intent: "Push hard while keeping compounds shy of failure.",
    label: "1 RIR",
    maxTargetRir: 1,
    minTargetRir: 1,
    weekNumber: 5,
  },
  {
    intent: "Peak the Training Block; isolation last sets may reach 0 RIR.",
    label: "0-1 RIR",
    maxTargetRir: 1,
    minTargetRir: 0,
    weekNumber: 6,
  },
];

const RESULT_MODES: ReadonlyArray<{
  id: RampResultMode;
  label: string;
  reps: number;
}> = [
  {
    id: "steady",
    label: "complete the middle of the rep range at target RIR",
    reps: DEFAULT_REPS,
  },
  {
    id: "top-range",
    label: "complete every set at the top of the rep range at target RIR or easier",
    reps: 12,
  },
  {
    id: "missed-range",
    label: "miss the lower end of the rep range",
    reps: 7,
  },
];

const SCENARIOS: ReadonlyArray<{
  id: RampScenarioId;
  initialReference: VolumeReference;
  label: string;
  notes: ReadonlyArray<string>;
  slots: ReadonlyArray<RampSlotState>;
}> = [
  {
    id: "exact-history",
    initialReference: {
      caveats: [],
      kind: "known",
      volumeKg: 5400,
    },
    label: "Kept exercises with exact previous-block history",
    notes: [
      "Week 1 uses Previous Exercise Load Prefill from the previous block's final Training Week.",
      "There is no automatic 5% or 10% load reset.",
      "The previous Training Week is an informational reference, not a target that changes prescriptions.",
    ],
    slots: [
      createExternalSlot({
        id: "flat-bench",
        loadKg: 100,
        name: "Flat Barbell Bench Press",
        origin: "Previous Exercise Load Prefill from final Training Week",
        role: "main_compound",
      }),
      createExternalSlot({
        id: "seated-row",
        loadKg: 80,
        name: "Seated Cable Row",
        origin: "Previous Exercise Load Prefill from final Training Week",
        role: "secondary_compound",
      }),
    ],
  },
  {
    id: "first-time-rotation",
    initialReference: {
      caveats: [],
      kind: "known",
      volumeKg: 5400,
    },
    label: "Rotation proposal introduces first-time exercises",
    notes: [
      "First-Time Exercise Starting Load is intentionally empty.",
      "Movement Pattern history is not used to infer a starting load.",
      "The first completed Training Session supplies the first known exercise load for later weeks.",
    ],
    slots: [
      createExternalSlot({
        id: "incline-dumbbell-bench",
        firstCompletionLoadKg: 30,
        loadKg: null,
        name: "Incline Dumbbell Bench Press",
        origin: "First-Time Exercise Starting Load, user enters first load during session",
        role: "main_compound",
      }),
      createExternalSlot({
        id: "chest-supported-row",
        firstCompletionLoadKg: 55,
        loadKg: null,
        name: "Chest Supported Row",
        origin: "First-Time Exercise Starting Load, user enters first load during session",
        role: "secondary_compound",
      }),
    ],
  },
  {
    id: "partial-bodyweight",
    initialReference: {
      caveats: ["Pull-Up volume is unknown until Session Bodyweight is corrected."],
      kind: "partial",
      missing: ["Pull-Up"],
      volumeKg: 3000,
    },
    label: "Previous reference is partial because bodyweight is missing",
    notes: [
      "Known Completed Load Volume remains visible.",
      "Unknown bodyweight work is never treated as zero.",
      "The weekly verdict or reference carries a Partial Volume Comparison caveat until corrected.",
    ],
    slots: [
      createBodyweightSlot({
        bodyweightKnown: false,
        id: "pull-up",
        loadKg: 0,
        name: "Pull-Up",
        origin: "Bodyweight Load Adjustment, Session Bodyweight missing",
        role: "main_compound",
      }),
      createExternalSlot({
        id: "split-squat",
        loadKg: 50,
        name: "Dumbbell Split Squat",
        origin: "Previous Exercise Load Prefill from final Training Week",
        role: "secondary_compound",
      }),
    ],
  },
  {
    id: "missing-history",
    initialReference: {
      kind: "none",
      reason: "No comparable previous Training Week exists.",
    },
    label: "No usable previous-block history",
    notes: [
      "The Training Week Volume Reference is not comparable.",
      "Exercises without exact previous-block history keep editable empty loads.",
      "The first completed week creates the first reference for week 2.",
    ],
    slots: [
      createExternalSlot({
        id: "goblet-squat",
        firstCompletionLoadKg: 32.5,
        loadKg: null,
        name: "Goblet Squat",
        origin: "No exact previous-block exercise history",
        role: "main_compound",
      }),
      createExternalSlot({
        id: "lat-pulldown",
        firstCompletionLoadKg: 60,
        loadKg: null,
        name: "Lat Pulldown",
        origin: "No exact previous-block exercise history",
        role: "secondary_compound",
      }),
    ],
  },
];

export function createInitialRampState(scenarioId: RampScenarioId = "exact-history"): RampState {
  const scenario = getScenario(scenarioId);

  return {
    completedWeeks: [],
    currentWeek: 1,
    previousWeekReference: scenario.initialReference,
    resultMode: "steady",
    scenarioId: scenario.id,
    slots: cloneSlots(scenario.slots),
  };
}

export function completeCurrentWeek(state: RampState): RampState {
  const completion = calculateCompletion(state);

  return {
    ...state,
    completedWeeks: [...state.completedWeeks, completion],
    currentWeek: Math.min(state.currentWeek + 1, WEEKLY_TARGETS.length),
    previousWeekReference: completionToReference(completion),
    slots: state.slots.map((slot) => progressSlotAfterCompletion(slot, state.resultMode)),
  };
}

export function cycleResultMode(state: RampState): RampState {
  const currentIndex = RESULT_MODES.findIndex((mode) => mode.id === state.resultMode);
  const nextMode = RESULT_MODES[(currentIndex + 1) % RESULT_MODES.length];

  if (!nextMode) {
    throw new Error("No ramp result modes are configured.");
  }

  return {
    ...state,
    resultMode: nextMode.id,
  };
}

export function cycleScenario(state: RampState): RampState {
  const currentIndex = SCENARIOS.findIndex((scenario) => scenario.id === state.scenarioId);
  const nextScenario = SCENARIOS[(currentIndex + 1) % SCENARIOS.length];

  if (!nextScenario) {
    throw new Error("No ramp scenarios are configured.");
  }

  return createInitialRampState(nextScenario.id);
}

export function resetScenario(state: RampState): RampState {
  return createInitialRampState(state.scenarioId);
}

export function toggleSessionBodyweightKnown(state: RampState): RampState {
  return {
    ...state,
    slots: state.slots.map((slot) =>
      slot.loadKind === "bodyweight_adjustment"
        ? {
            ...slot,
            bodyweightKnown: !slot.bodyweightKnown,
            origin: !slot.bodyweightKnown
              ? "Bodyweight Load Adjustment, Session Bodyweight known"
              : "Bodyweight Load Adjustment, Session Bodyweight missing",
          }
        : slot,
    ),
  };
}

export function getRampSnapshot(state: RampState): RampSnapshot {
  const scenario = getScenario(state.scenarioId);
  const completion = calculateCompletion(state);

  return {
    bodyweightKnown: state.slots
      .filter((slot) => slot.loadKind === "bodyweight_adjustment")
      .every((slot) => slot.bodyweightKnown !== false),
    completedWeeks: state.completedWeeks,
    currentWeek: state.currentWeek,
    loadIncrementKg: LOAD_INCREMENT_KG,
    pendingCompletion: {
      caveats: completion.caveats,
      isPartial: completion.isPartial,
      nextReference: completionToReference(completion),
      resultMode: state.resultMode,
      volumeKg: completion.volumeKg,
    },
    previousWeekReference: state.previousWeekReference,
    question: QUESTION,
    resultModeLabel: getResultMode(state.resultMode).label,
    scenario: {
      id: scenario.id,
      label: scenario.label,
      notes: scenario.notes,
    },
    slots: state.slots.map((slot) => ({
      action: describeProgressionAction(slot, state.resultMode),
      load: describeLoad(slot),
      name: slot.name,
      origin: slot.origin,
      role: slot.role,
      targetRir: getExerciseTargetRir({
        role: slot.role,
        setIndex: slot.sets,
        weekNumber: state.currentWeek,
      }),
    })),
    weeklyTargets: WEEKLY_TARGETS,
  };
}

function createExternalSlot({
  firstCompletionLoadKg,
  id,
  loadKg,
  name,
  origin,
  role,
}: {
  firstCompletionLoadKg?: number;
  id: string;
  loadKg: number | null;
  name: string;
  origin: string;
  role: RampExerciseRole;
}): RampSlotState {
  return {
    firstCompletionLoadKg,
    id,
    loadKg,
    loadKind: "external",
    name,
    origin,
    repRange: { maxReps: 12, minReps: 8 },
    role,
    sets: 3,
  };
}

function createBodyweightSlot({
  bodyweightKnown,
  id,
  loadKg,
  name,
  origin,
  role,
}: {
  bodyweightKnown: boolean;
  id: string;
  loadKg: number;
  name: string;
  origin: string;
  role: RampExerciseRole;
}): RampSlotState {
  return {
    bodyweightKg: 82,
    bodyweightKnown,
    id,
    loadKg,
    loadKind: "bodyweight_adjustment",
    name,
    origin,
    repRange: { maxReps: 12, minReps: 8 },
    role,
    sets: 3,
  };
}

function getScenario(scenarioId: RampScenarioId) {
  const scenario = SCENARIOS.find((candidate) => candidate.id === scenarioId);

  if (!scenario) {
    throw new Error(`Unknown ramp scenario: ${scenarioId}`);
  }

  return scenario;
}

function cloneSlots(slots: ReadonlyArray<RampSlotState>): ReadonlyArray<RampSlotState> {
  return slots.map((slot) => ({
    ...slot,
    repRange: { ...slot.repRange },
  }));
}

function getWeeklyTarget(weekNumber: number): WeeklyRampTarget {
  const target = WEEKLY_TARGETS[weekNumber - 1] ?? WEEKLY_TARGETS[WEEKLY_TARGETS.length - 1];

  if (!target) {
    throw new Error("No weekly ramp targets are configured.");
  }

  return target;
}

function getResultMode(resultMode: RampResultMode) {
  const mode = RESULT_MODES.find((candidate) => candidate.id === resultMode);

  if (!mode) {
    throw new Error(`Unknown result mode: ${resultMode}`);
  }

  return mode;
}

function calculateCompletion(state: RampState): WeekCompletion {
  const resultMode = getResultMode(state.resultMode);
  const caveats: string[] = [];
  let volumeKg = 0;

  for (const slot of state.slots) {
    const effectiveLoad = getCompletionEffectiveLoad(slot);

    if (effectiveLoad === null) {
      caveats.push(`${slot.name} has unknown Completed Load Volume.`);
      continue;
    }

    volumeKg += effectiveLoad * resultMode.reps * slot.sets;
  }

  return {
    caveats,
    isPartial: caveats.length > 0,
    resultMode: state.resultMode,
    volumeKg,
    weekNumber: state.currentWeek,
  };
}

function getCompletionEffectiveLoad(slot: RampSlotState): number | null {
  const loadKg = slot.loadKg ?? slot.firstCompletionLoadKg ?? null;

  if (slot.loadKind === "external") {
    return loadKg;
  }

  if (slot.bodyweightKnown === false || slot.bodyweightKg === undefined || loadKg === null) {
    return null;
  }

  return Math.max(slot.bodyweightKg + loadKg, 0);
}

function completionToReference(completion: WeekCompletion): VolumeReference {
  if (completion.isPartial) {
    return {
      caveats: completion.caveats,
      kind: "partial",
      missing: completion.caveats,
      volumeKg: completion.volumeKg,
    };
  }

  return {
    caveats: [],
    kind: "known",
    volumeKg: completion.volumeKg,
  };
}

function progressSlotAfterCompletion(
  slot: RampSlotState,
  resultMode: RampResultMode,
): RampSlotState {
  if (slot.loadKg === null) {
    return {
      ...slot,
      loadKg: slot.firstCompletionLoadKg ?? null,
      origin: slot.firstCompletionLoadKg
        ? "First completed Training Session supplied the exercise load"
        : slot.origin,
    };
  }

  if (resultMode === "top-range") {
    return {
      ...slot,
      loadKg: increaseLoad(slot),
      origin: "Double progression from completed set data",
    };
  }

  if (resultMode === "missed-range") {
    return {
      ...slot,
      loadKg: reduceLoad(slot),
      origin: "Load reduced after missing the lower end of the rep range",
    };
  }

  return {
    ...slot,
    origin: "Load kept after steady completion",
  };
}

function describeProgressionAction(slot: RampSlotState, resultMode: RampResultMode): string {
  if (slot.loadKg === null) {
    return slot.firstCompletionLoadKg === undefined
      ? "keep empty until the user records a load"
      : `seed next week from the user's first completed load (${formatKg(slot.firstCompletionLoadKg)})`;
  }

  if (resultMode === "top-range") {
    return `increase to ${formatKg(increaseLoad(slot))}`;
  }

  if (resultMode === "missed-range") {
    return `reduce to ${formatKg(reduceLoad(slot))}`;
  }

  return `keep at ${formatKg(slot.loadKg)}`;
}

function increaseLoad(slot: RampSlotState): number {
  const loadKg = slot.loadKg ?? 0;

  if (slot.loadKind === "bodyweight_adjustment" && loadKg < 0) {
    return Math.min(0, loadKg + LOAD_INCREMENT_KG);
  }

  return loadKg + LOAD_INCREMENT_KG;
}

function reduceLoad(slot: RampSlotState): number {
  const loadKg = slot.loadKg ?? 0;

  if (slot.loadKind === "bodyweight_adjustment" && loadKg <= 0) {
    return loadKg - LOAD_INCREMENT_KG;
  }

  return Math.max(0, loadKg - LOAD_INCREMENT_KG);
}

function describeLoad(slot: RampSlotState): string {
  if (slot.loadKg === null) {
    return "empty";
  }

  if (slot.loadKind === "bodyweight_adjustment") {
    return `${formatKg(slot.loadKg)} adjustment`;
  }

  return formatKg(slot.loadKg);
}

function getExerciseTargetRir({
  role,
  setIndex,
  weekNumber,
}: {
  role: RampExerciseRole;
  setIndex: number;
  weekNumber: number;
}): number {
  const weeklyTarget = getWeeklyTarget(weekNumber);
  const targetRir = weeklyTarget.minTargetRir;

  if (role === "main_compound" || role === "secondary_compound") {
    return Math.max(targetRir, 1);
  }

  if (role === "isolation" && setIndex < 3) {
    return Math.max(targetRir, 1);
  }

  return targetRir;
}

function formatKg(value: number): string {
  return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)} kg`;
}
