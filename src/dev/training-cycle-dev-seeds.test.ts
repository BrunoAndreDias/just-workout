import { describe, expect, it } from "vitest";
import {
  getTrainingPlan,
  getTrainingSessionsForPlan,
} from "../training-plan/training-plan-repository";
import { seedTrainingCycleDevPlans } from "./training-cycle-dev-seeds";

describe("seedTrainingCycleDevPlans", () => {
  it("creates plans that are already in the cycle test conditions", async () => {
    const result = await seedTrainingCycleDevPlans();

    const readyWeekSixPlan = await getTrainingPlan(result.readyWeekSixPlanId);
    const bodyweightWeekSixPlan = await getTrainingPlan(result.bodyweightWeekSixPlanId);
    const acceptedNextCyclePlan = await getTrainingPlan(result.acceptedNextCyclePlanId);
    const readySessions = await getTrainingSessionsForPlan(result.readyWeekSixPlanId);
    const bodyweightSessions = await getTrainingSessionsForPlan(result.bodyweightWeekSixPlanId);

    expect(readyWeekSixPlan).toMatchObject({
      active: true,
      id: "dev-cycle-week-6",
      trainingBlock: {
        cycleNumber: 1,
        status: "completed",
        weekNumber: 6,
      },
    });
    expect(readyWeekSixPlan?.mainCompoundRotationPools).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          exerciseIds: ["incline-dumbbell-bench-press"],
          movementPattern: "horizontal_push",
        }),
      ]),
    );
    expect(readySessions).toHaveLength(1);

    expect(bodyweightWeekSixPlan).toMatchObject({
      active: false,
      id: "dev-cycle-bodyweight-week-6",
      trainingBlock: {
        status: "completed",
        weekNumber: 6,
      },
    });
    expect(bodyweightSessions[0]?.exercises[0]).toMatchObject({
      exerciseId: "pull-ups",
      sets: [{ reps: 12, setIndex: 1, weight: 0 }],
    });

    expect(acceptedNextCyclePlan).toMatchObject({
      active: false,
      id: "dev-cycle-2",
      startingLoadSuggestions: expect.arrayContaining([
        expect.objectContaining({
          effectiveLoad: 92.5,
          exerciseId: "incline-dumbbell-bench-press",
          userEditedLoad: 92.5,
        }),
      ]),
      trainingBlock: {
        cycleNumber: 2,
        status: "active",
        weekNumber: 1,
      },
    });
  });
});
