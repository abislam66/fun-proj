import { describe, expect, it } from "vitest";

import { ZONE_LABEL_ICON_PREFIX, zoneLabelIconId } from "./zone-label-icon";

describe("zoneLabelIconId", () => {
  it("prefixes the zone key so each label is its own sprite", () => {
    expect(zoneLabelIconId("w-montgomery")).toBe(
      `${ZONE_LABEL_ICON_PREFIX}w-montgomery`,
    );
  });
});
