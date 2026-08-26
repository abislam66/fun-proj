import type { CuisineKey } from "@/config/cuisines";
import { MAP_ZONE_KEYS, type MapZoneKey } from "@/config/map-zones";
import type { ZoneKey } from "@/config/zones";
import { isHoursUnknown, isOpenNow, type VenueHours } from "@/lib/hours";
import { pointInMapZone } from "@/lib/map/point-in-polygon";

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
  zoneKey: ZoneKey | null;
  location: string;
  building?: string | null;
  floor?: string | null;
  /** WGS84 latitude — required for map pins. */
  lat: number;
  /** WGS84 longitude — required for map pins. */
  lng: number;
  acceptsCash: boolean | null;
  acceptsCard: boolean | null;
  cuisines: CuisineKey[];
  hours: VenueHours | null;
  lastVerifiedAt: string | null;
}

export interface VenueFilters {
  query: string;
  openNow: boolean;
  cuisines: CuisineKey[];
  zones: MapZoneKey[];
}

export const EMPTY_VENUE_FILTERS: VenueFilters = {
  query: "",
  openNow: false,
  cuisines: [],
  zones: [],
};

function uniqueSorted<T extends string>(values: T[]): T[] {
  return [...new Set(values)].sort();
}

export function parseVenueFilters(params: URLSearchParams): VenueFilters {
  const cuisineValues = params.getAll("cuisine");
  const zoneValues = params.getAll("zone");
  const cuisineKeys: CuisineKey[] = [
    "american",
    "caribbean",
    "chinese",
    "fruit",
    "halal",
    "mexican",
    "other",
  ];
  return {
    query: params.get("q")?.trim() ?? "",
    openNow: params.get("open") === "1",
    cuisines: uniqueSorted(
      cuisineValues.filter((value): value is CuisineKey =>
        cuisineKeys.includes(value as CuisineKey),
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
