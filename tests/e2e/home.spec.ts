import { expect, test } from "@playwright/test";

test("desktop explorer filters and preserves URL state", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Find your next campus bite." }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Temple campus food map" })
      .or(page.getByLabel("Temple campus food map")),
  ).toBeVisible();
  await expect(page.getByText("OpenStreetMap")).toBeVisible();
  await expect(page.getByText("Temple Main Campus")).toBeVisible();

  const search = page.getByRole("searchbox", {
    name: "Search venues or cuisines",
  });
  await search.fill("halal");
  await expect(page).toHaveURL(/q=halal/);
  await expect(
    page.locator(".desktop-results").getByText("Compass Kitchen"),
  ).toBeVisible();
  await expect(
    page.locator(".desktop-results").getByText("Cherry Cart"),
  ).toBeHidden();
});

test("desktop map pin opens mini-card", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const pin = page.getByRole("button", { name: /Compass Kitchen, Halal/ });
  await expect(pin).toBeVisible({ timeout: 15_000 });
  await pin.click();

  const miniCard = page.locator("a.map-mini-card");
  await expect(miniCard).toBeVisible();
  await expect(miniCard).toContainText("Compass Kitchen");
  await miniCard.click();
  await expect(page).toHaveURL(/eat\/compass-kitchen/);
});

test("mobile explorer exposes sheet detents", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const handle = page.getByRole("button", { name: /Results sheet mid/ });
  await expect(handle).toBeVisible();
  await handle.click();
  await expect(
    page.getByRole("button", { name: /Results sheet full/ }),
  ).toBeVisible();
});

test("venue detail reports a problem and returns to filters", async ({
  page,
}) => {
  await page.goto("/?q=halal");
  await page
    .locator(".desktop-results")
    .getByRole("link", { name: /Compass Kitchen/ })
    .click();
  await expect(page).toHaveURL(/eat\/compass-kitchen/);
  await expect(
    page.getByRole("heading", { name: "Compass Kitchen" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Report a problem" }).click();
  await page.getByLabel("Hours are wrong").check();
  await page.getByRole("button", { name: "Send report" }).click();
  await expect(page.getByText("Thanks for the heads-up.")).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Back to explore/ }),
  ).toHaveAttribute("href", "/?q=halal");
});

test("mock admin sign-in and venue editor work", async ({ page }) => {
  await page.goto("/admin/sign-in");
  await page.getByLabel("Email address").fill("admin@temple.edu");
  await page.getByRole("button", { name: "Send mock code" }).click();
  await page.getByLabel("One-time code").fill("123456");
  await page.getByRole("button", { name: "Enter mock workspace" }).click();

  await expect(page).toHaveURL(/\/admin$/);
  await expect(
    page.getByRole("heading", { name: "Venue management" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Add venue" }).click();
  await expect(page.getByRole("heading", { name: "Add venue" })).toBeVisible();
  await page.getByLabel("Venue name").fill("Test Lunch Cart");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(
    page.getByText("Mock changes saved in this browser."),
  ).toBeVisible();
});
