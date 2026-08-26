import { MAP_ZONES, type LngLat, type MapZoneKey } from "@/config/map-zones";

/**
 * Ray-casting. The last vertex may repeat the first (GeoJSON rings);
 * a zero-length edge is skipped.
 */
export function pointInRing(lng: number, lat: number, ring: LngLat[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const current = ring[i];
    const previous = ring[j];
    if (!current || !previous) continue;
    const [xi, yi] = current;
    const [xj, yj] = previous;
    if (yi === yj && xi === xj) continue;
    const intersect =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function mapZoneContaining(lng: number, lat: number): MapZoneKey | null {
  for (const key of Object.keys(MAP_ZONES) as MapZoneKey[]) {
    if (pointInRing(lng, lat, [...MAP_ZONES[key].membership])) return key;
  }
  return null;
}

export function pointInMapZone(
  lng: number,
  lat: number,
  key: MapZoneKey,
): boolean {
  return pointInRing(lng, lat, [...MAP_ZONES[key].membership]);
}
