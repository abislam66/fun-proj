import { describe, expect, it } from "vitest";

import { mapZoneContaining, pointInRing } from "./point-in-polygon";

const square: [number, number][] = [
  [0, 0],
  [0, 2],
  [2, 2],
  [2, 0],
  [0, 0],
];

describe("pointInRing", () => {
  it("counts a point inside a closed ring", () => {
    expect(pointInRing(1, 1, square)).toBe(true);
  });

  it("rejects a point outside the ring", () => {
    expect(pointInRing(3, 1, square)).toBe(false);
    expect(pointInRing(-0.1, 1, square)).toBe(false);
  });
});

describe("mapZoneContaining", () => {
  it("places a Student Center sidewalk point in student-center", () => {
    expect(mapZoneContaining(-75.15545, 39.9794)).toBe("student-center");
  });

  it("places Montgomery in front of Klein Law in w-montgomery", () => {
    expect(mapZoneContaining(-75.15678, 39.98012)).toBe("w-montgomery");
  });

  it("places the curbside spot between Klein Law and the Student Center in student-center (2026-08-30 west-edge widening)", () => {
    expect(mapZoneContaining(-75.1557, 39.97998)).toBe("student-center");
  });

  it("still leaves w-montgomery's own east edge out of student-center", () => {
    expect(mapZoneContaining(-75.15615, 39.98005)).toBeNull();
  });

  it("places a Vantage plaza point in vantage-view", () => {
    expect(mapZoneContaining(-75.1534, 39.9787)).toBe("vantage-view");
  });

  it("places the plaza west of Anderson in the-wall", () => {
    expect(mapZoneContaining(-75.15335, 39.98085)).toBe("the-wall");
  });

  it("places 12th at SERC in serc-trucks", () => {
    expect(mapZoneContaining(-75.1537, 39.9821)).toBe("serc-trucks");
  });

  it("places Norris in front of Presser Hall in tyler-trucks", () => {
    expect(mapZoneContaining(-75.15427, 39.98287)).toBe("tyler-trucks");
  });

  // SERC trucks' east edge pushed out 2026-08-30 to reach a gyro cart just
  // past the original edge.
  it("places Penn Halal Gyro 2.0 (stored coords) in serc-trucks", () => {
    expect(mapZoneContaining(-75.152978, 39.982332)).toBe("serc-trucks");
  });

  it("places Norris in front of Tomlinson in tyler-trucks", () => {
    expect(mapZoneContaining(-75.15515, 39.983)).toBe("tyler-trucks");
  });

  it("leaves Liacouras Walk west of Tomlinson out of tyler-trucks", () => {
    expect(mapZoneContaining(-75.15559, 39.98304)).toBeNull();
  });

  it("places the Richie's Cafe pin in richies-cafe", () => {
    expect(mapZoneContaining(-75.1513832, 39.980714)).toBe("richies-cafe");
  });

  it("leaves Facilities out of richies-cafe", () => {
    expect(mapZoneContaining(-75.1509, 39.9805)).toBeNull();
  });

  // Richie's Cafe given a NE lobe 2026-08-30 to reach a coffee shop further
  // east on the same block, without widening at Facilities' own latitude.
  it("places Land of A Thousand Hills Coffee (corrected coords) in richies-cafe via the new NE lobe", () => {
    expect(mapZoneContaining(-75.150479, 39.980923)).toBe("richies-cafe");
  });

  it("still leaves Facilities out of the widened richies-cafe", () => {
    expect(mapZoneContaining(-75.1509, 39.9805)).toBeNull();
  });

  it("places the Liacouras Walk building in liacouras-walk", () => {
    expect(mapZoneContaining(-75.156, 39.9824)).toBe("liacouras-walk");
  });

  it("leaves 1940 Residence Hall out of liacouras-walk", () => {
    expect(mapZoneContaining(-75.1564, 39.98285)).toBeNull();
  });

  it("returns null for a point clear of every map zone", () => {
    expect(mapZoneContaining(-75.148, 39.975)).toBeNull();
  });

  it("places a real N Broad St point (Wendy's, corrected coords) in broad-st", () => {
    expect(mapZoneContaining(-75.1571629, 39.9798944)).toBe("broad-st");
  });

  it("places a real Cecil B. Moore Ave point (Fancy Halal Grill) in cecil-b-moore", () => {
    expect(mapZoneContaining(-75.1627803, 39.9794942)).toBe("cecil-b-moore");
  });

  // Cecil B. Moore Ave's south edge pushed down 2026-08-30 to reach two
  // venues just south of the original edge, near the Broad St corner.
  it("places Oh Brother (corrected coords) in cecil-b-moore", () => {
    expect(mapZoneContaining(-75.1583, 39.9781)).toBe("cecil-b-moore");
  });

  it("places Tropical Smoothie Cafe (stored coords, never flagged for correction) in cecil-b-moore", () => {
    expect(mapZoneContaining(-75.1584827, 39.9778398)).toBe("cecil-b-moore");
  });

  // Student Center widened 2026-08-30: the old notch cut off the food
  // court's own real geocoded entrance (shared by 7 vendors) and the
  // Montgomery-Ave curbside trucks right outside it.
  it("places the Student Center food court's real geocode in student-center", () => {
    expect(mapZoneContaining(-75.154858, 39.979488)).toBe("student-center");
  });

  it("places Nanu's Hot Chicken (corrected coords, Montgomery Ave at 13th) in student-center", () => {
    expect(mapZoneContaining(-75.154571, 39.979818)).toBe("student-center");
  });

  // Student Center's west edge pushed out 2026-08-30 to also reach two more
  // venues just past the first widening — stops short of w-montgomery.
  it("places E&E Gourmet Express (stored coords, never flagged for correction) in student-center", () => {
    expect(mapZoneContaining(-75.1559418, 39.9799997)).toBe("student-center");
  });

  it("places the curbside truck in front of SAC (stored coords, left uncorrected at Low confidence) in student-center", () => {
    expect(mapZoneContaining(-75.1557481, 39.979529)).toBe("student-center");
  });

  it("places Rock N Rolls (1299 W Montgomery Ave) in student-center after the east-edge nudge", () => {
    expect(mapZoneContaining(-75.15432, 39.97988)).toBe("student-center");
  });

  // Liacouras Walk widened 2026-08-30: extended south to also cover
  // 1902/1912, not just the original 1926-1938 building.
  it("places 7-Eleven (1912 Liacouras Walk, corrected coords) in liacouras-walk", () => {
    expect(mapZoneContaining(-75.156057, 39.982039)).toBe("liacouras-walk");
  });

  it("places Saxbys Liacouras Walk (1902, corrected coords) in liacouras-walk", () => {
    expect(mapZoneContaining(-75.156078, 39.981662)).toBe("liacouras-walk");
  });

  it("still leaves 1940 Residence Hall out of the widened liacouras-walk", () => {
    expect(mapZoneContaining(-75.1564, 39.98285)).toBeNull();
  });

  // Liacouras Walk's east edge pushed out 2026-08-30 to also reach Stella's,
  // just past the original east edge.
  it("places Stella's (stored coords, never flagged for correction) in liacouras-walk", () => {
    expect(mapZoneContaining(-75.1556002, 39.9816613)).toBe("liacouras-walk");
  });
});
