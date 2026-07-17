import { describe, expect, it } from "vitest";

import { MOCK_VENUES } from "@/lib/venue-fixtures";
import {
  EMPTY_VENUE_FILTERS,
  filterVenues,
  parseVenueFilters,
  serializeVenueFilters,
} from "@/lib/venues";

describe("venue query serialization", () => {
  it("round-trips supported filters in a stable order", () => {
    const filters = {
      query: "  rice  ",
      openNow: true,
      cuisines: ["mexican", "halal"] as const,
      zones: ["twelfth", "norris"] as const,
      payments: ["card", "cash"] as const,
    };

    const query = serializeVenueFilters({
      ...filters,
      cuisines: [...filters.cuisines],
      zones: [...filters.zones],
      payments: [...filters.payments],
    });

    expect(query).toBe(
      "q=rice&open=1&cuisine=halal&cuisine=mexican&zone=norris&zone=twelfth&payment=card&payment=cash",
    );
    expect(parseVenueFilters(new URLSearchParams(query))).toEqual({
      query: "rice",
      openNow: true,
      cuisines: ["halal", "mexican"],
      zones: ["norris", "twelfth"],
      payments: ["card", "cash"],
    });
  });

  it("ignores unknown query values", () => {
    expect(
      parseVenueFilters(
        new URLSearchParams("cuisine=pizza&zone=moon&payment=crypto&open=true"),
      ),
    ).toEqual(EMPTY_VENUE_FILTERS);
  });
});

describe("filterVenues", () => {
  it("combines search, cuisine, zone, and payment filters with AND", () => {
    const results = filterVenues(MOCK_VENUES, {
      query: "tacos",
      openNow: false,
      cuisines: ["mexican"],
      zones: ["twelfth"],
      payments: ["cash"],
    });

    expect(results.map((venue) => venue.slug)).toEqual([
      "twelfth-street-tacos",
    ]);
  });

  it("searches cuisine names and excludes retired venues", () => {
    expect(
      filterVenues(MOCK_VENUES, {
        ...EMPTY_VENUE_FILTERS,
        query: "american",
      }).map((venue) => venue.slug),
    ).toEqual(["cherry-cart"]);
  });

  it("excludes venues with unknown hours from open-now", () => {
    const noonTuesday = new Date("2026-07-14T16:00:00.000Z");
    const results = filterVenues(
      MOCK_VENUES,
      { ...EMPTY_VENUE_FILTERS, openNow: true },
      noonTuesday,
    );

    expect(results.some((venue) => venue.slug === "island-bowl")).toBe(false);
    expect(results.some((venue) => venue.slug === "cherry-cart")).toBe(true);
  });
});
