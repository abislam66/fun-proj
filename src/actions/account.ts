"use server";

import { revalidateTag } from "next/cache";

import { requireMember } from "@/lib/auth";
import { AuthError } from "@/lib/auth-guards";
import {
  listVenueSlugsRatedByUser,
  updateOwnProfile as persistOwnProfile,
} from "@/lib/db/queries";
import { identityChangeBlocked } from "@/lib/profile";
import { RateLimitError } from "@/lib/ratelimit";
import { updateOwnProfileSchema } from "@/lib/validation";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function fail(error: unknown): ActionResult<never> {
  if (error instanceof AuthError || error instanceof RateLimitError) {
    return { ok: false, error: error.message };
  }
  if (isUniqueViolation(error, "username")) {
    return { ok: false, error: "That username is taken." };
  }
  if (isUniqueViolation(error, "display_name")) {
    return { ok: false, error: "That name is taken." };
  }
  if (error instanceof Error) {
    return { ok: false, error: error.message };
  }
  return { ok: false, error: "Something went wrong" };
}

function isUniqueViolation(error: unknown, column: string): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return false;
  }
  if ((error as { code?: string }).code !== "23505") return false;
  const constraint =
    (error as { constraint_name?: string; constraint?: string })
      .constraint_name ??
    (error as { constraint?: string }).constraint ??
    "";
  const detail = (error as { detail?: string }).detail ?? "";
  return constraint.includes(column) || detail.includes(column);
}

function revalidateReviewedVenues(slugs: string[]) {
  if (slugs.length === 0) return;
  revalidateTag("venues");
  for (const slug of slugs) {
    revalidateTag(`venue:${slug}`);
  }
}

/** Member: update own display name, username, and class year. */
export async function updateOwnProfile(raw: unknown): Promise<ActionResult> {
  try {
    const session = await requireMember();
    const input = updateOwnProfileSchema.parse(raw);
    const current = session.profile;

    const identityChanged =
      input.displayName !== current.displayName ||
      input.username !== current.username;

    if (identityChanged && identityChangeBlocked(current.identityChangedAt)) {
      throw new RateLimitError(
        "You can change your name or username once per day.",
      );
    }

    await persistOwnProfile(session.id, {
      displayName: input.displayName,
      username: input.username,
      graduationYear: input.graduationYear,
      identityChanged,
    });

    if (input.displayName !== current.displayName) {
      const slugs = await listVenueSlugsRatedByUser(session.id);
      revalidateReviewedVenues(slugs);
    }

    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error);
  }
}
