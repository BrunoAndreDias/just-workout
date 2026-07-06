import { describe, expect, it } from "vitest";
import {
  getNextWorkoutTemplateId,
  getStartNextWorkoutRouteTarget,
  getStartWorkoutRouteTarget,
} from "./active-training-plan-navigation";

describe("Active Training Plan navigation", () => {
  it("routes Start next workout to the next planned Workout Template in the current Training Week", () => {
    expect(
      getStartNextWorkoutRouteTarget({
        now: new Date("2026-06-10T12:00:00.000Z"),
        id: "training-plan-1",
        trainingBlock: {
          cycleNumber: 1,
          endDate: "2026-07-18",
          id: "training-block-1",
          planId: "training-plan-1",
          previousBlockId: null,
          startDate: "2026-06-07",
          status: "active",
          weekNumber: 1,
        },
        trainingFrequencyDaysPerWeek: 3,
        trainingSessions: [
          {
            completedAt: "2026-06-08T09:00:00.000Z",
            createdAt: "2026-06-08T09:00:00.000Z",
            exercises: [],
            id: "session-1",
            planId: "training-plan-1",
            sessionIntent: "planned",
            status: "completed",
            templateId: "template-1",
            templateLabel: "Upper A",
            updatedAt: "2026-06-08T09:00:00.000Z",
            volumeByMovementPattern: [],
          },
        ],
        workoutTemplates: [
          { id: "template-1", label: "Upper A", purpose: "strength", supersetGroups: [] },
          { id: "template-2", label: "Lower A", purpose: "strength", supersetGroups: [] },
        ],
      }),
    ).toEqual({
      params: {
        planId: "training-plan-1",
        templateId: "template-2",
      },
      to: "/training-plans/$planId/sessions/new/$templateId",
    });
  });

  it("falls back to the first generated Workout Template id before templates exist", () => {
    expect(getNextWorkoutTemplateId({ workoutTemplates: [] })).toBe("template-1");
  });

  it("routes Start next workout to the Extra Training Session chooser after the weekly target is met", () => {
    expect(
      getStartNextWorkoutRouteTarget({
        now: new Date("2026-06-11T12:00:00.000Z"),
        id: "training-plan-1",
        trainingBlock: {
          cycleNumber: 1,
          endDate: "2026-07-18",
          id: "training-block-1",
          planId: "training-plan-1",
          previousBlockId: null,
          startDate: "2026-06-07",
          status: "active",
          weekNumber: 1,
        },
        trainingFrequencyDaysPerWeek: 3,
        trainingSessions: [
          createCompletedTrainingSession({
            completedAt: "2026-06-08T09:00:00.000Z",
            id: "session-1",
            templateId: "template-1",
            templateLabel: "Upper A",
          }),
          createCompletedTrainingSession({
            completedAt: "2026-06-09T09:00:00.000Z",
            id: "session-2",
            templateId: "template-2",
            templateLabel: "Lower A",
          }),
          createCompletedTrainingSession({
            completedAt: "2026-06-10T09:00:00.000Z",
            id: "session-3",
            templateId: "template-1",
            templateLabel: "Upper A",
          }),
        ],
        workoutTemplates: [
          { id: "template-1", label: "Upper A", purpose: "strength", supersetGroups: [] },
          { id: "template-2", label: "Lower A", purpose: "strength", supersetGroups: [] },
        ],
      }),
    ).toEqual({
      params: {
        planId: "training-plan-1",
      },
      search: {
        intent: "extra",
      },
      to: "/training-plans/$planId/sessions/new",
    });
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

function createCompletedTrainingSession({
  completedAt,
  id,
  sessionIntent = "planned",
  templateId,
  templateLabel,
}: {
  completedAt: string;
  id: string;
  sessionIntent?: "extra" | "planned";
  templateId: string;
  templateLabel: string;
}) {
  return {
    completedAt,
    createdAt: completedAt,
    exercises: [],
    id,
    planId: "training-plan-1",
    sessionIntent,
    status: "completed" as const,
    templateId,
    templateLabel,
    updatedAt: completedAt,
    volumeByMovementPattern: [],
  };
}
