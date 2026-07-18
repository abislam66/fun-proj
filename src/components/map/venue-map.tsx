"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import type { Map as MapLibreMap } from "maplibre-gl";
import maplibregl from "maplibre-gl";
import { useEffect, useRef, useState } from "react";

import { LocateControl } from "@/components/map/locate-control";
import { MapAttribution } from "@/components/map/map-attribution";
import { VenuePinLayer } from "@/components/map/venue-pin-layer";
import { CAMPUS_BOUNDS, DEFAULT_VIEWPORT, MAP_STYLE_URL } from "@/config/site";
import type { Venue } from "@/lib/venues";

// Keep panning campus-local — never Philly-wide (DESIGN.md → Map).
const MAX_BOUNDS: [[number, number], [number, number]] = [
  [CAMPUS_BOUNDS.west - 0.02, CAMPUS_BOUNDS.south - 0.014],
  [CAMPUS_BOUNDS.east + 0.02, CAMPUS_BOUNDS.north + 0.014],
];

/** Solid Positron-ish canvas so pins still render if the tile style never arrives. */
const FALLBACK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {},
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#EEEEEA" },
    },
  ],
};

export function VenueMap({
  venues,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
}: {
  venues: Venue[];
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const [basemapFailed, setBasemapFailed] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;
    let instance: MapLibreMap;
    let usedFallback = false;

    function attach(ready: MapLibreMap) {
      if (cancelled) return;
      ready.resize();
      setMap(ready);
    }

    function useFallbackBasemap(reason: string) {
      if (usedFallback || cancelled || !mapRef.current) return;
      usedFallback = true;
      setBasemapFailed(true);
      console.warn("[VenueMap] basemap unavailable, using solid fallback:", reason);
      mapRef.current.setStyle(FALLBACK_STYLE);
    }

    try {
      instance = new maplibregl.Map({
        container: containerRef.current,
        style: MAP_STYLE_URL,
        center: DEFAULT_VIEWPORT.center,
        zoom: DEFAULT_VIEWPORT.zoom,
        minZoom: 13.5,
        maxZoom: 19,
        maxBounds: MAX_BOUNDS,
        attributionControl: false,
        dragRotate: false,
        pitchWithRotate: false,
      });
    } catch (error) {
      // e.g. WebGL unavailable — try a second time with the solid style.
      try {
        instance = new maplibregl.Map({
          container: containerRef.current,
          style: FALLBACK_STYLE,
          center: DEFAULT_VIEWPORT.center,
          zoom: DEFAULT_VIEWPORT.zoom,
          minZoom: 13.5,
          maxZoom: 19,
          maxBounds: MAX_BOUNDS,
          attributionControl: false,
          dragRotate: false,
          pitchWithRotate: false,
        });
        usedFallback = true;
        setBasemapFailed(true);
      } catch {
        setBasemapFailed(true);
        return;
      }
    }

    instance.touchZoomRotate.disableRotation();
    mapRef.current = instance;

    instance.on("load", () => attach(instance));
    instance.on("error", (event) => {
      const message = event.error?.message ?? "unknown map error";
      // Style/tile fetch failures shouldn't blank the whole map — keep pins.
      if (!instance.isStyleLoaded()) {
        useFallbackBasemap(message);
      }
    });

    // Container can mount at 0×0 under the sheet/split; resize when it settles.
    const observer = new ResizeObserver(() => {
      mapRef.current?.resize();
    });
    observer.observe(containerRef.current);

    // If the remote style never arrives, fall back so pins still show.
    const watchdog = window.setTimeout(() => {
      if (!cancelled && mapRef.current && !mapRef.current.isStyleLoaded()) {
        useFallbackBasemap("style load timed out");
      }
    }, 8000);

    return () => {
      cancelled = true;
      window.clearTimeout(watchdog);
      observer.disconnect();
      instance.remove();
      mapRef.current = null;
      setMap(null);
    };
  }, []);

  // Re-attach after a setStyle(fallback) — 'load' fires again.
  useEffect(() => {
    if (!mapRef.current) return;
    const ready = mapRef.current;
    if (ready.isStyleLoaded() && !map) {
      setMap(ready);
    }
  }, [basemapFailed, map]);

  return (
    <div className="venue-map">
      <div
        aria-label="Map of food near Temple's main campus"
        className="venue-map-canvas"
        ref={containerRef}
        role="application"
      />

      {map ? (
        <VenuePinLayer
          hoveredId={hoveredId}
          map={map}
          onHover={onHover}
          onSelect={onSelect}
          selectedId={selectedId}
          venues={venues}
        />
      ) : null}

      <div className="map-controls">
        <button
          aria-label="Zoom in"
          className="map-control-button"
          onClick={() => mapRef.current?.zoomIn()}
          title="Zoom in"
          type="button"
        >
          <span aria-hidden="true" className="map-control-icon">
            +
          </span>
        </button>
        <button
          aria-label="Zoom out"
          className="map-control-button"
          onClick={() => mapRef.current?.zoomOut()}
          title="Zoom out"
          type="button"
        >
          <span aria-hidden="true" className="map-control-icon">
            −
          </span>
        </button>
        {map ? <LocateControl map={map} /> : null}
      </div>

      <MapAttribution />

      {basemapFailed ? (
        <p className="map-fallback map-fallback-quiet" role="status">
          Basemap offline — pins still work.
        </p>
      ) : null}
    </div>
  );
}
