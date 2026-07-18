import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  doublePrecision,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import type { VenueHours } from "@/lib/hours";

export const venueTypeEnum = pgEnum("venue_type", [
  "truck",
  "restaurant",
  "cafe",
  "vending",
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
    zoneKey: text("zone_key"),
    building: text("building"),
    floor: text("floor"),
    /** null = unknown (unknown ≠ no) */
    acceptsCash: boolean("accepts_cash"),
    acceptsCard: boolean("accepts_card"),
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
    // Mirrors CAMPUS_COORDINATE_BOUNDS in src/config/site.ts — change together.
    check(
      "venues_lat_lng_campus_ish",
      sql`${table.lat} BETWEEN 39.96 AND 40.02 AND ${table.lng} BETWEEN -75.18 AND -75.13`,
    ),
    index("venues_cuisines_gin").using("gin", table.cuisines),
    index("venues_status_idx").on(table.status),
  ],
);

/** 1:1 with Supabase auth.users — email lives only in Auth, never here. */
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  displayName: text("display_name").notNull().unique(),
  role: userRoleEnum("role").notNull().default("member"),
  struckAt: timestamp("struck_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

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

export type VenueRow = typeof venues.$inferSelect;
export type VenueInsert = typeof venues.$inferInsert;
export type ProfileRow = typeof profiles.$inferSelect;
export type ProblemReportRow = typeof problemReports.$inferSelect;
