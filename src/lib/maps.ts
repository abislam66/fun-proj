import type { Venue } from "@/lib/venues";

/**
 * Coordinates, not an address — most venues (food trucks especially) have
 * no formal street address, so lat/lng is the only anchor `Venue`
 * guarantees. No travel mode is forced — Google Maps defaults to
 * whatever's appropriate for the user (driving, walking, transit).
 */
export function googleMapsDirectionsUrl({
  lat,
  lng,
}: Pick<Venue, "lat" | "lng">): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
