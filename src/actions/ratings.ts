"use server";

import { revalidateTag } from "next/cache";

import { requireMember } from "@/lib/auth";
import { AuthError } from "@/lib/auth-guards";
import {
  assertRatingUpsertAllowed,
  deleteOwnRating,
  getVenueById,
  upsertRating,
} from "@/lib/db/queries";
import { RateLimitError } from "@/lib/ratelimit";
import { deleteRatingSchema, submitRatingSchema } from "@/lib/validation";

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

/** Member: upsert own 1–5 star rating and optional review text. */
export async function submitRating(raw: unknown): Promise<ActionResult> {
  try {
    const session = await requireMember();
    const input = submitRatingSchema.parse(raw);
    const venue = await getVenueById(input.venueId);
    if (!venue || venue.status === "draft") {
      return { ok: false, error: "Venue not found" };
    }
    if (venue.status === "retired") {
      return {
        ok: false,
        error: "This place has closed — new ratings are closed too.",
      };
    }

    await assertRatingUpsertAllowed(session.id);
    await upsertRating({
      venueId: input.venueId,
      userId: session.id,
      stars: input.stars,
      reviewText: input.reviewText,
    });

    revalidateVenue(venue.slug);
    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error);
  }
}

/** Member: delete own rating row entirely. */
export async function deleteRating(raw: unknown): Promise<ActionResult> {
  try {
    const session = await requireMember();
    const { venueId } = deleteRatingSchema.parse(raw);
    const venue = await getVenueById(venueId);
    if (!venue || venue.status === "draft") {
      return { ok: false, error: "Venue not found" };
    }

    const deleted = await deleteOwnRating(venueId, session.id);
    if (!deleted) {
      return { ok: false, error: "No rating to remove" };
    }

    revalidateVenue(venue.slug);
    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error);
  }
}
