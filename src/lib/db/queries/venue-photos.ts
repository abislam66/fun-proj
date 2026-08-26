import { and, asc, eq, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";

import { db } from "@/lib/db";
import { venuePhotos, venues, type VenuePhotoRow } from "@/lib/db/schema";

export type VenuePhoto = { url: string; alt: string };

async function fetchVenuePhotos(slug: string): Promise<VenuePhoto[]> {
  return db
    .select({ url: venuePhotos.url, alt: venuePhotos.alt })
    .from(venuePhotos)
    .innerJoin(venues, eq(venuePhotos.venueId, venues.id))
    .where(eq(venues.slug, slug))
    .orderBy(asc(venuePhotos.sortOrder), asc(venuePhotos.createdAt));
}

/** All photos for a venue's public gallery — legacy + admin-uploaded, oldest/curated first. */
export function getVenuePhotosBySlug(slug: string): Promise<VenuePhoto[]> {
  return unstable_cache(() => fetchVenuePhotos(slug), [`venue-photos-${slug}`], {
    tags: ["venues", `venue:${slug}`],
  })();
}

/** The one photo admin upload/remove manages — never touches "legacy" rows. */
export async function getAdminVenuePhoto(
  venueId: string,
): Promise<VenuePhotoRow | null> {
  const [row] = await db
    .select()
    .from(venuePhotos)
    .where(
      and(eq(venuePhotos.venueId, venueId), eq(venuePhotos.source, "admin")),
    )
    .limit(1);
  return row ?? null;
}

/** Insert or replace the admin-managed photo; appended after any legacy photos. */
export async function upsertAdminVenuePhoto(
  venueId: string,
  values: { url: string; alt: string },
): Promise<VenuePhotoRow> {
  const existing = await getAdminVenuePhoto(venueId);
  if (existing) {
    const [row] = await db
      .update(venuePhotos)
      .set({ url: values.url, alt: values.alt })
      .where(eq(venuePhotos.id, existing.id))
      .returning();
    if (!row) throw new Error("Failed to update venue photo");
    return row;
  }

  const [sortRow] = await db
    .select({
      nextSortOrder: sql<number>`coalesce(max(${venuePhotos.sortOrder}), -1) + 1`,
    })
    .from(venuePhotos)
    .where(eq(venuePhotos.venueId, venueId));
  const nextSortOrder = sortRow?.nextSortOrder ?? 0;

  const [row] = await db
    .insert(venuePhotos)
    .values({
      venueId,
      url: values.url,
      alt: values.alt,
      source: "admin",
      sortOrder: nextSortOrder,
    })
    .returning();
  if (!row) throw new Error("Failed to insert venue photo");
  return row;
}

export async function deleteAdminVenuePhoto(
  venueId: string,
): Promise<VenuePhotoRow | null> {
  const existing = await getAdminVenuePhoto(venueId);
  if (!existing) return null;
  await db.delete(venuePhotos).where(eq(venuePhotos.id, existing.id));
  return existing;
}
