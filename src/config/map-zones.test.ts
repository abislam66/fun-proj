import { describe, expect, it } from "vitest";

import { MAP_ZONE_MARK, mapZoneKeysByMark } from "./map-zones";

describe("MAP_ZONE_MARK", () => {
  it("puts corridor clusters on streetLine", () => {
    expect(mapZoneKeysByMark(MAP_ZONE_MARK.streetLine)).toEqual([
      "student-center",
      "w-montgomery",
      "serc-trucks",
      "tyler-trucks",
      "cecil-b-moore",
      "broad-st",
    ]);
  });

  it("puts Vantage, The View, The Wall plaza, Richie's Cafe, and Liacouras Walk on buildingFill", () => {
    expect(mapZoneKeysByMark(MAP_ZONE_MARK.buildingFill)).toEqual([
      "vantage-view",
      "the-wall",
      "richies-cafe",
      "liacouras-walk",
    ]);
  });
});
