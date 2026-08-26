import { describe, expect, it } from "vitest";

import {
  beforeIdFor,
  liftOverlaysAboveBasemap,
  OVERLAY_PAINT_ORDER,
} from "./overlay-order";

function mapWith(ids: string[]) {
  const set = new Set(ids);
  return { getLayer: (id: string) => (set.has(id) ? {} : undefined) };
}

describe("beforeIdFor", () => {
  it("appends when no higher overlay exists yet", () => {
    expect(beforeIdFor(mapWith([]), "campus-buildings-fill")).toBeUndefined();
  });

  it("inserts under venue pills so remounts stay below pins", () => {
    expect(
      beforeIdFor(mapWith(["venue-pills-symbol"]), "map-zones-label"),
    ).toBe("venue-pills-symbol");
  });

  it("keeps dining pins with zone marks, under zone names and venue pills", () => {
    expect(
      beforeIdFor(mapWith(["map-zones-label"]), "campus-dining-symbol"),
    ).toBe("map-zones-label");
    expect(
      beforeIdFor(mapWith(["venue-pills-symbol"]), "campus-dining-symbol"),
    ).toBe("venue-pills-symbol");
  });

  it("keeps the published stack order", () => {
    expect(OVERLAY_PAINT_ORDER.at(-1)).toBe("venue-pills-symbol");
  });
});

describe("liftOverlaysAboveBasemap", () => {
  it("moves mounted overlays bottom-to-top so the last id ends on top", () => {
    const moved: string[] = [];
    const mounted = new Set(["campus-buildings-fill", "venue-pills-symbol"]);
    liftOverlaysAboveBasemap({
      getLayer: (id) => (mounted.has(id) ? {} : undefined),
      moveLayer: (id) => {
        moved.push(id);
      },
    });
    expect(moved).toEqual(["campus-buildings-fill", "venue-pills-symbol"]);
  });
});
