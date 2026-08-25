"use client";

import { useEffect } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";

import { CAMPUS_DINING_MARKERS } from "@/config/campus-dining";
import {
  buildDiningPillIcon,
  DINING_PILL_ICON,
} from "@/lib/map/venue-pill-icon";

const SOURCE_ID = "campus-dining";
export const CAMPUS_DINING_LAYER_ID = "campus-dining-symbol";

function firstSymbolLayerId(map: MapLibreMap): string | undefined {
  const layers = map.getStyle().layers ?? [];
  return layers.find((layer) => layer.type === "symbol")?.id;
}

const FEATURE_COLLECTION = {
  type: "FeatureCollection" as const,
  features: CAMPUS_DINING_MARKERS.map((marker) => ({
    type: "Feature" as const,
    geometry: {
      type: "Point" as const,
      coordinates: [marker.lng, marker.lat],
    },
    properties: { id: marker.id, label: marker.label },
  })),
};

/**
 * One neutral info pin per meal-plan dining building (config/campus-dining.ts):
 * white pill, stone border, ink-secondary regular text. Deliberately not a
 * venue pill — no cherry, no hover, no click, no mini-card — it only names
 * what the building holds, since meal-plan dining is out of scope.
 *
 * Mounted between CampusBuildingLayer and VenuePillLayer (venue-map.tsx),
 * and inserted ahead of the base style's symbol layers, so the collision
 * order ends up: venue pills → dining pins → base labels → building
 * labels. Unlike venue pills these do NOT allow overlap: when a truck
 * pill covers a dining pin, the dining pin hides — info pins never
 * compete with decision info.
 */
export function CampusDiningLayer({
  map,
  visible = true,
}: {
  map: MapLibreMap | null;
  visible?: boolean;
}) {
  useEffect(() => {
    if (!map || map.getSource(SOURCE_ID)) return;

    // Style readiness is guaranteed for the same reason as VenuePillLayer:
    // the map is only handed down after its one-time "load" event.
    if (!map.hasImage(DINING_PILL_ICON)) {
      const asset = buildDiningPillIcon();
      map.addImage(DINING_PILL_ICON, asset, {
        pixelRatio: asset.pixelRatio,
        content: asset.content,
        stretchX: asset.stretchX,
        stretchY: asset.stretchY,
      });
    }

    map.addSource(SOURCE_ID, {
      type: "geojson",
      data: FEATURE_COLLECTION,
    });

    map.addLayer(
      {
        id: CAMPUS_DINING_LAYER_ID,
        type: "symbol",
        source: SOURCE_ID,
        layout: {
          "icon-image": DINING_PILL_ICON,
          "icon-text-fit": "both",
          "icon-text-fit-padding": [1, 3, 1, 3],
          "icon-padding": 0,
          "icon-anchor": "bottom",
          visibility: "none",
          "text-field": ["get", "label"],
          // Regular weight where venue pills are bold — quieter on purpose.
          "text-font": ["Noto Sans Regular"],
          // Same zoom curve as venue pills so the two pill families scale
          // together instead of swapping visual dominance mid-zoom.
          "text-size": [
            "interpolate",
            ["linear"],
            ["zoom"],
            14,
            7,
            15.5,
            8.5,
            17,
            10.5,
            18.5,
            13,
          ],
          "text-max-width": 7,
          "text-line-height": 1.1,
          "text-padding": 1,
          "text-anchor": "bottom",
        },
        paint: {
          "text-color": "#57534E",
        },
      },
      firstSymbolLayerId(map),
    );

    return () => {
      if (!map.getStyle()) return;
      if (map.getLayer(CAMPUS_DINING_LAYER_ID))
        map.removeLayer(CAMPUS_DINING_LAYER_ID);
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
    };
  }, [map]);

  useEffect(() => {
    if (!map?.getLayer(CAMPUS_DINING_LAYER_ID)) return;
    map.setLayoutProperty(
      CAMPUS_DINING_LAYER_ID,
      "visibility",
      visible ? "visible" : "none",
    );
  }, [map, visible]);

  return null;
}
