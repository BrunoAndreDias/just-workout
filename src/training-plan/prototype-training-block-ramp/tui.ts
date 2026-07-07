/// <reference types="node" />

import { stdin, stdout } from "node:process";
import {
  completeCurrentWeek,
  createInitialRampState,
  cycleResultMode,
  cycleScenario,
  getRampSnapshot,
  type RampState,
  resetScenario,
  toggleSessionBodyweightKnown,
  type VolumeReference,
} from "./model.ts";

let state = createInitialRampState();

const keyActions: Record<string, () => void> = {
  b: () => {
    state = toggleSessionBodyweightKnown(state);
  },
  m: () => {
    state = cycleResultMode(state);
  },
  n: () => {
    state = completeCurrentWeek(state);
  },
  r: () => {
    state = resetScenario(state);
  },
  s: () => {
    state = cycleScenario(state);
  },
};

if (process.argv.includes("--summary") || !stdin.isTTY) {
  stdout.write(render(state));
  process.exit(0);
}

stdin.setRawMode(true);
stdin.resume();
stdin.setEncoding("utf8");

renderFrame();

stdin.on("data", handleKeyPress);

function handleKeyPress(key: string) {
  const normalizedKey = key.toLowerCase();

  if (isQuitKey(key, normalizedKey)) {
    stdout.write("\n");
    process.exit(0);
  }

  keyActions[normalizedKey]?.();
  renderFrame();
}

function isQuitKey(key: string, normalizedKey: string): boolean {
  return key === "\u0003" || normalizedKey === "q";
}

function renderFrame() {
  console.clear();
  stdout.write(render(state));
}

type RampSnapshot = ReturnType<typeof getRampSnapshot>;

function render(currentState: RampState): string {
  const snapshot = getRampSnapshot(currentState);

  return [
    ...renderPrototypeHeading(snapshot),
    "",
    ...renderScenario(snapshot),
    "",
    ...renderCurrentWeek(snapshot),
    "",
    ...renderExerciseState(snapshot),
    "",
    ...renderPendingCompletion(snapshot),
    "",
    ...renderCompletedWeeks(snapshot),
    "",
    renderControls(),
    "",
  ].join("\n");
}

function renderPrototypeHeading(snapshot: RampSnapshot): Array<string> {
  return [`${bold("PROTOTYPE")} - six-week Training Block ramp model`, dim(snapshot.question)];
}

function renderScenario(snapshot: RampSnapshot): Array<string> {
  return [
    `${bold("Scenario")}: ${snapshot.scenario.label}`,
    ...snapshot.scenario.notes.map((note) => `  - ${note}`),
  ];
}

function renderCurrentWeek(snapshot: RampSnapshot): Array<string> {
  return [
    `${bold("Current Training Week")}: ${snapshot.currentWeek} of ${snapshot.weeklyTargets.length}`,
    `${bold("Weekly RIR target")}: ${formatWeeklyTarget(snapshot)}`,
    `${bold("Training Week Volume Reference")}: ${formatReference(snapshot.previousWeekReference)}`,
    `${bold("Planned Training Volume")}: unchanged from the generated Training Plan`,
  ];
}

function formatWeeklyTarget(snapshot: RampSnapshot): string {
  const weeklyTarget = snapshot.weeklyTargets[snapshot.currentWeek - 1];

  if (!weeklyTarget) {
    return "unknown - No intensity target.";
  }

  return `${weeklyTarget.label} - ${weeklyTarget.intent}`;
}

function renderExerciseState(snapshot: RampSnapshot): Array<string> {
  return [bold("Exercise state"), ...snapshot.slots.map(formatSlotLine)];
}

function formatSlotLine(slot: RampSnapshot["slots"][number]): string {
  return `  - ${slot.name} (${formatRole(slot.role)}): ${slot.load}; target ${slot.targetRir} RIR; ${slot.origin}; next action if completed now: ${slot.action}`;
}

function renderPendingCompletion(snapshot: RampSnapshot): Array<string> {
  return [
    bold("If completed now"),
    `  Result mode: ${snapshot.resultModeLabel}`,
    `  Known Completed Load Volume: ${formatPendingVolume(snapshot)}`,
    `  Next week's reference: ${formatReference(snapshot.pendingCompletion.nextReference)}`,
    ...snapshot.pendingCompletion.caveats.map((caveat) => `  Caveat: ${caveat}`),
  ];
}

function formatPendingVolume(snapshot: RampSnapshot): string {
  const partialLabel = snapshot.pendingCompletion.isPartial ? " (partial)" : "";

  return `${formatKg(snapshot.pendingCompletion.volumeKg)}${partialLabel}`;
}

function renderCompletedWeeks(snapshot: RampSnapshot): Array<string> {
  return [bold("Completed weeks"), ...formatCompletedWeekLines(snapshot.completedWeeks)];
}

function formatCompletedWeekLines(completedWeeks: RampSnapshot["completedWeeks"]): Array<string> {
  if (completedWeeks.length === 0) {
    return ["  none"];
  }

  return completedWeeks.map(
    (week) =>
      `  Week ${week.weekNumber}: ${formatKg(week.volumeKg)}${
        week.isPartial ? " partial" : ""
      } via ${week.resultMode}`,
  );
}

function renderControls(): string {
  return `${bold("[n]")} complete week  ${bold("[m]")} result mode  ${bold("[s]")} scenario  ${bold(
    "[b]",
  )} bodyweight known/missing  ${bold("[r]")} reset  ${bold("[q]")} quit`;
}

function formatReference(reference: VolumeReference): string {
  if (reference.kind === "none") {
    return `not comparable (${reference.reason})`;
  }

  if (reference.kind === "partial") {
    return `${formatKg(reference.volumeKg)} known, partial (${reference.missing.join("; ")})`;
  }

  if (reference.caveats.length > 0) {
    return `${formatKg(reference.volumeKg)} (${reference.caveats.join("; ")})`;
  }

  return formatKg(reference.volumeKg);
}

function formatKg(value: number): string {
  return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)} kg`;
}

function formatRole(role: string): string {
  return role.replaceAll("_", " ");
}

function bold(text: string): string {
  return `\x1b[1m${text}\x1b[0m`;
}

function dim(text: string): string {
  return `\x1b[2m${text}\x1b[0m`;
}
