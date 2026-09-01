"use server";

import { put } from "@vercel/blob";
import { revalidateTag } from "next/cache";

import {
  ALLOWED_VENUE_IMAGE_TYPES,
  MAX_VENUE_IMAGE_BYTES,
} from "@/config/site";
import { requireMember } from "@/lib/auth";
import { AuthError } from "@/lib/auth-guards";
import {
  assertMemberPhotoAllowed,
  getVenueById,
  insertMemberVenuePhoto,
} from "@/lib/db/queries";
import { RateLimitError } from "@/lib/ratelimit";

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

/** Member: submit a gallery photo. Stays pending until an admin approves it. */
export async function submitVenuePhoto(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const session = await requireMember();
    const venueId = formData.get("venueId");
    const file = formData.get("file");

    if (typeof venueId !== "string" || !venueId) {
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

    const venue = await getVenueById(venueId);
    if (!venue || venue.status === "draft") {
      return { ok: false, error: "Venue not found" };
    }
    if (venue.status === "retired") {
      return { ok: false, error: "This place has closed — new photos are closed too." };
    }

    await assertMemberPhotoAllowed(session.id);

    const extension = file.type.split("/")[1];
    const blob = await put(
      `venues/${venueId}/member-${session.id}-${Date.now()}.${extension}`,
      file,
      { access: "public", addRandomSuffix: false },
    );

    await insertMemberVenuePhoto({
      venueId,
      userId: session.id,
      url: blob.url,
      alt: `${venue.name} photo from ${session.profile.displayName}`,
    });

    revalidateTag("venues");
    revalidateTag(`venue:${venue.slug}`);
    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error);
  }
}
