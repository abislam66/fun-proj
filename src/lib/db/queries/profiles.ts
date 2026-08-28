import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { profiles, type ProfileRow } from "@/lib/db/schema";

export async function getProfileById(id: string): Promise<ProfileRow | null> {
  const [row] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, id))
    .limit(1);
  return row ?? null;
}

/** Every taken display name — the project's scale (hundreds of accounts) makes a full set cheap, same tradeoff as listSlugsExcept(). */
export async function listDisplayNames(): Promise<Set<string>> {
  const rows = await db
    .select({ displayName: profiles.displayName })
    .from(profiles);
  return new Set(rows.map((row) => row.displayName));
}

/**
 * Always inserts with role: "member" — there is no code path from a Google
 * sign-in to any other role. Returns null if a concurrent request already
 * created this row (harmless; the caller only needed it to exist).
 */
export async function insertMemberProfile(
  id: string,
  displayName: string,
): Promise<ProfileRow | null> {
  const [row] = await db
    .insert(profiles)
    .values({ id, displayName, role: "member" })
    .onConflictDoNothing()
    .returning();
  return row ?? null;
}
