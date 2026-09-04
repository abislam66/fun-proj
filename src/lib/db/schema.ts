import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import type { VenueHours } from "@/lib/hours";

export const venueTypeEnum = pgEnum("venue_type", [
  "truck",
  "restaurant",
  "cafe",
  "vending",
  "convenience",
]);

export const venueStatusEnum = pgEnum("venue_status", [
  "draft",
  "published",
  "retired",
]);

export const userRoleEnum = pgEnum("user_role", ["member", "admin"]);

export const reportStatusEnum = pgEnum("report_status", [
  "open",
  "dismissed",
  "actioned",
]);

export const problemKindEnum = pgEnum("problem_kind", [
  "closed",
  "moved",
  "wrong_hours",
  "other",
]);

/**
 * "legacy" = migrated from the pre-backend static registry
 * (src/config/venue-photos.ts + public/photos/<slug>/) — kept alongside
 * admin-uploaded photos in the gallery, but its files live in the public
 * folder, not Vercel Blob, so blob cleanup on delete only ever targets
 * Blob-backed rows. "admin" = photos uploaded through the admin photo
 * manager. "member" = student submissions; they stay `pending` until an
 * admin publishes them into the gallery.
 */
export const venuePhotoSourceEnum = pgEnum("venue_photo_source", [
  "legacy",
  "admin",
  "member",
]);

export const venuePhotoStatusEnum = pgEnum("venue_photo_status", [
  "pending",
  "published",
  "rejected",
]);

export const ratingStatusEnum = pgEnum("rating_status", ["active", "removed"]);

export const venues = pgTable(
  "venues",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    type: venueTypeEnum("type").notNull().default("truck"),
    name: text("name").notNull(),
    description: text("description"),
    status: venueStatusEnum("status").notNull().default("draft"),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    /** One of MapZoneKey (config/map-zones.ts) or the literal "other" — never a MAP_ZONES entry. */
    mapZone: text("map_zone"),
    building: text("building"),
    floor: text("floor"),
    /** null = unknown (unknown ≠ no) */
    acceptsCash: boolean("accepts_cash"),
    acceptsCard: boolean("accepts_card"),
    /** Admin-set only — never auto-inferred. Default false, not unknown. */
    isHalal: boolean("is_halal").notNull().default(false),
    /** True only when there's reliable evidence of a real vegan food option. Admin-set/researched, not inferred from cuisine tags. */
    isVeganFriendly: boolean("is_vegan_friendly").notNull().default(false),
    cuisines: text("cuisines")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    /** Local wall-clock ranges; null = hours unknown. Never store UTC. */
    hours: jsonb("hours").$type<VenueHours | null>(),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "venues_lat_lng_campus_ish",
      sql`${table.lat} BETWEEN 39.96 AND 40.02 AND ${table.lng} BETWEEN -75.18 AND -75.13`,
    ),
    index("venues_cuisines_gin").using("gin", table.cuisines),
    index("venues_status_idx").on(table.status),
  ],
);

export const venuePhotos = pgTable(
  "venue_photos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    venueId: uuid("venue_id")
      .notNull()
      .references(() => venues.id),
    url: text("url").notNull(),
    alt: text("alt").notNull(),
    source: venuePhotoSourceEnum("source").notNull().default("admin"),
    status: venuePhotoStatusEnum("status").notNull().default("published"),
    uploadedBy: uuid("uploaded_by").references(() => profiles.id),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("venue_photos_venue_id_idx").on(table.venueId),
    index("venue_photos_status_idx").on(table.status),
  ],
);

/** 1:1 with Supabase auth.users — email lives only in Auth, never here. */
export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey(),
    displayName: text("display_name").notNull().unique(),
    username: text("username").notNull().unique(),
    graduationYear: smallint("graduation_year"),
    /** Set only when display_name or username changes — identity cooldown. */
    identityChangedAt: timestamp("identity_changed_at", { withTimezone: true }),
    role: userRoleEnum("role").notNull().default("member"),
    struckAt: timestamp("struck_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "profiles_username_format",
      sql`${table.username} ~ '^[a-z][a-z0-9_]{2,19}$'`,
    ),
    check(
      "profiles_graduation_year_range",
      sql`${table.graduationYear} IS NULL OR (${table.graduationYear} BETWEEN 1990 AND 2040)`,
    ),
  ],
);

export const problemReports = pgTable("problem_reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  venueId: uuid("venue_id")
    .notNull()
    .references(() => venues.id),
  kind: problemKindEnum("kind").notNull(),
  note: text("note"),
  /** Salted hash only — raw IP never stored. */
  ipHash: text("ip_hash").notNull(),
  status: reportStatusEnum("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

/** A review is a rating with text. One row per user per venue. */
export const ratings = pgTable(
  "ratings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    venueId: uuid("venue_id")
      .notNull()
      .references(() => venues.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id),
    stars: smallint("stars").notNull(),
    reviewText: text("review_text"),
    status: ratingStatusEnum("status").notNull().default("active"),
    removedReason: text("removed_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("ratings_venue_user_unique").on(table.venueId, table.userId),
    index("ratings_venue_id_idx").on(table.venueId),
    index("ratings_user_id_idx").on(table.userId),
    check("ratings_stars_range", sql`${table.stars} BETWEEN 1 AND 5`),
    check(
      "ratings_review_text_length",
      sql`${table.reviewText} IS NULL OR char_length(${table.reviewText}) <= 1000`,
    ),
  ],
);

export type VenueRow = typeof venues.$inferSelect;
export type VenueInsert = typeof venues.$inferInsert;
export type ProfileRow = typeof profiles.$inferSelect;
export type ProblemReportRow = typeof problemReports.$inferSelect;
export type VenuePhotoRow = typeof venuePhotos.$inferSelect;
export type VenuePhotoInsert = typeof venuePhotos.$inferInsert;
export type RatingRow = typeof ratings.$inferSelect;
export type RatingInsert = typeof ratings.$inferInsert;
