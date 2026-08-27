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

  it("leaves a gap between Klein Law and the Student Center L", () => {
    expect(mapZoneContaining(-75.1557, 39.97998)).toBeNull();
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

  it("leaves the Klein Law/Student Center gap out of broad-st", () => {
    expect(mapZoneContaining(-75.1557, 39.97998)).toBeNull();
  });

  it("places a real Cecil B. Moore Ave point (Fancy Halal Grill) in cecil-b-moore", () => {
    expect(mapZoneContaining(-75.1627803, 39.9794942)).toBe("cecil-b-moore");
  });
});
