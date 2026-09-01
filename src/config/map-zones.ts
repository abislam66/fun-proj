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
 *   Liacouras Walk — 1902–1938 stretch of the walk, not 1940 Residence Hall)
 *
 * Cecil B. Moore Ave and N Broad St (added 2026-08-27) are approximate
 * straight-line corridors, not hand-traced like the original 8 — added
 * once enough real venues clustered along those streets to be worth their
 * own filter chip, with a known lower-precision street-line/label overlay
 * in map-zones.geojson (see that file's *-street features for these two).
 *
 * Student Center, Liacouras Walk, Richie's Cafe, and Cecil B. Moore Ave
 * were all widened 2026-08-30 (see each zone's own description) after a
 * coordinate-correction pass revealed real venues sitting just outside
 * the original, narrower boundaries.
 */

/** How a map zone is drawn at campus overview. */
export const MAP_ZONE_MARK = {
  streetLine: "streetLine",
  buildingFill: "buildingFill",
} as const;

export type MapZoneMark = (typeof MAP_ZONE_MARK)[keyof typeof MAP_ZONE_MARK];

/**
 * Retro-HUD redesign (branch: map-ui-pixel-hud) — each zone gets its own
 * badge color + glyph so the campus overview reads like a game map's
 * region key, instead of every zone sharing one cherry hue. `color` is
 * the zone's own signature hue (badge/pin fill); `soft` is a lighter
 * wash for the overview building-fill layer. `icon` picks which glyph
 * `zone-label-icon.ts` bakes into the badge: "truck" for the two food-
 * truck corridors, "walk" for the pedestrian walk, "cap" for the
 * Student Center (campus-life hub), "binoculars" for Vantage & The View
 * ("the view"), "cup" for Richie's Cafe, "star" as the generic default
 * for the street corridors that don't have their own landmark glyph.
 */
export type MapZoneIcon =
  | "star"
  | "truck"
  | "walk"
  | "food"
  | "cap"
  | "binoculars"
  | "cup";

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
    color: "#4a7856",
    soft: "#dcede1",
    icon: "cap" as MapZoneIcon,
    description:
      "N 13th Street and W Montgomery Avenue wrapping the Student Center. " +
      "Widened 2026-08-30 from a notched L-shape to a full rectangle — the " +
      "notch cut off the food court's own real geocoded entrance and the " +
      "Montgomery-Ave curbside trucks right outside it. West edge pushed " +
      "further out the same day to also reach E&E Gourmet Express and the " +
      "curbside truck in front of SAC, both just outside the first widening " +
      "— stops 8m short of w-montgomery's east edge so the two zones still " +
      "don't touch. East edge nudged out ~4m the same day to also reach " +
      "Rock N Rolls, which geocodes just past the original edge — still " +
      "clears vantage-view's west edge by ~8m.",
    sort: 1,
    mark: MAP_ZONE_MARK.streetLine,
    padding: 56,
    membership: [
      [-75.1561, 39.97868],
      [-75.1561, 39.98038],
      [-75.15428, 39.98038],
      [-75.15428, 39.97868],
      [-75.1561, 39.97868],
    ] as LngLat[],
  },
  "w-montgomery": {
    key: "w-montgomery",
    label: "W Montgomery",
    color: "#c15a82",
    soft: "#f8e1ec",
    icon: "star" as MapZoneIcon,
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
    color: "#4c6fa0",
    soft: "#dee7f5",
    icon: "binoculars" as MapZoneIcon,
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
    color: "#8b6544",
    soft: "#efe2d3",
    icon: "star" as MapZoneIcon,
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
    color: "#3f8e8a",
    soft: "#d9f0ee",
    icon: "truck" as MapZoneIcon,
    description:
      "N 12th Street west of Engineering and SERC. East edge pushed out " +
      "2026-08-30 to also reach Penn Halal Gyro 2.0, just past the original " +
      "edge — stays adjacent to, not overlapping, the-wall to its south.",
    sort: 4,
    mark: MAP_ZONE_MARK.streetLine,
    padding: 64,
    membership: [
      [-75.15408, 39.9813],
      [-75.15408, 39.98274],
      [-75.1528, 39.98274],
      [-75.1528, 39.9813],
      [-75.15408, 39.9813],
    ] as LngLat[],
  },
  "tyler-trucks": {
    key: "tyler-trucks",
    label: "Tyler trucks",
    color: "#c99a3b",
    soft: "#f7ebd0",
    icon: "truck" as MapZoneIcon,
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
    color: "#c1618a",
    soft: "#f8e3ed",
    icon: "cup" as MapZoneIcon,
    description:
      "Richie's Cafe on W Berks — the cafe footprint only, not Facilities. " +
      "Given a NE lobe 2026-08-30 to also reach Land of A Thousand Hills " +
      "Coffee, further east on the same block — the lobe only exists north " +
      "of the original box (above Facilities' latitude) so it reaches the " +
      "coffee shop without ever widening at Facilities' own latitude.",
    sort: 7,
    mark: MAP_ZONE_MARK.buildingFill,
    padding: 64,
    membership: [
      [-75.15155, 39.98043],
      [-75.15155, 39.9811],
      [-75.1503, 39.9811],
      [-75.1503, 39.9808],
      [-75.15122, 39.9808],
      [-75.15122, 39.98043],
      [-75.15155, 39.98043],
    ] as LngLat[],
  },
  "liacouras-walk": {
    key: "liacouras-walk",
    label: "Liacouras Walk",
    color: "#8a6bb0",
    soft: "#eae1f5",
    icon: "walk" as MapZoneIcon,
    description:
      "1902–1938 N. Liacouras Walk — this stretch of the walkway, not 1940 " +
      "Residence Hall. Extended south 2026-08-30 to also cover 1902/1912 " +
      "further down the same walk, not just 1926–1938. East edge pushed out " +
      "the same day to also reach Stella's, sitting just past the original " +
      "east edge — the widened zone's latitude band never overlaps Student " +
      "Center's, so no new overlap is possible.",
    sort: 8,
    mark: MAP_ZONE_MARK.buildingFill,
    padding: 56,
    membership: [
      [-75.15616, 39.9816],
      [-75.15616, 39.982635],
      [-75.1555, 39.982635],
      [-75.1555, 39.9816],
      [-75.15616, 39.9816],
    ] as LngLat[],
  },
  "cecil-b-moore": {
    key: "cecil-b-moore",
    label: "Cecil B. Moore Ave",
    color: "#b5383f",
    soft: "#f5dcdd",
    icon: "star" as MapZoneIcon,
    description:
      "Cecil B. Moore Avenue between roughly 17th and 14th — approximate corridor, not hand-traced like the other zones. " +
      "South edge pushed down 2026-08-30 to also reach Oh Brother and Tropical Smoothie Cafe, both just south of the original edge near the Broad St corner.",
    sort: 9,
    mark: MAP_ZONE_MARK.streetLine,
    padding: 64,
    membership: [
      [-75.1638, 39.9777],
      [-75.1638, 39.98],
      [-75.158, 39.98],
      [-75.158, 39.9777],
      [-75.1638, 39.9777],
    ] as LngLat[],
  },
  "broad-st": {
    key: "broad-st",
    label: "N Broad St",
    color: "#7a2338",
    soft: "#f0dce1",
    icon: "star" as MapZoneIcon,
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
