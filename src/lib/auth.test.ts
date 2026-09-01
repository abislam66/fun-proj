import { describe, expect, it } from "vitest";

import { AuthError, assertIsAdmin, assertIsMember } from "./auth-guards";
import type { ProfileRow } from "@/lib/db/schema";

function profile(overrides: Partial<ProfileRow>): ProfileRow {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    displayName: "tester",
    role: "member",
    struckAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe("assertIsAdmin", () => {
  it("allows admin profiles", () => {
    expect(() => assertIsAdmin(profile({ role: "admin" }))).not.toThrow();
  });

  it("denies members and missing profiles", () => {
    expect(() => assertIsAdmin(profile({ role: "member" }))).toThrow(AuthError);
    expect(() => assertIsAdmin(null)).toThrow(AuthError);
    expect(() => assertIsAdmin(undefined)).toThrow(AuthError);
  });
});

describe("assertIsMember", () => {
  it("allows members and admins who are not struck", () => {
    expect(() => assertIsMember(profile({ role: "member" }))).not.toThrow();
    expect(() => assertIsMember(profile({ role: "admin" }))).not.toThrow();
  });

  it("denies missing or struck profiles", () => {
    expect(() => assertIsMember(null)).toThrow(AuthError);
    expect(() => assertIsMember(undefined)).toThrow(AuthError);
    expect(() =>
      assertIsMember(profile({ struckAt: new Date() })),
    ).toThrow(AuthError);
  });
});
