import { expect, type Locator, type Page, test } from "@playwright/test";
import { planBuilderPaths } from "../../src/plan-builder/plan-builder-paths";

type PlanBuilderLocators = {
  frequencyGroup: Locator;
  summary: Locator;
  workspace: Locator;
};

const trainingSplitLabels = {
  rotatingPushPullLegs: "Rotating Push/Pull/Legs",
  upperLower4Day: "4-Day Upper/Lower",
} as const;

test.describe("desktop plan builder layout", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "Desktop-only layout assertions");

  test("keeps the workspace and summary aligned through the main flow", async ({ page }) => {
    await page.setViewportSize({ width: 1536, height: 900 });

    const locators = await openPlanBuilder(page);
    await expectDesktopPlanBuilderLayout(locators);
    await expectLocatorWithinViewport(page, locators.summary, "Plan Blueprint Summary");

    await selectTrainingFrequency(locators.frequencyGroup, 5);
    await expect(locators.summary.getByText("5 days/week")).toBeVisible();

    await continueToTrainingStyle(page, trainingSplitLabels.rotatingPushPullLegs);

    await expect(locators.summary.getByText("5 days/week")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("fits the frequency step on a 1366 by 768 laptop viewport without scrolling", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 768 });

    const locators = await openPlanBuilder(page);
    await selectTrainingFrequency(locators.frequencyGroup, 5);

    await expectLocatorWithinViewport(
      page,
      page.getByRole("button", { name: /back/i }),
      "Back button",
    );
    await expectLocatorWithinViewport(
      page,
      page.getByRole("button", { name: /continue to training style/i }),
      "continue to training style button",
    );
    await expectNoVerticalOverflow(page);
  });

  test("fits the frequency step on the reference 1440 by 900 laptop viewport without scrolling", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    const locators = await openPlanBuilder(page);
    await selectTrainingFrequency(locators.frequencyGroup, 5);

    await expectLocatorWithinViewport(
      page,
      page.getByRole("button", { name: /continue to training style/i }),
      "continue to training style button",
    );
    await expectLocatorAboveViewportBottom(
      page,
      page.getByRole("button", { name: /continue to training style/i }),
      24,
      "continue to training style button",
    );
    await expectNoVerticalOverflow(page);
  });

  test("fits the Training schedule step on a short desktop viewport without clipping actions", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    await openPlanBuilder(page);
    await expect(page).toHaveURL(new RegExp(`${planBuilderPaths.frequency}$`));

    await expectLocatorWithinViewport(
      page,
      page.getByRole("button", { name: /^back$/i }),
      "Back button",
    );
    await expectLocatorWithinViewport(
      page,
      page.getByRole("button", { name: /continue to training style/i }),
      "continue to training style button",
    );
    await expectLocatorAboveViewportBottom(
      page,
      page.getByRole("button", { name: /continue to training style/i }),
      12,
      "continue to training style button",
    );
    await expectNoVerticalOverflow(page);
  });

  test("keeps the Training schedule step compact on a 24-inch desktop viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1920, height: 930 });

    await openPlanBuilder(page);
    await expect(page).toHaveURL(new RegExp(`${planBuilderPaths.frequency}$`));

    await expectLocatorHeightAtMost(
      page.locator(".plan-builder-stepper"),
      64,
      "Plan Builder stepper",
    );
    await expectLocatorAboveViewportBottom(
      page,
      page.getByRole("button", { name: /continue to training style/i }),
      48,
      "continue to training style button",
    );
    await expectLocatorWithinViewport(
      page,
      page.locator(".plan-builder-right-rail"),
      "Plan Blueprint rail",
    );
    await expectLocatorHeightAtMost(
      page.locator(".plan-builder-right-rail"),
      720,
      "Plan Blueprint rail",
    );
    await expectNoVerticalOverflow(page);
  });

  test("keeps the same stepper and blueprint shell after continuing to Training style", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1920, height: 930 });

    await openPlanBuilder(page);
    const frequencyShell = await getPlanBuilderShellMetrics(page);

    await page.getByRole("button", { name: /continue to training style/i }).click();
    await expect(page).toHaveURL(new RegExp(`${planBuilderPaths.repRanges}$`));
    const trainingStyleShell = await getPlanBuilderShellMetrics(page);

    expect(trainingStyleShell).toEqual(frequencyShell);
  });

  test("does not scroll with a long saved split value on a laptop viewport", async ({ page }) => {
    await page.setViewportSize({ width: 2048, height: 1000 });

    const locators = await openPlanBuilder(page);
    await selectTrainingFrequency(locators.frequencyGroup, 5);
    await continueToTrainingStyle(page, trainingSplitLabels.rotatingPushPullLegs);
    await page.getByRole("link", { name: /back to training schedule/i }).click();
    await expect(page).toHaveURL(new RegExp(`${planBuilderPaths.frequency}$`));

    await expect(
      getBlueprintValueLocator(locators.summary, "Rotating Push/Pull/Legs"),
    ).toBeVisible();
    await expectBlueprintValueWraps(locators.summary, "Rotating Push/Pull/Legs");
    await expectNoHorizontalOverflow(page);
    await expectNoVerticalOverflow(page);
  });

  test("does not scroll on intermediate laptop browser heights", async ({ page }) => {
    for (const viewport of [
      { height: 864, width: 1536 },
      { height: 810, width: 1440 },
      { height: 600, width: 1280 },
    ]) {
      await page.setViewportSize(viewport);

      const locators = await openPlanBuilder(page);

      await expectLocatorWithinViewport(
        page,
        page.getByRole("button", { name: /continue to training style/i }),
        "continue to training style button",
      );
      await expectLocatorWithinViewport(
        page,
        locators.frequencyGroup,
        "Training Frequency options",
      );
      await expectNoVerticalOverflow(page);
    }
  });
});

test.describe("laptop plan builder layout", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "Laptop-only layout assertions");

  test("keeps the frequency step compact between tablet and wide desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 504 });

    const locators = await openPlanBuilder(page);

    await expectSummaryPosition(locators.summary, "static");
    await expectLocatorHeightAtMost(
      page.locator(".plan-builder-stepper"),
      70,
      "Plan Builder stepper",
    );
    await expectLocatorWithinViewport(page, locators.frequencyGroup, "Training Frequency options");
    await expectLocatorWithinViewport(
      page,
      page.getByRole("button", { name: /back/i }),
      "Back button",
    );
    await expectLocatorWithinViewport(
      page,
      page.getByRole("button", { name: /continue to training style/i }),
      "continue to training style button",
    );
  });
});

test.describe("mobile plan builder layout", () => {
  test.skip(({ browserName }) => browserName !== "webkit", "Mobile-only layout assertions");

  test("shows the Plan Blueprint as a collapsed expandable strip before the stepper", async ({
    page,
  }) => {
    const locators = await openPlanBuilder(page);
    const blueprintToggle = locators.summary.getByRole("button", {
      name: /plan blueprint draft/i,
    });
    const stepper = page.locator(".plan-builder-stepper");

    await expect(blueprintToggle).toBeVisible();
    await expect(blueprintToggle).toHaveAttribute("aria-expanded", "false");
    await expect(blueprintToggle).toContainText("Build muscle · 3 days/week");
    await expect(blueprintToggle).toContainText("Upper / Lower / Full Body");
    await expect(locators.summary.getByText("Balanced hypertrophy")).toBeHidden();
    await expectLocatorHeightAtMost(locators.summary, 88, "Collapsed Plan Blueprint strip");

    const summaryBox = await getRequiredBoundingBox(locators.summary, "Plan Blueprint Summary");
    const stepperBox = await getRequiredBoundingBox(stepper, "Plan Builder stepper");
    expect(summaryBox.y + summaryBox.height).toBeLessThanOrEqual(stepperBox.y);

    await blueprintToggle.click();

    await expect(blueprintToggle).toHaveAttribute("aria-expanded", "true");
    await expect(locators.summary.getByText("Balanced hypertrophy")).toBeVisible();
    await expect(locators.summary.getByText("Balanced", { exact: true })).toBeVisible();
  });

  test("stacks the workspace above the summary without overflow", async ({ page }) => {
    const locators = await openPlanBuilder(page);
    await expectMobilePlanBuilderLayout(locators);

    await selectTrainingFrequency(locators.frequencyGroup, 4);
    await expect(
      locators.summary.getByRole("button", { name: /plan blueprint draft/i }),
    ).toContainText("4 days/week");

    await continueToTrainingStyle(page, trainingSplitLabels.upperLower4Day);

    await expect(
      locators.summary.getByRole("button", { name: /plan blueprint draft/i }),
    ).toContainText("4 days/week");
    await expectNoHorizontalOverflow(page);
  });

  test("keeps the stepper visible on the Exercises step", async ({ page }) => {
    await openPlanBuilder(page);
    await continueToExercises(page);

    const stepper = page.locator(".plan-builder-stepper");

    await expect(stepper).toBeVisible();
    await expectLocatorHeightAtMost(stepper, 48, "Plan Builder stepper");
    await expect(stepper.locator(".plan-builder-stepper-label--current")).toHaveAttribute(
      "aria-current",
      "step",
    );
    await expect(stepper.locator(".plan-builder-stepper-label--current")).toHaveText("Exercises");
  });
});

async function openPlanBuilder(page: Page) {
  await page.goto(planBuilderPaths.entry);

  const locators = getPlanBuilderLocators(page);

  await expectPlanBuilderShell(page, locators);

  return locators;
}

function getPlanBuilderLocators(page: Page): PlanBuilderLocators {
  return {
    frequencyGroup: page.getByRole("group", { name: /training frequency/i }),
    summary: page.getByRole("complementary", { name: /plan blueprint summary/i }),
    workspace: page.getByRole("region", { name: /plan builder workspace/i }),
  };
}

async function expectPlanBuilderShell(page: Page, locators: PlanBuilderLocators) {
  await expect(locators.workspace).toBeVisible();
  await expect(locators.summary).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`${planBuilderPaths.frequency}$`));
  await expect(page.getByRole("radio", { name: /3 days per week/i })).toBeChecked();
  await expect(page.locator("body")).not.toContainText(/strongplan/i);
  await expectNoHorizontalOverflow(page);
}

async function expectDesktopPlanBuilderLayout({ summary, workspace }: PlanBuilderLocators) {
  await expectSummaryPosition(summary, "static");

  const workspaceBox = await getRequiredBoundingBox(workspace, "Plan Builder workspace");
  const summaryBox = await getRequiredBoundingBox(summary, "Plan Blueprint Summary");

  expect(summaryBox.x).toBeGreaterThanOrEqual(workspaceBox.x + workspaceBox.width);
  expect(summaryBox.y).toBeGreaterThanOrEqual(workspaceBox.y);
  expect(summaryBox.y).toBeLessThan(workspaceBox.y + 180);
}

async function expectMobilePlanBuilderLayout({ summary, workspace }: PlanBuilderLocators) {
  await expectSummaryPosition(summary, "static");

  const workspaceBox = await getRequiredBoundingBox(workspace, "Plan Builder workspace");
  const summaryBox = await getRequiredBoundingBox(summary, "Plan Blueprint Summary");

  expect(summaryBox.x).toBeGreaterThanOrEqual(workspaceBox.x);
  expect(summaryBox.x + summaryBox.width).toBeLessThanOrEqual(workspaceBox.x + workspaceBox.width);
  expect(summaryBox.y).toBeGreaterThan(workspaceBox.y);
  expect(summaryBox.y + summaryBox.height).toBeLessThan(workspaceBox.y + workspaceBox.height);
}

async function expectSummaryPosition(summary: Locator, expectedPosition: "static" | "sticky") {
  const summaryPosition = await summary.evaluate((node) => getComputedStyle(node).position);

  expect(summaryPosition).toBe(expectedPosition);
}

async function getRequiredBoundingBox(locator: Locator, label: string) {
  const box = await locator.boundingBox();

  expect(box, `${label} layout box should be available`).not.toBeNull();

  if (!box) {
    throw new Error(`${label} layout box was not available.`);
  }

  return box;
}

async function expectLocatorWithinViewport(page: Page, locator: Locator, label: string) {
  const box = await getRequiredBoundingBox(locator, label);
  const viewport = page.viewportSize();

  expect(viewport, `${label} should be checked against a fixed viewport`).not.toBeNull();

  if (!viewport) {
    throw new Error(`${label} viewport was not available.`);
  }

  expect(box.x, `${label} left edge should stay in viewport`).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width, `${label} right edge should stay in viewport`).toBeLessThanOrEqual(
    viewport.width,
  );
  expect(box.y, `${label} top edge should stay in viewport`).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height, `${label} bottom edge should stay in viewport`).toBeLessThanOrEqual(
    viewport.height,
  );
}

async function expectLocatorHeightAtMost(locator: Locator, maxHeight: number, label: string) {
  const box = await getRequiredBoundingBox(locator, label);

  expect(box.height, `${label} should stay compact`).toBeLessThanOrEqual(maxHeight);
}

async function expectLocatorAboveViewportBottom(
  page: Page,
  locator: Locator,
  bottomReserve: number,
  label: string,
) {
  const box = await getRequiredBoundingBox(locator, label);
  const viewport = page.viewportSize();

  expect(viewport, `${label} should be checked against a fixed viewport`).not.toBeNull();

  if (!viewport) {
    throw new Error(`${label} viewport was not available.`);
  }

  expect(
    box.y + box.height,
    `${label} should leave ${bottomReserve}px of visual bottom reserve`,
  ).toBeLessThanOrEqual(viewport.height - bottomReserve);
}

async function expectBlueprintValueWraps(summary: Locator, value: string) {
  const valueLocator = getBlueprintValueLocator(summary, value);

  await expect(valueLocator).toHaveCSS("white-space", "normal");
  await expect(valueLocator).toHaveCSS("text-overflow", "clip");
}

async function getPlanBuilderShellMetrics(page: Page) {
  return page.evaluate(() => {
    function readStyles(selector: string, properties: ReadonlyArray<string>) {
      const element = document.querySelector(selector);

      if (!element) {
        throw new Error(`Missing shell element: ${selector}`);
      }

      const styles = getComputedStyle(element);

      return Object.fromEntries(
        properties.map((property) => [property, styles.getPropertyValue(property)]),
      );
    }

    return {
      blueprintHeading: readStyles(".plan-builder-summary-card h2", ["font-size", "line-height"]),
      blueprintPanel: readStyles(".plan-builder-right-rail", [
        "align-content",
        "gap",
        "min-height",
        "overflow",
        "padding-top",
      ]),
      blueprintRow: readStyles(".plan-builder-summary-row", [
        "gap",
        "grid-template-columns",
        "padding-bottom",
        "padding-top",
      ]),
      stepper: readStyles(".plan-builder-stepper", ["margin-top"]),
      stepperDot: readStyles(".plan-builder-stepper-dot", [
        "box-shadow",
        "font-size",
        "height",
        "width",
      ]),
      stepperLabel: readStyles(".plan-builder-stepper-label", [
        "font-size",
        "line-height",
        "margin-top",
      ]),
      stepperList: readStyles(".plan-builder-stepper-list", ["column-gap"]),
    };
  });
}

function getBlueprintValueLocator(summary: Locator, value: string) {
  return summary.locator("dd").filter({ hasText: value }).first();
}

async function selectTrainingFrequency(frequencyGroup: Locator, daysPerWeek: number) {
  const label = `${daysPerWeek} days per week`;
  const radio = frequencyGroup.getByRole("radio", { name: getLabelMatcher(label) });

  await radio.check({ force: true });
  await expect(radio).toBeChecked();
}

async function continueToTrainingStyle(page: Page, expectedSplitLabel: string) {
  await page.getByRole("button", { name: /continue to training style/i }).click();

  await expect(page.getByRole("heading", { name: /^rep ranges$/i })).toBeVisible();
  const summary = page.getByRole("complementary", { name: /plan blueprint summary/i });
  const mobileBlueprintToggle = summary.getByRole("button", { name: /plan blueprint draft/i });

  if ((await mobileBlueprintToggle.count()) > 0) {
    await expect(mobileBlueprintToggle).toContainText(expectedSplitLabel);
  } else {
    await expect(summary.getByText(expectedSplitLabel).first()).toBeVisible();
  }
  await expect(page).toHaveURL(new RegExp(`${planBuilderPaths.repRanges}$`));
}

async function continueToExercises(page: Page) {
  await page.getByRole("button", { name: /continue to training style/i }).click();
  await expect(page).toHaveURL(new RegExp(`${planBuilderPaths.repRanges}$`));

  await page.getByRole("button", { name: /continue to volume/i }).click();
  await expect(page).toHaveURL(new RegExp(`${planBuilderPaths.volume}$`));

  await page.getByRole("button", { name: /continue to exercises/i }).click();
  await expect(page).toHaveURL(new RegExp(`${planBuilderPaths.exercises}$`));
  await expect(page.getByRole("heading", { level: 1, name: "Exercise foundation" })).toBeVisible();
}

async function expectNoHorizontalOverflow(page: Page) {
  const hasHorizontalOverflow = await page.evaluate(() => {
    const root = document.documentElement;

    return root.scrollWidth > root.clientWidth;
  });

  expect(hasHorizontalOverflow).toBe(false);
}

async function expectNoVerticalOverflow(page: Page) {
  const hasVerticalOverflow = await page.evaluate(() => {
    const root = document.documentElement;

    return root.scrollHeight > root.clientHeight;
  });

  expect(hasVerticalOverflow).toBe(false);
}

function getLabelMatcher(label: string) {
  return new RegExp(escapeRegExp(label), "i");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
