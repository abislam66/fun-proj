import { describe, expect, it } from "vitest";

import { pickUsername, slugifyUsername } from "@/lib/username";

describe("slugifyUsername", () => {
  it("collapses a display name to a handle", () => {
    expect(slugifyUsername("Alex Rivera")).toBe("alexrivera");
    expect(slugifyUsername("TuEats Team")).toBe("tueatsteam");
  });

  it("prefixes a leading digit so the handle still starts with a letter", () => {
    expect(slugifyUsername("99 tacos")).toBe("owl99tacos");
  });

  it("falls back to owl when nothing usable remains", () => {
    expect(slugifyUsername("!!!")).toBe("owl");
    expect(slugifyUsername("ab")).toBe("owl");
  });
});

describe("pickUsername", () => {
  it("returns the slug when it is free", () => {
    expect(pickUsername("Alex Rivera", new Set())).toBe("alexrivera");
  });

  it("skips reserved names and suffixes on collision", () => {
    expect(pickUsername("admin", new Set())).toBe("admin2");
    expect(pickUsername("Alex", new Set(["alex"]))).toBe("alex2");
    expect(pickUsername("Alex", new Set(["alex", "alex2"]))).toBe("alex3");
  });
});
