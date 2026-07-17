import { describe, expect, it } from "vitest";

import { PROBLEM_REPORT_RATE_LIMIT } from "@/config/site";
import { hashIp } from "@/lib/ip-hash";
import { isOverLimit } from "@/lib/ratelimit";

describe("isOverLimit", () => {
  it("triggers at the configured max", () => {
    expect(isOverLimit(PROBLEM_REPORT_RATE_LIMIT.max - 1)).toBe(false);
    expect(isOverLimit(PROBLEM_REPORT_RATE_LIMIT.max)).toBe(true);
    expect(isOverLimit(PROBLEM_REPORT_RATE_LIMIT.max + 3)).toBe(true);
  });
});

describe("hashIp", () => {
  it("is stable for the same salt and never returns the raw IP", () => {
    const a = hashIp("203.0.113.10", "test-salt");
    const b = hashIp("203.0.113.10", "test-salt");
    expect(a).toBe(b);
    expect(a).not.toContain("203.0.113");
    expect(a).toHaveLength(64);
  });

  it("changes when the salt changes", () => {
    expect(hashIp("203.0.113.10", "salt-a")).not.toBe(
      hashIp("203.0.113.10", "salt-b"),
    );
  });
});
