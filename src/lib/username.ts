import {
  MAX_USERNAME_LENGTH,
  MIN_USERNAME_LENGTH,
  RESERVED_USERNAMES,
  USERNAME_PATTERN,
} from "@/config/site";

const reserved = new Set<string>(RESERVED_USERNAMES);

export function isReservedUsername(username: string): boolean {
  return reserved.has(username);
}

/**
 * Collapse a display name (or any raw string) into a username candidate.
 * Empty / too-short leftovers become "owl".
 */
export function slugifyUsername(raw: string): string {
  let cleaned = raw.toLowerCase().replace(/[^a-z0-9_]+/g, "");
  if (!/^[a-z]/.test(cleaned)) {
    cleaned = `owl${cleaned}`;
  }
  cleaned = cleaned.slice(0, MAX_USERNAME_LENGTH);
  return cleaned.length >= MIN_USERNAME_LENGTH ? cleaned : "owl";
}

export function isAvailableUsername(
  username: string,
  taken: ReadonlySet<string>,
): boolean {
  return (
    USERNAME_PATTERN.test(username) &&
    !isReservedUsername(username) &&
    !taken.has(username)
  );
}

/**
 * Collision-avoidance for usernames, same `base` → `base2` → `base3`
 * pattern as pickDisplayName / uniqueSlug.
 */
export function pickUsername(
  raw: string,
  taken: ReadonlySet<string>,
  fallbackId?: string,
): string {
  const base = slugifyUsername(raw);
  if (isAvailableUsername(base, taken)) {
    return base;
  }

  for (let n = 2; n < 1000; n++) {
    const suffix = String(n);
    const candidate = `${base.slice(0, MAX_USERNAME_LENGTH - suffix.length)}${suffix}`;
    if (isAvailableUsername(candidate, taken)) {
      return candidate;
    }
  }

  const idBit = (fallbackId ?? "user").replace(/-/g, "").slice(0, 8);
  return `owl${idBit}`.slice(0, MAX_USERNAME_LENGTH);
}
