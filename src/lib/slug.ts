/**
 * Slug generation for venues.
 * Slugs are generated once at publish and are immutable thereafter.
 * Near-duplicate names (e.g. the five gyro trucks) must remain distinct venues.
 */

const MAX_BASE_LENGTH = 60;

export function slugifyName(name: string): string {
  const base = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_BASE_LENGTH)
    .replace(/-+$/g, "");

  return base.length > 0 ? base : "venue";
}

/**
 * Given a desired base slug and the set of slugs already taken,
 * return a unique slug (`famous-ny-gyro`, `famous-ny-gyro-2`, …).
 */
export function uniqueSlug(
  name: string,
  existingSlugs: ReadonlySet<string>,
): string {
  const base = slugifyName(name);
  if (!existingSlugs.has(base)) {
    return base;
  }

  let n = 2;
  while (existingSlugs.has(`${base}-${n}`)) {
    n += 1;
  }
  return `${base}-${n}`;
}
