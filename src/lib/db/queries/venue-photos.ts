import { and, asc, count, desc, eq, gte, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";

import { MEMBER_PHOTO_RATE_LIMIT } from "@/config/site";
import { db } from "@/lib/db";
import {
  profiles,
  venuePhotos,
  venues,
  type VenuePhotoRow,
} from "@/lib/db/schema";
import { isOverLimit, RateLimitError } from "@/lib/ratelimit";

export type VenuePhoto = { url: string; alt: string };
export type AdminVenuePhoto = Pick<VenuePhotoRow, "id" | "url" | "alt">;

export type PendingVenuePhoto = {
  id: string;
  venueId: string;
  venueName: string;
  url: string;
  alt: string;
  createdAt: Date;
  uploaderDisplayName: string;
};

async function fetchVenuePhotos(slug: string): Promise<VenuePhoto[]> {
  return db
    .select({ url: venuePhotos.url, alt: venuePhotos.alt })
    .from(venuePhotos)
    .innerJoin(venues, eq(venuePhotos.venueId, venues.id))
    .where(and(eq(venues.slug, slug), eq(venuePhotos.status, "published")))
    .orderBy(asc(venuePhotos.sortOrder), asc(venuePhotos.createdAt));
}

/** Published photos for a venue's public gallery — pending/rejected never leak. */
export function getVenuePhotosBySlug(slug: string): Promise<VenuePhoto[]> {
  return unstable_cache(
    () => fetchVenuePhotos(slug),
    [`venue-photos-${slug}`],
    {
      tags: ["venues", `venue:${slug}`],
    },
  )();
}

/** Published rows for the admin photo manager, in display order. */
export async function getVenuePhotosForAdmin(
  venueId: string,
): Promise<VenuePhotoRow[]> {
  return db
    .select()
    .from(venuePhotos)
    .where(
      and(
        eq(venuePhotos.venueId, venueId),
        eq(venuePhotos.status, "published"),
      ),
    )
    .orderBy(asc(venuePhotos.sortOrder), asc(venuePhotos.createdAt));
}

export async function countPublishedVenuePhotos(
  venueId: string,
): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(venuePhotos)
    .where(
      and(
        eq(venuePhotos.venueId, venueId),
        eq(venuePhotos.status, "published"),
      ),
    );
  return Number(row?.total ?? 0);
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

/** Appends a new admin-uploaded photo after every published photo for the venue. */
export async function insertVenuePhoto(
  venueId: string,
  values: { url: string; alt: string },
): Promise<VenuePhotoRow> {
  const [sortRow] = await db
    .select({
      nextSortOrder: sql<number>`coalesce(max(${venuePhotos.sortOrder}), -1) + 1`,
    })
    .from(venuePhotos)
    .where(
      and(
        eq(venuePhotos.venueId, venueId),
        eq(venuePhotos.status, "published"),
      ),
    );
  const nextSortOrder = sortRow?.nextSortOrder ?? 0;

  const [row] = await db
    .insert(venuePhotos)
    .values({
      venueId,
      url: values.url,
      alt: values.alt,
      source: "admin",
      status: "published",
      sortOrder: nextSortOrder,
    })
    .returning();
  if (!row) throw new Error("Failed to insert venue photo");
  return row;
}

export async function insertMemberVenuePhoto(values: {
  venueId: string;
  userId: string;
  url: string;
  alt: string;
}): Promise<VenuePhotoRow> {
  const [row] = await db
    .insert(venuePhotos)
    .values({
      venueId: values.venueId,
      url: values.url,
      alt: values.alt,
      source: "member",
      status: "pending",
      uploadedBy: values.userId,
      sortOrder: 0,
    })
    .returning();
  if (!row) throw new Error("Failed to insert member photo");
  return row;
}

export async function assertMemberPhotoAllowed(userId: string): Promise<void> {
  const since = new Date(Date.now() - MEMBER_PHOTO_RATE_LIMIT.windowMs);
  const [row] = await db
    .select({ total: count() })
    .from(venuePhotos)
    .where(
      and(
        eq(venuePhotos.uploadedBy, userId),
        eq(venuePhotos.source, "member"),
        gte(venuePhotos.createdAt, since),
      ),
    );

  if (isOverLimit(row?.total ?? 0, MEMBER_PHOTO_RATE_LIMIT.max)) {
    throw new RateLimitError(
      "Too many photo submissions today. Try again tomorrow.",
    );
  }
}

export async function listPendingVenuePhotos(): Promise<PendingVenuePhoto[]> {
  const rows = await db
    .select({
      id: venuePhotos.id,
      venueId: venuePhotos.venueId,
      venueName: venues.name,
      url: venuePhotos.url,
      alt: venuePhotos.alt,
      createdAt: venuePhotos.createdAt,
      uploaderDisplayName: profiles.displayName,
    })
    .from(venuePhotos)
    .innerJoin(venues, eq(venues.id, venuePhotos.venueId))
    .innerJoin(profiles, eq(profiles.id, venuePhotos.uploadedBy))
    .where(eq(venuePhotos.status, "pending"))
    .orderBy(desc(venuePhotos.createdAt));
  return rows;
}

export async function publishMemberVenuePhoto(
  photoId: string,
  venueId: string,
): Promise<VenuePhotoRow> {
  const [sortRow] = await db
    .select({
      nextSortOrder: sql<number>`coalesce(max(${venuePhotos.sortOrder}), -1) + 1`,
    })
    .from(venuePhotos)
    .where(
      and(
        eq(venuePhotos.venueId, venueId),
        eq(venuePhotos.status, "published"),
      ),
    );
  const nextSortOrder = sortRow?.nextSortOrder ?? 0;

  const [row] = await db
    .update(venuePhotos)
    .set({ status: "published", sortOrder: nextSortOrder })
    .where(
      and(
        eq(venuePhotos.id, photoId),
        eq(venuePhotos.venueId, venueId),
        eq(venuePhotos.status, "pending"),
      ),
    )
    .returning();
  if (!row) throw new Error("Photo not found");
  return row;
}

export async function rejectMemberVenuePhoto(
  photoId: string,
): Promise<VenuePhotoRow> {
  const [row] = await db
    .update(venuePhotos)
    .set({ status: "rejected" })
    .where(and(eq(venuePhotos.id, photoId), eq(venuePhotos.status, "pending")))
    .returning();
  if (!row) throw new Error("Photo not found");
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
