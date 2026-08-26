import { and, asc, eq, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";

import { db } from "@/lib/db";
import { venuePhotos, venues, type VenuePhotoRow } from "@/lib/db/schema";

export type VenuePhoto = { url: string; alt: string };
export type AdminVenuePhoto = Pick<VenuePhotoRow, "id" | "url" | "alt">;

async function fetchVenuePhotos(slug: string): Promise<VenuePhoto[]> {
  return db
    .select({ url: venuePhotos.url, alt: venuePhotos.alt })
    .from(venuePhotos)
    .innerJoin(venues, eq(venuePhotos.venueId, venues.id))
    .where(eq(venues.slug, slug))
    .orderBy(asc(venuePhotos.sortOrder), asc(venuePhotos.createdAt));
}

/** All photos for a venue's public gallery — legacy + admin-uploaded, curated order first. */
export function getVenuePhotosBySlug(slug: string): Promise<VenuePhoto[]> {
  return unstable_cache(() => fetchVenuePhotos(slug), [`venue-photos-${slug}`], {
    tags: ["venues", `venue:${slug}`],
  })();
}

/** Full rows for the admin photo manager, in display order. Up to `MAX_VENUE_PHOTOS`. */
export async function getVenuePhotosForAdmin(
  venueId: string,
): Promise<VenuePhotoRow[]> {
  return db
    .select()
    .from(venuePhotos)
    .where(eq(venuePhotos.venueId, venueId))
    .orderBy(asc(venuePhotos.sortOrder), asc(venuePhotos.createdAt));
}

export async function getVenuePhotoById(
  photoId: string,
): Promise<VenuePhotoRow | null> {
  const [row] = await db
    .select()
    .from(venuePhotos)
    .where(eq(venuePhotos.id, photoId))
    .limit(1);
  return row ?? null;
}

/** Appends a new admin-uploaded photo after every existing photo for the venue. */
export async function insertVenuePhoto(
  venueId: string,
  values: { url: string; alt: string },
): Promise<VenuePhotoRow> {
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

export async function deleteVenuePhotoById(
  photoId: string,
): Promise<VenuePhotoRow | null> {
  const [row] = await db
    .delete(venuePhotos)
    .where(eq(venuePhotos.id, photoId))
    .returning();
  return row ?? null;
}

/**
 * Rewrites sort order to match `orderedIds` exactly (0-indexed). Ids that
 * don't belong to `venueId` are silently skipped — callers validate the
 * full set matches first so this should never happen in practice.
 */
export async function setVenuePhotoOrder(
  venueId: string,
  orderedIds: string[],
): Promise<VenuePhotoRow[]> {
  await db.transaction(async (tx) => {
    for (const [index, photoId] of orderedIds.entries()) {
      await tx
        .update(venuePhotos)
        .set({ sortOrder: index })
        .where(
          and(eq(venuePhotos.id, photoId), eq(venuePhotos.venueId, venueId)),
        );
    }
  });
  return getVenuePhotosForAdmin(venueId);
}
