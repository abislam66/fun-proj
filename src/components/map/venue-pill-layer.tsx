"use client";

import { useEffect, useRef } from "react";
import type {
  GeoJSONSource,
  Map as MapLibreMap,
  MapGeoJSONFeature,
} from "maplibre-gl";

import {
  buildPillIcons,
  PILL_ICON_HOVER,
  PILL_ICON_NORMAL,
  PILL_ICON_SELECTED,
  type PillIconAsset,
} from "@/lib/map/venue-pill-icon";
import type { Venue } from "@/lib/venues";

const SOURCE_ID = "venue-pills";
export const VENUE_PILL_LAYER_ID = "venue-pills-symbol";

/**
 * MapLibre resolves label collisions in layer order — earlier layers win
 * ties. Venue pins are the primary decision info, so this layer must be
 * inserted ahead of the base style's own labels, the campus building
 * labels (campus-building-layer.tsx), and the meal-plan dining info pins
 * (campus-dining-layer.tsx), not appended after them.
 */
function firstSymbolLayerId(map: MapLibreMap): string | undefined {
  const layers = map.getStyle().layers ?? [];
  return layers.find((layer) => layer.type === "symbol")?.id;
}

/**
 * With overlap allowed, several pills can share a pixel. MapLibre's own
 * ordering of `queryRenderedFeatures` results isn't a documented contract,
 * so pick the visually topmost hit ourselves using the same `priority`
 * field the layer is sorted by, rather than trusting `features[0]`.
 */
function topFeature(
  features: MapGeoJSONFeature[] | undefined,
): MapGeoJSONFeature | undefined {
  if (!features || features.length === 0) return undefined;
  return features.reduce((top, feature) => {
    const topPriority = (top.properties?.priority as number | undefined) ?? 0;
    const featurePriority =
      (feature.properties?.priority as number | undefined) ?? 0;
    return featurePriority > topPriority ? feature : top;
  });
}

type VenuePillProps = {
  id: string;
  name: string;
  priority: number;
  iconId: string;
};

function toFeatureCollection(
  venues: Venue[],
  selectedId: string | null,
  hoveredId: string | null,
) {
  // With icon/text-allow-overlap true, symbol-sort-key controls visual
  // stacking directly: a *higher* sort key wins the overlap (opposite of
  // the placement-priority meaning it has when overlap is disallowed).
  // Base order is stable per-render (index); hover bumps a pill above the
  // rest, selection bumps it above hover, and selection wins ties with
  // hover so a stronger signal never gets buried by a weaker one.
  const base = venues.length;
  return {
    type: "FeatureCollection" as const,
    features: venues.map((venue, index) => {
      const priority =
        venue.id === selectedId
          ? base * 2 + index
          : venue.id === hoveredId
            ? base + index
            : index;
      const properties: VenuePillProps = {
        id: venue.id,
        name: venue.name,
        priority,
        iconId:
          venue.id === selectedId
            ? PILL_ICON_SELECTED
            : venue.id === hoveredId
              ? PILL_ICON_HOVER
              : PILL_ICON_NORMAL,
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
 * icon-text-fit. Both icon and text allow overlap, so every venue renders
 * every pill on every frame — no GL collision detection deciding which
 * pills survive as you pan/zoom, which previously made pills appear and
 * disappear unpredictably in dense clusters. `symbol-sort-key` (see
 * `toFeatureCollection`) controls which pill draws on top when several
 * overlap: selected beats hovered beats default insertion order.
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
    const iconIds = [PILL_ICON_NORMAL, PILL_ICON_HOVER, PILL_ICON_SELECTED];
    if (iconIds.some((id) => !map.hasImage(id))) {
      const icons = buildPillIcons();
      const assets: [string, PillIconAsset][] = [
        [PILL_ICON_NORMAL, icons.normal],
        [PILL_ICON_HOVER, icons.hover],
        [PILL_ICON_SELECTED, icons.selected],
      ];
      for (const [id, asset] of assets) {
        if (map.hasImage(id)) continue;
        map.addImage(id, asset, {
          pixelRatio: asset.pixelRatio,
          content: asset.content,
          stretchX: asset.stretchX,
          stretchY: asset.stretchY,
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
          // Tightened from [2,6,2,6] — less dead space around the text
          // keeps each pill visually compact now that pills can overlap
          // freely (no collision system to shrink the footprint for).
          "icon-text-fit-padding": [1, 3, 1, 3],
          "icon-padding": 0,
          "icon-anchor": "bottom",
          // Overlap is allowed rather than left to GL collision detection:
          // dense clusters render every pill every time instead of some
          // winning the collision test and others vanishing as you pan/zoom.
          "icon-allow-overlap": true,
          "icon-optional": false,
          "text-field": ["get", "name"],
          "text-font": ["Noto Sans Bold"],
          // Smaller at campus-wide zoom, growing toward the previous fixed
          // size as you zoom in — native GL interpolation, not custom
          // logic. Selected/hovered emphasis comes from the thicker-border
          // icon variant (iconId) rather than a bigger text-size here —
          // nesting per-feature branching around a zoom expression like
          // this one hit a MapLibre GL validation edge case (see commit
          // history). Floor kept at a legibility minimum: below ~7px the
          // labels are unreadable for everyone and hostile to low vision.
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
          "text-allow-overlap": true,
          "text-optional": false,
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
      const feature = topFeature(e.features as MapGeoJSONFeature[] | undefined);
      const id = feature?.properties?.id as string | undefined;
      if (id) onHoverRef.current(id);
    });
    map.on("click", VENUE_PILL_LAYER_ID, (e) => {
      const feature = topFeature(e.features as MapGeoJSONFeature[] | undefined);
      const id = feature?.properties?.id as string | undefined;
      if (id) onSelectRef.current(id);
    });

    return () => {
      if (!map.getStyle()) return;
      if (map.getLayer(VENUE_PILL_LAYER_ID))
        map.removeLayer(VENUE_PILL_LAYER_ID);
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
