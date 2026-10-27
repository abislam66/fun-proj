import { describe, expect, it } from "vitest";

import { buildCallbackRedirectUrl } from "./auth-callback";

describe("buildCallbackRedirectUrl", () => {
  it("adds auth_error=1 on failure", () => {
    const url = buildCallbackRedirectUrl(
      "https://tueats.co",
      "/eat/richies-cafe",
      true,
    );
    expect(url.pathname).toBe("/eat/richies-cafe");
    expect(url.searchParams.get("auth_error")).toBe("1");
  });

  it("omits auth_error on success", () => {
    const url = buildCallbackRedirectUrl(
      "https://tueats.co",
      "/account",
      false,
    );
    expect(url.searchParams.has("auth_error")).toBe(false);
  });

  it("strips a pre-existing auth_error from next rather than trusting it", () => {
    const url = buildCallbackRedirectUrl(
      "https://tueats.co",
      "/eat/richies-cafe?auth_error=1",
      false,
    );
    expect(url.searchParams.has("auth_error")).toBe(false);
  });

  it("preserves next's own query params alongside the flag", () => {
    const url = buildCallbackRedirectUrl(
      "https://tueats.co",
      "/eat/richies-cafe?from=map",
      true,
    );
    expect(url.searchParams.get("from")).toBe("map");
    expect(url.searchParams.get("auth_error")).toBe("1");
  });
});
