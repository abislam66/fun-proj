import { describe, expect, it } from "vitest";

import {
  EMPTY_MOCK_VENUE,
  INITIAL_ADMIN_STATE,
  saveMockVenue,
  setMockReportStatus,
  setMockVenueStatus,
  slugifyMockVenue,
  validateMockVenue,
  verifyMockVenue,
} from "@/lib/admin-mock";

describe("mock admin venue logic", () => {
  it("validates publish-only requirements and campus coordinates", () => {
    const errors = validateMockVenue(
      {
        ...EMPTY_MOCK_VENUE,
        name: "Test truck",
        lat: "0",
        lng: "not-a-number",
      },
      true,
    );

    expect(errors).toMatchObject({
      lat: expect.any(String),
      lng: expect.any(String),
      zoneKey: expect.any(String),
      cuisines: expect.any(String),
    });
  });

  it("rejects equal opening and closing times", () => {
    const errors = validateMockVenue({
      ...EMPTY_MOCK_VENUE,
      name: "Late Cart",
      hoursKnown: true,
      hours: { mon: [{ open: "11:00", close: "11:00" }] },
    });

    expect(errors.hours).toBeDefined();
  });

  it("creates stable unique slugs without mutating prior state", () => {
    expect(slugifyMockVenue("  Café @ Temple  ")).toBe("cafe-temple");

    const { state, venue } = saveMockVenue(
      INITIAL_ADMIN_STATE,
      {
        ...EMPTY_MOCK_VENUE,
        name: "Cherry Cart",
        zoneKey: "norris",
        cuisines: ["american"],
      },
      new Date("2026-07-17T12:00:00.000Z"),
    );

    expect(venue.slug).toBe("cherry-cart-2");
    expect(state.venues).toHaveLength(INITIAL_ADMIN_STATE.venues.length + 1);
    expect(INITIAL_ADMIN_STATE.venues).toHaveLength(4);
  });

  it("handles venue and report state transitions", () => {
    const published = setMockVenueStatus(
      INITIAL_ADMIN_STATE,
      "venue-island-bowl",
      "published",
    );
    const verified = verifyMockVenue(
      published,
      "venue-island-bowl",
      new Date("2026-07-17T14:00:00.000Z"),
    );
    const actioned = setMockReportStatus(verified, "report-2", "actioned");

    expect(
      actioned.venues.find((venue) => venue.id === "venue-island-bowl"),
    ).toMatchObject({
      status: "published",
      lastVerifiedAt: "2026-07-17T14:00:00.000Z",
    });
    expect(
      actioned.reports.find((report) => report.id === "report-2")?.status,
    ).toBe("actioned");
  });
});
