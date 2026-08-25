"use client";

import { useEffect, useRef } from "react";
import type { Map as MapLibreMap, MapGeoJSONFeature } from "maplibre-gl";

import {
  MAP_ZONE_GEOJSON_ROLE,
  MAP_ZONE_GEOJSON_URL,
  MAP_ZONE_KEYS,
  type MapZoneKey,
} from "@/config/map-zones";
import {
  buildZoneLabelIcon,
  ZONE_LABEL_ICON,
} from "@/lib/map/zone-label-icon";

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
const CHERRY_DEEP = "#6E1826";

function firstSymbolLayerId(map: MapLibreMap): string | undefined {
  const layers = map.getStyle().layers ?? [];
  return layers.find((layer) => layer.type === "symbol")?.id;
}

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
  selectedKey,
  onSelect,
}: {
  map: MapLibreMap | null;
  selectedKey: MapZoneKey | null;
  onSelect: (key: MapZoneKey) => void;
}) {
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (!map) return;

    if (map.getSource(SOURCE_ID)) {
      for (const id of [...MAP_ZONE_LAYER_IDS].reverse()) {
        if (map.getLayer(id)) map.removeLayer(id);
      }
      map.removeSource(SOURCE_ID);
    }

    if (map.hasImage(ZONE_LABEL_ICON)) {
      map.removeImage(ZONE_LABEL_ICON);
    }
    const plate = buildZoneLabelIcon();
    map.addImage(ZONE_LABEL_ICON, plate, {
      pixelRatio: plate.pixelRatio,
      content: plate.content,
      stretchX: plate.stretchX,
      stretchY: plate.stretchY,
    });

    map.addSource(SOURCE_ID, {
      type: "geojson",
      data: MAP_ZONE_GEOJSON_URL,
    });

    const beforeId = firstSymbolLayerId(map);

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
      beforeId,
    );

    map.addLayer(
      {
        id: BUILDING_FILL_ID,
        type: "fill",
        source: SOURCE_ID,
        filter: ["==", ["get", "role"], MAP_ZONE_GEOJSON_ROLE.buildingFill],
        paint: {
          "fill-color": CHERRY_SOFT,
          "fill-opacity": 0.88,
        },
      },
      beforeId,
    );

    map.addLayer(
      {
        id: BUILDING_FILL_LINE_ID,
        type: "line",
        source: SOURCE_ID,
        filter: ["==", ["get", "role"], MAP_ZONE_GEOJSON_ROLE.buildingFill],
        paint: {
          "line-color": CHERRY,
          "line-width": 1.6,
          "line-opacity": 0.95,
        },
      },
      beforeId,
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
          "line-color": CHERRY_SOFT,
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            14,
            10,
            16,
            18,
          ],
          "line-opacity": 0.95,
        },
      },
      beforeId,
    );

    map.addLayer(
      {
        id: STREET_LINE_CORE_ID,
        type: "line",
        source: SOURCE_ID,
        filter: ["==", ["get", "role"], MAP_ZONE_GEOJSON_ROLE.streetLine],
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": CHERRY,
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            14,
            4,
            16,
            7,
          ],
        },
      },
      beforeId,
    );

    map.addLayer({
      id: LABEL_LAYER_ID,
      type: "symbol",
      source: SOURCE_ID,
      filter: ["==", ["get", "role"], MAP_ZONE_GEOJSON_ROLE.label],
      layout: {
        "icon-image": ZONE_LABEL_ICON,
        "icon-text-fit": "both",
        "icon-text-fit-padding": [5, 10, 5, 10],
        "icon-allow-overlap": true,
        "icon-padding": 0,
        "icon-anchor": "center",
        "text-field": ["get", "label"],
        "text-font": ["Noto Sans Bold"],
        "text-size": [
          "interpolate",
          ["linear"],
          ["zoom"],
          14,
          12,
          16,
          14,
        ],
        "text-anchor": "center",
        "text-allow-overlap": true,
        "text-padding": 2,
        "symbol-sort-key": ["get", "sort"],
      },
      paint: {
        "text-color": CHERRY_DEEP,
      },
    });

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
    };
  }, [map]);

  useEffect(() => {
    if (!map || !map.getSource(SOURCE_ID)) return;
    setOverviewVisible(map, selectedKey === null);
  }, [map, selectedKey]);

  return null;
}
