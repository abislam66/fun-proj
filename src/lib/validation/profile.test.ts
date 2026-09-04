import { describe, expect, it } from "vitest";

import { updateOwnProfileSchema } from "@/lib/validation";

describe("updateOwnProfileSchema", () => {
  const valid = {
    displayName: "Alex Rivera",
    username: "alexrivera",
    graduationYear: 2027,
  };

  it("accepts a well-formed profile", () => {
    expect(updateOwnProfileSchema.parse(valid)).toEqual(valid);
  });

  it("lowercases usernames and allows a missing class year", () => {
    expect(
      updateOwnProfileSchema.parse({
        ...valid,
        username: "Alex_Owl",
        graduationYear: null,
      }),
    ).toEqual({
      ...valid,
      username: "alex_owl",
      graduationYear: null,
    });
  });

  it("rejects reserved usernames, short names, and out-of-range years", () => {
    expect(() =>
      updateOwnProfileSchema.parse({ ...valid, username: "admin" }),
    ).toThrow();
    expect(() =>
      updateOwnProfileSchema.parse({ ...valid, displayName: "Al" }),
    ).toThrow();
    expect(() =>
      updateOwnProfileSchema.parse({ ...valid, graduationYear: 1989 }),
    ).toThrow();
    expect(() =>
      updateOwnProfileSchema.parse({ ...valid, graduationYear: 2041 }),
    ).toThrow();
  });

  it("rejects unknown keys", () => {
    expect(() =>
      updateOwnProfileSchema.parse({ ...valid, extra: true }),
    ).toThrow();
  });
});
