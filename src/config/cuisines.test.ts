import { describe, expect, it } from "vitest";

import { cuisinePinLabel } from "@/config/cuisines";

describe("cuisinePinLabel", () => {
  it("uses the primary (first) cuisine's short label", () => {
    expect(cuisinePinLabel(["halal"])).toBe("Halal");
    expect(cuisinePinLabel(["mexican", "american"])).toBe("Mex");
  });

  it("falls back to Food for an untagged venue", () => {
    expect(cuisinePinLabel([])).toBe("Food");
  });

  it("labels the 'other' cuisine as Food", () => {
    expect(cuisinePinLabel(["other"])).toBe("Food");
  });
});
