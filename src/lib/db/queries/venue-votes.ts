import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";

import { HOT_SPOTS_WINDOW_MS, VOTE_RATE_LIMIT } from "@/config/site";
import { db } from "@/lib/db";
import { venueVotes, venues, type VenueVoteRow } from "@/lib/db/schema";
import { RateLimitError, isOverLimit } from "@/lib/ratelimit";

export type HotSpotRanking = {
  venueId: string;
  slug: string;
  name: string;
  /** Net of up/down votes in the rolling window; 0 for an unvoted venue. */
  score: number;
  /** How many members voted (either way) in the window — 0 ⇒ show "NEW". */
  voteCount: number;
};

export async function getUserVoteForVenue(
  venueId: string,
  userId: string,
): Promise<VenueVoteRow | null> {
  const [row] = await db
    .select()
    .from(venueVotes)
    .where(and(eq(venueVotes.venueId, venueId), eq(venueVotes.userId, userId)))
    .limit(1);
  return row ?? null;
}

export async function assertVoteAllowed(userId: string): Promise<void> {
  const since = new Date(Date.now() - VOTE_RATE_LIMIT.windowMs);
  const [row] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(venueVotes)
    .where(
      and(eq(venueVotes.userId, userId), gte(venueVotes.updatedAt, since)),
    );

  if (isOverLimit(row?.total ?? 0, VOTE_RATE_LIMIT.max)) {
    throw new RateLimitError("Too many votes today. Try again tomorrow.");
  }
}

export async function upsertVote(values: {
  venueId: string;
  userId: string;
  value: 1 | -1;
}): Promise<VenueVoteRow> {
  const now = new Date();
  const [row] = await db
    .insert(venueVotes)
    .values({
      venueId: values.venueId,
      userId: values.userId,
      value: values.value,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [venueVotes.venueId, venueVotes.userId],
      set: { value: values.value, updatedAt: now },
    })
    .returning();
  if (!row) throw new Error("Failed to save vote");
  return row;
}

export async function deleteOwnVote(
  venueId: string,
  userId: string,
): Promise<VenueVoteRow | null> {
  const [row] = await db
    .delete(venueVotes)
    .where(and(eq(venueVotes.venueId, venueId), eq(venueVotes.userId, userId)))
    .returning();
  return row ?? null;
}

/**
 * The whole Hot Spots board: every published venue, ranked by its live
 * net vote score over the rolling "this week" window (highest first,
 * name A→Z on ties). A venue nobody has voted on this week comes back
 * with score 0 / voteCount 0 — the panel renders that as "NEW". There
 * is no ballot; every venue competes. `count(venue_votes.id)` counts
 * only matched rows, and the unique(venue,user) constraint means one
 * row per member per venue, so it's the distinct-voter count.
 */
export async function getAllVenuesRanking(): Promise<HotSpotRanking[]> {
  const since = new Date(Date.now() - HOT_SPOTS_WINDOW_MS);
  const netScore = sql<number>`coalesce(sum(${venueVotes.value}), 0)`;

  const rows = await db
    .select({
      venueId: venues.id,
      slug: venues.slug,
      name: venues.name,
      score: sql<number>`${netScore}::int`,
      voteCount: sql<number>`count(${venueVotes.id})::int`,
    })
    .from(venues)
    .leftJoin(
      venueVotes,
      and(eq(venueVotes.venueId, venues.id), gte(venueVotes.updatedAt, since)),
    )
    .where(eq(venues.status, "published"))
    .groupBy(venues.id, venues.slug, venues.name)
    .orderBy(desc(netScore), asc(venues.name));

  return rows.map((row) => ({
    venueId: row.venueId,
    slug: row.slug,
    name: row.name,
    score: Number(row.score),
    voteCount: Number(row.voteCount),
  }));
}

/** This user's own votes for a batch of venues — keyed by venueId. */
export async function getUserVotesForVenues(
  venueIds: string[],
  userId: string,
): Promise<Map<string, 1 | -1>> {
  const result = new Map<string, 1 | -1>();
  if (venueIds.length === 0) return result;

  const rows = await db
    .select({ venueId: venueVotes.venueId, value: venueVotes.value })
    .from(venueVotes)
    .where(
      and(eq(venueVotes.userId, userId), inArray(venueVotes.venueId, venueIds)),
    );

  for (const row of rows) {
    result.set(row.venueId, row.value as 1 | -1);
  }
  return result;
}
