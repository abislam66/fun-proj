import { describe, expect, it } from "vitest";

import { MAX_VENUE_PHOTOS } from "@/config/site";
import {
  blobBackedPhotoSource,
  canPublishVenuePhoto,
  formatStudentRating,
  isPublicVenuePhoto,
  rankPlacesByRating,
  roundStudentAverage,
  studentRatingSummary,
} from "@/lib/ratings";

describe("studentRatingSummary", () => {
  it("returns null when there are no ratings", () => {
    expect(studentRatingSummary(0, 0)).toBeNull();
  });

  it("rounds the average to one decimal", () => {
    expect(studentRatingSummary(4.66, 3)).toEqual({ average: 4.7, count: 3 });
  });
});

describe("formatStudentRating", () => {
  it("labels the detail aggregate as student ratings", () => {
    expect(formatStudentRating({ average: 4.6, count: 12 })).toBe(
      "4.6 ★ · 12 student ratings",
    );
    expect(formatStudentRating({ average: 5, count: 1 })).toBe(
      "5.0 ★ · 1 student rating",
    );
  });

  it("uses a compact list label", () => {
    expect(formatStudentRating({ average: 4.6, count: 12 }, "list")).toBe(
      "4.6 ★ · 12",
    );
  });
});

describe("rankPlacesByRating", () => {
  const rating = (average: number, count: number) => ({ average, count });

  it("returns nothing when no venue has a rating", () => {
    expect(
      rankPlacesByRating([
        { id: "a", name: "A", rating: null },
        { id: "b", name: "B", rating: rating(0, 0) },
      ]),
    ).toEqual([]);
  });

  it("keeps a lone 5-star from outranking a well-reviewed venue", () => {
    const ranked = rankPlacesByRating([
      { id: "lone", name: "Lone Five", rating: rating(5, 1) },
      { id: "solid", name: "Crowd Favorite", rating: rating(4.6, 40) },
      { id: "mid", name: "Middle", rating: rating(3.8, 10) },
    ]);
    expect(ranked.map((r) => r.id)).toEqual(["solid", "lone", "mid"]);
    // The single 5★ is pulled toward the ~4.4 global mean, under 4.6.
    expect(ranked.find((r) => r.id === "lone")!.score).toBeLessThan(4.6);
  });

  it("only ranks venues that actually have ratings", () => {
    const ranked = rankPlacesByRating([
      { id: "rated", name: "Rated", rating: rating(4.2, 6) },
      { id: "unrated", name: "Unrated", rating: null },
    ]);
    expect(ranked.map((r) => r.id)).toEqual(["rated"]);
  });

  it("breaks ties by rating count, then name", () => {
    // Identical averages equal to the global mean → identical scores.
    const ranked = rankPlacesByRating([
      { id: "few", name: "Zeta", rating: rating(4, 3) },
      { id: "many", name: "Alpha", rating: rating(4, 9) },
      { id: "also-few", name: "Beta", rating: rating(4, 3) },
    ]);
    expect(ranked.map((r) => r.id)).toEqual(["many", "also-few", "few"]);
  });

  it("a heavier prior pulls a thin-sample venue's score toward the mean", () => {
    const venues = [
      { id: "thin", name: "Thin", rating: rating(5, 2) },
      { id: "anchor", name: "Anchor", rating: rating(3.5, 40) },
    ];
    const scoreOf = (m: number) =>
      rankPlacesByRating(venues, m).find((r) => r.id === "thin")!.score;
    // "thin" sits above the global mean, so a heavier prior can only drag
    // its score down toward that mean.
    expect(scoreOf(1)).toBeGreaterThan(scoreOf(20));
  });
});

describe("roundStudentAverage", () => {
  it("rounds half up at one decimal", () => {
    expect(roundStudentAverage(4.65)).toBe(4.7);
  });
});

describe("canPublishVenuePhoto", () => {
  it("allows approve under the published cap", () => {
    expect(canPublishVenuePhoto(9)).toBe(true);
    expect(canPublishVenuePhoto(MAX_VENUE_PHOTOS)).toBe(false);
    expect(canPublishVenuePhoto(11)).toBe(false);
  });
});

describe("isPublicVenuePhoto", () => {
  it("only published photos appear on the public gallery", () => {
    expect(isPublicVenuePhoto({ status: "published" })).toBe(true);
    expect(isPublicVenuePhoto({ status: "pending" })).toBe(false);
    expect(isPublicVenuePhoto({ status: "rejected" })).toBe(false);
  });
});

describe("blobBackedPhotoSource", () => {
  it("deletes blobs for admin and member photos, never legacy", () => {
    expect(blobBackedPhotoSource("admin")).toBe(true);
    expect(blobBackedPhotoSource("member")).toBe(true);
    expect(blobBackedPhotoSource("legacy")).toBe(false);
  });
});
