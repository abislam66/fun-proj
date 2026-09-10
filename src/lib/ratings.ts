import {
  MAX_VENUE_PHOTOS,
  PLACES_RATING_PRIOR_WEIGHT,
} from "@/config/site";

export type StudentRatingSummary = {
  average: number;
  count: number;
};

export type VenuePhotoVisibility = {
  status: "pending" | "published" | "rejected";
};

/** One decimal, the public aggregate display. */
export function roundStudentAverage(value: number): number {
  return Math.round(value * 10) / 10;
}

export function studentRatingSummary(
  average: number,
  count: number,
): StudentRatingSummary | null {
  if (count <= 0) return null;
  return { average: roundStudentAverage(average), count };
}

export function formatStudentRating(
  summary: StudentRatingSummary,
  variant: "detail" | "list" = "detail",
): string {
  const stars = summary.average.toFixed(1);
  if (variant === "list") {
    return `${stars} ★ · ${summary.count}`;
  }
  const noun = summary.count === 1 ? "student rating" : "student ratings";
  return `${stars} ★ · ${summary.count} ${noun}`;
}

export type RankableVenue = {
  id: string;
  name: string;
  /** The venue's live student-rating aggregate, or null if never rated. */
  rating: StudentRatingSummary | null;
};

export type RankedPlace = {
  id: string;
  name: string;
  average: number;
  count: number;
  /** Bayesian weighted score used for ordering — not shown to users. */
  score: number;
};

/**
 * Rank venues for "Places of the Week" by a weighted (Bayesian / IMDb)
 * rating, computed only from real student ratings — nothing is invented:
 *
 *   C     = mean star across every real rating on the board (the prior)
 *   score = (n · avg + m · C) / (n + m)
 *
 * where `n`/`avg` are a venue's own rating count/mean and `m` is
 * `priorWeight`. This keeps a single 5★ from outranking a venue with many
 * strong ratings: with few ratings the score is pulled toward the global
 * mean, and only a real body of ratings lets a venue move away from it.
 *
 * Only venues with at least one active rating are returned; a board with
 * no ratings anywhere returns `[]`. Ties break by rating count (more
 * first), then name (A→Z). The caller slices to the display limit.
 */
export function rankPlacesByRating(
  venues: RankableVenue[],
  priorWeight: number = PLACES_RATING_PRIOR_WEIGHT,
): RankedPlace[] {
  const rated = venues.filter(
    (venue): venue is RankableVenue & { rating: StudentRatingSummary } =>
      venue.rating !== null && venue.rating.count > 0,
  );
  if (rated.length === 0) return [];

  const totalCount = rated.reduce((sum, v) => sum + v.rating.count, 0);
  const totalStars = rated.reduce(
    (sum, v) => sum + v.rating.average * v.rating.count,
    0,
  );
  const globalMean = totalStars / totalCount;

  return rated
    .map((venue) => {
      const n = venue.rating.count;
      const score =
        (n * venue.rating.average + priorWeight * globalMean) /
        (n + priorWeight);
      return {
        id: venue.id,
        name: venue.name,
        average: venue.rating.average,
        count: n,
        score,
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.count - a.count ||
        a.name.localeCompare(b.name),
    );
}

export function canPublishVenuePhoto(
  publishedCount: number,
  max: number = MAX_VENUE_PHOTOS,
): boolean {
  return publishedCount < max;
}

export function isPublicVenuePhoto(photo: VenuePhotoVisibility): boolean {
  return photo.status === "published";
}

export function blobBackedPhotoSource(
  source: "legacy" | "admin" | "member",
): boolean {
  return source === "admin" || source === "member";
}
