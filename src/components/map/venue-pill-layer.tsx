"use client";

import { useEffect, useRef } from "react";
import type {
  GeoJSONSource,
  Map as MapLibreMap,
  MapGeoJSONFeature,
} from "maplibre-gl";

import {
  buildPillIcons,
  PILL_ICON_NORMAL,
  PILL_ICON_SELECTED,
} from "@/lib/map/venue-pill-icon";
import type { Venue } from "@/lib/venues";

const SOURCE_ID = "venue-pills";
export const VENUE_PILL_LAYER_ID = "venue-pills-symbol";

/**
 * MapLibre resolves label collisions in layer order — earlier layers win
 * ties. Venue pins are the primary decision info, so this layer must be
 * inserted ahead of the base style's own labels and the campus building
 * labels (campus-building-layer.tsx), not appended after them.
 */
function firstSymbolLayerId(map: MapLibreMap): string | undefined {
  const layers = map.getStyle().layers ?? [];
  return layers.find((layer) => layer.type === "symbol")?.id;
}

type VenuePillProps = {
  id: string;
  name: string;
  priority: number;
  iconId: string;
  textSize: number;
};

function toFeatureCollection(
  venues: Venue[],
  selectedId: string | null,
  hoveredId: string | null,
) {
  return {
    type: "FeatureCollection" as const,
    features: venues.map((venue, index) => {
      const emphasized = venue.id === selectedId || venue.id === hoveredId;
      const priority =
        venue.id === selectedId ? -2 : venue.id === hoveredId ? -1 : index;
      const properties: VenuePillProps = {
        id: venue.id,
        name: venue.name,
        priority,
        iconId: emphasized ? PILL_ICON_SELECTED : PILL_ICON_NORMAL,
        textSize: emphasized ? 12.5 : 11,
      };
      return {
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [venue.lng, venue.lat],
        },
        properties,
      };
    }),
  };
}

/**
 * Venue markers as a single native MapLibre symbol layer: a 9-slice pill+
 * stem icon (venue-pill-icon.ts) with the venue name fit inside it via
 * icon-text-fit. Collision detection, priority ordering, and zoom-based
 * reveal all come from the GL engine, not custom logic. `icon-optional:
 * false` + `text-optional: true` means a crowded pill falls back to its
 * bare (nameless) form rather than disappearing — the marker stays
 * discoverable even when its name can't fit.
 */
export function VenuePillLayer({
  map,
  venues,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
}: {
  map: MapLibreMap | null;
  venues: Venue[];
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (venueId: string) => void;
  onHover: (venueId: string | null) => void;
}) {
  const onSelectRef = useRef(onSelect);
  const onHoverRef = useRef(onHover);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    onHoverRef.current = onHover;
  }, [onHover]);

  useEffect(() => {
    if (!map || map.getSource(SOURCE_ID)) return;

    // `map` is only ever handed down after the parent's own one-time "load"
    // event already fired (see VenueMap), so the style is guaranteed ready
    // here — no gating on isStyleLoaded()/"load" needed (see venue-map.tsx
    // history: that gate silently dead-ends for late-mounted layers).
    if (!map.hasImage(PILL_ICON_NORMAL) || !map.hasImage(PILL_ICON_SELECTED)) {
      const icons = buildPillIcons();
      if (!map.hasImage(PILL_ICON_NORMAL)) {
        map.addImage(PILL_ICON_NORMAL, icons.normal, {
          pixelRatio: icons.normal.pixelRatio,
          content: icons.normal.content,
          stretchX: icons.normal.stretchX,
          stretchY: icons.normal.stretchY,
        });
      }
      if (!map.hasImage(PILL_ICON_SELECTED)) {
        map.addImage(PILL_ICON_SELECTED, icons.selected, {
          pixelRatio: icons.selected.pixelRatio,
          content: icons.selected.content,
          stretchX: icons.selected.stretchX,
          stretchY: icons.selected.stretchY,
        });
      }
    }

    map.addSource(SOURCE_ID, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });

    map.addLayer(
      {
        id: VENUE_PILL_LAYER_ID,
        type: "symbol",
        source: SOURCE_ID,
        layout: {
          "icon-image": ["get", "iconId"],
          "icon-text-fit": "both",
          "icon-text-fit-padding": [2, 6, 2, 6],
          "icon-anchor": "bottom",
          "icon-allow-overlap": false,
          "icon-optional": false,
          "text-field": ["get", "name"],
          "text-font": ["Noto Sans Bold"],
          "text-size": ["get", "textSize"],
          "text-max-width": 7,
          "text-line-height": 1.1,
          "text-anchor": "bottom",
          "text-allow-overlap": false,
          "text-optional": true,
          "symbol-sort-key": ["get", "priority"],
        },
        paint: {
          "text-color": "#ffffff",
        },
      },
      firstSymbolLayerId(map),
    );

    map.on("mouseenter", VENUE_PILL_LAYER_ID, () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", VENUE_PILL_LAYER_ID, () => {
      map.getCanvas().style.cursor = "";
      onHoverRef.current(null);
    });
    map.on("mousemove", VENUE_PILL_LAYER_ID, (e) => {
      const feature = e.features?.[0] as MapGeoJSONFeature | undefined;
      const id = feature?.properties?.id as string | undefined;
      if (id) onHoverRef.current(id);
    });
    map.on("click", VENUE_PILL_LAYER_ID, (e) => {
      const feature = e.features?.[0] as MapGeoJSONFeature | undefined;
      const id = feature?.properties?.id as string | undefined;
      if (id) onSelectRef.current(id);
    });

    return () => {
      if (!map.getStyle()) return;
      if (map.getLayer(VENUE_PILL_LAYER_ID)) map.removeLayer(VENUE_PILL_LAYER_ID);
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
    };
  }, [map]);

  useEffect(() => {
    if (!map || !map.getSource(SOURCE_ID)) return;
    const source = map.getSource(SOURCE_ID) as GeoJSONSource;
    source.setData(toFeatureCollection(venues, selectedId, hoveredId));
  }, [map, venues, selectedId, hoveredId]);

  return null;
}
