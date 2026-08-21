/**
 * Drives the real /admin UI (Playwright) to apply ENRICHMENT (data.ts) to
 * live venues, one "Save draft" submission per venue — same write path a
 * human admin uses (requireAdmin -> venueInputSchema -> upsertVenue ->
 * revalidateTag), just automated. Never bypasses the server action.
 *
 * Requires a running dev server (pnpm dev, default http://localhost:3000)
 * and ADMIN_EMAIL / ADMIN_PASSWORD in the environment — never hardcode or
 * commit credentials. Run:
 *
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... pnpm enrich:venues [--only=slug1,slug2] [--headed]
 */
import { chromium } from "@playwright/test";

import { CUISINES, type CuisineKey } from "../../src/config/cuisines";
import { WEEKDAY_KEYS, type WeekdayKey } from "../../src/lib/hours";
import { ENRICHMENT } from "./data";

const BASE_URL = process.env.ENRICH_BASE_URL ?? "http://localhost:3000";
const dayLabels: Record<WeekdayKey, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

function parseArgs() {
  const only = process.argv
    .find((a) => a.startsWith("--only="))
    ?.slice("--only=".length)
    .split(",")
    .filter(Boolean);
  const headed = process.argv.includes("--headed");
  return { only, headed };
}

async function main() {
  const { only, headed } = parseArgs();
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required env vars");
  }

  const targets = only
    ? ENRICHMENT.filter((e) => only.includes(e.slug))
    : ENRICHMENT;
  if (targets.length === 0) {
    throw new Error("No matching ENRICHMENT entries for --only filter");
  }
  console.log(`Applying enrichment to ${targets.length} venue(s)`);

  const browser = await chromium.launch({ headless: !headed });
  const page = await browser.newPage();

  console.log("Signing in…");
  await page.goto(`${BASE_URL}/admin/sign-in`);
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(`${BASE_URL}/admin`);

  console.log("Reading venue table…");
  await page.goto(`${BASE_URL}/admin`);
  const rows = page.locator("table.admin-table tbody tr");
  const rowCount = await rows.count();
  const slugToId = new Map<string, string>();
  for (let i = 0; i < rowCount; i++) {
    const row = rows.nth(i);
    const href = await row
      .locator("td a.admin-record-link")
      .getAttribute("href");
    const slug = await row.locator("td a.admin-record-link span").textContent();
    const id = href?.split("/").pop();
    if (id && slug) slugToId.set(slug.trim(), id);
  }
  console.log(`Found ${slugToId.size} venues in the admin table`);

  const missing = targets.filter((t) => !slugToId.has(t.slug));
  if (missing.length > 0) {
    throw new Error(
      `Aborting: ${missing.length} slug(s) in data.ts have no matching venue: ${missing.map((m) => m.slug).join(", ")}`,
    );
  }

  let ok = 0;
  let failed = 0;
  for (const entry of targets) {
    const id = slugToId.get(entry.slug)!;
    console.log(`\n${entry.slug} (${id})`);
    try {
      await page.goto(`${BASE_URL}/admin/venues/${id}`);

      if (entry.type) {
        await page.getByLabel("Venue type").selectOption({ value: entry.type });
      }

      // zoneKey is intentionally left untouched here — an automated
      // lat/lng-based rule was tried and validated against the live DB's
      // already-assigned zones (23% mismatch rate), so it's a human
      // curation task, not something this pass fills in (see progress.md).

      // Cuisines: converge current checked set onto the desired array.
      for (const cuisine of Object.values(CUISINES)) {
        const checkbox = page.getByRole("checkbox", { name: cuisine.label });
        const shouldBeChecked = entry.cuisines.includes(
          cuisine.key as CuisineKey,
        );
        const isChecked = await checkbox.isChecked();
        if (shouldBeChecked !== isChecked) await checkbox.click();
      }

      // Hours: leave "Posted hours are known" untouched if entry.hours is
      // null (preserves whatever the venue already had — usually already
      // unset for these targets). Only touch it when we have real hours.
      if (entry.hours) {
        const hoursKnownToggle = page.getByRole("checkbox", {
          name: "Posted hours are known",
        });
        if (!(await hoursKnownToggle.isChecked()))
          await hoursKnownToggle.click();

        for (const day of WEEKDAY_KEYS) {
          const range = entry.hours[day]?.[0];
          const dayToggle = page.getByRole("checkbox", {
            name: dayLabels[day],
          });
          const dayIsOn = await dayToggle.isChecked();
          if (Boolean(range) !== dayIsOn) await dayToggle.click();
          if (range) {
            await page
              .getByLabel(`${dayLabels[day]} opening time`)
              .fill(range.open);
            await page
              .getByLabel(`${dayLabels[day]} closing time`)
              .fill(range.close);
          }
        }
      }

      await page.getByRole("button", { name: "Save draft" }).click();
      await page
        .getByText("Saved.", { exact: true })
        .waitFor({ timeout: 5000 });
      console.log(
        `  saved (cuisines=${entry.cuisines.join("+")}, hours=${entry.hours ? "set" : "unknown"}${entry.type ? `, type=${entry.type}` : ""})`,
      );
      ok += 1;
    } catch (error) {
      failed += 1;
      console.error(`  FAILED: ${(error as Error).message}`);
    }
  }

  console.log(`\nDone. ok=${ok} failed=${failed}`);
  await browser.close();
  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
