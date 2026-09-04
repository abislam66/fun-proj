/** Campus geography, map defaults, and Phase 1 rate-limit numbers. */

export const CAMPUS_TIMEZONE = "America/New_York" as const;

/**
 * Observed venue spread around Temple main campus (approx). Widened from
 * the original truck-corridor-only box (west -75.157/south 39.979/east
 * -75.15/north 39.984) once the KML source grew to include the Liacouras
 * Walk chain cluster and north/south outliers — still comfortably inside
 * the DB's own check constraint (lat 39.96-40.02, lng -75.18--75.13).
 * South edge is the map-zones branch's 39.971 (DESIGN.md viewport spec:
 * include the Girard sports complex) — the union of both widenings.
 */
export const CAMPUS_BOUNDS = {
  west: -75.165,
  south: 39.971,
  east: -75.146,
  north: 39.989,
} as const;

/** Default MapLibre viewport — campus, not Philadelphia. */
export const DEFAULT_VIEWPORT = {
  center: [-75.1555, 39.9775] as [number, number],
  zoom: 14.6,
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

export const MAX_VENUE_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_VENUE_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export const MAX_VENUE_PHOTOS = 10;

export const MAX_REVIEW_TEXT_LENGTH = 1000;

export const MIN_DISPLAY_NAME_LENGTH = 3;
export const MAX_DISPLAY_NAME_LENGTH = 30;
export const DISPLAY_NAME_PATTERN = /^[a-zA-Z0-9 ]+$/;

export const MIN_USERNAME_LENGTH = 3;
export const MAX_USERNAME_LENGTH = 20;
/** Starts with a letter; lowercase letters, digits, underscore. */
export const USERNAME_PATTERN = /^[a-z][a-z0-9_]{2,19}$/;
export const USERNAME_PATTERN_SOURCE = "^[a-z][a-z0-9_]{2,19}$";

export const GRADUATION_YEAR_MIN = 1990;
export const GRADUATION_YEAR_MAX = 2040;

/**
 * Route-shaped and brand-shaped handles nobody should be able to claim.
 * Checked in Zod, not the DB — the unique constraint still applies.
 */
export const RESERVED_USERNAMES = [
  "about",
  "account",
  "admin",
  "api",
  "auth",
  "eat",
  "help",
  "login",
  "me",
  "moderator",
  "owl",
  "owls",
  "profile",
  "root",
  "settings",
  "signin",
  "signup",
  "support",
  "team",
  "tueats",
] as const;

/** Member rating upserts per user per rolling day. */
export const RATING_UPSERT_RATE_LIMIT = {
  max: 5,
  windowMs: 24 * 60 * 60 * 1000,
} as const;

/** One display-name or username change per member per rolling day. */
export const PROFILE_IDENTITY_RATE_LIMIT = {
  max: 1,
  windowMs: 24 * 60 * 60 * 1000,
} as const;

/** Member photo submissions per user per rolling day. */
export const MEMBER_PHOTO_RATE_LIMIT = {
  max: 3,
  windowMs: 24 * 60 * 60 * 1000,
} as const;
