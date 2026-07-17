import { expect, test } from "@playwright/test";

test("renders the foundation page", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "TuEats" })).toBeVisible();
  await expect(
    page.getByText("Unofficial and not affiliated with Temple University."),
  ).toBeVisible();
});
