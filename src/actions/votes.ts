"use server";

import { getUser, requireMember } from "@/lib/auth";
import { AuthError } from "@/lib/auth-guards";
import {
  assertVoteAllowed,
  deleteOwnVote,
  getAllVenuesRanking,
  getUserVoteForVenue,
  getUserVotesForVenues,
  getVenueById,
  upsertVote,
  type HotSpotRanking,
} from "@/lib/db/queries";
import { RateLimitError } from "@/lib/ratelimit";
import { submitVenueVoteSchema } from "@/lib/validation";

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

/**
 * Member: cast, change, or toggle off a +1/-1 vote. Re-tapping the same
 * arrow removes the vote (Yik-Yak-style) rather than re-affirming it.
 * No revalidateTag call — vote counts aren't part of Venue/toVenue's
 * shape, so nothing under the "venues"/"venue:{slug}" tags needs
 * invalidating. See Context/decisions.md for why this deliberately
 * doesn't follow the ratings/photos revalidate-on-write pattern.
 */
export async function submitVenueVote(
  raw: unknown,
): Promise<ActionResult<{ value: 1 | -1 | null }>> {
  try {
    const session = await requireMember();
    const input = submitVenueVoteSchema.parse(raw);
    const venue = await getVenueById(input.venueId);
    if (!venue || venue.status !== "published") {
      return { ok: false, error: "Venue not found" };
    }

    await assertVoteAllowed(session.id);
    const existing = await getUserVoteForVenue(input.venueId, session.id);

    if (existing && existing.value === input.value) {
      await deleteOwnVote(input.venueId, session.id);
      return { ok: true, data: { value: null } };
    }

    await upsertVote({
      venueId: input.venueId,
      userId: session.id,
      value: input.value,
    });
    return { ok: true, data: { value: input.value } };
  } catch (error) {
    return fail(error);
  }
}

export type HotSpotsData = {
  ranking: HotSpotRanking[];
  /** The caller's own votes for the ranked venues — empty when signed out. */
  myVotes: Record<string, 1 | -1>;
};

/**
 * Read-only: this week's Hot Spots board — every published venue, ranked
 * by its live net vote score (see `getAllVenuesRanking`). Fetched on
 * demand when the tab opens. Anonymous visitors can view it (myVotes comes
 * back empty); only submitVenueVote requires a session.
 */
export async function getHotSpotsRanking(): Promise<
  ActionResult<HotSpotsData>
> {
  try {
    const ranking = await getAllVenuesRanking();
    const session = await getUser();
    if (!session) return { ok: true, data: { ranking, myVotes: {} } };

    const votes = await getUserVotesForVenues(
      ranking.map((row) => row.venueId),
      session.id,
    );
    return { ok: true, data: { ranking, myVotes: Object.fromEntries(votes) } };
  } catch (error) {
    return fail(error);
  }
}
