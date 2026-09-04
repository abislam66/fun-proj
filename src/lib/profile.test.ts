import { describe, expect, it } from "vitest";

import { PROFILE_IDENTITY_RATE_LIMIT } from "@/config/site";
import {
  decadeStart,
  formatClassYear,
  identityChangeBlocked,
  yearsInDecade,
} from "@/lib/profile";

describe("formatClassYear", () => {
  it("uses Class of for both past and future years", () => {
    expect(formatClassYear(2027)).toBe("Class of 2027");
    expect(formatClassYear(2019)).toBe("Class of 2019");
  });

  it("returns null when the year is missing", () => {
    expect(formatClassYear(null)).toBeNull();
    expect(formatClassYear(undefined)).toBeNull();
  });
});

describe("yearsInDecade", () => {
  it("returns a full decade when every year is in range", () => {
    expect(yearsInDecade(2024)).toEqual([
      2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029,
    ]);
  });

  it("clips the first and last decades to the allowed range", () => {
    expect(yearsInDecade(1990)[0]).toBe(1990);
    expect(yearsInDecade(2040)).toEqual([2040]);
  });

  it("aligns any year in the decade to the same start", () => {
    expect(decadeStart(2028)).toBe(2020);
    expect(decadeStart(2040)).toBe(2040);
  });
});

describe("identityChangeBlocked", () => {
  it("allows the first identity change", () => {
    expect(identityChangeBlocked(null)).toBe(false);
  });

  it("blocks a second change inside the cooldown window", () => {
    const now = new Date("2026-09-04T12:00:00Z");
    const recent = new Date(
      now.getTime() - PROFILE_IDENTITY_RATE_LIMIT.windowMs + 60_000,
    );
    expect(identityChangeBlocked(recent, now)).toBe(true);
  });

  it("allows a change after the cooldown", () => {
    const now = new Date("2026-09-04T12:00:00Z");
    const stale = new Date(
      now.getTime() - PROFILE_IDENTITY_RATE_LIMIT.windowMs - 1,
    );
    expect(identityChangeBlocked(stale, now)).toBe(false);
  });
});
