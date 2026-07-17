import type { ProfileRow } from "@/lib/db/schema";

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

/** Pure authorization helper — used by requireAdmin and unit tests. */
export function assertIsAdmin(profile: ProfileRow | null | undefined): void {
  if (!profile || profile.role !== "admin") {
    throw new AuthError("Admin access required");
  }
}
