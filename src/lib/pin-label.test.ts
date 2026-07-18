import { describe, expect, it } from "vitest";

import { getPinLabel } from "@/lib/pin-label";

describe("getPinLabel", () => {
  it("uses the primary cuisine abbrev", () => {
    expect(getPinLabel(["halal", "american"])).toBe("Halal");
    expect(getPinLabel(["mexican"])).toBe("Mex");
  });

  it("falls back to Food when cuisine is missing", () => {
    expect(getPinLabel([])).toBe("Food");
  });
});
