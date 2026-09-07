"use server";

import { del } from "@vercel/blob";
import { revalidateTag } from "next/cache";
import { z } from "zod";

import { MAX_VENUE_PHOTOS } from "@/config/site";
import { requireAdmin } from "@/lib/auth";
import { AuthError } from "@/lib/auth-guards";
import { blobBackedPhotoSource, canPublishVenuePhoto } from "@/lib/ratings";
import {
  bulkAddVenueCuisine,
  bulkRemoveVenueCuisine,
  bulkUpdateVenueHalal,
  bulkUpdateVenueVeganFriendly,
  countPublishedVenuePhotos,
  deleteVenuePhotoById,
  getRatingById,
  getVenueById,
  getVenuePhotoById,
  getVenuePhotosForAdmin,
  insertVenue,
  insertVenuePhoto,
  listPendingVenuePhotos,
  listProblemReports,
  listSlugsExcept,
  publishMemberVenuePhoto,
  rejectMemberVenuePhoto,
  removeRating,
  setVenuePhotoOrder,
  updateProblemReportStatus,
  updateVenue,
  type AdminVenuePhoto,
  type PendingVenuePhoto,
} from "@/lib/db/queries";
import { RateLimitError } from "@/lib/ratelimit";
import { uniqueSlug } from "@/lib/slug";
import {
  bulkSetCuisineSchema,
  bulkSetHalalSchema,
  bulkSetVeganFriendlySchema,
  finalizeVenuePhotoUploadSchema,
  reorderVenuePhotosSchema,
  removeRatingSchema,
  resolveProblemReportSchema,
  resolveVenuePhotoSchema,
  venueIdSchema,
  venueInputSchema,
  venuePhotoIdSchema,
} from "@/lib/validation";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function fail(error: unknown): ActionResult<never> {
  if (error instanceof AuthError || error instanceof RateLimitError) {
    return { ok: false, error: error.message };
  }
  if (error instanceof z.ZodError) {
    // Default .message is a pretty-printed JSON dump of every issue —
    // unreadable in the admin's single-line notice banner. The client
    // already validates with friendly per-field messages
    // (validateVenueDraft); this is only the server-side safety net for
    // whatever that missed, so a readable joined summary is enough.
    const message = error.issues
      .map((issue) => {
        const field = issue.path.join(".");
        return field ? `${field}: ${issue.message}` : issue.message;
      })
      .join("; ");
    return { ok: false, error: message || "Invalid input." };
  }
  if (error instanceof Error) {
    return { ok: false, error: error.message };
  }
  return { ok: false, error: "Something went wrong" };
}

function revalidateVenue(slug: string) {
  revalidateTag("venues");
  revalidateTag(`venue:${slug}`);
}

/** Admin: create or update a venue (draft by default on create). */
export async function upsertVenue(
  raw: unknown,
): Promise<ActionResult<{ id: string; slug: string }>> {
  try {
    await requireAdmin();
    const input = venueInputSchema.parse(raw);

    if (input.id) {
      const existing = await getVenueById(input.id);
      if (!existing) {
        return { ok: false, error: "Venue not found" };
      }

      const updated = await updateVenue(input.id, {
        name: input.name,
        type: input.type,
        description: input.description ?? null,
        lat: input.lat,
        lng: input.lng,
        mapZone: input.mapZone ?? null,
        building: input.building ?? null,
        floor: input.floor ?? null,
        acceptsCash: input.acceptsCash ?? null,
        acceptsCard: input.acceptsCard ?? null,
        isHalal: input.isHalal,
        isVeganFriendly: input.isVeganFriendly,
        cuisines: input.cuisines,
        hours: input.hours === undefined ? existing.hours : input.hours,
      });

      revalidateVenue(updated.slug);
      return { ok: true, data: { id: updated.id, slug: updated.slug } };
    }

    const taken = new Set(await listSlugsExcept());
    const slug = uniqueSlug(input.name, taken);

    const created = await insertVenue({
      slug,
      name: input.name,
      type: input.type,
      description: input.description ?? null,
      status: "draft",
      lat: input.lat,
      lng: input.lng,
      mapZone: input.mapZone ?? null,
      building: input.building ?? null,
      floor: input.floor ?? null,
      acceptsCash: input.acceptsCash ?? null,
      acceptsCard: input.acceptsCard ?? null,
      isHalal: input.isHalal,
      isVeganFriendly: input.isVeganFriendly,
      cuisines: input.cuisines,
      hours: input.hours ?? null,
    });

    revalidateTag("venues");
    return { ok: true, data: { id: created.id, slug: created.slug } };
  } catch (error) {
    return fail(error);
  }
}

function toAdminPhoto(row: {
  id: string;
  url: string;
  alt: string;
}): AdminVenuePhoto {
  return { id: row.id, url: row.url, alt: row.alt };
}

/**
 * Admin: record a photo the browser already uploaded directly to Blob
 * storage (see src/app/api/admin/photos/upload/route.ts, which issues the
 * scoped upload token and is the only place this app uploads a photo file
 * through the server — routing bytes through a server action here would
 * mean every photo crosses the network twice: browser -> function ->
 * Blob, instead of browser -> Blob directly). This action never sees the
 * file; it just validates the resulting blob URL and writes the DB row.
 */
export async function finalizeVenuePhotoUpload(
  raw: unknown,
): Promise<ActionResult<{ photo: AdminVenuePhoto }>> {
  try {
    await requireAdmin();
    const { id, url } = finalizeVenuePhotoUploadSchema.parse(raw);

    const existing = await getVenueById(id);
    if (!existing) {
      return { ok: false, error: "Venue not found" };
    }

    const currentCount = await countPublishedVenuePhotos(id);
    if (currentCount >= MAX_VENUE_PHOTOS) {
      return {
        ok: false,
        error: `This venue already has ${MAX_VENUE_PHOTOS} photos — remove one before adding another.`,
      };
    }

    const photo = await insertVenuePhoto(id, {
      url,
      alt: `${existing.name} photo ${currentCount + 1}`,
    });

    revalidateVenue(existing.slug);
    return { ok: true, data: { photo: toAdminPhoto(photo) } };
  } catch (error) {
    return fail(error);
  }
}

/** Admin: remove one photo from a venue's gallery. Blob is only deleted for admin-uploaded photos. */
export async function deleteVenuePhoto(raw: unknown): Promise<ActionResult> {
  try {
    await requireAdmin();
    const { venueId, photoId } = venuePhotoIdSchema.parse(raw);
    const existing = await getVenueById(venueId);
    if (!existing) {
      return { ok: false, error: "Venue not found" };
    }

    const photo = await getVenuePhotoById(photoId);
    if (!photo || photo.venueId !== venueId) {
      return { ok: false, error: "Photo not found" };
    }

    await deleteVenuePhotoById(photoId);
    if (blobBackedPhotoSource(photo.source)) {
      await del(photo.url).catch(() => {});
    }

    revalidateVenue(existing.slug);
    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error);
  }
}

/** Admin: reorder a venue's photos (also used to set the cover photo — move it to index 0). */
export async function reorderVenuePhotos(
  raw: unknown,
): Promise<ActionResult<{ photos: AdminVenuePhoto[] }>> {
  try {
    await requireAdmin();
    const { venueId, photoIds } = reorderVenuePhotosSchema.parse(raw);
    const existing = await getVenueById(venueId);
    if (!existing) {
      return { ok: false, error: "Venue not found" };
    }

    const current = await getVenuePhotosForAdmin(venueId);
    const currentIds = new Set(current.map((photo) => photo.id));
    const sameSet =
      photoIds.length === current.length &&
      photoIds.every((id) => currentIds.has(id));
    if (!sameSet) {
      return {
        ok: false,
        error: "Photo list changed elsewhere — refresh and try again.",
      };
    }

    const reordered = await setVenuePhotoOrder(venueId, photoIds);
    revalidateVenue(existing.slug);
    return { ok: true, data: { photos: reordered.map(toAdminPhoto) } };
  } catch (error) {
    return fail(error);
  }
}

/** Admin: publish a draft (slug is frozen at first publish). */
export async function publishVenue(
  raw: unknown,
): Promise<ActionResult<{ slug: string }>> {
  try {
    await requireAdmin();
    const { id } = venueIdSchema.parse(raw);
    const existing = await getVenueById(id);
    if (!existing) {
      return { ok: false, error: "Venue not found" };
    }
    if (existing.status === "published") {
      return { ok: true, data: { slug: existing.slug } };
    }

    const updated = await updateVenue(id, {
      status: "published",
      retiredAt: null,
    });
    revalidateVenue(updated.slug);
    return { ok: true, data: { slug: updated.slug } };
  } catch (error) {
    return fail(error);
  }
}

/** Admin: retire a venue — hidden from map/list; URL stays live as Closed. */
export async function retireVenue(
  raw: unknown,
): Promise<ActionResult<{ slug: string }>> {
  try {
    await requireAdmin();
    const { id } = venueIdSchema.parse(raw);
    const existing = await getVenueById(id);
    if (!existing) {
      return { ok: false, error: "Venue not found" };
    }

    const updated = await updateVenue(id, {
      status: "retired",
      retiredAt: new Date(),
    });
    revalidateVenue(updated.slug);
    return { ok: true, data: { slug: updated.slug } };
  } catch (error) {
    return fail(error);
  }
}

/** Admin: mark venue details verified on campus. */
export async function verifyVenue(
  raw: unknown,
): Promise<ActionResult<{ slug: string; lastVerifiedAt: string }>> {
  try {
    await requireAdmin();
    const { id } = venueIdSchema.parse(raw);
    const existing = await getVenueById(id);
    if (!existing) {
      return { ok: false, error: "Venue not found" };
    }

    const now = new Date();
    const updated = await updateVenue(id, { lastVerifiedAt: now });
    revalidateVenue(updated.slug);
    return {
      ok: true,
      data: {
        slug: updated.slug,
        lastVerifiedAt: now.toISOString(),
      },
    };
  } catch (error) {
    return fail(error);
  }
}

/** Admin: bulk-set Halal on many venues in one action (used by the admin list's bulk selection). */
export async function bulkSetVenueHalal(
  raw: unknown,
): Promise<ActionResult<{ updatedIds: string[] }>> {
  try {
    await requireAdmin();
    const { ids, isHalal } = bulkSetHalalSchema.parse(raw);
    const updated = await bulkUpdateVenueHalal(ids, isHalal);

    revalidateTag("venues");
    for (const row of updated) revalidateTag(`venue:${row.slug}`);

    return { ok: true, data: { updatedIds: updated.map((row) => row.id) } };
  } catch (error) {
    return fail(error);
  }
}

/** Admin: bulk-set Vegan Friendly on many venues in one action (used by the admin list's bulk selection). */
export async function bulkSetVenueVeganFriendly(
  raw: unknown,
): Promise<ActionResult<{ updatedIds: string[] }>> {
  try {
    await requireAdmin();
    const { ids, isVeganFriendly } = bulkSetVeganFriendlySchema.parse(raw);
    const updated = await bulkUpdateVenueVeganFriendly(ids, isVeganFriendly);

    revalidateTag("venues");
    for (const row of updated) revalidateTag(`venue:${row.slug}`);

    return { ok: true, data: { updatedIds: updated.map((row) => row.id) } };
  } catch (error) {
    return fail(error);
  }
}

/**
 * Admin: bulk-add or bulk-remove one cuisine tag across many venues (used
 * by the admin list's bulk selection). Never overwrites the `cuisines`
 * array wholesale — the query layer only adds/removes the one named tag,
 * so every other cuisine already on a row survives untouched.
 */
export async function bulkSetVenueCuisine(
  raw: unknown,
): Promise<ActionResult<{ updatedIds: string[] }>> {
  try {
    await requireAdmin();
    const { ids, cuisine, action } = bulkSetCuisineSchema.parse(raw);
    const updated =
      action === "add"
        ? await bulkAddVenueCuisine(ids, cuisine)
        : await bulkRemoveVenueCuisine(ids, cuisine);

    revalidateTag("venues");
    for (const row of updated) revalidateTag(`venue:${row.slug}`);

    return { ok: true, data: { updatedIds: updated.map((row) => row.id) } };
  } catch (error) {
    return fail(error);
  }
}

/** Admin: resolve a problem report in the queue. */
export async function resolveProblemReport(
  raw: unknown,
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const input = resolveProblemReportSchema.parse(raw);
    await updateProblemReportStatus(input.id, input.status);
    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error);
  }
}

/** Admin: list problem reports (for the queue stub). */
export async function getProblemReportQueue(
  status?: "open" | "dismissed" | "actioned",
) {
  await requireAdmin();
  return listProblemReports(status);
}

/** Admin: pending member photo submissions. */
export async function getPendingVenuePhotoQueue(): Promise<
  PendingVenuePhoto[]
> {
  await requireAdmin();
  return listPendingVenuePhotos();
}

/** Admin: publish or reject a member photo. */
export async function resolveVenuePhoto(raw: unknown): Promise<ActionResult> {
  try {
    await requireAdmin();
    const { photoId, action } = resolveVenuePhotoSchema.parse(raw);
    const photo = await getVenuePhotoById(photoId);
    if (!photo || photo.source !== "member" || photo.status !== "pending") {
      return { ok: false, error: "Photo not found" };
    }

    const venue = await getVenueById(photo.venueId);
    if (!venue) {
      return { ok: false, error: "Venue not found" };
    }

    if (action === "approve") {
      const publishedCount = await countPublishedVenuePhotos(photo.venueId);
      if (!canPublishVenuePhoto(publishedCount)) {
        return {
          ok: false,
          error: `This venue already has ${MAX_VENUE_PHOTOS} photos — remove one before approving.`,
        };
      }
      await publishMemberVenuePhoto(photo.id, photo.venueId);
    } else {
      await rejectMemberVenuePhoto(photo.id);
      await del(photo.url).catch(() => {});
    }

    revalidateVenue(venue.slug);
    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error);
  }
}

/** Admin: hide a rating/review without deleting the row. */
export async function hideRating(raw: unknown): Promise<ActionResult> {
  try {
    await requireAdmin();
    const { ratingId, reason } = removeRatingSchema.parse(raw);
    const rating = await getRatingById(ratingId);
    if (!rating) {
      return { ok: false, error: "Rating not found" };
    }
    const venue = await getVenueById(rating.venueId);
    if (!venue) {
      return { ok: false, error: "Venue not found" };
    }

    await removeRating(ratingId, reason ?? "Removed by a moderator");
    revalidateVenue(venue.slug);
    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error);
  }
}
