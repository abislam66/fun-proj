import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";

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
 * Every published venue that has been voted on in the rolling window
 * ("this week" = last 7 days), ranked by net score. Venues with no votes
 * don't appear here — for a fixed ballot that always shows every candidate
 * (with "NEW"/0), use `getBallotRanking`.
 */
export async function getWeeklyVenueRanking(
  limit = 20,
): Promise<HotSpotRanking[]> {
  const since = new Date(Date.now() - HOT_SPOTS_WINDOW_MS);
  const rows = await db
    .select({
      venueId: venueVotes.venueId,
      slug: venues.slug,
      name: venues.name,
      score: sql<number>`sum(${venueVotes.value})::int`,
      voteCount: sql<number>`count(*)::int`,
    })
    .from(venueVotes)
    .innerJoin(venues, eq(venues.id, venueVotes.venueId))
    .where(
      and(eq(venues.status, "published"), gte(venueVotes.updatedAt, since)),
    )
    .groupBy(venueVotes.venueId, venues.slug, venues.name)
    .orderBy(desc(sql`sum(${venueVotes.value})`))
    .limit(limit);

  return rows.map((row) => ({
    ...row,
    score: Number(row.score),
    voteCount: Number(row.voteCount),
  }));
}

/**
 * Net score + vote count for a specific set of venues over the rolling
 * window. Missing from the returned maps ⇒ nobody has voted this week
 * (score 0, count 0). The `venue_votes` unique(venue,user) constraint
 * means one row per member per venue, so `count(*)` is distinct voters.
 */
export async function getVoteTalliesForVenues(
  venueIds: string[],
): Promise<Map<string, { score: number; voteCount: number }>> {
  const result = new Map<string, { score: number; voteCount: number }>();
  if (venueIds.length === 0) return result;

  const since = new Date(Date.now() - HOT_SPOTS_WINDOW_MS);
  const rows = await db
    .select({
      venueId: venueVotes.venueId,
      score: sql<number>`sum(${venueVotes.value})::int`,
      voteCount: sql<number>`count(*)::int`,
    })
    .from(venueVotes)
    .where(
      and(
        inArray(venueVotes.venueId, venueIds),
        gte(venueVotes.updatedAt, since),
      ),
    )
    .groupBy(venueVotes.venueId);

  for (const row of rows) {
    result.set(row.venueId, {
      score: Number(row.score),
      voteCount: Number(row.voteCount),
    });
  }
  return result;
}

/**
 * The Hot Spots "ballot" — a fixed, ordered set of candidate venues (the
 * admin-curated `hot_spots` list, or the config fallback), each carried
 * with its live tally so brand-new candidates still render (as "NEW").
 * Sorted by score desc; ties keep the given ballot order (stable sort).
 * Non-published ids are dropped.
 */
export async function getBallotRanking(
  venueIds: string[],
): Promise<HotSpotRanking[]> {
  if (venueIds.length === 0) return [];

  const rows = await db
    .select({ id: venues.id, slug: venues.slug, name: venues.name })
    .from(venues)
    .where(and(inArray(venues.id, venueIds), eq(venues.status, "published")));
  const byId = new Map(rows.map((row) => [row.id, row]));
  const tallies = await getVoteTalliesForVenues(venueIds);

  return venueIds
    .map((id) => byId.get(id))
    .filter((row): row is (typeof rows)[number] => row != null)
    .map((row) => {
      const tally = tallies.get(row.id);
      return {
        venueId: row.id,
        slug: row.slug,
        name: row.name,
        score: tally?.score ?? 0,
        voteCount: tally?.voteCount ?? 0,
      };
    })
    .sort((a, b) => b.score - a.score);
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
