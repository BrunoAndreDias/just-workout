import { describe, expect, it } from "vitest";
import type { TrainingBlock } from "./training-block";
import {
  getCurrentTrainingWeek,
  getSessionTrainingBlockWeek,
  getTrainingWeekWindow,
  isSessionInTrainingBlock,
  isSessionInTrainingWeek,
} from "./training-block-calendar";
import type { TrainingSession } from "./training-session";

// Block weeks run Sunday to Saturday from 2026-06-07; week 6 is 2026-07-12 to 2026-07-18.
const TRAINING_BLOCK: TrainingBlock = {
  cycleNumber: 1,
  endDate: "2026-07-18",
  id: "training-block-1",
  planId: "training-plan-1",
  previousBlockId: null,
  startDate: "2026-06-07",
  status: "active",
  weekNumber: 1,
};

describe("getCurrentTrainingWeek", () => {
  it("follows the calendar from the Training Block start date", () => {
    expect(getCurrentTrainingWeek(createPlan(), new Date("2026-06-16T10:00:00.000Z"))).toEqual({
      end: new Date("2026-06-20T00:00:00.000Z"),
      isOpenEnded: false,
      label: "Jun 14-20, 2026",
      start: new Date("2026-06-14T00:00:00.000Z"),
      weekEnd: "2026-06-20",
      weekNumber: 2,
      weekStart: "2026-06-14",
    });
    expect(
      getCurrentTrainingWeek(createPlan(), new Date("2026-06-01T10:00:00.000Z")).weekNumber,
    ).toBe(1);
  });

  it("stays in the final week after the block end date until the next block is accepted", () => {
    const currentWeek = getCurrentTrainingWeek(createPlan(), new Date("2026-08-03T10:00:00.000Z"));

    expect(currentWeek).toMatchObject({
      isOpenEnded: true,
      weekEnd: "2026-07-18",
      weekNumber: 6,
      weekStart: "2026-07-12",
    });
    expect(
      isSessionInTrainingWeek(
        createSession({ completedAt: "2026-08-02T09:00:00.000Z" }),
        currentWeek,
      ),
    ).toBe(true);
    expect(
      isSessionInTrainingWeek(
        createSession({ completedAt: "2026-07-11T09:00:00.000Z" }),
        currentWeek,
      ),
    ).toBe(false);
  });

  it("counts a late next block from its own start date and never moves a stored week back", () => {
    const lateBlock = { ...TRAINING_BLOCK, id: "training-block-2", startDate: "2026-08-03" };

    expect(
      getCurrentTrainingWeek(
        createPlan({ trainingBlock: lateBlock }),
        new Date("2026-08-11T10:00:00.000Z"),
      ).weekStart,
    ).toBe("2026-08-10");
    expect(
      getCurrentTrainingWeek(
        createPlan({ trainingBlock: { ...lateBlock, weekNumber: 4 } }),
        new Date("2026-08-11T10:00:00.000Z"),
      ).weekNumber,
    ).toBe(4);
  });

  it("anchors plans without a Training Block to their generation date", () => {
    expect(
      getCurrentTrainingWeek(
        createPlan({ trainingBlock: undefined }),
        new Date("2026-06-09T10:00:00.000Z"),
      ),
    ).toMatchObject({ weekEnd: "2026-06-14", weekNumber: 2, weekStart: "2026-06-08" });
  });
});

describe("getTrainingWeekWindow", () => {
  it("returns the week before the block start as the previous-week reference for week 1", () => {
    expect(getTrainingWeekWindow(createPlan(), 0)).toMatchObject({
      isOpenEnded: false,
      label: "May 31-Jun 6, 2026",
      weekEnd: "2026-06-06",
      weekStart: "2026-05-31",
    });
    expect(
      isSessionInTrainingWeek(
        createSession({ completedAt: "2026-06-06T23:30:00.000Z" }),
        getTrainingWeekWindow(createPlan(), 0),
      ),
    ).toBe(true);
    expect(
      isSessionInTrainingWeek(
        createSession({ completedAt: null }),
        getTrainingWeekWindow(createPlan(), 1),
      ),
    ).toBe(false);
  });
});

describe("getSessionTrainingBlockWeek", () => {
  it("prefers the stored block week over the completion date", () => {
    expect(
      getSessionTrainingBlockWeek(
        createPlan(),
        createSession({ completedAt: "2026-06-16T09:00:00.000Z", trainingBlockWeekNumber: 3 }),
      ),
    ).toBe(3);
  });

  it("derives the week from the completion date when the stored week is out of range", () => {
    expect(
      getSessionTrainingBlockWeek(
        createPlan(),
        createSession({ completedAt: "2026-06-16T09:00:00.000Z", trainingBlockWeekNumber: 9 }),
      ),
    ).toBe(2);
  });

  it("puts block sessions logged after the end date in the final week", () => {
    expect(
      getSessionTrainingBlockWeek(
        createPlan(),
        createSession({ completedAt: "2026-07-25T09:00:00.000Z", trainingBlockWeekNumber: null }),
      ),
    ).toBe(6);
  });

  it("uses the completion date for legacy sessions without block metadata", () => {
    const legacySession = createSession({
      completedAt: "2026-06-24T09:00:00.000Z",
      trainingBlockId: null,
      trainingBlockWeekNumber: null,
    });

    expect(getSessionTrainingBlockWeek(createPlan(), legacySession)).toBe(3);
    expect(
      getSessionTrainingBlockWeek(createPlan(), {
        ...legacySession,
        completedAt: "2026-07-25T09:00:00.000Z",
      }),
    ).toBeNull();
  });

  it("ignores sessions from another Training Block or without a completion", () => {
    expect(
      getSessionTrainingBlockWeek(
        createPlan(),
        createSession({ trainingBlockId: "training-block-0", trainingBlockWeekNumber: 2 }),
      ),
    ).toBeNull();
    expect(
      getSessionTrainingBlockWeek(createPlan(), createSession({ completedAt: null })),
    ).toBeNull();
    expect(
      getSessionTrainingBlockWeek(createPlan({ trainingBlock: undefined }), createSession()),
    ).toBeNull();
  });
});

describe("isSessionInTrainingBlock", () => {
  it("matches stamped sessions by block id and legacy sessions by the block's dates", () => {
    expect(isSessionInTrainingBlock(TRAINING_BLOCK, createSession())).toBe(true);
    expect(
      isSessionInTrainingBlock(
        TRAINING_BLOCK,
        createSession({ completedAt: "2026-05-01T09:00:00.000Z" }),
      ),
    ).toBe(true);
    expect(
      isSessionInTrainingBlock(
        TRAINING_BLOCK,
        createSession({ trainingBlockId: "training-block-0" }),
      ),
    ).toBe(false);
    expect(
      isSessionInTrainingBlock(TRAINING_BLOCK, createSession({ planId: "training-plan-2" })),
    ).toBe(false);
    expect(
      isSessionInTrainingBlock(
        TRAINING_BLOCK,
        createSession({ completedAt: "2026-07-18T23:00:00.000Z", trainingBlockId: null }),
      ),
    ).toBe(true);
    expect(
      isSessionInTrainingBlock(
        TRAINING_BLOCK,
        createSession({ completedAt: "2026-06-06T09:00:00.000Z", trainingBlockId: null }),
      ),
    ).toBe(false);
  });
});

function createPlan(overrides: { trainingBlock?: TrainingBlock } = {}) {
  return {
    generatedAt: "2026-06-01T10:00:00.000Z",
    trainingBlock: TRAINING_BLOCK,
    trainingBlockWeeks: 6,
    ...overrides,
  };
}

function createSession(
  overrides: Partial<
    Pick<TrainingSession, "completedAt" | "planId" | "trainingBlockId" | "trainingBlockWeekNumber">
  > = {},
) {
  return {
    completedAt: "2026-06-09T09:00:00.000Z",
    planId: "training-plan-1",
    trainingBlockId: "training-block-1",
    trainingBlockWeekNumber: 1,
    ...overrides,
  };
}
