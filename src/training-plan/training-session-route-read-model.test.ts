import { describe, expect, it } from "vitest";
import type { WorkoutTemplate } from "./training-plan";
import {
  getWorkoutTemplateForTrainingSessionRoute,
  parseTrainingSessionRoutePathname,
} from "./training-session-route-read-model";

describe("Training Session route read model", () => {
  it("parses encoded Training Session route params from the pathname", () => {
    expect(
      parseTrainingSessionRoutePathname(
        "/training-plans/training%20plan%201/sessions/new/template%201",
      ),
    ).toEqual({
      planId: "training plan 1",
      templateId: "template 1",
    });
  });

  it("returns null for unrelated pathnames", () => {
    expect(parseTrainingSessionRoutePathname("/training-plans/training-plan-1")).toBeNull();
  });

  it("selects the Workout Template for the parsed route", () => {
    expect(
      getWorkoutTemplateForTrainingSessionRoute({
        templateId: "template-2",
        workoutTemplates: [
          createWorkoutTemplate("template-1", "Upper A"),
          createWorkoutTemplate("template-2", "Lower A"),
        ],
      }),
    ).toEqual(createWorkoutTemplate("template-2", "Lower A"));
  });
});

function createWorkoutTemplate(id: string, label: string): WorkoutTemplate {
  return {
    id,
    label,
    supersetGroups: [],
  };
}
