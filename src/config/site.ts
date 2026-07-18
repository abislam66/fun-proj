/** Campus geography, map defaults, and Phase 1 rate-limit numbers. */

export const CAMPUS_TIMEZONE = "America/New_York" as const;

/**
 * Tight viewport box — the corridor where trucks actually cluster. Used only to
 * frame the map / default viewport, NOT to validate coordinates (real venues
 * near Broad St or Cecil B. Moore fall just outside it).
 */
export const CAMPUS_BOUNDS = {
  west: -75.157,
  south: 39.979,
  east: -75.15,
  north: 39.984,
} as const;

/**
 * Acceptable coordinate envelope for a campus-area venue — the source of truth
 * for validation and the KML seed guard. Kept in sync with the `venues`
 * lat/lng CHECK constraint in `src/lib/db/schema.ts` (change both together).
 */
export const CAMPUS_COORDINATE_BOUNDS = {
  west: -75.18,
  south: 39.96,
  east: -75.13,
  north: 40.02,
} as const;

/** Default MapLibre viewport — campus, not Philadelphia. */
export const DEFAULT_VIEWPORT = {
  center: [-75.1535, 39.9815] as [number, number],
  zoom: 15.5,
} as const;

export const MAP_STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ??
  "https://tiles.openfreemap.org/styles/positron";

/** Soft clamp so pan/zoom stays campus-local, never Philly-wide. */
export const CAMPUS_MAX_BOUNDS = [
  [CAMPUS_BOUNDS.west - 0.004, CAMPUS_BOUNDS.south - 0.003],
  [CAMPUS_BOUNDS.east + 0.004, CAMPUS_BOUNDS.north + 0.003],
] as [[number, number], [number, number]];

/** Anonymous problem reports per salted IP hash per rolling window. */
export const PROBLEM_REPORT_RATE_LIMIT = {
  max: 5,
  windowMs: 60 * 60 * 1000, // 1 hour
} as const;

export const MAX_PROBLEM_NOTE_LENGTH = 500;
export const MAX_VENUE_DESCRIPTION_LENGTH = 2000;
export const MAX_VENUE_NAME_LENGTH = 120;
