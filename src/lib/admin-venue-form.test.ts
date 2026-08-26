import { describe, expect, it } from "vitest";

import { EMPTY_VENUE_DRAFT, zoneMismatchWarning } from "@/lib/admin-venue-form";

// Verified via mapZoneContaining directly against config/map-zones.ts's
// student-center polygon (an irregular hexagon — not a simple bbox, so
// these are real ring midpoints, not guessed coordinates).
const INSIDE_STUDENT_CENTER = { lat: "39.97953", lng: "-75.1555" };
const OUTSIDE_EVERY_ZONE = { lat: "39.985", lng: "-75.16" };

describe("zoneMismatchWarning", () => {
  it("returns null when the selected zone matches the coordinates", () => {
    expect(
      zoneMismatchWarning({
        ...EMPTY_VENUE_DRAFT,
        mapZone: "student-center",
        ...INSIDE_STUDENT_CENTER,
      }),
    ).toBeNull();
  });

  it("warns when a real zone is picked but coordinates land outside it", () => {
    const warning = zoneMismatchWarning({
      ...EMPTY_VENUE_DRAFT,
      mapZone: "student-center",
      ...OUTSIDE_EVERY_ZONE,
    });
    expect(warning).toMatch(/Student Center/);
    expect(warning).toMatch(/outside every mapped zone/);
  });

  it("warns the other direction: 'Other' picked but coordinates land inside a real zone", () => {
    const warning = zoneMismatchWarning({
      ...EMPTY_VENUE_DRAFT,
      mapZone: "other",
      ...INSIDE_STUDENT_CENTER,
    });
    expect(warning).toMatch(/Student Center/);
    expect(warning).toMatch(/"Other"/);
  });

  it("returns null when 'Other' is picked and coordinates are genuinely outside every zone", () => {
    expect(
      zoneMismatchWarning({
        ...EMPTY_VENUE_DRAFT,
        mapZone: "other",
        ...OUTSIDE_EVERY_ZONE,
      }),
    ).toBeNull();
  });

  it("returns null before a zone has been picked yet, even with coordinates set", () => {
    expect(
      zoneMismatchWarning({
        ...EMPTY_VENUE_DRAFT,
        mapZone: "",
        ...OUTSIDE_EVERY_ZONE,
      }),
    ).toBeNull();
  });

  it("returns null while lat/lng are still blank", () => {
    expect(
      zoneMismatchWarning({
        ...EMPTY_VENUE_DRAFT,
        mapZone: "student-center",
        lat: "",
        lng: "",
      }),
    ).toBeNull();
  });
});
