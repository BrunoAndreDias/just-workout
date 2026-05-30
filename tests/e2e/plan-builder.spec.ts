import { expect, type Page, test } from "@playwright/test";

test("keeps the desktop plan builder workspace and summary aligned through the main flow", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Desktop-only layout assertions");

  await page.goto("/plan-builder");

  const workspace = page.getByRole("region", { name: /plan builder workspace/i });
  const summary = page.getByRole("complementary", { name: /plan blueprint summary/i });
  const frequencyGroup = page.getByRole("group", { name: /training frequency/i });

  await expect(workspace).toBeVisible();
  await expect(summary).toBeVisible();
  await expect(page.getByRole("radio", { name: /3 days\/week/i })).toBeChecked();
  await expect(page.locator("body")).not.toContainText(/strongplan/i);
  await expectNoHorizontalOverflow(page);

  const summaryPosition = await summary.evaluate((node) => getComputedStyle(node).position);
  expect(summaryPosition).toBe("sticky");

  const workspaceBox = await workspace.boundingBox();
  const summaryBox = await summary.boundingBox();

  expect(workspaceBox).not.toBeNull();
  expect(summaryBox).not.toBeNull();

  if (!workspaceBox || !summaryBox) {
    throw new Error("Plan Builder layout boxes were not available.");
  }

  expect(summaryBox.x).toBeGreaterThan(workspaceBox.x + workspaceBox.width - 48);
  expect(Math.abs(summaryBox.y - workspaceBox.y)).toBeLessThan(32);

  await frequencyGroup.getByText("5 days/week").click();
  await expect(frequencyGroup.getByRole("radio", { name: /5 days\/week/i })).toBeChecked();
  await expect(summary.getByText("5 days/week")).toBeVisible();

  await page.getByRole("link", { name: /continue to split/i }).click();

  await expect(page.getByRole("heading", { name: /split placeholder/i })).toBeVisible();
  await expect(summary.getByText("5 days/week")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("stacks the mobile plan builder workspace above the summary without overflow", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-safari", "Mobile-only layout assertions");

  await page.goto("/plan-builder");

  const workspace = page.getByRole("region", { name: /plan builder workspace/i });
  const summary = page.getByRole("complementary", { name: /plan blueprint summary/i });
  const frequencyGroup = page.getByRole("group", { name: /training frequency/i });

  await expect(workspace).toBeVisible();
  await expect(summary).toBeVisible();
  await expect(page.getByRole("radio", { name: /3 days\/week/i })).toBeChecked();
  await expect(page.locator("body")).not.toContainText(/strongplan/i);
  await expectNoHorizontalOverflow(page);

  const summaryPosition = await summary.evaluate((node) => getComputedStyle(node).position);
  expect(summaryPosition).toBe("static");

  const workspaceBox = await workspace.boundingBox();
  const summaryBox = await summary.boundingBox();

  expect(workspaceBox).not.toBeNull();
  expect(summaryBox).not.toBeNull();

  if (!workspaceBox || !summaryBox) {
    throw new Error("Plan Builder layout boxes were not available.");
  }

  expect(summaryBox.y).toBeGreaterThan(workspaceBox.y + workspaceBox.height - 24);
  expect(Math.abs(summaryBox.x - workspaceBox.x)).toBeLessThan(24);

  await frequencyGroup.getByText("4 days/week").click();
  await expect(frequencyGroup.getByRole("radio", { name: /4 days\/week/i })).toBeChecked();
  await expect(summary.getByText("4 days/week")).toBeVisible();

  await page.getByRole("link", { name: /continue to split/i }).click();

  await expect(page.getByRole("heading", { name: /split placeholder/i })).toBeVisible();
  await expect(summary.getByText("4 days/week")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

async function expectNoHorizontalOverflow(page: Page) {
  const hasHorizontalOverflow = await page.evaluate(() => {
    const root = document.documentElement;

    return root.scrollWidth > root.clientWidth;
  });

  expect(hasHorizontalOverflow).toBe(false);
}
