import { createHash } from "node:crypto";

/** Salted IP hash for anonymous reports — raw IP never stored. */
export function hashIp(ip: string, salt = process.env.IP_HASH_SALT): string {
  if (!salt) {
    throw new Error("IP_HASH_SALT is required");
  }
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}
