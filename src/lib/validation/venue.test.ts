import { describe, expect, it } from "vitest";

import { CAMPUS_BOUNDS } from "@/config/site";
import {
  bulkSetCuisineSchema,
  bulkSetHalalSchema,
  bulkSetVeganFriendlySchema,
  reportProblemSchema,
  venueInputSchema,
} from "@/lib/validation";

describe("venueInputSchema", () => {
  const valid = {
    name: "Richie's Lunch Box",
    type: "truck" as const,
    lat: 39.9815,
    lng: -75.1535,
    cuisines: ["halal" as const],
    hours: { mon: [{ open: "11:00", close: "15:00" }] },
  };

  it("accepts a well-formed venue", () => {
    const parsed = venueInputSchema.parse(valid);
    expect(parsed.name).toBe("Richie's Lunch Box");
    expect(parsed.type).toBe("truck");
  });

  it("rejects coordinates outside campus bounds", () => {
    expect(() =>
      venueInputSchema.parse({
        ...valid,
        lat: CAMPUS_BOUNDS.north + 0.1,
      }),
    ).toThrow();
    expect(() =>
      venueInputSchema.parse({
        ...valid,
        lng: CAMPUS_BOUNDS.west - 0.1,
      }),
    ).toThrow();
  });

  it("rejects unknown keys (strict)", () => {
    expect(() =>
      venueInputSchema.parse({ ...valid, truckOnlyField: true }),
    ).toThrow();
  });

  it("rejects invalid cuisine tags", () => {
    expect(() =>
      venueInputSchema.parse({ ...valid, cuisines: ["barbecue"] }),
    ).toThrow();
  });
});

describe("bulkSetHalalSchema", () => {
  const ids = [
    "00000000-0000-4000-8000-000000000001",
    "00000000-0000-4000-8000-000000000002",
  ];

  it("accepts a list of venue ids and a boolean", () => {
    const parsed = bulkSetHalalSchema.parse({ ids, isHalal: true });
    expect(parsed.ids).toEqual(ids);
    expect(parsed.isHalal).toBe(true);
  });

  it("rejects an empty id list", () => {
    expect(() =>
      bulkSetHalalSchema.parse({ ids: [], isHalal: true }),
    ).toThrow();
  });

  it("rejects non-uuid ids", () => {
    expect(() =>
      bulkSetHalalSchema.parse({ ids: ["not-a-uuid"], isHalal: true }),
    ).toThrow();
  });

  it("rejects a non-boolean isHalal value", () => {
    expect(() => bulkSetHalalSchema.parse({ ids, isHalal: "yes" })).toThrow();
  });

  it("rejects unknown keys (strict)", () => {
    expect(() =>
      bulkSetHalalSchema.parse({ ids, isHalal: true, status: "published" }),
    ).toThrow();
  });
});

describe("bulkSetVeganFriendlySchema", () => {
  const ids = [
    "00000000-0000-4000-8000-000000000001",
    "00000000-0000-4000-8000-000000000002",
  ];

  it("accepts a list of venue ids and a boolean", () => {
    const parsed = bulkSetVeganFriendlySchema.parse({
      ids,
      isVeganFriendly: true,
    });
    expect(parsed.ids).toEqual(ids);
    expect(parsed.isVeganFriendly).toBe(true);
  });

  it("rejects an empty id list", () => {
    expect(() =>
      bulkSetVeganFriendlySchema.parse({ ids: [], isVeganFriendly: true }),
    ).toThrow();
  });

  it("rejects non-uuid ids", () => {
    expect(() =>
      bulkSetVeganFriendlySchema.parse({
        ids: ["not-a-uuid"],
        isVeganFriendly: true,
      }),
    ).toThrow();
  });

  it("rejects a non-boolean isVeganFriendly value", () => {
    expect(() =>
      bulkSetVeganFriendlySchema.parse({ ids, isVeganFriendly: "yes" }),
    ).toThrow();
  });

  it("rejects unknown keys (strict)", () => {
    expect(() =>
      bulkSetVeganFriendlySchema.parse({
        ids,
        isVeganFriendly: true,
        status: "published",
      }),
    ).toThrow();
  });
});

describe("bulkSetCuisineSchema", () => {
  const ids = [
    "00000000-0000-4000-8000-000000000001",
    "00000000-0000-4000-8000-000000000002",
  ];

  it("accepts a list of venue ids, a real cuisine key, and add/remove", () => {
    expect(
      bulkSetCuisineSchema.parse({ ids, cuisine: "halal", action: "add" }),
    ).toEqual({ ids, cuisine: "halal", action: "add" });
    expect(
      bulkSetCuisineSchema.parse({ ids, cuisine: "halal", action: "remove" }),
    ).toEqual({ ids, cuisine: "halal", action: "remove" });
  });

  it("rejects an empty id list", () => {
    expect(() =>
      bulkSetCuisineSchema.parse({ ids: [], cuisine: "halal", action: "add" }),
    ).toThrow();
  });

  it("rejects non-uuid ids", () => {
    expect(() =>
      bulkSetCuisineSchema.parse({
        ids: ["not-a-uuid"],
        cuisine: "halal",
        action: "add",
      }),
    ).toThrow();
  });

  it("rejects a cuisine key that isn't in CUISINES", () => {
    expect(() =>
      bulkSetCuisineSchema.parse({ ids, cuisine: "cafe", action: "add" }),
    ).toThrow();
  });

  it("rejects an action other than add/remove", () => {
    expect(() =>
      bulkSetCuisineSchema.parse({
        ids,
        cuisine: "halal",
        action: "overwrite",
      }),
    ).toThrow();
  });

  it("rejects unknown keys (strict)", () => {
    expect(() =>
      bulkSetCuisineSchema.parse({
        ids,
        cuisine: "halal",
        action: "add",
        status: "published",
      }),
    ).toThrow();
  });
});

describe("reportProblemSchema", () => {
  it("accepts a valid report with empty honeypot", () => {
    const parsed = reportProblemSchema.parse({
      venueId: "00000000-0000-4000-8000-000000000099",
      kind: "wrong_hours",
      note: "Usually closed by 2",
      website: "",
    });
    expect(parsed.kind).toBe("wrong_hours");
  });

  it("rejects honeypot filled by bots", () => {
    expect(() =>
      reportProblemSchema.parse({
        venueId: "00000000-0000-4000-8000-000000000099",
        kind: "closed",
        website: "http://spam.example",
      }),
    ).toThrow();
  });

  it("rejects unknown problem kinds", () => {
    expect(() =>
      reportProblemSchema.parse({
        venueId: "00000000-0000-4000-8000-000000000099",
        kind: "hours_incorrect",
      }),
    ).toThrow();
  });
});
