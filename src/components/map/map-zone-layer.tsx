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
const STREET_LINE_CASEMENT_ID = "map-zones-street-line-casement";
const STREET_LINE_CORE_ID = "map-zones-street-line-core";
const BUILDING_FILL_ID = "map-zones-building-fill";
const BUILDING_FILL_LINE_ID = "map-zones-building-fill-line";
const LABEL_LAYER_ID = "map-zones-label";

export const MAP_ZONE_LAYER_IDS = [
  HIT_LAYER_ID,
  STREET_LINE_CASEMENT_ID,
  STREET_LINE_CORE_ID,
  BUILDING_FILL_ID,
  BUILDING_FILL_LINE_ID,
  LABEL_LAYER_ID,
] as const;

export const MAP_ZONE_CLICK_LAYER_IDS = [
  HIT_LAYER_ID,
  BUILDING_FILL_ID,
  STREET_LINE_CORE_ID,
  STREET_LINE_CASEMENT_ID,
  LABEL_LAYER_ID,
] as const;

const CHERRY = "#9D2235";
const CHERRY_SOFT = "#F8ECEF";

/** One color per zone (retro-HUD redesign) instead of every zone sharing cherry. */
const ZONE_FILL_MATCH = [
  "match",
  ["get", "zoneKey"],
  ...MAP_ZONE_KEYS.flatMap((key) => [key, MAP_ZONES[key].color]),
  CHERRY,
] as unknown as string;

const ZONE_SOFT_MATCH = [
  "match",
  ["get", "zoneKey"],
  ...MAP_ZONE_KEYS.flatMap((key) => [key, MAP_ZONES[key].soft]),
  CHERRY_SOFT,
] as unknown as string;

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
 * Overview-only zone overlays. `streetLine` corridors and `buildingFill`
 * washes are drawn together. Hidden once a zone is selected so pins
 * can take over.
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
        id: BUILDING_FILL_ID,
        type: "fill",
        source: SOURCE_ID,
        filter: ["==", ["get", "role"], MAP_ZONE_GEOJSON_ROLE.buildingFill],
        paint: {
          "fill-color": ZONE_SOFT_MATCH,
          "fill-opacity": 0.88,
        },
      },
      beforeIdFor(map, BUILDING_FILL_ID),
    );

    map.addLayer(
      {
        id: BUILDING_FILL_LINE_ID,
        type: "line",
        source: SOURCE_ID,
        filter: ["==", ["get", "role"], MAP_ZONE_GEOJSON_ROLE.buildingFill],
        paint: {
          "line-color": ZONE_FILL_MATCH,
          "line-width": 1.6,
          "line-opacity": 0.95,
        },
      },
      beforeIdFor(map, BUILDING_FILL_LINE_ID),
    );

    map.addLayer(
      {
        id: STREET_LINE_CASEMENT_ID,
        type: "line",
        source: SOURCE_ID,
        filter: ["==", ["get", "role"], MAP_ZONE_GEOJSON_ROLE.streetLine],
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": ZONE_SOFT_MATCH,
          "line-width": ["interpolate", ["linear"], ["zoom"], 14, 10, 16, 18],
          "line-opacity": 0.95,
        },
      },
      beforeIdFor(map, STREET_LINE_CASEMENT_ID),
    );

    map.addLayer(
      {
        id: STREET_LINE_CORE_ID,
        type: "line",
        source: SOURCE_ID,
        filter: ["==", ["get", "role"], MAP_ZONE_GEOJSON_ROLE.streetLine],
        layout: {
          "line-cap": "butt",
          "line-join": "round",
        },
        paint: {
          "line-color": ZONE_FILL_MATCH,
          "line-width": ["interpolate", ["linear"], ["zoom"], 14, 4, 16, 7],
          // A dashed core reads as a pixel-drawn road stripe rather than a
          // solid modern line — part of the Y2K reference's aesthetic.
          "line-dasharray": [2, 1.6],
        },
      },
      beforeIdFor(map, STREET_LINE_CORE_ID),
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
