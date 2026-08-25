"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";

import { CampusBuildingLayer } from "@/components/map/campus-building-layer";
import { CampusDiningLayer } from "@/components/map/campus-dining-layer";
import { LocateControl } from "@/components/map/locate-control";
import { MapAttribution } from "@/components/map/map-attribution";
import {
  MAP_ZONE_CLICK_LAYER_IDS,
  MapZoneLayer,
} from "@/components/map/map-zone-layer";
import {
  VenuePillLayer,
  VENUE_PILL_LAYER_ID,
} from "@/components/map/venue-pill-layer";
import {
  CuisineTags,
  OpenStatus,
  PaymentTag,
  VenueLocation,
} from "@/components/venues/venue-bits";
import {
  MAP_ZONES,
  MAP_ZONE_OVERVIEW_MAX_ZOOM,
  mapZoneBounds,
  type MapZoneKey,
} from "@/config/map-zones";
import {
  CAMPUS_BOUNDS,
  CAMPUS_MAX_BOUNDS,
  DEFAULT_VIEWPORT,
  MAP_STYLE_URL,
} from "@/config/site";
import { getOpenStatus } from "@/lib/hours";
import { mapZoneContaining, pointInMapZone } from "@/lib/map/point-in-polygon";
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
  const enteringZoneRef = useRef(false);
  const selectedZoneRef = useRef<MapZoneKey | null>(null);
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [selectedZone, setSelectedZone] = useState<MapZoneKey | null>(null);
  const reduceMotion = useReducedMotion();

  const selectedVenue = venues.find((venue) => venue.id === selectedId) ?? null;
  const zoneVenues = useMemo(
    () =>
      selectedZone
        ? venues.filter((venue) =>
            pointInMapZone(venue.lng, venue.lat, selectedZone),
          )
        : [],
    [venues, selectedZone],
  );

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
        minZoom: 13.5,
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
        const zoneLayers = MAP_ZONE_CLICK_LAYER_IDS.filter((id) =>
          instance.getLayer(id),
        );
        if (zoneLayers.length > 0) {
          const zoneHits = instance.queryRenderedFeatures(e.point, {
            layers: [...zoneLayers],
          });
          if (zoneHits.length > 0) return;
        }
        onClearSelectionRef.current();
      });
    }

    // The MapLibre constructor throws synchronously when WebGL is
    // unavailable (old devices, disabled GPU) — without the catch, the UI
    // hangs on "Loading campus map…" forever instead of falling back.
    init().catch(() => {
      if (!disposed) setFailed(true);
    });

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

  useEffect(() => {
    if (!map || !selectedVenue) return;
    const hostZone = mapZoneContaining(selectedVenue.lng, selectedVenue.lat);
    if (hostZone && hostZone !== selectedZoneRef.current) {
      flyToZone(map, hostZone, reduceMotion, setSelectedZone, enteringZoneRef);
      return;
    }
    const position: [number, number] = [selectedVenue.lng, selectedVenue.lat];
    if (map.getBounds().contains(position)) return;
    map.easeTo({ center: position, duration: reduceMotion ? 0 : 350 });
  }, [map, selectedVenue, reduceMotion]);

  useEffect(() => {
    selectedZoneRef.current = selectedZone;
  }, [selectedZone]);

  useEffect(() => {
    if (!map) return;
    function onZoomEnd() {
      if (enteringZoneRef.current) return;
      if (
        selectedZoneRef.current &&
        map &&
        map.getZoom() < MAP_ZONE_OVERVIEW_MAX_ZOOM
      ) {
        setSelectedZone(null);
        onClearSelectionRef.current();
      }
    }
    map.on("zoomend", onZoomEnd);
    return () => {
      map.off("zoomend", onZoomEnd);
    };
  }, [map]);

  function zoomBy(delta: number) {
    if (!map) return;
    map.easeTo({
      zoom: map.getZoom() + delta,
      duration: reduceMotion ? 0 : 220,
    });
  }

  function resetView() {
    if (!map) return;
    setSelectedZone(null);
    onClearSelection();
    map.fitBounds(
      [
        [CAMPUS_BOUNDS.west, CAMPUS_BOUNDS.south],
        [CAMPUS_BOUNDS.east, CAMPUS_BOUNDS.north],
      ],
      {
        padding: 48,
        duration: reduceMotion ? 0 : 450,
        maxZoom: DEFAULT_VIEWPORT.zoom,
      },
    );
  }

  function selectZone(key: MapZoneKey) {
    if (!map) return;
    flyToZone(map, key, reduceMotion, setSelectedZone, enteringZoneRef);
  }

  function closeMiniCard() {
    onClearSelection();
    // The close button unmounts with the card — hand focus back to the
    // map canvas so keyboard users aren't dropped at the document root.
    mapRef.current?.getCanvas().focus();
  }

  return (
    <div
      className="venue-map"
      aria-label="Temple campus food map"
      aria-describedby="venue-map-usage"
      role="region"
    >
      <p className="sr-only" id="venue-map-usage">
        Interactive map of food venues around Temple University&apos;s main
        campus. At campus zoom, tap a named zone to fly in and see the places
        there. Focus the map, then pan with the arrow keys and zoom with the
        plus and minus keys. Every venue on the map is also in the venue list.
      </p>
      <p aria-live="polite" className="sr-only">
        {selectedVenue
          ? `${selectedVenue.name}. ${getOpenStatus(selectedVenue.hours).label}.`
          : ""}
      </p>
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
        <button
          aria-label="Reset view to campus"
          className="map-control-button"
          disabled={!ready}
          onClick={resetView}
          title="Reset view to campus"
          type="button"
        >
          <svg
            aria-hidden="true"
            fill="none"
            height="16"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.5"
            viewBox="0 0 16 16"
            width="16"
          >
            <path d="M2 5V3a1 1 0 0 1 1-1h2" />
            <path d="M11 2h2a1 1 0 0 1 1 1v2" />
            <path d="M14 11v2a1 1 0 0 1-1 1h-2" />
            <path d="M5 14H3a1 1 0 0 1-1-1v-2" />
          </svg>
        </button>
        <LocateControl map={map} />
      </div>

      <div className="map-campus-chip" aria-hidden="true">
        Temple Main Campus
      </div>

      <MapAttribution />

      <CampusBuildingLayer map={map} />

      <MapZoneLayer
        map={map}
        onSelect={selectZone}
        selectedKey={selectedZone}
      />

      {/* Mount order is load-bearing: each layer inserts itself ahead of
          the style's first symbol layer, so later mounts land earlier in
          the layer list and win label collisions. Dining pins must mount
          before VenuePillLayer so venue pills stay on top. */}
      <CampusDiningLayer map={map} visible={selectedZone !== null} />

      <VenuePillLayer
        hoveredId={hoveredId}
        map={map}
        onHover={onHover}
        onSelect={onSelect}
        selectedId={selectedId}
        venues={zoneVenues}
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
            <div className="map-mini-card">
              <Link
                className="map-mini-card-link"
                href={`/eat/${selectedVenue.slug}?from=${encodeURIComponent(backPath)}`}
              >
                <div className="map-mini-card-top">
                  <h3>{selectedVenue.name}</h3>
                </div>
                <VenueLocation venue={selectedVenue} />
                <div className="venue-tags">
                  <CuisineTags cuisines={selectedVenue.cuisines} />
                  <PaymentTag card={selectedVenue.acceptsCard} />
                </div>
                <div className="map-mini-card-footer">
                  <OpenStatus venue={selectedVenue} />
                  <span className="map-mini-card-cta">
                    View details
                    <svg
                      aria-hidden="true"
                      fill="none"
                      height="12"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      viewBox="0 0 16 16"
                      width="12"
                    >
                      <path d="M4 12 12 4" />
                      <path d="M6 4h6v6" />
                    </svg>
                  </span>
                </div>
              </Link>
              <button
                aria-label="Close venue preview"
                className="map-mini-card-close"
                onClick={closeMiniCard}
                type="button"
              >
                <svg
                  aria-hidden="true"
                  fill="none"
                  height="14"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="1.5"
                  viewBox="0 0 16 16"
                  width="14"
                >
                  <path d="m4 4 8 8" />
                  <path d="m12 4-8 8" />
                </svg>
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function flyToZone(
  map: MapLibreMap,
  key: MapZoneKey,
  reduceMotion: boolean | null,
  setSelectedZone: (key: MapZoneKey) => void,
  enteringZoneRef: { current: boolean },
) {
  enteringZoneRef.current = true;
  setSelectedZone(key);
  const bounds = mapZoneBounds(key);
  map.fitBounds(
    [
      [bounds.west, bounds.south],
      [bounds.east, bounds.north],
    ],
    {
      padding: MAP_ZONES[key].padding,
      duration: reduceMotion ? 0 : 450,
      maxZoom: 17.4,
    },
  );
  map.once("moveend", () => {
    enteringZoneRef.current = false;
  });
}
