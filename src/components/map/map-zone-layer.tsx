"use client";

import { useEffect, useRef } from "react";
import type { Map as MapLibreMap, MapGeoJSONFeature } from "maplibre-gl";

import {
  MAP_ZONES,
  MAP_ZONE_GEOJSON_ROLE,
  MAP_ZONE_GEOJSON_URL,
  MAP_ZONE_KEYS,
  type MapZoneKey,
} from "@/config/map-zones";
import {
  buildZoneLabelIcon,
  ZONE_LABEL_ICON_PREFIX,
  zoneLabelIconId,
} from "@/lib/map/zone-label-icon";
import { beforeIdFor, liftOverlaysAboveBasemap } from "@/lib/map/overlay-order";

const SOURCE_ID = "map-zones";
const HIT_LAYER_ID = "map-zones-hit";
const LABEL_LAYER_ID = "map-zones-label";

export const MAP_ZONE_LAYER_IDS = [HIT_LAYER_ID, LABEL_LAYER_ID] as const;

export const MAP_ZONE_CLICK_LAYER_IDS = [
  HIT_LAYER_ID,
  LABEL_LAYER_ID,
] as const;

const CHERRY = "#9D2235";

function zoneKeyFromFeatures(
  features: MapGeoJSONFeature[] | undefined,
): MapZoneKey | null {
  const key = features?.[0]?.properties?.zoneKey;
  if (typeof key === "string" && (MAP_ZONE_KEYS as string[]).includes(key)) {
    return key as MapZoneKey;
  }
  return null;
}

function setVisible(map: MapLibreMap, id: string, visible: boolean) {
  if (!map.getLayer(id)) return;
  map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
}

function setOverviewVisible(map: MapLibreMap, overview: boolean) {
  for (const id of MAP_ZONE_LAYER_IDS) {
    setVisible(map, id, overview);
  }
}

/**
 * Overview-only zone marks. 2026-09-04: the visible `streetLine` corridors
 * and `buildingFill` washes/outlines were removed — only two layers still
 * render: an invisible hit-fill (`HIT_LAYER_ID`, for click-to-select) and
 * the badge/label plate (`LABEL_LAYER_ID`). The underlying geometry (each
 * zone's `membership` ring, and `map-zones.geojson`'s `street-line`/
 * `building-fill` features) is untouched — filtering, click-to-select, and
 * the badge counts all still work exactly as before; only the drawn
 * fill/outline/dashed-line shapes are gone. Hidden entirely once a zone is
 * selected so pins can take over.
 */
export function MapZoneLayer({
  map,
  zonesActive,
  zoneCounts,
  onSelect,
}: {
  map: MapLibreMap | null;
  /** Any zone filter active → the overview marks hide (pills take over). */
  zonesActive: boolean;
  /** Live "N spots" count per zone, baked into each badge (see venue-map.tsx). */
  zoneCounts: Record<MapZoneKey, number>;
  onSelect: (key: MapZoneKey) => void;
}) {
  const onSelectRef = useRef(onSelect);
  const zoneCountsRef = useRef(zoneCounts);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    zoneCountsRef.current = zoneCounts;
  }, [zoneCounts]);

  useEffect(() => {
    if (!map) return;

    if (map.getSource(SOURCE_ID)) {
      for (const id of [...MAP_ZONE_LAYER_IDS].reverse()) {
        if (map.getLayer(id)) map.removeLayer(id);
      }
      map.removeSource(SOURCE_ID);
    }

    for (const key of MAP_ZONE_KEYS) {
      const imageId = zoneLabelIconId(key);
      if (map.hasImage(imageId)) map.removeImage(imageId);
      const zone = MAP_ZONES[key];
      const plate = buildZoneLabelIcon(
        zone.label,
        zoneCountsRef.current[key] ?? 0,
        zone.color,
        zone.icon,
      );
      map.addImage(imageId, plate, { pixelRatio: plate.pixelRatio });
    }

    map.addSource(SOURCE_ID, {
      type: "geojson",
      data: MAP_ZONE_GEOJSON_URL,
    });

    map.addLayer(
      {
        id: HIT_LAYER_ID,
        type: "fill",
        source: SOURCE_ID,
        filter: ["==", ["get", "role"], MAP_ZONE_GEOJSON_ROLE.membership],
        paint: {
          "fill-color": CHERRY,
          "fill-opacity": 0.01,
        },
      },
      beforeIdFor(map, HIT_LAYER_ID),
    );

    map.addLayer(
      {
        id: LABEL_LAYER_ID,
        type: "symbol",
        source: SOURCE_ID,
        filter: ["==", ["get", "role"], MAP_ZONE_GEOJSON_ROLE.label],
        layout: {
          "icon-image": ["concat", ZONE_LABEL_ICON_PREFIX, ["get", "zoneKey"]],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
          "icon-overlap": "always",
          "icon-padding": 0,
          "icon-anchor": "bottom",
          "icon-size": [
            "interpolate",
            ["linear"],
            ["zoom"],
            14,
            0.92,
            16,
            14 / 12,
          ],
          "symbol-sort-key": ["get", "sort"],
        },
      },
      beforeIdFor(map, LABEL_LAYER_ID),
    );

    liftOverlaysAboveBasemap(map);

    const onEnter = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const onLeave = () => {
      map.getCanvas().style.cursor = "";
    };
    const onClick = (e: { features?: MapGeoJSONFeature[] }) => {
      const key = zoneKeyFromFeatures(e.features);
      if (key) onSelectRef.current(key);
    };

    for (const id of MAP_ZONE_CLICK_LAYER_IDS) {
      map.on("mouseenter", id, onEnter);
      map.on("mouseleave", id, onLeave);
      map.on("click", id, onClick);
    }

    return () => {
      for (const id of MAP_ZONE_CLICK_LAYER_IDS) {
        map.off("mouseenter", id, onEnter);
        map.off("mouseleave", id, onLeave);
        map.off("click", id, onClick);
      }
      if (!map.getStyle()) return;
      for (const id of [...MAP_ZONE_LAYER_IDS].reverse()) {
        if (map.getLayer(id)) map.removeLayer(id);
      }
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
      for (const key of MAP_ZONE_KEYS) {
        const imageId = zoneLabelIconId(key);
        if (map.hasImage(imageId)) map.removeImage(imageId);
      }
    };
  }, [map]);

  // Re-bake each zone's badge whenever the live spot count changes (filter
  // changes, publish/retire, etc.) — same image id, updated bitmap, so the
  // symbol layer above never needs to be touched.
  useEffect(() => {
    if (!map) return;
    for (const key of MAP_ZONE_KEYS) {
      const imageId = zoneLabelIconId(key);
      if (!map.hasImage(imageId)) continue;
      const zone = MAP_ZONES[key];
      const plate = buildZoneLabelIcon(
        zone.label,
        zoneCounts[key] ?? 0,
        zone.color,
        zone.icon,
      );
      map.updateImage(imageId, plate);
    }
  }, [map, zoneCounts]);

  useEffect(() => {
    if (!map || !map.getSource(SOURCE_ID)) return;
    setOverviewVisible(map, !zonesActive);
  }, [map, zonesActive]);

  return null;
}
