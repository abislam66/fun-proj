import { unstable_cache } from "next/cache";
import { and, desc, eq, getTableColumns, inArray, ne, sql } from "drizzle-orm";

import { CUISINE_KEYS } from "@/config/cuisines";
import { MAP_ZONE_KEYS } from "@/config/map-zones";
import { db } from "@/lib/db";
import {
  problemReports,
  venuePhotos,
  venues,
  type ProblemReportRow,
  type VenueInsert,
  type VenueRow,
} from "@/lib/db/schema";
import type { VenueHours } from "@/lib/hours";
import {
  getRatingAggregatesByVenueIds,
  getVenueRatingAggregate,
} from "@/lib/db/queries/ratings";
import type { StudentRatingSummary } from "@/lib/ratings";
import { OTHER_MAP_ZONE, type Venue } from "@/lib/venues";

export type PublicVenue = Omit<VenueRow, "hours"> & {
  hours: VenueHours | null;
  studentRating: StudentRatingSummary | null;
};

/** Maps a DB row to the frontend `Venue` shape used by mock fixtures. */
export function toVenue(row: PublicVenue): Venue {
  return {
    id: row.id,
    slug: row.slug,
    type: row.type,
    name: row.name,
    description: row.description,
    status: row.status === "retired" ? "retired" : "published",
    mapZone:
      row.mapZone === OTHER_MAP_ZONE ||
      MAP_ZONE_KEYS.includes(row.mapZone as (typeof MAP_ZONE_KEYS)[number])
        ? (row.mapZone as Venue["mapZone"])
        : null,
    location:
      [row.building, row.floor].filter(Boolean).join(" · ") ||
      "Near Temple Main Campus",
    building: row.building,
    floor: row.floor,
    lat: row.lat,
    lng: row.lng,
    acceptsCash: row.acceptsCash,
    acceptsCard: row.acceptsCard,
    isHalal: row.isHalal,
    isVeganFriendly: row.isVeganFriendly,
    cuisines: row.cuisines.filter((value): value is Venue["cuisines"][number] =>
      CUISINE_KEYS.includes(value as (typeof CUISINE_KEYS)[number]),
    ),
    hours: row.hours,
    // getPublishedVenues/getVenueBySlug run through unstable_cache, whose
    // disk-backed store round-trips through JSON — a Date survives a cold
    // read but comes back as a plain ISO string on a cache hit, so this
    // must accept either rather than assume row.lastVerifiedAt is a Date.
    lastVerifiedAt: row.lastVerifiedAt
      ? new Date(row.lastVerifiedAt).toISOString().slice(0, 10)
      : null,
    studentRating: row.studentRating,
  };
}

const PUBLIC_STATUSES = ["published", "retired"] as const;

// The list/map endpoint ships to every client on every home page load, so
// it skips columns only the detail page (`fetchVenueBySlug`, full row)
// actually reads: `toVenue()` never puts description/retiredAt/createdAt/
// updatedAt into the `Venue` shape the map/list render. `description` is
// nulled back in rather than typed away, so `normalizeVenue`'s VenueRow
// contract stays a single, unchanged shape.
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to exclude them from listColumns below
const { description, retiredAt, createdAt, updatedAt, ...listColumns } =
  getTableColumns(venues);

async function fetchPublishedVenues(): Promise<PublicVenue[]> {
  const rows = await db
    .select(listColumns)
    .from(venues)
    .where(eq(venues.status, "published"))
    .orderBy(venues.name);

  const aggregates = await getRatingAggregatesByVenueIds(
    rows.map((row) => row.id),
  );

  return rows.map((row) =>
    normalizeVenue(
      {
        ...row,
        description: null,
        retiredAt: null,
        createdAt: new Date(0),
        updatedAt: new Date(0),
      },
      aggregates.get(row.id) ?? null,
    ),
  );
}

export function getPublishedVenues(): Promise<PublicVenue[]> {
  return unstable_cache(fetchPublishedVenues, ["published-venues"], {
    tags: ["venues"],
  })();
}

async function fetchVenueBySlug(slug: string): Promise<PublicVenue | null> {
  const [row] = await db
    .select()
    .from(venues)
    .where(
      and(eq(venues.slug, slug), inArray(venues.status, [...PUBLIC_STATUSES])),
    )
    .limit(1);

  if (!row) return null;
  const studentRating = await getVenueRatingAggregate(row.id);
  return normalizeVenue(row, studentRating);
}

export function getVenueBySlug(slug: string): Promise<PublicVenue | null> {
  return unstable_cache(
    async () => fetchVenueBySlug(slug),
    [`venue-by-slug-${slug}`],
    { tags: ["venues", `venue:${slug}`] },
  )();
}

export type AdminVenueRow = VenueRow & { photoCount: number };

/** Powers the admin venue list + its "missing photo" completeness filter. */
export async function listAllVenuesAdmin(): Promise<AdminVenueRow[]> {
  const rows = await db
    .select({
      ...getTableColumns(venues),
      photoCount: sql<number>`count(${venuePhotos.id})::int`,
    })
    .from(venues)
    .leftJoin(venuePhotos, eq(venuePhotos.venueId, venues.id))
    .groupBy(venues.id)
    .orderBy(desc(venues.updatedAt));
  return rows;
}

export async function getVenueById(id: string): Promise<VenueRow | null> {
  const [row] = await db
    .select()
    .from(venues)
    .where(eq(venues.id, id))
    .limit(1);
  return row ?? null;
}

export async function listSlugsExcept(exceptId?: string): Promise<string[]> {
  const rows = exceptId
    ? await db
        .select({ slug: venues.slug })
        .from(venues)
        .where(ne(venues.id, exceptId))
    : await db.select({ slug: venues.slug }).from(venues);
  return rows.map((r) => r.slug);
}

export async function insertVenue(values: VenueInsert): Promise<VenueRow> {
  const [row] = await db.insert(venues).values(values).returning();
  if (!row) {
    throw new Error("Failed to insert venue");
  }
  return row;
}

export async function updateVenue(
  id: string,
  values: Partial<VenueInsert>,
): Promise<VenueRow> {
  const [row] = await db
    .update(venues)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(venues.id, id))
    .returning();
  if (!row) {
    throw new Error("Venue not found");
  }
  return row;
}

/** Bulk admin edit: sets `isHalal` for many venues in one statement — nothing else changes. */
export async function bulkUpdateVenueHalal(
  ids: string[],
  isHalal: boolean,
): Promise<VenueRow[]> {
  return db
    .update(venues)
    .set({ isHalal, updatedAt: new Date() })
    .where(inArray(venues.id, ids))
    .returning();
}

/** Bulk admin edit: sets `isVeganFriendly` for many venues in one statement — nothing else changes. */
export async function bulkUpdateVenueVeganFriendly(
  ids: string[],
  isVeganFriendly: boolean,
): Promise<VenueRow[]> {
  return db
    .update(venues)
    .set({ isVeganFriendly, updatedAt: new Date() })
    .where(inArray(venues.id, ids))
    .returning();
}

export async function insertProblemReport(values: {
  venueId: string;
  kind: ProblemReportRow["kind"];
  note: string | null;
  ipHash: string;
}): Promise<ProblemReportRow> {
  const [row] = await db
    .insert(problemReports)
    .values({
      venueId: values.venueId,
      kind: values.kind,
      note: values.note,
      ipHash: values.ipHash,
    })
    .returning();
  if (!row) {
    throw new Error("Failed to insert problem report");
  }
  return row;
}

export async function listProblemReports(
  status?: ProblemReportRow["status"],
): Promise<ProblemReportRow[]> {
  if (status) {
    return db
      .select()
      .from(problemReports)
      .where(eq(problemReports.status, status))
      .orderBy(desc(problemReports.createdAt));
  }
  return db
    .select()
    .from(problemReports)
    .orderBy(desc(problemReports.createdAt));
}

export async function updateProblemReportStatus(
  id: string,
  status: Exclude<ProblemReportRow["status"], "open">,
): Promise<ProblemReportRow> {
  const [row] = await db
    .update(problemReports)
    .set({ status, resolvedAt: new Date() })
    .where(eq(problemReports.id, id))
    .returning();
  if (!row) {
    throw new Error("Problem report not found");
  }
  return row;
}

function normalizeVenue(
  row: VenueRow,
  studentRating: StudentRatingSummary | null,
): PublicVenue {
  return {
    ...row,
    hours: (row.hours as VenueHours | null) ?? null,
    studentRating,
  };
}
