"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";

import { CampusBuildingLayer } from "@/components/map/campus-building-layer";
import { LocateControl } from "@/components/map/locate-control";
import { MapAttribution } from "@/components/map/map-attribution";
import { VenuePillLayer, VENUE_PILL_LAYER_ID } from "@/components/map/venue-pill-layer";
import { CuisineTags, OpenStatus } from "@/components/venues/venue-bits";
import {
  CAMPUS_BOUNDS,
  CAMPUS_MAX_BOUNDS,
  DEFAULT_VIEWPORT,
  MAP_STYLE_URL,
} from "@/config/site";
import type { Venue } from "@/lib/venues";

import "maplibre-gl/dist/maplibre-gl.css";

export function VenueMap({
  venues,
  selectedId,
  hoveredId,
  backPath,
  onSelect,
  onHover,
  onClearSelection,
}: {
  venues: Venue[];
  selectedId: string | null;
  hoveredId: string | null;
  backPath: string;
  onSelect: (venueId: string) => void;
  onHover: (venueId: string | null) => void;
  onClearSelection: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const onClearSelectionRef = useRef(onClearSelection);
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const reduceMotion = useReducedMotion();

  const selectedVenue = venues.find((venue) => venue.id === selectedId) ?? null;

  useEffect(() => {
    onClearSelectionRef.current = onClearSelection;
  }, [onClearSelection]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let disposed = false;

    async function init() {
      const maplibre = await import("maplibre-gl");
      if (disposed || !containerRef.current) return;

      const instance = new maplibre.Map({
        container: containerRef.current,
        style: MAP_STYLE_URL,
        center: DEFAULT_VIEWPORT.center,
        zoom: DEFAULT_VIEWPORT.zoom,
        maxBounds: CAMPUS_MAX_BOUNDS,
        minZoom: 14,
        maxZoom: 18.5,
        attributionControl: false,
        logoPosition: "bottom-left",
        pitchWithRotate: false,
        dragRotate: false,
      });

      mapRef.current = instance;

      instance.fitBounds(
        [
          [CAMPUS_BOUNDS.west, CAMPUS_BOUNDS.south],
          [CAMPUS_BOUNDS.east, CAMPUS_BOUNDS.north],
        ],
        {
          padding: 48,
          duration: 0,
          maxZoom: DEFAULT_VIEWPORT.zoom,
        },
      );

      instance.once("load", () => {
        if (disposed) return;
        setMap(instance);
        setReady(true);
      });

      instance.on("error", () => {
        if (!disposed) setFailed(true);
      });

      instance.on("click", (e) => {
        if (instance.getLayer(VENUE_PILL_LAYER_ID)) {
          const hits = instance.queryRenderedFeatures(e.point, {
            layers: [VENUE_PILL_LAYER_ID],
          });
          if (hits.length > 0) return;
        }
        onClearSelectionRef.current();
      });
    }

    void init();

    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
      setMap(null);
    };
  }, []);

  useEffect(() => {
    if (!map) return;
    const resize = () => map.resize();
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [map]);

  function zoomBy(delta: number) {
    if (!map) return;
    map.easeTo({
      zoom: map.getZoom() + delta,
      duration: reduceMotion ? 0 : 220,
    });
  }

  return (
    <div
      className="venue-map"
      aria-label="Temple campus food map"
      role="region"
    >
      <div className="venue-map-canvas" ref={containerRef} />

      {!ready && !failed ? (
        <div className="venue-map-loading" aria-live="polite">
          Loading campus map…
        </div>
      ) : null}

      {failed ? (
        <div className="venue-map-fallback" role="status">
          <p>Map tiles unavailable.</p>
          <p>Browse the list — campus pins will return when the map loads.</p>
        </div>
      ) : null}

      <div className="map-controls">
        <button
          aria-label="Zoom in"
          className="map-control-button"
          disabled={!ready}
          onClick={() => zoomBy(0.75)}
          type="button"
        >
          +
        </button>
        <button
          aria-label="Zoom out"
          className="map-control-button"
          disabled={!ready}
          onClick={() => zoomBy(-0.75)}
          type="button"
        >
          −
        </button>
        <LocateControl map={map} />
      </div>

      <div className="map-campus-chip" aria-hidden="true">
        Temple Main Campus
      </div>

      <MapAttribution />

      <CampusBuildingLayer map={map} />

      <VenuePillLayer
        hoveredId={hoveredId}
        map={map}
        onHover={onHover}
        onSelect={onSelect}
        selectedId={selectedId}
        venues={venues}
      />

      <AnimatePresence>
        {selectedVenue ? (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="map-mini-card-wrap"
            exit={{ opacity: 0, y: 8 }}
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            key={selectedVenue.id}
            transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
          >
            <Link
              className="venue-mini-card map-mini-card"
              href={`/eat/${selectedVenue.slug}?from=${encodeURIComponent(backPath)}`}
            >
              <div className="map-mini-card-top">
                <h3>{selectedVenue.name}</h3>
                <span aria-hidden="true">↗</span>
              </div>
              <CuisineTags cuisines={selectedVenue.cuisines} />
              <OpenStatus venue={selectedVenue} />
            </Link>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
