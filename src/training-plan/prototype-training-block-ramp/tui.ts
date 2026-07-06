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

if (process.argv.includes("--summary") || !stdin.isTTY) {
  stdout.write(render(state));
  process.exit(0);
}

stdin.setRawMode(true);
stdin.resume();
stdin.setEncoding("utf8");

renderFrame();

stdin.on("data", (key: string) => {
  if (key === "\u0003" || key.toLowerCase() === "q") {
    stdout.write("\n");
    process.exit(0);
  }

  if (key.toLowerCase() === "n") {
    state = completeCurrentWeek(state);
  }

  if (key.toLowerCase() === "m") {
    state = cycleResultMode(state);
  }

  if (key.toLowerCase() === "s") {
    state = cycleScenario(state);
  }

  if (key.toLowerCase() === "b") {
    state = toggleSessionBodyweightKnown(state);
  }

  if (key.toLowerCase() === "r") {
    state = resetScenario(state);
  }

  renderFrame();
});

function renderFrame() {
  console.clear();
  stdout.write(render(state));
}

function render(currentState: RampState): string {
  const snapshot = getRampSnapshot(currentState);
  const weeklyTarget = snapshot.weeklyTargets[snapshot.currentWeek - 1];

  return [
    `${bold("PROTOTYPE")} - six-week Training Block ramp model`,
    dim(snapshot.question),
    "",
    `${bold("Scenario")}: ${snapshot.scenario.label}`,
    ...snapshot.scenario.notes.map((note) => `  - ${note}`),
    "",
    `${bold("Current Training Week")}: ${snapshot.currentWeek} of ${snapshot.weeklyTargets.length}`,
    `${bold("Weekly RIR target")}: ${weeklyTarget?.label ?? "unknown"} - ${
      weeklyTarget?.intent ?? "No intensity target."
    }`,
    `${bold("Training Week Volume Reference")}: ${formatReference(snapshot.previousWeekReference)}`,
    `${bold("Planned Training Volume")}: unchanged from the generated Training Plan`,
    "",
    bold("Exercise state"),
    ...snapshot.slots.map(
      (slot) =>
        `  - ${slot.name} (${formatRole(slot.role)}): ${slot.load}; target ${slot.targetRir} RIR; ${slot.origin}; next action if completed now: ${slot.action}`,
    ),
    "",
    bold("If completed now"),
    `  Result mode: ${snapshot.resultModeLabel}`,
    `  Known Completed Load Volume: ${formatKg(snapshot.pendingCompletion.volumeKg)}${
      snapshot.pendingCompletion.isPartial ? " (partial)" : ""
    }`,
    `  Next week's reference: ${formatReference(snapshot.pendingCompletion.nextReference)}`,
    ...snapshot.pendingCompletion.caveats.map((caveat) => `  Caveat: ${caveat}`),
    "",
    bold("Completed weeks"),
    ...(snapshot.completedWeeks.length === 0
      ? ["  none"]
      : snapshot.completedWeeks.map(
          (week) =>
            `  Week ${week.weekNumber}: ${formatKg(week.volumeKg)}${
              week.isPartial ? " partial" : ""
            } via ${week.resultMode}`,
        )),
    "",
    `${bold("[n]")} complete week  ${bold("[m]")} result mode  ${bold("[s]")} scenario  ${bold(
      "[b]",
    )} bodyweight known/missing  ${bold("[r]")} reset  ${bold("[q]")} quit`,
    "",
  ].join("\n");
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
