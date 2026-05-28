import { expect, test } from "@playwright/test";

test("loads the app shell", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("link", { name: /just workout/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /create/i })).toBeVisible();
});
