import { expect, test } from "@playwright/test";

test("redirects / into the canonical Plan Builder and opens every builder section", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/plan-builder$/);
  await expect(page.getByRole("heading", { name: /^plan builder$/i })).toBeVisible();

  await page.getByRole("button", { name: /training schedule/i }).click();
  await expect(
    page.getByRole("heading", {
      name: /how many days can you train per week\?/i,
    }),
  ).toBeVisible();

  await page.getByRole("button", { name: /rep ranges/i }).click();
  await expect(page.getByRole("radio", { name: /balanced hypertrophy/i })).toBeChecked();

  await page.getByRole("button", { name: /^volume/i }).click();
  await expect(page.getByRole("group", { name: /volume preset/i })).toBeVisible();

  await page.getByRole("button", { name: /exercises/i }).click();
  await expect(page.getByRole("heading", { name: /exercises needs setup/i })).toBeVisible();

  await page.getByRole("button", { name: /^generate/i }).click();
  await expect(page.getByRole("heading", { name: /generate training plan/i })).toBeVisible();
});

test("confirms Recommended Defaults before generation and creates a Training Plan after acceptance", async ({
  page,
}) => {
  await page.goto("/plan-builder");

  await page.getByRole("button", { name: /^generate/i }).click();
  await page.getByRole("button", { name: /^generate training plan$/i }).click();

  const confirmation = page.getByRole("dialog", {
    name: /default generation confirmation/i,
  });

  await expect(confirmation).toBeVisible();
  await expect(confirmation.getByText("3-Day Full Body")).toBeVisible();
  await expect(confirmation.getByText("Balanced hypertrophy")).toBeVisible();
  await expect(confirmation.getByText("Balanced volume preset")).toBeVisible();
  await expect(confirmation.getByText("Full gym equipment preset")).toBeVisible();

  await confirmation.getByRole("button", { name: /^cancel$/i }).click();

  await expect(confirmation).toBeHidden();
  await expect(page).toHaveURL(/\/plan-builder$/);
  await expect(page.getByRole("heading", { name: /generate training plan/i })).toBeVisible();

  await page.getByRole("button", { name: /^generate training plan$/i }).click();
  await confirmation.getByRole("button", { name: /^generate with recommended defaults$/i }).click();

  await expect(page).toHaveURL(/\/training-plans\/[^/]+$/);
  await expect(page.getByRole("heading", { name: "3-Day Full Body" })).toBeVisible();
});
