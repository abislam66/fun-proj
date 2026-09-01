import { describe, expect, it } from "vitest";

import {
  deleteRatingSchema,
  removeRatingSchema,
  resolveVenuePhotoSchema,
  submitRatingSchema,
} from "@/lib/validation";

const venueId = "00000000-0000-4000-8000-000000000099";

describe("submitRatingSchema", () => {
  it("accepts a rating with optional review text", () => {
    expect(
      submitRatingSchema.parse({
        venueId,
        stars: 5,
        reviewText: "Get the gyro.",
      }),
    ).toEqual({
      venueId,
      stars: 5,
      reviewText: "Get the gyro.",
    });
  });

  it("treats blank review text as null", () => {
    expect(
      submitRatingSchema.parse({ venueId, stars: 3, reviewText: "   " }),
    ).toEqual({ venueId, stars: 3, reviewText: null });
  });

  it("rejects stars outside 1–5 and overlong reviews", () => {
    expect(() => submitRatingSchema.parse({ venueId, stars: 0 })).toThrow();
    expect(() => submitRatingSchema.parse({ venueId, stars: 6 })).toThrow();
    expect(() =>
      submitRatingSchema.parse({
        venueId,
        stars: 4,
        reviewText: "x".repeat(1001),
      }),
    ).toThrow();
  });

  it("rejects unknown keys", () => {
    expect(() =>
      submitRatingSchema.parse({ venueId, stars: 4, extra: true }),
    ).toThrow();
  });
});

describe("deleteRatingSchema / moderation schemas", () => {
  it("accepts a venue id for author delete", () => {
    expect(deleteRatingSchema.parse({ venueId })).toEqual({ venueId });
  });

  it("accepts approve/reject for a photo", () => {
    const photoId = "00000000-0000-4000-8000-000000000012";
    expect(
      resolveVenuePhotoSchema.parse({ photoId, action: "approve" }),
    ).toEqual({ photoId, action: "approve" });
  });

  it("accepts an optional hide reason", () => {
    const ratingId = "00000000-0000-4000-8000-000000000013";
    expect(removeRatingSchema.parse({ ratingId })).toEqual({ ratingId });
  });
});
