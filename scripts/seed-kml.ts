/**
 * Idempotent KML → draft venues importer.
 * Run locally: `pnpm seed:kml`
 *
 * Sources Temple's public My Map KML (names + coordinates).
 * Never publishes — drafts only. Parsing, the campus-bounds guard, and dedup
 * live in `src/lib/seed/kml.ts` (pure + unit-tested). Near-duplicate names stay
 * distinct venues (see domain-knowledge.md gyro pitfall).
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { venues } from "../src/lib/db/schema";
import {
  findExistingMatch,
  findNearbyDistinct,
  parsePlacemarks,
  type ExistingVenue,
} from "../src/lib/seed/kml";
import { uniqueSlug } from "../src/lib/slug";

const KML_URL =
  "https://www.google.com/maps/d/kml?mid=1kFf5IaeeXiFpn_UHIyd4UqwHj90&forcekml=1";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required (load via .env.local)");
  }

  console.log("Fetching KML…");
  const response = await fetch(KML_URL);
  if (!response.ok) {
    throw new Error(
      `KML fetch failed: ${response.status} ${response.statusText}`,
    );
  }
  const kml = await response.text();
  const placemarks = parsePlacemarks(kml);
  console.log(`Parsed ${placemarks.length} in-bounds placemarks`);

  const client = postgres(connectionString, { prepare: false, max: 1 });
  const db = drizzle(client);

  const existing: ExistingVenue[] = (await db.select().from(venues)).map(
    (row) => ({ name: row.name, lat: row.lat, lng: row.lng }),
  );
  const slugSet = new Set(
    (await db.select({ slug: venues.slug }).from(venues)).map((r) => r.slug),
  );

  let inserted = 0;
  let skipped = 0;

  for (const place of placemarks) {
    if (findExistingMatch(place, existing)) {
      skipped += 1;
      continue;
    }

    const nearby = findNearbyDistinct(place, existing);
    if (nearby) {
      console.warn(
        `  review: "${place.name}" is ~near "${nearby.name}" — kept distinct`,
      );
    }

    const slug = uniqueSlug(place.name, slugSet);
    slugSet.add(slug);

    await db.insert(venues).values({
      slug,
      name: place.name,
      description: place.description,
      type: "truck",
      status: "draft",
      lat: place.lat,
      lng: place.lng,
      cuisines: [],
      hours: null,
    });
    existing.push({ name: place.name, lat: place.lat, lng: place.lng });

    inserted += 1;
    console.log(`  draft: ${place.name} → ${slug}`);
  }

  console.log(`Done. inserted=${inserted} skipped=${skipped}`);
  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
