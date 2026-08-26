"use server";

import { del, put } from "@vercel/blob";
import { revalidateTag } from "next/cache";

import {
  ALLOWED_VENUE_IMAGE_TYPES,
  MAX_VENUE_IMAGE_BYTES,
} from "@/config/site";
import { requireAdmin } from "@/lib/auth";
import { AuthError } from "@/lib/auth-guards";
import {
  getVenueById,
  insertVenue,
  listProblemReports,
  listSlugsExcept,
  updateProblemReportStatus,
  updateVenue,
} from "@/lib/db/queries";
import { RateLimitError } from "@/lib/ratelimit";
import { uniqueSlug } from "@/lib/slug";
import {
  resolveProblemReportSchema,
  venueIdSchema,
  venueInputSchema,
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
        zoneKey: input.zoneKey ?? null,
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
      zoneKey: input.zoneKey ?? null,
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

/** Admin: upload/replace a venue's photo. Old blob is deleted once the new one is saved. */
export async function uploadVenueImage(
  formData: FormData,
): Promise<ActionResult<{ imageUrl: string }>> {
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

    const extension = file.type.split("/")[1];
    const blob = await put(`venues/${id}-${Date.now()}.${extension}`, file, {
      access: "public",
      addRandomSuffix: false,
    });

    const updated = await updateVenue(id, { imageUrl: blob.url });

    if (existing.imageUrl && existing.imageUrl !== blob.url) {
      await del(existing.imageUrl).catch(() => {});
    }

    revalidateVenue(updated.slug);
    return { ok: true, data: { imageUrl: blob.url } };
  } catch (error) {
    return fail(error);
  }
}

/** Admin: remove a venue's photo. */
export async function removeVenueImage(raw: unknown): Promise<ActionResult> {
  try {
    await requireAdmin();
    const { id } = venueIdSchema.parse(raw);
    const existing = await getVenueById(id);
    if (!existing) {
      return { ok: false, error: "Venue not found" };
    }
    if (!existing.imageUrl) {
      return { ok: true, data: undefined };
    }

    const updated = await updateVenue(id, { imageUrl: null });
    await del(existing.imageUrl).catch(() => {});

    revalidateVenue(updated.slug);
    return { ok: true, data: undefined };
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
