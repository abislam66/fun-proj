import { describe, expect, it } from "vitest";

import { safeInternalPath } from "./safe-path";

describe("safeInternalPath", () => {
  it("passes through a plain internal path", () => {
    expect(safeInternalPath("/eat/mcdonalds")).toBe("/eat/mcdonalds");
  });

  it("preserves query strings and hashes", () => {
    expect(safeInternalPath("/?q=mc&zone=broad-st")).toBe(
      "/?q=mc&zone=broad-st",
    );
  });

  it("falls back to / for null, undefined, and empty input", () => {
    expect(safeInternalPath(null)).toBe("/");
    expect(safeInternalPath(undefined)).toBe("/");
    expect(safeInternalPath("")).toBe("/");
  });

  it("rejects a protocol-relative URL", () => {
    expect(safeInternalPath("//evil.com")).toBe("/");
  });

  it("rejects a fully-qualified external URL", () => {
    expect(safeInternalPath("https://evil.com")).toBe("/");
    expect(safeInternalPath("http://evil.com/eat/mcdonalds")).toBe("/");
  });

  it("rejects backslash variants that browsers normalize into protocol-relative URLs", () => {
    expect(safeInternalPath("/\\evil.com")).toBe("/");
    expect(safeInternalPath("/\\/evil.com")).toBe("/");
  });

  it("rejects a leading tab/newline that URL parsing strips before the host", () => {
    expect(safeInternalPath("/\t/evil.com")).toBe("/");
  });
});
