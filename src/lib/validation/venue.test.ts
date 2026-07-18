import { describe, expect, it } from "vitest";

import { CAMPUS_COORDINATE_BOUNDS } from "@/config/site";
import { reportProblemSchema, venueInputSchema } from "@/lib/validation";

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
        lat: CAMPUS_COORDINATE_BOUNDS.north + 0.1,
      }),
    ).toThrow();
    expect(() =>
      venueInputSchema.parse({
        ...valid,
        lng: CAMPUS_COORDINATE_BOUNDS.west - 0.1,
      }),
    ).toThrow();
  });

  it("accepts campus-edge coordinates the tight viewport box would reject", () => {
    // A truck near Broad St sits outside CAMPUS_BOUNDS but inside the envelope.
    const parsed = venueInputSchema.parse({
      ...valid,
      lat: 39.9775,
      lng: -75.16,
    });
    expect(parsed.lat).toBe(39.9775);
  });

  it("rejects unknown keys (strict)", () => {
    expect(() =>
      venueInputSchema.parse({ ...valid, truckOnlyField: true }),
    ).toThrow();
  });

  it("rejects invalid cuisine tags", () => {
    expect(() =>
      venueInputSchema.parse({ ...valid, cuisines: ["pizza"] }),
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
