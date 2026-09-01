import { describe, expect, it } from "vitest";

import { MAX_VENUE_PHOTOS } from "@/config/site";
import {
  blobBackedPhotoSource,
  canPublishVenuePhoto,
  formatStudentRating,
  isPublicVenuePhoto,
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
