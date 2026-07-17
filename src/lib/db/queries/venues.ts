import { unstable_cache } from "next/cache";
import { and, desc, eq, inArray, ne } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  problemReports,
  venues,
  type ProblemReportRow,
  type VenueInsert,
  type VenueRow,
} from "@/lib/db/schema";
import type { VenueHours } from "@/lib/hours";

export type PublicVenue = Omit<VenueRow, "hours"> & {
  hours: VenueHours | null;
};

const PUBLIC_STATUSES = ["published", "retired"] as const;

async function fetchPublishedVenues(): Promise<PublicVenue[]> {
  const rows = await db
    .select()
    .from(venues)
    .where(eq(venues.status, "published"))
    .orderBy(venues.name);

  return rows.map(normalizeVenue);
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

  return row ? normalizeVenue(row) : null;
}

export function getVenueBySlug(slug: string): Promise<PublicVenue | null> {
  return unstable_cache(
    async () => fetchVenueBySlug(slug),
    [`venue-by-slug-${slug}`],
    { tags: ["venues", `venue:${slug}`] },
  )();
}

export async function listAllVenuesAdmin(): Promise<VenueRow[]> {
  return db.select().from(venues).orderBy(desc(venues.updatedAt));
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

function normalizeVenue(row: VenueRow): PublicVenue {
  return {
    ...row,
    hours: (row.hours as VenueHours | null) ?? null,
  };
}
