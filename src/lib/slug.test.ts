import { describe, expect, it } from "vitest";

import { slugifyName, uniqueSlug } from "./slug";

describe("slugifyName", () => {
  it("slugifies typical truck names", () => {
    expect(slugifyName("Richie's Lunch Box")).toBe("richies-lunch-box");
    expect(slugifyName("Famous NY Gyro")).toBe("famous-ny-gyro");
  });
});

describe("uniqueSlug — gyro trucks must stay distinct", () => {
  /**
   * Domain pitfall: Famous NY Gyro, New York Gyro, Halal Gyro Express,
   * Philly Halal Gyro, and Philly Fellas Gyro Halal are five different trucks.
   * Never dedupe by name similarity; collision-suffix when bases collide.
   */
  const GYRO_NAMES = [
    "Famous NY Gyro",
    "New York Gyro",
    "Halal Gyro Express",
    "Philly Halal Gyro",
    "Philly Fellas Gyro Halal",
  ] as const;

  it("produces five unique slugs for the five gyro trucks", () => {
    const taken = new Set<string>();
    const slugs = GYRO_NAMES.map((name) => {
      const slug = uniqueSlug(name, taken);
      taken.add(slug);
      return slug;
    });

    expect(new Set(slugs).size).toBe(5);
    expect(slugs).toEqual([
      "famous-ny-gyro",
      "new-york-gyro",
      "halal-gyro-express",
      "philly-halal-gyro",
      "philly-fellas-gyro-halal",
    ]);
  });

  it("suffixes on true base collisions", () => {
    const taken = new Set(["new-york-gyro"]);
    expect(uniqueSlug("New York Gyro", taken)).toBe("new-york-gyro-2");
    taken.add("new-york-gyro-2");
    expect(uniqueSlug("New York Gyro", taken)).toBe("new-york-gyro-3");
  });
});
