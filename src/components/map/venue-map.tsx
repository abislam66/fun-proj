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

const STYLE_WATCHDOG_MS = 12000;

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
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    let instance: MapLibreMap;
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
    } catch {
      // e.g. WebGL unavailable — the list still carries the full experience.
      setFailed(true);
      return;
    }
    instance.touchZoomRotate.disableRotation();
    mapRef.current = instance;

    // The list renders even if tiles never arrive; surface a quiet fallback.
    const watchdog = window.setTimeout(() => {
      if (!instance.isStyleLoaded()) setFailed(true);
    }, STYLE_WATCHDOG_MS);

    instance.on("load", () => {
      window.clearTimeout(watchdog);
      setFailed(false);
      setMap(instance);
    });

    return () => {
      window.clearTimeout(watchdog);
      instance.remove();
      mapRef.current = null;
      setMap(null);
    };
  }, []);

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

      {failed ? (
        <p className="map-fallback" role="status">
          Map couldn’t load — browse the list instead.
        </p>
      ) : null}
    </div>
  );
}
