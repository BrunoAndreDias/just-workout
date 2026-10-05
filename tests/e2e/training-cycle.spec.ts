import { expect, type Page, test } from "@playwright/test";

test("builds a 3-day Rotating Upper/Lower plan and starts week 1 with session targets", async ({
  page,
}) => {
  await startFirstUpperLowerSession(page);
  await expect(page.getByRole("heading", { name: "Upper A session" })).toBeAttached();
  await expect(page.getByText("Week 1 of 6")).toBeVisible();
  await expect(page.getByText(/easy week: stop with 4-5 reps left/i)).toBeVisible();

  const firstWeight = page.getByLabel(/ set 1 weight$/).first();
  await firstWeight.fill("60");
  const firstEffort = page.getByRole("radiogroup", { name: / set 1 RIR$/ }).first();
  // Week 1 targets 4 RIR, so the 4 chip carries the target marker.
  await expect(
    firstEffort.getByRole("radio", { name: "4 reps in reserve (target)" }),
  ).toBeVisible();
  await firstEffort.getByRole("radio", { name: /^3 reps in reserve/ }).click();
  await expect(firstEffort.getByRole("radio", { name: /^3 reps in reserve/ })).toBeChecked();
  // Picking an effort seeds the next, still-empty set of the same exercise.
  await expect(
    page
      .getByRole("radiogroup", { name: / set 2 RIR$/ })
      .first()
      .getByRole("radio", { name: /^3 reps in reserve/ }),
  ).toBeChecked();
  if ((page.viewportSize()?.width ?? Number.POSITIVE_INFINITY) <= 560) {
    // Phones get thumb-sized effort chips.
    const chipBox = await firstEffort
      .getByRole("radio", { name: /^3 reps in reserve/ })
      .boundingBox();
    expect(chipBox?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
  await page.reload();

  await expect(page.getByLabel(/ set 1 weight$/).first()).toHaveValue("60");
  await expect(
    page
      .getByRole("radiogroup", { name: / set 1 RIR$/ })
      .first()
      .getByRole("radio", { name: /^3 reps in reserve/ }),
  ).toBeChecked();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
  ).toBeLessThanOrEqual(0);
});

test("shows each completed set next to its Session Target in Training History", async ({
  page,
}) => {
  await startFirstUpperLowerSession(page);
  await expect(page.getByRole("heading", { name: "Upper A session" })).toBeAttached();

  await page
    .getByLabel(/ set 1 weight$/)
    .first()
    .fill("60");
  await page
    .getByRole("radiogroup", { name: / set 1 RIR$/ })
    .first()
    .getByRole("radio", { name: /^3 reps in reserve/ })
    .click();
  await page
    .getByRole("checkbox", { name: / set 1 done$/i })
    .first()
    .check();

  // Pull-Ups is a bodyweight exercise, so completion needs a Session Bodyweight.
  await page.getByRole("spinbutton", { name: "Session Bodyweight" }).fill("80");
  await page.getByRole("button", { name: /complete session/i }).click();
  await expect(page.getByText("Session stored")).toBeVisible();

  await page
    .getByRole("link", { name: /training history/i })
    .first()
    .click();
  await page.getByRole("button", { name: /^View session Upper A/ }).click();

  const targets = page.getByRole("region", { name: "Session Targets vs actual" });
  const firstSet = targets.getByRole("listitem").first();
  await expect(firstSet).toContainText("Set 1");
  await expect(firstSet).toContainText("60 kg × ");
  await expect(firstSet).toContainText("3 RIR");
  // Week 1 has no progression history yet, so only the effort target is stored.
  await expect(firstSet).toContainText("Target 4 RIR");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
  ).toBeLessThanOrEqual(0);
});

async function startFirstUpperLowerSession(page: Page) {
  await page.goto("/plan-builder");

  await page.getByRole("button", { name: /training schedule/i }).click();

  const threeDays = page.locator('input[name="training-frequency-days-per-week"][value="3"]');
  const rotatingUpperLower = page.locator(
    'input[name="training-split"][value="rotating-upper-lower"]',
  );

  await threeDays.check({ force: true });
  await expect(threeDays).toBeChecked();
  // The split cards animate in; retry the click until the selection sticks.
  await expect(async () => {
    await page.getByText("Rotating Upper/Lower", { exact: true }).first().click();
    await expect(rotatingUpperLower).toBeChecked({ timeout: 1000 });
  }).toPass();
  await expect(page.getByText(/the cycle carries over to the next week/i)).toBeVisible();

  await page.getByRole("button", { name: /^generate/i }).click();
  await page.getByRole("button", { name: /^generate training plan$/i }).click();

  const confirmation = page.getByRole("dialog", { name: /use recommended defaults\?/i });

  if (await confirmation.isVisible().catch(() => false)) {
    await confirmation
      .getByRole("button", { name: /^generate with recommended defaults$/i })
      .click();
  }

  await expect(page.getByRole("heading", { name: /^training plan draft$/i })).toBeVisible();
  await page.getByRole("button", { name: /^accept draft$/i }).click();
  await expect(page).toHaveURL(/\/training-plans\/[^/]+$/);
  await expect(page.getByRole("heading", { name: "Rotating Upper/Lower" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Weekly effort targets" })).toBeVisible();
  // Block progress counts sessions, so a fresh block starts empty rather than at week 1's 17%.
  await expect(page.getByText("0 / 18 sessions · 0%")).toBeVisible();

  await page.getByRole("button", { name: "Start next workout" }).first().click();
}
