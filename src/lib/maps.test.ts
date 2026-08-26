import { describe, expect, it } from "vitest";

import { googleMapsDirectionsUrl } from "./maps";

describe("googleMapsDirectionsUrl", () => {
  it("builds a directions deep link from coordinates with no forced travel mode", () => {
    expect(googleMapsDirectionsUrl({ lat: 39.9815, lng: -75.1535 })).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=39.9815,-75.1535",
    );
  });

  it("preserves negative longitude — every real campus coordinate is negative", () => {
    const url = googleMapsDirectionsUrl({ lat: 39.9792117, lng: -75.1549397 });
    expect(url).toContain("destination=39.9792117,-75.1549397");
  });
});
