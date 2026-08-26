"use server";

import { del, put } from "@vercel/blob";
import { revalidateTag } from "next/cache";

import {
  ALLOWED_VENUE_IMAGE_TYPES,
  MAX_VENUE_IMAGE_BYTES,
  MAX_VENUE_PHOTOS,
} from "@/config/site";
import { requireAdmin } from "@/lib/auth";
import { AuthError } from "@/lib/auth-guards";
import {
  deleteVenuePhotoById,
  getVenueById,
  getVenuePhotoById,
  getVenuePhotosForAdmin,
  insertVenue,
  insertVenuePhoto,
  listProblemReports,
  listSlugsExcept,
  setVenuePhotoOrder,
  updateProblemReportStatus,
  updateVenue,
  type AdminVenuePhoto,
} from "@/lib/db/queries";
import { RateLimitError } from "@/lib/ratelimit";
import { uniqueSlug } from "@/lib/slug";
import {
  reorderVenuePhotosSchema,
  resolveProblemReportSchema,
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

/** Admin: add a photo to a venue's gallery (up to MAX_VENUE_PHOTOS). */
export async function uploadVenuePhoto(
  formData: FormData,
): Promise<ActionResult<{ photo: AdminVenuePhoto }>> {
  try {
    await requireAdmin();
    const id = formData.get("id");
    const file = formData.get("file");

    if (typeof id !== "string" || !id) {
      return { ok: false, error: "Missing venue id" };
    }
    if (!(file instanceof File)) {
      return { ok: false, error: "No image file provided" };
    }
    if (
      !ALLOWED_VENUE_IMAGE_TYPES.includes(
        file.type as (typeof ALLOWED_VENUE_IMAGE_TYPES)[number],
      )
    ) {
      return { ok: false, error: "Image must be JPEG, PNG, or WebP" };
    }
    if (file.size > MAX_VENUE_IMAGE_BYTES) {
      return { ok: false, error: "Image must be under 5 MB" };
    }

    const existing = await getVenueById(id);
    if (!existing) {
      return { ok: false, error: "Venue not found" };
    }

    const currentPhotos = await getVenuePhotosForAdmin(id);
    if (currentPhotos.length >= MAX_VENUE_PHOTOS) {
      return {
        ok: false,
        error: `This venue already has ${MAX_VENUE_PHOTOS} photos — remove one before adding another.`,
      };
    }

    const extension = file.type.split("/")[1];
    const blob = await put(`venues/${id}-${Date.now()}.${extension}`, file, {
      access: "public",
      addRandomSuffix: false,
    });

    const photo = await insertVenuePhoto(id, {
      url: blob.url,
      alt: `${existing.name} photo ${currentPhotos.length + 1}`,
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
    if (photo.source === "admin") {
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
