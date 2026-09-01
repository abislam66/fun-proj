/**
 * One-time backfill: computes venues.map_zone from each venue's existing
 * lat/lng using the same point-in-polygon logic that already drives the
 * live public map-zone filter (src/lib/map/point-in-polygon.ts). Not a
 * guess — this can't disagree with the filter, since it's the same
 * function. Venues outside all of config/map-zones.ts's 8 zones get the
 * literal "other" sentinel (never a MAP_ZONES key, so it can't leak into
 * the public filter bar).
 *
 * Idempotent — safe to re-run any time (e.g. after map-zones.ts changes).
 * Run locally: `pnpm backfill:map-zones`
 */

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { venues } from "../src/lib/db/schema";
import { mapZoneContaining } from "../src/lib/map/point-in-polygon";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required (load via .env.local)");
  }

  const client = postgres(connectionString, { prepare: false, max: 1 });
  const db = drizzle(client);

  const rows = await db
    .select({
      id: venues.id,
      slug: venues.slug,
      lat: venues.lat,
      lng: venues.lng,
    })
    .from(venues);

  console.log(`Backfilling map_zone for ${rows.length} venue(s)…`);

  let realZone = 0;
  let other = 0;

  for (const row of rows) {
    const computed = mapZoneContaining(row.lng, row.lat) ?? "other";
    if (computed === "other") other += 1;
    else realZone += 1;
    await db
      .update(venues)
      .set({ mapZone: computed })
      .where(eq(venues.id, row.id));
  }

  console.log(`Done. ${realZone} in a real zone, ${other} "other".`);
  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
