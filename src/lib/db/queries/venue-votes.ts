import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";

import { HOT_SPOTS_WINDOW_MS, VOTE_RATE_LIMIT } from "@/config/site";
import { db } from "@/lib/db";
import { venueVotes, venues, type VenueVoteRow } from "@/lib/db/schema";
import { RateLimitError, isOverLimit } from "@/lib/ratelimit";

export type HotSpotRanking = {
  venueId: string;
  slug: string;
  name: string;
  score: number;
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

/** Ranked by net score over a rolling window ("this week" = last 7 days). */
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
    })
    .from(venueVotes)
    .innerJoin(venues, eq(venues.id, venueVotes.venueId))
    .where(
      and(eq(venues.status, "published"), gte(venueVotes.updatedAt, since)),
    )
    .groupBy(venueVotes.venueId, venues.slug, venues.name)
    .orderBy(desc(sql`sum(${venueVotes.value})`))
    .limit(limit);

  return rows.map((row) => ({ ...row, score: Number(row.score) }));
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
