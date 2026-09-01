import { MAP_ZONES, type MapZoneKey } from "@/config/map-zones";
import { OTHER_MAP_ZONE } from "@/lib/venues";

export type AdminVenueZoneFilter =
  | "all"
  | MapZoneKey
  | typeof OTHER_MAP_ZONE
  | "unset";

export type AdminVenueSort = "updated" | "name" | "zone";

export type AdminVenueListRow = {
  name: string;
  slug: string;
  status: string;
  mapZone: string | null;
  updatedAt: Date;
};

export function adminVenueZoneLabel(mapZone: string | null): string {
  if (!mapZone) return "Not set";
  if (mapZone === OTHER_MAP_ZONE) return "Other / Outside mapped zones";
  if (mapZone in MAP_ZONES) return MAP_ZONES[mapZone as MapZoneKey].label;
  return mapZone;
}

/** Canonical zone order: mapped zones by `sort`, then Other, then unset. */
export function adminVenueZoneSortIndex(mapZone: string | null): number {
  if (mapZone && mapZone in MAP_ZONES) {
    return MAP_ZONES[mapZone as MapZoneKey].sort;
  }
  if (mapZone === OTHER_MAP_ZONE) return 100;
  if (!mapZone) return 101;
  return 102;
}

export function matchesAdminVenueZone(
  mapZone: string | null,
  zone: AdminVenueZoneFilter,
): boolean {
  if (zone === "all") return true;
  if (zone === "unset") return !mapZone;
  return mapZone === zone;
}

function compareByName(a: string, b: string): number {
  return a.localeCompare(b, "en", { sensitivity: "base" });
}

export function filterAndSortAdminVenues<T extends AdminVenueListRow>(
  venues: T[],
  {
    search,
    status,
    zone,
    sort,
  }: {
    search: string;
    status: "all" | T["status"];
    zone: AdminVenueZoneFilter;
    sort: AdminVenueSort;
  },
): T[] {
  const query = search.trim().toLowerCase();
  const filtered = venues.filter(
    (venue) =>
      (status === "all" || venue.status === status) &&
      matchesAdminVenueZone(venue.mapZone, zone) &&
      (query.length === 0 ||
        `${venue.name} ${venue.slug}`.toLowerCase().includes(query)),
  );

  return [...filtered].sort((a, b) => {
    if (sort === "name") {
      return compareByName(a.name, b.name);
    }
    if (sort === "zone") {
      const zoneDelta =
        adminVenueZoneSortIndex(a.mapZone) - adminVenueZoneSortIndex(b.mapZone);
      if (zoneDelta !== 0) return zoneDelta;
      return compareByName(a.name, b.name);
    }
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}
