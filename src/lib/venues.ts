import { CUISINE_KEYS, type CuisineKey } from "@/config/cuisines";
import { MAP_ZONE_KEYS, MAP_ZONES, type MapZoneKey } from "@/config/map-zones";
import { isHoursUnknown, isOpenNow, type VenueHours } from "@/lib/hours";
import { pointInMapZone } from "@/lib/map/point-in-polygon";
import type { StudentRatingSummary } from "@/lib/ratings";

/**
 * Admin-only sentinel for "outside every drawn map zone" — deliberately
 * NOT a `MAP_ZONES` entry, so it can never leak into the public zone
 * filter bar (which renders its chips directly from `MAP_ZONES`).
 */
export const OTHER_MAP_ZONE = "other" as const;
export type VenueMapZone = MapZoneKey | typeof OTHER_MAP_ZONE;
/** Display text for `OTHER_MAP_ZONE` — carries over the old system's wording. */
export const OTHER_MAP_ZONE_LABEL = "Elsewhere near campus";

export type VenueType =
  | "truck"
  | "restaurant"
  | "cafe"
  | "vending"
  | "convenience";

export interface Venue {
  id: string;
  slug: string;
  type: VenueType;
  name: string;
  description: string | null;
  status: "published" | "retired";
  mapZone: VenueMapZone | null;
  location: string;
  building?: string | null;
  floor?: string | null;
  /** WGS84 latitude — required for map pins. */
  lat: number;
  /** WGS84 longitude — required for map pins. */
  lng: number;
  acceptsCash: boolean | null;
  acceptsCard: boolean | null;
  isHalal: boolean;
  isVeganFriendly: boolean;
  cuisines: CuisineKey[];
  hours: VenueHours | null;
  lastVerifiedAt: string | null;
  studentRating: StudentRatingSummary | null;
}

export interface VenueFilters {
  query: string;
  openNow: boolean;
  isHalal: boolean;
  isVeganFriendly: boolean;
  /** `venue.type === "cafe"` — filters on the venue's business category. */
  isCafe: boolean;
  cuisines: CuisineKey[];
  zones: MapZoneKey[];
}

export const EMPTY_VENUE_FILTERS: VenueFilters = {
  query: "",
  openNow: false,
  isHalal: false,
  isVeganFriendly: false,
  isCafe: false,
  cuisines: [],
  zones: [],
};

function uniqueSorted<T extends string>(values: T[]): T[] {
  return [...new Set(values)].sort();
}

/**
 * Detail-page location text. Trucks are approximate (move/set up
 * informally) and get a "Near" prefix; every other type is a fixed spot
 * and states it plainly. `building` already holds whatever's most
 * specific an admin has entered — a street address for an off-campus
 * shop, a building/room name for an on-campus one — so it's shown as-is
 * rather than guessing which it is. `OTHER_MAP_ZONE` ("outside every
 * drawn zone") is deliberately excluded as a fallback: it's a catch-all,
 * not a real place, so it reads as filler rather than information.
 */
export function venueLocationText(venue: Venue): {
  text: string;
  approximate: boolean;
} {
  const approximate = venue.type === "truck";
  const landmark = venue.building
    ? venue.floor
      ? `${venue.building}, Floor ${venue.floor}`
      : venue.building
    : null;
  const zoneLabel =
    venue.mapZone && venue.mapZone !== OTHER_MAP_ZONE
      ? MAP_ZONES[venue.mapZone].label
      : null;

  const known = landmark ?? zoneLabel;
  if (known) {
    return { text: approximate ? `Near ${known}` : known, approximate };
  }
  return {
    text: approximate ? "Near Temple Main Campus" : "Location not yet added",
    approximate,
  };
}

export function parseVenueFilters(params: URLSearchParams): VenueFilters {
  const cuisineValues = params.getAll("cuisine");
  const zoneValues = params.getAll("zone");
  return {
    query: params.get("q")?.trim() ?? "",
    openNow: params.get("open") === "1",
    isHalal: params.get("halal") === "1",
    isVeganFriendly: params.get("vegan") === "1",
    isCafe: params.get("cafe") === "1",
    cuisines: uniqueSorted(
      cuisineValues.filter((value): value is CuisineKey =>
        (CUISINE_KEYS as string[]).includes(value),
      ),
    ),
    zones: uniqueSorted(
      zoneValues.filter((value): value is MapZoneKey =>
        (MAP_ZONE_KEYS as string[]).includes(value),
      ),
    ),
  };
}

export function serializeVenueFilters(filters: VenueFilters): string {
  const params = new URLSearchParams();
  const query = filters.query.trim();
  if (query) params.set("q", query);
  if (filters.openNow) params.set("open", "1");
  if (filters.isHalal) params.set("halal", "1");
  if (filters.isVeganFriendly) params.set("vegan", "1");
  if (filters.isCafe) params.set("cafe", "1");
  uniqueSorted(filters.cuisines).forEach((value) =>
    params.append("cuisine", value),
  );
  uniqueSorted(filters.zones).forEach((value) => params.append("zone", value));
  return params.toString();
}

export function filterVenues(
  venues: Venue[],
  filters: VenueFilters,
  now: Date = new Date(),
): Venue[] {
  const query = filters.query.trim().toLocaleLowerCase();

  return venues.filter((venue) => {
    if (venue.status !== "published") return false;
    const searchable = [venue.name, ...venue.cuisines]
      .join(" ")
      .toLocaleLowerCase();
    if (query && !searchable.includes(query)) return false;
    if (filters.openNow && !isOpenNow(venue.hours, now)) return false;
    if (filters.isHalal && !venue.isHalal) return false;
    if (filters.isVeganFriendly && !venue.isVeganFriendly) return false;
    if (filters.isCafe && venue.type !== "cafe") return false;
    if (
      filters.cuisines.length > 0 &&
      !filters.cuisines.some((cuisine) => venue.cuisines.includes(cuisine))
    ) {
      return false;
    }
    if (
      filters.zones.length > 0 &&
      !filters.zones.some((key) => pointInMapZone(venue.lng, venue.lat, key))
    ) {
      return false;
    }
    return true;
  });
}

export function countUnknownHours(
  venues: Venue[],
  filters: VenueFilters,
): number {
  if (!filters.openNow) return 0;
  return filterVenues(venues, { ...filters, openNow: false }).filter((venue) =>
    isHoursUnknown(venue.hours),
  ).length;
}
