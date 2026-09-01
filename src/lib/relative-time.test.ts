import { describe, expect, it } from "vitest";

import { formatRelativeDate } from "./relative-time";

describe("formatRelativeDate", () => {
  it("describes a time in the past", () => {
    const now = new Date("2026-09-01T18:00:00Z");
    expect(formatRelativeDate("2026-09-01T17:00:00Z", now)).toBe("1 hour ago");
  });
});
