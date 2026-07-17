"use server";

import { revalidateTag } from "next/cache";

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
