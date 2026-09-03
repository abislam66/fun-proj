import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

import {
  ALLOWED_VENUE_IMAGE_TYPES,
  MAX_VENUE_IMAGE_BYTES,
  MAX_VENUE_PHOTOS,
} from "@/config/site";
import { requireAdmin } from "@/lib/auth";
import { AuthError } from "@/lib/auth-guards";
import { countPublishedVenuePhotos, getVenueById } from "@/lib/db/queries";

/**
 * Second deliberate exception to "no custom route handlers" (see
 * src/app/auth/callback/route.ts and Context/decisions.md) — Vercel Blob's
 * client-direct-upload protocol has no server-action equivalent either:
 * the browser's `upload()` helper POSTs a fixed JSON RPC body here to
 * exchange for a short-lived, scoped token, then PUTs the file bytes
 * straight to Blob storage. That's the fix for admin photo uploads being
 * slow — previously every photo crossed the network twice (browser ->
 * this app's server -> Blob) because the upload ran through a server
 * action's `put()` call.
 *
 * Authorization and validation still happen here, server-side, before any
 * token is issued — this route never receives or forwards a file, and it
 * never touches the database. The DB write happens after, through the
 * normal `finalizeVenuePhotoUpload` server action once the client's
 * direct upload resolves.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayloadRaw) => {
        await requireAdmin();

        let venueId: string | undefined;
        try {
          venueId = clientPayloadRaw
            ? (JSON.parse(clientPayloadRaw) as { venueId?: string }).venueId
            : undefined;
        } catch {
          venueId = undefined;
        }
        if (!venueId) {
          throw new Error("Missing venue id");
        }

        const venue = await getVenueById(venueId);
        if (!venue) {
          throw new Error("Venue not found");
        }

        const currentCount = await countPublishedVenuePhotos(venueId);
        if (currentCount >= MAX_VENUE_PHOTOS) {
          throw new Error(
            `This venue already has ${MAX_VENUE_PHOTOS} photos — remove one before adding another.`,
          );
        }

        return {
          allowedContentTypes: [...ALLOWED_VENUE_IMAGE_TYPES],
          maximumSizeInBytes: MAX_VENUE_IMAGE_BYTES,
          addRandomSuffix: false,
        };
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    const status = error instanceof AuthError ? 403 : 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status },
    );
  }
}
