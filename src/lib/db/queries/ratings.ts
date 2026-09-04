import { and, count, desc, eq, gte, inArray, sql } from "drizzle-orm";

import { RATING_UPSERT_RATE_LIMIT } from "@/config/site";
import { db } from "@/lib/db";
import { profiles, ratings, venues, type RatingRow } from "@/lib/db/schema";
import { studentRatingSummary, type StudentRatingSummary } from "@/lib/ratings";
import { RateLimitError, isOverLimit } from "@/lib/ratelimit";

export type VenueReview = {
  id: string;
  userId: string;
  stars: number;
  reviewText: string | null;
  status: RatingRow["status"];
  removedReason: string | null;
  displayName: string;
  createdAt: Date;
  updatedAt: Date;
};

export type MemberReview = {
  id: string;
  venueId: string;
  venueSlug: string;
  venueName: string;
  venueStatus: "draft" | "published" | "retired";
  stars: number;
  reviewText: string | null;
  status: RatingRow["status"];
  removedReason: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function getRatingAggregatesByVenueIds(
  venueIds: string[],
): Promise<Map<string, StudentRatingSummary>> {
  const summaries = new Map<string, StudentRatingSummary>();
  if (venueIds.length === 0) return summaries;

  const rows = await db
    .select({
      venueId: ratings.venueId,
      average: sql<number>`avg(${ratings.stars})::float`,
      count: count(),
    })
    .from(ratings)
    .where(
      and(eq(ratings.status, "active"), inArray(ratings.venueId, venueIds)),
    )
    .groupBy(ratings.venueId);

  for (const row of rows) {
    const summary = studentRatingSummary(
      Number(row.average),
      Number(row.count),
    );
    if (summary) summaries.set(row.venueId, summary);
  }
  return summaries;
}

export async function getVenueRatingAggregate(
  venueId: string,
): Promise<StudentRatingSummary | null> {
  const [row] = await db
    .select({
      average: sql<number>`avg(${ratings.stars})::float`,
      count: count(),
    })
    .from(ratings)
    .where(and(eq(ratings.venueId, venueId), eq(ratings.status, "active")));

  return studentRatingSummary(
    Number(row?.average ?? 0),
    Number(row?.count ?? 0),
  );
}

export async function listVenueReviews(
  venueId: string,
): Promise<VenueReview[]> {
  const rows = await db
    .select({
      id: ratings.id,
      userId: ratings.userId,
      stars: ratings.stars,
      reviewText: ratings.reviewText,
      status: ratings.status,
      removedReason: ratings.removedReason,
      displayName: profiles.displayName,
      createdAt: ratings.createdAt,
      updatedAt: ratings.updatedAt,
    })
    .from(ratings)
    .innerJoin(profiles, eq(profiles.id, ratings.userId))
    .where(eq(ratings.venueId, venueId))
    .orderBy(desc(ratings.createdAt));

  return rows.map((row) => ({
    ...row,
    stars: Number(row.stars),
  }));
}

/** Every rating this user has ever submitted, including removed and star-only. */
export async function listRatingsForUser(
  userId: string,
): Promise<MemberReview[]> {
  const rows = await db
    .select({
      id: ratings.id,
      venueId: ratings.venueId,
      venueSlug: venues.slug,
      venueName: venues.name,
      venueStatus: venues.status,
      stars: ratings.stars,
      reviewText: ratings.reviewText,
      status: ratings.status,
      removedReason: ratings.removedReason,
      createdAt: ratings.createdAt,
      updatedAt: ratings.updatedAt,
    })
    .from(ratings)
    .innerJoin(venues, eq(venues.id, ratings.venueId))
    .where(eq(ratings.userId, userId))
    .orderBy(desc(ratings.updatedAt));

  return rows.map((row) => ({
    ...row,
    stars: Number(row.stars),
  }));
}

export async function listVenueSlugsRatedByUser(
  userId: string,
): Promise<string[]> {
  const rows = await db
    .select({ slug: venues.slug })
    .from(ratings)
    .innerJoin(venues, eq(venues.id, ratings.venueId))
    .where(eq(ratings.userId, userId));
  return rows.map((row) => row.slug);
}

export async function getUserRatingForVenue(
  venueId: string,
  userId: string,
): Promise<RatingRow | null> {
  const [row] = await db
    .select()
    .from(ratings)
    .where(and(eq(ratings.venueId, venueId), eq(ratings.userId, userId)))
    .limit(1);
  return row ?? null;
}

export async function assertRatingUpsertAllowed(userId: string): Promise<void> {
  const since = new Date(Date.now() - RATING_UPSERT_RATE_LIMIT.windowMs);
  const [row] = await db
    .select({ total: count() })
    .from(ratings)
    .where(and(eq(ratings.userId, userId), gte(ratings.updatedAt, since)));

  if (isOverLimit(row?.total ?? 0, RATING_UPSERT_RATE_LIMIT.max)) {
    throw new RateLimitError("Too many ratings today. Try again tomorrow.");
  }
}

export async function upsertRating(values: {
  venueId: string;
  userId: string;
  stars: number;
  reviewText: string | null;
}): Promise<RatingRow> {
  const now = new Date();
  const [row] = await db
    .insert(ratings)
    .values({
      venueId: values.venueId,
      userId: values.userId,
      stars: values.stars,
      reviewText: values.reviewText,
      status: "active",
      removedReason: null,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [ratings.venueId, ratings.userId],
      set: {
        stars: values.stars,
        reviewText: values.reviewText,
        status: "active",
        removedReason: null,
        updatedAt: now,
      },
    })
    .returning();
  if (!row) throw new Error("Failed to save rating");
  return row;
}

export async function deleteOwnRating(
  venueId: string,
  userId: string,
): Promise<RatingRow | null> {
  const [row] = await db
    .delete(ratings)
    .where(and(eq(ratings.venueId, venueId), eq(ratings.userId, userId)))
    .returning();
  return row ?? null;
}

export async function getRatingById(id: string): Promise<RatingRow | null> {
  const [row] = await db
    .select()
    .from(ratings)
    .where(eq(ratings.id, id))
    .limit(1);
  return row ?? null;
}

export async function removeRating(
  id: string,
  reason: string | null,
): Promise<RatingRow> {
  const [row] = await db
    .update(ratings)
    .set({
      status: "removed",
      removedReason: reason,
      updatedAt: new Date(),
    })
    .where(eq(ratings.id, id))
    .returning();
  if (!row) throw new Error("Rating not found");
  return row;
}
