import type { User } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { pickDisplayName } from "./member-profile";

function googleUser(overrides: Partial<User> = {}): User {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  } as User;
}

describe("pickDisplayName", () => {
  it("uses the Google account's full name when nothing collides", () => {
    const user = googleUser({ user_metadata: { full_name: "Alex Rivera" } });
    expect(pickDisplayName(user, new Set())).toBe("Alex Rivera");
  });

  it("falls back to the metadata name, then the email prefix, then a generic default", () => {
    expect(
      pickDisplayName(
        googleUser({ user_metadata: { name: "Jordan" } }),
        new Set(),
      ),
    ).toBe("Jordan");
    expect(
      pickDisplayName(googleUser({ email: "sam.owl@gmail.com" }), new Set()),
    ).toBe("samowl");
    expect(
      pickDisplayName(googleUser({ email: "a@gmail.com" }), new Set()),
    ).toBe("Owl");
  });

  it("strips punctuation and caps length to fit the 3-30 character bound", () => {
    const user = googleUser({
      user_metadata: { full_name: "Dr. Steven J. O'Malley-Fitzgerald III!!!" },
    });
    const name = pickDisplayName(user, new Set());
    expect(name).toMatch(/^[a-zA-Z0-9 ]+$/);
    expect(name.length).toBeLessThanOrEqual(30);
  });

  it("suffixes on collision, mirroring uniqueSlug's base -> base2 -> base3 pattern", () => {
    const user = googleUser({ user_metadata: { full_name: "Alex" } });
    expect(pickDisplayName(user, new Set(["Alex"]))).toBe("Alex2");
    expect(pickDisplayName(user, new Set(["Alex", "Alex2"]))).toBe("Alex3");
  });

  it("never produces a name shorter than 3 characters even from a short base", () => {
    const user = googleUser({ user_metadata: { full_name: "A!" } });
    expect(pickDisplayName(user, new Set())).toBe("Owl");
  });
});
