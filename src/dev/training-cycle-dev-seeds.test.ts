import { describe, expect, it } from "vitest";
import { db } from "../app/local-database";
import { seedTrainingCycleDevPlans } from "./training-cycle-dev-seeds";

describe("seedTrainingCycleDevPlans", () => {
  it("creates plans that are already in the cycle test conditions", async () => {
    const result = await seedTrainingCycleDevPlans();

    const readyWeekSixPlan = await db.trainingPlans.get(result.readyWeekSixPlanId);
    const bodyweightWeekSixPlan = await db.trainingPlans.get(result.bodyweightWeekSixPlanId);
    const acceptedNextCyclePlan = await db.trainingPlans.get(result.acceptedNextCyclePlanId);
    const readySessions = await db.trainingSessions
      .where("planId")
      .equals(result.readyWeekSixPlanId)
      .toArray();
    const bodyweightSessions = await db.trainingSessions
      .where("planId")
      .equals(result.bodyweightWeekSixPlanId)
      .toArray();

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
