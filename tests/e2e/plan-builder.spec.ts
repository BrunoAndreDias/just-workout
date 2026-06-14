import { expect, type Locator, type Page, test } from "@playwright/test";

const planBuilderPath = /\/plan-builder$/;
const defaultGenerationDialogName = /default generation confirmation/i;
const recommendedDefaults = [
  "3-Day Full Body",
  "Balanced hypertrophy",
  "Balanced volume preset",
  "Full gym equipment preset",
];

test("redirects / into the canonical Plan Builder and opens every builder section", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page).toHaveURL(planBuilderPath);
  await expect(page.getByRole("heading", { name: /^plan builder$/i })).toBeVisible();

  await openBuilderSection(page, /training schedule/i);
  await expect(
    page.getByRole("heading", {
      name: /how many days can you train per week\?/i,
    }),
  ).toBeVisible();

  await openBuilderSection(page, /rep ranges/i);
  await expect(page.getByRole("radio", { name: /balanced hypertrophy/i })).toBeChecked();

  await openBuilderSection(page, /^volume/i);
  await expect(page.getByRole("group", { name: /volume preset/i })).toBeVisible();

  await openBuilderSection(page, /exercises/i);
  await expect(page.getByRole("heading", { name: /exercises needs setup/i })).toBeVisible();

  await openBuilderSection(page, /^generate/i);
  await expect(page.getByRole("heading", { name: /generate training plan/i })).toBeVisible();
});

test("confirms Recommended Defaults before generation and creates a Training Plan after acceptance", async ({
  page,
}) => {
  await page.goto("/plan-builder");

  await openBuilderSection(page, /^generate/i);
  await generateTrainingPlanButton(page).click();

  const confirmation = defaultGenerationConfirmation(page);

  await expect(confirmation).toBeVisible();
  await expectRecommendedDefaults(confirmation);

  await confirmation.getByRole("button", { name: /^cancel$/i }).click();

  await expect(confirmation).toBeHidden();
  await expect(page).toHaveURL(planBuilderPath);
  await expect(page.getByRole("heading", { name: /generate training plan/i })).toBeVisible();

  await generateTrainingPlanButton(page).click();
  await confirmation.getByRole("button", { name: /^generate with recommended defaults$/i }).click();

  await expect(page).toHaveURL(/\/training-plans\/[^/]+$/);
  await expect(page.getByRole("heading", { name: "3-Day Full Body" })).toBeVisible();
});

async function openBuilderSection(page: Page, sectionName: RegExp) {
  await page.getByRole("button", { name: sectionName }).click();
}

function defaultGenerationConfirmation(page: Page) {
  return page.getByRole("dialog", {
    name: defaultGenerationDialogName,
  });
}

function generateTrainingPlanButton(page: Page) {
  return page.getByRole("button", { name: /^generate training plan$/i });
}

async function expectRecommendedDefaults(confirmation: Locator) {
  for (const defaultLabel of recommendedDefaults) {
    await expect(confirmation.getByText(defaultLabel)).toBeVisible();
  }
}
