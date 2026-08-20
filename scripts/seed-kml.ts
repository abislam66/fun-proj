/**
 * Idempotent KML → draft venues importer.
 * Run locally: `pnpm seed:kml`
 *
 * Sources the curated `TuEats.kml` export (My Maps → File → Download KML)
 * at the repo root — names + coordinates. Re-export and overwrite that file
 * whenever the map changes, then re-run.
 * Never publishes — drafts only. Near-duplicate names stay distinct venues.
 * Matching is by exact name (case-insensitive) OR near-identical coordinates,
 * never by fuzzy name similarity (see domain-knowledge.md gyro pitfall).
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { uniqueSlug } from "../src/lib/slug";
import { venues } from "../src/lib/db/schema";

const KML_PATH = path.resolve(__dirname, "../TuEats.kml");

const COORD_EPSILON = 0.00015; // ~15m

type Placemark = {
  name: string;
  description: string | null;
  lat: number;
  lng: number;
};

function decodeXml(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripHtml(html: string): string {
  return decodeXml(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parsePlacemarks(kml: string): Placemark[] {
  const results: Placemark[] = [];
  const placemarkRe = /<Placemark>([\s\S]*?)<\/Placemark>/gi;
  let match: RegExpExecArray | null;

  while ((match = placemarkRe.exec(kml)) !== null) {
    const block = match[1] ?? "";
    const nameMatch = /<name>([\s\S]*?)<\/name>/i.exec(block);
    const descMatch = /<description>([\s\S]*?)<\/description>/i.exec(block);
    const coordMatch = /<coordinates>\s*([-\d.]+)\s*,\s*([-\d.]+)/i.exec(block);

    if (!nameMatch || !coordMatch) {
      continue;
    }

    const name = stripHtml(nameMatch[1] ?? "").trim();
    const lng = Number(coordMatch[1]);
    const lat = Number(coordMatch[2]);
    if (!name || Number.isNaN(lat) || Number.isNaN(lng)) {
      continue;
    }

    results.push({
      name,
      description: descMatch ? stripHtml(descMatch[1] ?? "") || null : null,
      lat,
      lng,
    });
  }

  return results;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required (load via .env.local)");
  }

  console.log(`Reading ${KML_PATH}…`);
  const kml = await readFile(KML_PATH, "utf-8");
  const placemarks = parsePlacemarks(kml);
  console.log(`Parsed ${placemarks.length} placemarks`);

  const client = postgres(connectionString, { prepare: false, max: 1 });
  const db = drizzle(client);

  const existing = await db.select().from(venues);
  const slugSet = new Set(existing.map((v) => v.slug));

  let inserted = 0;
  let skipped = 0;

  for (const place of placemarks) {
    const byName = existing.find(
      (v) => v.name.toLowerCase() === place.name.toLowerCase(),
    );
    const byCoords = existing.find(
      (v) =>
        Math.abs(v.lat - place.lat) < COORD_EPSILON &&
        Math.abs(v.lng - place.lng) < COORD_EPSILON,
    );

    if (byName || byCoords) {
      skipped += 1;
      continue;
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

    existing.push({
      id: "pending",
      slug,
      name: place.name,
      lat: place.lat,
      lng: place.lng,
    } as (typeof existing)[number]);

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
