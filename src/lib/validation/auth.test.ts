import { describe, expect, it } from "vitest";

import { adminSignInSchema } from "@/lib/validation";

describe("adminSignInSchema", () => {
  it("accepts a valid email/password pair", () => {
    const parsed = adminSignInSchema.parse({
      email: "Admin@Example.com",
      password: "correct-horse",
    });
    expect(parsed.email).toBe("admin@example.com");
    expect(parsed.password).toBe("correct-horse");
  });

  it("rejects an empty email", () => {
    expect(() =>
      adminSignInSchema.parse({ email: "", password: "x" }),
    ).toThrow();
  });

  it("rejects an empty password", () => {
    expect(() =>
      adminSignInSchema.parse({ email: "admin@example.com", password: "" }),
    ).toThrow();
  });

  it("rejects unknown keys (strict)", () => {
    expect(() =>
      adminSignInSchema.parse({
        email: "admin@example.com",
        password: "x",
        extra: true,
      }),
    ).toThrow();
  });
});
