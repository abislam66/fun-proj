"use server";

import { headers } from "next/headers";

import { AuthError } from "@/lib/auth-guards";
import { getVenueById, insertProblemReport } from "@/lib/db/queries";
import { hashIp } from "@/lib/ip-hash";
import { assertProblemReportAllowed, RateLimitError } from "@/lib/ratelimit";
import { reportProblemSchema } from "@/lib/validation";

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

/** Anonymous: report a data problem on a venue (rate-limited + honeypot). */
export async function reportProblem(raw: unknown): Promise<ActionResult> {
  try {
    const input = reportProblemSchema.parse(raw);

    const venue = await getVenueById(input.venueId);
    if (!venue || venue.status === "draft") {
      return { ok: false, error: "Venue not found" };
    }

    const headerStore = await headers();
    const forwarded = headerStore.get("x-forwarded-for");
    const ip =
      forwarded?.split(",")[0]?.trim() ||
      headerStore.get("x-real-ip") ||
      "0.0.0.0";
    const ipHash = hashIp(ip);

    await assertProblemReportAllowed(ipHash);

    await insertProblemReport({
      venueId: input.venueId,
      kind: input.kind,
      note: input.note ?? null,
      ipHash,
    });

    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error);
  }
}
