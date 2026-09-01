import { MAX_VENUE_PHOTOS } from "@/config/site";

export type StudentRatingSummary = {
  average: number;
  count: number;
};

export type VenuePhotoVisibility = {
  status: "pending" | "published" | "rejected";
};

/** One decimal, the public aggregate display. */
export function roundStudentAverage(value: number): number {
  return Math.round(value * 10) / 10;
}

export function studentRatingSummary(
  average: number,
  count: number,
): StudentRatingSummary | null {
  if (count <= 0) return null;
  return { average: roundStudentAverage(average), count };
}

export function formatStudentRating(
  summary: StudentRatingSummary,
  variant: "detail" | "list" = "detail",
): string {
  const stars = summary.average.toFixed(1);
  if (variant === "list") {
    return `${stars} ★ · ${summary.count}`;
  }
  const noun = summary.count === 1 ? "student rating" : "student ratings";
  return `${stars} ★ · ${summary.count} ${noun}`;
}

export function canPublishVenuePhoto(
  publishedCount: number,
  max: number = MAX_VENUE_PHOTOS,
): boolean {
  return publishedCount < max;
}

export function isPublicVenuePhoto(photo: VenuePhotoVisibility): boolean {
  return photo.status === "published";
}

export function blobBackedPhotoSource(
  source: "legacy" | "admin" | "member",
): boolean {
  return source === "admin" || source === "member";
}
