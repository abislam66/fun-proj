import { describe, expect, it } from "vitest";

import { getMockVenueBySlug, MOCK_VENUES } from "@/lib/venue-fixtures";
import {
  EMPTY_VENUE_FILTERS,
  filterVenues,
  OTHER_MAP_ZONE,
  parseVenueFilters,
  serializeVenueFilters,
  venueLocationText,
  type Venue,
} from "@/lib/venues";

describe("venueLocationText", () => {
  const truck = getMockVenueBySlug("cherry-cart")!; // mapZone tyler-trucks, building set

  it("prefixes a truck's known landmark with 'Near'", () => {
    expect(venueLocationText(truck)).toEqual({
      text: "Near Engineering Building",
      approximate: true,
    });
  });

  it("states a fixed venue's known landmark plainly, no 'Near'", () => {
    const restaurant: Venue = {
      ...truck,
      type: "restaurant",
      building: "1703 Cecil B Moore Ave",
    };
    expect(venueLocationText(restaurant)).toEqual({
      text: "1703 Cecil B Moore Ave",
      approximate: false,
    });
  });

  it("appends floor for an indoor campus venue with one recorded", () => {
    const foodCourtStall: Venue = {
      ...truck,
      type: "restaurant",
      building: "Howard Gittis Student Center",
      floor: "2",
    };
    expect(venueLocationText(foodCourtStall)).toEqual({
      text: "Howard Gittis Student Center, Floor 2",
      approximate: false,
    });
  });

  it("falls back to a real zone label when no building is known", () => {
    const noBuilding: Venue = { ...truck, building: null };
    expect(venueLocationText(noBuilding)).toEqual({
      text: "Near Tyler trucks",
      approximate: true,
    });
  });

  it("never surfaces the 'other' map zone as if it were a real place", () => {
    const catchAllZone: Venue = {
      ...truck,
      building: null,
      mapZone: OTHER_MAP_ZONE,
    };
    expect(venueLocationText(catchAllZone)).toEqual({
      text: "Near Temple Main Campus",
      approximate: true,
    });
  });

  it("degrades gracefully for a fixed venue with no location data at all", () => {
    const noData: Venue = {
      ...truck,
      type: "restaurant",
      building: null,
      mapZone: null,
    };
    expect(venueLocationText(noData)).toEqual({
      text: "Location not yet added",
      approximate: false,
    });
  });
});

describe("venue query serialization", () => {
  it("round-trips supported filters in a stable order", () => {
    const filters = {
      query: "  rice  ",
      openNow: true,
      cuisines: ["mexican", "halal"] as const,
      zones: ["student-center", "serc-trucks"] as const,
    };

    const query = serializeVenueFilters({
      ...filters,
      cuisines: [...filters.cuisines],
      zones: [...filters.zones],
    });

    expect(query).toBe(
      "q=rice&open=1&cuisine=halal&cuisine=mexican&zone=serc-trucks&zone=student-center",
    );
    expect(parseVenueFilters(new URLSearchParams(query))).toEqual({
      query: "rice",
      openNow: true,
      cuisines: ["halal", "mexican"],
      zones: ["serc-trucks", "student-center"],
    });
  });

  it("ignores unknown query values", () => {
    // `payment` was a real param until 2026-08-25 — now just another
    // ignored leftover in old bookmarked URLs.
    expect(
      parseVenueFilters(
        new URLSearchParams("cuisine=pizza&zone=moon&payment=card&open=true"),
      ),
    ).toEqual(EMPTY_VENUE_FILTERS);
  });
});

describe("filterVenues", () => {
  it("combines search, cuisine, and zone filters with AND", () => {
    // Zone filtering is spatial (point-in-polygon against map zones), not
    // venue.zoneKey: the tacos fixture sits on 12th St inside serc-trucks.
    const results = filterVenues(MOCK_VENUES, {
      query: "tacos",
      openNow: false,
      cuisines: ["mexican"],
      zones: ["serc-trucks"],
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
