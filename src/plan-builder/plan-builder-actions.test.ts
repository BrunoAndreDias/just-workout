import { describe, expect, it } from "vitest";
import {
  createDefaultPlanBlueprint,
  type PlanBlueprint,
  type PlanBlueprintTransition,
} from "./plan-blueprint";
import type { PlanBlueprintCommand } from "./plan-blueprint-command";
import { createPlanBuilderActions } from "./plan-builder-actions";

describe("Plan Builder actions", () => {
  it("continues Training Schedule with one timestamp, ordered persistence, and the Rep ranges next-step effect", async () => {
    const timestamp = "2026-06-18T09:15:00.000Z";
    const commands: PlanBlueprintCommand[] = [];
    const finalBlueprint = createTestBlueprint("after-confirm-split");
    const persistedBlueprints = [
      createTestBlueprint("after-update-split"),
      createTestBlueprint("after-confirm-frequency"),
      finalBlueprint,
    ];
    let timestampRequests = 0;
    const actions = createPlanBuilderActions({
      getTimestamp: () => {
        timestampRequests += 1;

        return timestamp;
      },
      persistPlanBlueprintCommand: async (command) => {
        commands.push(command);

        const persistedBlueprint = persistedBlueprints[commands.length - 1];

        if (!persistedBlueprint) {
          throw new Error("Missing persisted Plan Blueprint fixture.");
        }

        return persistedBlueprint;
      },
    });

    const result = await actions.continueTrainingSchedule({
      split: "upper-lower-4-day",
      trainingFrequencyDaysPerWeek: 4,
    });

    expect(timestampRequests).toBe(1);
    expect(commands.map(getPlanBlueprintTransition)).toEqual([
      {
        split: "upper-lower-4-day",
        timestamp,
        type: "selectTrainingSplit",
      },
      {
        timestamp,
        trainingFrequencyDaysPerWeek: 4,
        type: "confirmTrainingFrequency",
      },
      {
        split: "upper-lower-4-day",
        timestamp,
        type: "confirmTrainingSplit",
      },
    ]);
    expect(result).toEqual({
      blueprint: finalBlueprint,
      nextStep: "rep-ranges",
    });
  });
});

function createTestBlueprint(id: string): PlanBlueprint {
  return createDefaultPlanBlueprint({
    id,
    timestamp: "2026-06-18T09:00:00.000Z",
  });
}

function getPlanBlueprintTransition(command: PlanBlueprintCommand): PlanBlueprintTransition {
  if (command.type !== "planBlueprintTransition") {
    throw new Error(`Expected Plan Blueprint transition command, received "${command.type}".`);
  }

  return command.transition;
}
