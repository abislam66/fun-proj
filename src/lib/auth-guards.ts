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

/**
 * Any signed-in profile that is not struck can write member content
 * (ratings, photo submissions). Admins with a profile pass too.
 */
export function assertIsMember(profile: ProfileRow | null | undefined): void {
  if (!profile) {
    throw new AuthError("Sign in required");
  }
  if (profile.struckAt) {
    throw new AuthError("Your account can’t post right now.");
  }
}
