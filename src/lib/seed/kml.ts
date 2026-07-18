/**
 * Pure KML parsing + dedup helpers for the truck seed importer.
 * Kept free of DB / network so the logic is unit-testable (see kml.test.ts).
 * The script wrapper lives in `scripts/seed-kml.ts`.
 */
import { CAMPUS_COORDINATE_BOUNDS } from "@/config/site";

export type Placemark = {
  name: string;
  description: string | null;
  lat: number;
  lng: number;
};

export type ExistingVenue = {
  name: string;
  lat: number;
  lng: number;
};

/**
 * Only essentially-identical points dedup by coordinate (~5m). Kept deliberately
 * tight: the five near-identical gyro trucks are DISTINCT venues parked close
 * together (domain-knowledge.md), so a loose radius would wrongly merge them.
 * Re-run idempotency is still guaranteed by the exact-name match.
 */
export const COORD_MATCH_EPSILON = 0.00005;

/** Different-named venues this close are flagged for manual review, not merged. */
export const COORD_REVIEW_RADIUS = 0.00025;

export function decodeXml(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

export function stripHtml(html: string): string {
  return decodeXml(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Parse `<Placemark>` blocks. Only the first `<coordinates>` pair is read
 * (`lng,lat[,alt]`); placemarks without a name/point or with off-campus or
 * non-numeric coordinates are skipped so a stray LineString vertex or garbage
 * row never becomes a draft venue.
 */
export function parsePlacemarks(kml: string): Placemark[] {
  const results: Placemark[] = [];
  const placemarkRe = /<Placemark>([\s\S]*?)<\/Placemark>/gi;
  let match: RegExpExecArray | null;

  while ((match = placemarkRe.exec(kml)) !== null) {
    const block = match[1] ?? "";
    const nameMatch = /<name>([\s\S]*?)<\/name>/i.exec(block);
    const descMatch = /<description>([\s\S]*?)<\/description>/i.exec(block);
    const coordMatch = /<coordinates>\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)/i.exec(
      block,
    );

    if (!nameMatch || !coordMatch) continue;

    const name = stripHtml(nameMatch[1] ?? "");
    const lng = Number(coordMatch[1]);
    const lat = Number(coordMatch[2]);

    if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (!isWithinCampus(lat, lng)) continue;

    results.push({
      name,
      description: descMatch ? stripHtml(descMatch[1] ?? "") || null : null,
      lat,
      lng,
    });
  }

  return results;
}

export function isWithinCampus(lat: number, lng: number): boolean {
  return (
    lat >= CAMPUS_COORDINATE_BOUNDS.south &&
    lat <= CAMPUS_COORDINATE_BOUNDS.north &&
    lng >= CAMPUS_COORDINATE_BOUNDS.west &&
    lng <= CAMPUS_COORDINATE_BOUNDS.east
  );
}

function sameName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function withinRadius(
  place: Placemark,
  venue: ExistingVenue,
  radius: number,
): boolean {
  return (
    Math.abs(venue.lat - place.lat) < radius &&
    Math.abs(venue.lng - place.lng) < radius
  );
}

/**
 * A placemark is a duplicate of an existing venue when the name matches exactly
 * (case-insensitive) OR the coordinates are essentially identical. This is the
 * idempotency key for re-running the importer.
 */
export function findExistingMatch(
  place: Placemark,
  existing: readonly ExistingVenue[],
  epsilon = COORD_MATCH_EPSILON,
): ExistingVenue | null {
  return (
    existing.find(
      (venue) =>
        sameName(venue.name, place.name) || withinRadius(place, venue, epsilon),
    ) ?? null
  );
}

/**
 * A differently-named venue very close to this placemark — likely a distinct
 * neighbour (e.g. the gyro cluster) that should stay separate but is worth an
 * admin glance. Returns null once the coordinates are close enough to count as
 * the same venue (handled by `findExistingMatch`).
 */
export function findNearbyDistinct(
  place: Placemark,
  existing: readonly ExistingVenue[],
  radius = COORD_REVIEW_RADIUS,
  epsilon = COORD_MATCH_EPSILON,
): ExistingVenue | null {
  return (
    existing.find(
      (venue) =>
        !sameName(venue.name, place.name) &&
        !withinRadius(place, venue, epsilon) &&
        withinRadius(place, venue, radius),
    ) ?? null
  );
}
