import { describe, expect, it } from "vitest";

import {
  adminVenueZoneLabel,
  adminVenueZoneSortIndex,
  filterAndSortAdminVenues,
  type AdminVenueListRow,
} from "@/lib/admin-venue-list";

function row(
  overrides: Partial<AdminVenueListRow> & Pick<AdminVenueListRow, "name">,
): AdminVenueListRow {
  return {
    slug: overrides.name.toLowerCase().replace(/\s+/g, "-"),
    status: "published",
    mapZone: null,
    updatedAt: new Date("2026-08-01T12:00:00Z"),
    ...overrides,
  };
}

describe("adminVenueZoneLabel", () => {
  it("uses mapped-zone labels, Other, and Not set", () => {
    expect(adminVenueZoneLabel("student-center")).toBe("Student Center");
    expect(adminVenueZoneLabel("other")).toBe("Other / Outside mapped zones");
    expect(adminVenueZoneLabel(null)).toBe("Not set");
  });
});

describe("adminVenueZoneSortIndex", () => {
  it("orders mapped zones before Other, then unset", () => {
    expect(adminVenueZoneSortIndex("student-center")).toBeLessThan(
      adminVenueZoneSortIndex("cecil-b-moore"),
    );
    expect(adminVenueZoneSortIndex("susquehanna")).toBeLessThan(
      adminVenueZoneSortIndex("other"),
    );
    expect(adminVenueZoneSortIndex("other")).toBeLessThan(
      adminVenueZoneSortIndex(null),
    );
  });
});

describe("filterAndSortAdminVenues", () => {
  const venues: AdminVenueListRow[] = [
    row({
      name: "Zed Tacos",
      mapZone: "student-center",
      updatedAt: new Date("2026-08-10T12:00:00Z"),
    }),
    row({
      name: "Alpha Cart",
      mapZone: "susquehanna",
      updatedAt: new Date("2026-08-20T12:00:00Z"),
    }),
    row({
      name: "Mid Truck",
      mapZone: "other",
      status: "draft",
      updatedAt: new Date("2026-08-15T12:00:00Z"),
    }),
    row({
      name: "No Zone Yet",
      mapZone: null,
      updatedAt: new Date("2026-08-05T12:00:00Z"),
    }),
  ];

  it("filters to one mapped zone", () => {
    const result = filterAndSortAdminVenues(venues, {
      search: "",
      status: "all",
      zone: "student-center",
      sort: "name",
    });
    expect(result.map((venue) => venue.name)).toEqual(["Zed Tacos"]);
  });

  it("filters Other and unset as distinct buckets", () => {
    expect(
      filterAndSortAdminVenues(venues, {
        search: "",
        status: "all",
        zone: "other",
        sort: "name",
      }).map((venue) => venue.name),
    ).toEqual(["Mid Truck"]);
    expect(
      filterAndSortAdminVenues(venues, {
        search: "",
        status: "all",
        zone: "unset",
        sort: "name",
      }).map((venue) => venue.name),
    ).toEqual(["No Zone Yet"]);
  });

  it("sorts by zone order then name", () => {
    const result = filterAndSortAdminVenues(venues, {
      search: "",
      status: "all",
      zone: "all",
      sort: "zone",
    });
    expect(result.map((venue) => venue.name)).toEqual([
      "Zed Tacos",
      "Alpha Cart",
      "Mid Truck",
      "No Zone Yet",
    ]);
  });

  it("sorts by most recently updated", () => {
    const result = filterAndSortAdminVenues(venues, {
      search: "",
      status: "all",
      zone: "all",
      sort: "updated",
    });
    expect(result.map((venue) => venue.name)).toEqual([
      "Alpha Cart",
      "Mid Truck",
      "Zed Tacos",
      "No Zone Yet",
    ]);
  });

  it("still respects status and search alongside zone", () => {
    const result = filterAndSortAdminVenues(venues, {
      search: "mid",
      status: "draft",
      zone: "other",
      sort: "name",
    });
    expect(result.map((venue) => venue.name)).toEqual(["Mid Truck"]);
  });
});
