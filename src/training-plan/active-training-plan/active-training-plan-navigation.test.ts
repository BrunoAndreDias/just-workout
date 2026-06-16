import { describe, expect, it } from "vitest";
import {
  getNextWorkoutTemplateId,
  getStartNextWorkoutRouteTarget,
  getStartWorkoutRouteTarget,
} from "./active-training-plan-navigation";

describe("Active Training Plan navigation", () => {
  it("routes Start next workout to the first Workout Template", () => {
    expect(
      getStartNextWorkoutRouteTarget({
        id: "training-plan-1",
        workoutTemplates: [
          { id: "template-1", label: "Upper A", supersetGroups: [] },
          { id: "template-2", label: "Lower A", supersetGroups: [] },
        ],
      }),
    ).toEqual({
      params: {
        planId: "training-plan-1",
        templateId: "template-1",
      },
      to: "/training-plans/$planId/sessions/new/$templateId",
    });
  });

  it("falls back to the first generated Workout Template id before templates exist", () => {
    expect(getNextWorkoutTemplateId({ workoutTemplates: [] })).toBe("template-1");
  });

  it("routes a selected Workout Template session start", () => {
    expect(
      getStartWorkoutRouteTarget({
        planId: "training-plan-1",
        workoutTemplateId: "template-2",
      }),
    ).toEqual({
      params: {
        planId: "training-plan-1",
        templateId: "template-2",
      },
      to: "/training-plans/$planId/sessions/new/$templateId",
    });
  });
});
