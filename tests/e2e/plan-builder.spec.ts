import { expect, type Locator, type Page, test } from "@playwright/test";

type PlanBuilderLocators = {
  frequencyGroup: Locator;
  summary: Locator;
  workspace: Locator;
};

test.describe("desktop plan builder layout", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "Desktop-only layout assertions");

  test("keeps the workspace and summary aligned through the main flow", async ({ page }) => {
    const locators = await openPlanBuilder(page);
    await expectDesktopPlanBuilderLayout(locators);

    await selectTrainingFrequency(locators.frequencyGroup, 5);
    await expect(locators.summary.getByText("5 days/week")).toBeVisible();

    await continueToSplit(page);

    await expect(locators.summary.getByText("5 days/week")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});

test.describe("mobile plan builder layout", () => {
  test.skip(({ browserName }) => browserName !== "webkit", "Mobile-only layout assertions");

  test("stacks the workspace above the summary without overflow", async ({ page }) => {
    const locators = await openPlanBuilder(page);
    await expectMobilePlanBuilderLayout(locators);

    await selectTrainingFrequency(locators.frequencyGroup, 4);
    await expect(locators.summary.getByText("4 days/week")).toBeVisible();

    await continueToSplit(page);

    await expect(locators.summary.getByText("4 days/week")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});

async function openPlanBuilder(page: Page) {
  await page.goto("/plan-builder");

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
  await expect(page.getByRole("radio", { name: /3 days\/week/i })).toBeChecked();
  await expect(page.locator("body")).not.toContainText(/strongplan/i);
  await expectNoHorizontalOverflow(page);
}

async function expectDesktopPlanBuilderLayout({ summary, workspace }: PlanBuilderLocators) {
  await expectSummaryPosition(summary, "sticky");

  const workspaceBox = await getRequiredBoundingBox(workspace, "Plan Builder workspace");
  const summaryBox = await getRequiredBoundingBox(summary, "Plan Blueprint Summary");

  expect(summaryBox.x).toBeGreaterThan(workspaceBox.x + workspaceBox.width - 48);
  expect(Math.abs(summaryBox.y - workspaceBox.y)).toBeLessThan(32);
}

async function expectMobilePlanBuilderLayout({ summary, workspace }: PlanBuilderLocators) {
  await expectSummaryPosition(summary, "static");

  const workspaceBox = await getRequiredBoundingBox(workspace, "Plan Builder workspace");
  const summaryBox = await getRequiredBoundingBox(summary, "Plan Blueprint Summary");

  expect(summaryBox.y).toBeGreaterThan(workspaceBox.y + workspaceBox.height - 24);
  expect(Math.abs(summaryBox.x - workspaceBox.x)).toBeLessThan(24);
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

async function selectTrainingFrequency(frequencyGroup: Locator, daysPerWeek: number) {
  const label = `${daysPerWeek} days/week`;

  await frequencyGroup.getByText(label).click();
  await expect(frequencyGroup.getByRole("radio", { name: new RegExp(label, "i") })).toBeChecked();
}

async function continueToSplit(page: Page) {
  await page.getByRole("link", { name: /continue to split/i }).click();

  await expect(page.getByRole("heading", { name: /split placeholder/i })).toBeVisible();
}

async function expectNoHorizontalOverflow(page: Page) {
  const hasHorizontalOverflow = await page.evaluate(() => {
    const root = document.documentElement;

    return root.scrollWidth > root.clientWidth;
  });

  expect(hasHorizontalOverflow).toBe(false);
}
