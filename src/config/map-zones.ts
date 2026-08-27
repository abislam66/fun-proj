/**
 * Map-only campus zones — the single source of truth for venue zones as
 * of 2026-08-26 (`venues.map_zone` stores one of these keys, or the
 * admin-only "other" sentinel from `lib/venues.ts`, which is deliberately
 * not a key here so it can't leak into the public filter bar).
 *
 * Two marks, used together on the campus overview:
 * - `MAP_ZONE_MARK.streetLine` — cherry corridor (Student Center, W Montgomery,
 *   SERC trucks, Tyler trucks, Cecil B. Moore Ave, N Broad St)
 * - `MAP_ZONE_MARK.buildingFill` — cherry wash (Vantage & The View buildings;
 *   The Wall plaza west of Anderson Hall — not Anderson itself;
 *   Richie's Cafe — that footprint only, not Facilities;
 *   Liacouras Walk — 1926–1938 building only, not 1940 Residence Hall)
 *
 * Cecil B. Moore Ave and N Broad St (added 2026-08-27) are approximate
 * straight-line corridors, not hand-traced like the original 8 — added
 * once enough real venues clustered along those streets to be worth their
 * own filter chip, with a known lower-precision street-line/label overlay
 * in map-zones.geojson (see that file's *-street features for these two).
 */

/** How a map zone is drawn at campus overview. */
export const MAP_ZONE_MARK = {
  streetLine: "streetLine",
  buildingFill: "buildingFill",
} as const;

export type MapZoneMark = (typeof MAP_ZONE_MARK)[keyof typeof MAP_ZONE_MARK];

/** GeoJSON `role` values in `public/maps/map-zones.geojson`. */
export const MAP_ZONE_GEOJSON_ROLE = {
  membership: "membership",
  streetLine: "street-line",
  buildingFill: "building-fill",
  label: "label",
} as const;

export const MAP_ZONE_GEOJSON_URL = "/maps/map-zones.geojson";

/** Below this zoom, a selected zone returns to the campus overview. */
export const MAP_ZONE_OVERVIEW_MAX_ZOOM = 15.2;

export type LngLat = [number, number];

export const MAP_ZONES = {
  "student-center": {
    key: "student-center",
    label: "Student Center",
    description:
      "N 13th Street and W Montgomery Avenue wrapping the Student Center.",
    sort: 1,
    mark: MAP_ZONE_MARK.streetLine,
    padding: 56,
    membership: [
      [-75.1555, 39.97868],
      [-75.1555, 39.98038],
      [-75.15438, 39.98038],
      [-75.15438, 39.97986],
      [-75.15536, 39.97986],
      [-75.15536, 39.97868],
      [-75.1555, 39.97868],
    ] as LngLat[],
  },
  "w-montgomery": {
    key: "w-montgomery",
    label: "W Montgomery",
    description:
      "W Montgomery Avenue along Klein Law, stopping short of the Student Center zone at 13th.",
    sort: 5,
    mark: MAP_ZONE_MARK.streetLine,
    padding: 56,
    membership: [
      [-75.1575, 39.98008],
      [-75.1575, 39.98038],
      [-75.1562, 39.98022],
      [-75.1562, 39.97992],
      [-75.1575, 39.98008],
    ] as LngLat[],
  },
  "vantage-view": {
    key: "vantage-view",
    label: "Vantage & The View",
    description: "The Vantage and The View buildings.",
    sort: 2,
    mark: MAP_ZONE_MARK.buildingFill,
    padding: 56,
    membership: [
      [-75.15418, 39.97808],
      [-75.15418, 39.97974],
      [-75.15232, 39.97974],
      [-75.15232, 39.97808],
      [-75.15418, 39.97808],
    ] as LngLat[],
  },
  "the-wall": {
    key: "the-wall",
    label: "The Wall",
    description:
      "12th Street vendor-pad plaza immediately west of Anderson Hall, not the hall itself.",
    sort: 3,
    mark: MAP_ZONE_MARK.buildingFill,
    padding: 64,
    membership: [
      [-75.15355, 39.98058],
      [-75.15355, 39.9812],
      [-75.15316, 39.9812],
      [-75.15316, 39.98058],
      [-75.15355, 39.98058],
    ] as LngLat[],
  },
  "serc-trucks": {
    key: "serc-trucks",
    label: "SERC trucks",
    description: "N 12th Street west of Engineering and SERC.",
    sort: 4,
    mark: MAP_ZONE_MARK.streetLine,
    padding: 64,
    membership: [
      [-75.15408, 39.9813],
      [-75.15408, 39.98274],
      [-75.15316, 39.98274],
      [-75.15316, 39.9813],
      [-75.15408, 39.9813],
    ] as LngLat[],
  },
  "tyler-trucks": {
    key: "tyler-trucks",
    label: "Tyler trucks",
    description:
      "W Norris Street from Tomlinson through Presser Hall, ending just before Tyler’s east edge.",
    sort: 6,
    mark: MAP_ZONE_MARK.streetLine,
    padding: 56,
    membership: [
      [-75.1555, 39.98288],
      [-75.1555, 39.9832],
      [-75.15334, 39.98294],
      [-75.15334, 39.98276],
      [-75.1555, 39.98288],
    ] as LngLat[],
  },
  "richies-cafe": {
    key: "richies-cafe",
    label: "Richie's Cafe",
    description:
      "Richie's Cafe on W Berks — the cafe footprint only, not Facilities.",
    sort: 7,
    mark: MAP_ZONE_MARK.buildingFill,
    padding: 64,
    membership: [
      [-75.15155, 39.98043],
      [-75.15155, 39.9808],
      [-75.15122, 39.9808],
      [-75.15122, 39.98043],
      [-75.15155, 39.98043],
    ] as LngLat[],
  },
  "liacouras-walk": {
    key: "liacouras-walk",
    label: "Liacouras Walk",
    description:
      "1926–1938 N. Liacouras Walk — that building only, not 1940 Residence Hall.",
    sort: 8,
    mark: MAP_ZONE_MARK.buildingFill,
    padding: 56,
    membership: [
      [-75.15616, 39.98216],
      [-75.15616, 39.982635],
      [-75.15585, 39.982635],
      [-75.15585, 39.98216],
      [-75.15616, 39.98216],
    ] as LngLat[],
  },
  "cecil-b-moore": {
    key: "cecil-b-moore",
    label: "Cecil B. Moore Ave",
    description:
      "Cecil B. Moore Avenue between roughly 17th and 14th — approximate corridor, not hand-traced like the other zones.",
    sort: 9,
    mark: MAP_ZONE_MARK.streetLine,
    padding: 64,
    membership: [
      [-75.1638, 39.9782],
      [-75.1638, 39.98],
      [-75.158, 39.98],
      [-75.158, 39.9782],
      [-75.1638, 39.9782],
    ] as LngLat[],
  },
  "broad-st": {
    key: "broad-st",
    label: "N Broad St",
    description:
      "N Broad Street from roughly Cecil B. Moore north to Susquehanna — approximate corridor (interpolated between two real geocoded points, Morgan Hall at 1601 and the McDonald's at 2109), not hand-traced like the other zones. Narrower south of Diamond St (~39.984) because Broad runs close enough to the campus core there to threaten the deliberate gaps other zones carve out (e.g. between Klein Law and Student Center, and west of the 1940 Residence Hall); wider north of that where there's no such conflict.",
    sort: 10,
    mark: MAP_ZONE_MARK.streetLine,
    padding: 64,
    membership: [
      [-75.158, 39.9784],
      [-75.158, 39.988],
      [-75.1548, 39.988],
      [-75.1548, 39.984],
      [-75.1568, 39.984],
      [-75.1568, 39.9784],
      [-75.158, 39.9784],
    ] as LngLat[],
  },
} as const;

export type MapZoneKey = keyof typeof MAP_ZONES;

export const MAP_ZONE_KEYS = Object.keys(MAP_ZONES) as MapZoneKey[];

/** Filter / search order — follows each zone's `sort` field. */
export const MAP_ZONE_KEYS_SORTED = [...MAP_ZONE_KEYS].sort(
  (a, b) => MAP_ZONES[a].sort - MAP_ZONES[b].sort,
);

export function mapZoneKeysByMark(mark: MapZoneMark): MapZoneKey[] {
  return MAP_ZONE_KEYS.filter((key) => MAP_ZONES[key].mark === mark);
}

export function mapZoneBounds(key: MapZoneKey): {
  west: number;
  south: number;
  east: number;
  north: number;
} {
  const ring = MAP_ZONES[key].membership;
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  for (const [lng, lat] of ring) {
    if (lng < west) west = lng;
    if (lng > east) east = lng;
    if (lat < south) south = lat;
    if (lat > north) north = lat;
  }
  return { west, south, east, north };
}
