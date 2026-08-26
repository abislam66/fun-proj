"use client";

import { useEffect, useRef } from "react";
import type {
  GeoJSONSource,
  Map as MapLibreMap,
  MapGeoJSONFeature,
} from "maplibre-gl";

import {
  buildVenuePillIcon,
  venuePillIconId,
  type VenuePillState,
} from "@/lib/map/venue-pill-icon";
import { beforeIdFor, liftOverlaysAboveBasemap } from "@/lib/map/overlay-order";
import type { Venue } from "@/lib/venues";

const SOURCE_ID = "venue-pills";
export const VENUE_PILL_LAYER_ID = "venue-pills-symbol";

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

function pillState(
  venue: Venue,
  selectedId: string | null,
  hoveredId: string | null,
): VenuePillState {
  if (venue.id === selectedId) return "selected";
  if (venue.id === hoveredId) return "hover";
  return "normal";
}

function toFeatureCollection(
  venues: Venue[],
  selectedId: string | null,
  hoveredId: string | null,
) {
  // With icon-allow-overlap true, symbol-sort-key controls visual
  // stacking directly: a *higher* sort key wins the overlap (opposite of
  // the placement-priority meaning it has when overlap is disallowed).
  // Base order is stable per-render (index); hover bumps a pill above the
  // rest, selection bumps it above hover, and selection wins ties with
  // hover so a stronger signal never gets buried by a weaker one.
  const base = venues.length;
  return {
    type: "FeatureCollection" as const,
    features: venues.map((venue, index) => {
      const state = pillState(venue, selectedId, hoveredId);
      const priority =
        state === "selected"
          ? base * 2 + index
          : state === "hover"
            ? base + index
            : index;
      const properties: VenuePillProps = {
        id: venue.id,
        name: venue.name,
        priority,
        iconId: venuePillIconId(venue.id, state, venue.name),
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
 * Venue markers as a single native MapLibre symbol layer. Each pill is an
 * opaque sprite with the venue name BAKED IN (venue-pill-icon.ts), one
 * image per venue × state, registered lazily as states are needed —
 * MapLibre paints a layer's icons first and its text-fields second, so a
 * live text-field would bleed a lower pill's name across the pill above
 * it (see Context/decisions.md, zone labels). Overlap is allowed, so
 * every venue renders every frame — no GL collision detection deciding
 * which pills survive as you pan/zoom. `symbol-sort-key` (see
 * `toFeatureCollection`) controls which pill draws on top when several
 * overlap: selected beats hovered beats default insertion order, and the
 * winner fully occludes what's beneath it.
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
          "icon-padding": 0,
          "icon-anchor": "bottom",
          "icon-allow-overlap": true,
          // Sprites are drawn at the old z18.5 text size; this reproduces
          // the former text-size zoom ramp, scaling the whole pill about
          // its stem tip.
          "icon-size": [
            "interpolate",
            ["linear"],
            ["zoom"],
            14,
            10 / 13,
            15.5,
            11 / 13,
            17,
            12 / 13,
            18.5,
            1,
          ],
          "symbol-sort-key": ["get", "priority"],
        },
      },
      beforeIdFor(map, VENUE_PILL_LAYER_ID),
    );
    liftOverlaysAboveBasemap(map);

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
    // Register each venue's sprite for the state it is about to render in
    // (normal for everything, hover/selected on demand). Already-built
    // sprites stay cached on the map instance across zone switches; ids
    // embed the venue name, so a rename simply mints a fresh image.
    for (const venue of venues) {
      const state = pillState(venue, selectedId, hoveredId);
      const iconId = venuePillIconId(venue.id, state, venue.name);
      if (!map.hasImage(iconId)) {
        const asset = buildVenuePillIcon(venue.name, state);
        map.addImage(iconId, asset, { pixelRatio: asset.pixelRatio });
      }
    }
    const source = map.getSource(SOURCE_ID) as GeoJSONSource;
    source.setData(toFeatureCollection(venues, selectedId, hoveredId));
  }, [map, venues, selectedId, hoveredId]);

  return null;
}
