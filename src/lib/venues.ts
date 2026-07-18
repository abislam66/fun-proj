import type { CuisineKey } from "@/config/cuisines";
import type { ZoneKey } from "@/config/zones";
import { isHoursUnknown, isOpenNow, type VenueHours } from "@/lib/hours";

export type VenueType = "truck" | "restaurant" | "cafe" | "vending";
export type PaymentFilter = "cash" | "card";

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
  zones: ZoneKey[];
  payments: PaymentFilter[];
}

export const EMPTY_VENUE_FILTERS: VenueFilters = {
  query: "",
  openNow: false,
  cuisines: [],
  zones: [],
  payments: [],
};

function uniqueSorted<T extends string>(values: T[]): T[] {
  return [...new Set(values)].sort();
}

export function parseVenueFilters(params: URLSearchParams): VenueFilters {
  const cuisineValues = params.getAll("cuisine");
  const zoneValues = params.getAll("zone");
  const paymentValues = params.getAll("payment");
  const cuisineKeys: CuisineKey[] = [
    "american",
    "caribbean",
    "chinese",
    "fruit",
    "halal",
    "mexican",
    "other",
  ];
  const zoneKeys: ZoneKey[] = ["norris", "montgomery", "twelfth", "other"];

  return {
    query: params.get("q")?.trim() ?? "",
    openNow: params.get("open") === "1",
    cuisines: uniqueSorted(
      cuisineValues.filter((value): value is CuisineKey =>
        cuisineKeys.includes(value as CuisineKey),
      ),
    ),
    zones: uniqueSorted(
      zoneValues.filter((value): value is ZoneKey =>
        zoneKeys.includes(value as ZoneKey),
      ),
    ),
    payments: uniqueSorted(
      paymentValues.filter(
        (value): value is PaymentFilter => value === "cash" || value === "card",
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
  uniqueSorted(filters.payments).forEach((value) =>
    params.append("payment", value),
  );
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
      (!venue.zoneKey || !filters.zones.includes(venue.zoneKey))
    ) {
      return false;
    }
    if (filters.payments.includes("cash") && venue.acceptsCash !== true) {
      return false;
    }
    if (filters.payments.includes("card") && venue.acceptsCard !== true) {
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
