import { describe, expect, it } from "vitest";

import {
  findExistingMatch,
  findNearbyDistinct,
  isWithinCampus,
  parsePlacemarks,
  type ExistingVenue,
} from "@/lib/seed/kml";

const KML = `<?xml version="1.0"?><kml><Document>
  <Placemark>
    <name>Cherry Cart</name>
    <description><![CDATA[<p>Great fries &amp; sandwiches</p>]]></description>
    <Point><coordinates>-75.1548,39.9828,0</coordinates></Point>
  </Placemark>
  <Placemark>
    <name>Rice &amp; Beans</name>
    <Point><coordinates>-75.1540,39.9810</coordinates></Point>
  </Placemark>
  <Placemark>
    <name>Missing Point</name>
  </Placemark>
  <Placemark>
    <name>Center City Cart</name>
    <Point><coordinates>-75.1650,39.9500,0</coordinates></Point>
  </Placemark>
</Document></kml>`;

describe("parsePlacemarks", () => {
  it("parses name, blurb, and lng,lat order while ignoring altitude", () => {
    const places = parsePlacemarks(KML);
    const cherry = places.find((p) => p.name === "Cherry Cart");
    expect(cherry).toEqual({
      name: "Cherry Cart",
      description: "Great fries & sandwiches",
      lat: 39.9828,
      lng: -75.1548,
    });
  });

  it("decodes entities in names", () => {
    const places = parsePlacemarks(KML);
    expect(places.some((p) => p.name === "Rice & Beans")).toBe(true);
  });

  it("skips placemarks without a point and off-campus points", () => {
    const names = parsePlacemarks(KML).map((p) => p.name);
    expect(names).not.toContain("Missing Point");
    expect(names).not.toContain("Center City Cart");
    expect(names).toHaveLength(2);
  });
});

describe("isWithinCampus", () => {
  it("accepts campus-area points and rejects Philly-wide ones", () => {
    expect(isWithinCampus(39.9815, -75.1535)).toBe(true);
    expect(isWithinCampus(39.95, -75.165)).toBe(false);
    expect(isWithinCampus(40.5, -75.15)).toBe(false);
  });
});

describe("dedup", () => {
  const existing: ExistingVenue[] = [
    { name: "Famous NY Gyro", lat: 39.9812, lng: -75.154 },
  ];

  it("matches by exact name (case-insensitive)", () => {
    const match = findExistingMatch(
      { name: "famous ny gyro", description: null, lat: 39.99, lng: -75.15 },
      existing,
    );
    expect(match?.name).toBe("Famous NY Gyro");
  });

  it("matches a differently-named venue only when the point is identical", () => {
    const match = findExistingMatch(
      { name: "Renamed Gyro", description: null, lat: 39.9812, lng: -75.154 },
      existing,
    );
    expect(match?.name).toBe("Famous NY Gyro");
  });

  it("keeps a distinct nearby gyro truck separate but flags it for review", () => {
    // ~11m north — a different truck on the same corner, not a re-export.
    const place = {
      name: "New York Gyro",
      description: null,
      lat: 39.9813,
      lng: -75.154,
    };
    expect(findExistingMatch(place, existing)).toBeNull();
    expect(findNearbyDistinct(place, existing)?.name).toBe("Famous NY Gyro");
  });

  it("does not flag far-away distinct venues", () => {
    const place = {
      name: "West Cart",
      description: null,
      lat: 39.982,
      lng: -75.152,
    };
    expect(findNearbyDistinct(place, existing)).toBeNull();
  });
});
