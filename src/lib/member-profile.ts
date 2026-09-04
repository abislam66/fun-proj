import type { User } from "@supabase/supabase-js";

import {
  MAX_DISPLAY_NAME_LENGTH,
  MIN_DISPLAY_NAME_LENGTH,
} from "@/config/site";
import {
  getProfileById,
  insertMemberProfile,
  listDisplayNames,
  listUsernames,
} from "@/lib/db/queries";
import { pickUsername } from "@/lib/username";

function baseDisplayName(user: User): string {
  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  const raw =
    (typeof metadata?.full_name === "string" ? metadata.full_name : null) ??
    (typeof metadata?.name === "string" ? metadata.name : null) ??
    user.email?.split("@")[0] ??
    "Owl";

  const cleaned = raw
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .trim()
    .slice(0, MAX_DISPLAY_NAME_LENGTH);

  return cleaned.length >= MIN_DISPLAY_NAME_LENGTH ? cleaned : "Owl";
}

/**
 * Pure collision-avoidance, mirroring uniqueSlug()'s `base` → `base-2` →
 * `base-3` pattern (lib/slug.ts) but for display names, which have no
 * separator convention of their own (`Alex`, `Alex2`, `Alex3`, ...).
 */
export function pickDisplayName(
  user: User,
  existingNames: ReadonlySet<string>,
): string {
  const base = baseDisplayName(user);
  if (!existingNames.has(base)) {
    return base;
  }

  for (let n = 2; n < 1000; n++) {
    const suffix = String(n);
    const candidate = `${base.slice(0, MAX_DISPLAY_NAME_LENGTH - suffix.length)}${suffix}`;
    if (!existingNames.has(candidate)) {
      return candidate;
    }
  }

  // Astronomically unlikely at this project's scale — the user id is
  // guaranteed unique regardless of how many collisions came before it.
  return `owl-${user.id.slice(0, 8)}`;
}

/**
 * Google sign-in creates a Supabase auth.users row automatically but never a
 * profiles row — that only happens here, and always with role: "member".
 * requireAdmin() only ever grants access via a profiles row set to "admin"
 * through direct DB access (Specs/auth-security.md), so this path can never
 * produce an admin account no matter what a Google account looks like.
 */
export async function ensureMemberProfile(user: User): Promise<void> {
  const existing = await getProfileById(user.id);
  if (existing) return;

  const [existingNames, existingUsernames] = await Promise.all([
    listDisplayNames(),
    listUsernames(),
  ]);
  const displayName = pickDisplayName(user, existingNames);
  const username = pickUsername(displayName, existingUsernames, user.id);
  await insertMemberProfile(user.id, displayName, username);
}
