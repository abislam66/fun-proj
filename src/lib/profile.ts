import {
  GRADUATION_YEAR_MAX,
  GRADUATION_YEAR_MIN,
  PROFILE_IDENTITY_RATE_LIMIT,
} from "@/config/site";

/** "Class of 2027" works for both alumni and current students. */
export function formatClassYear(
  year: number | null | undefined,
): string | null {
  if (year == null) return null;
  return `Class of ${year}`;
}

export function decadeStart(year: number): number {
  return Math.floor(year / 10) * 10;
}

/** Ten years of a decade, clipped to the allowed class-year range. */
export function yearsInDecade(
  start: number,
  min: number = GRADUATION_YEAR_MIN,
  max: number = GRADUATION_YEAR_MAX,
): number[] {
  const decade = decadeStart(start);
  return Array.from({ length: 10 }, (_, index) => decade + index).filter(
    (year) => year >= min && year <= max,
  );
}

export function identityChangeBlocked(
  identityChangedAt: Date | null | undefined,
  now = new Date(),
  windowMs: number = PROFILE_IDENTITY_RATE_LIMIT.windowMs,
): boolean {
  if (!identityChangedAt) return false;
  return now.getTime() - identityChangedAt.getTime() < windowMs;
}
