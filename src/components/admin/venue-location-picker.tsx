"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap, Marker as MapLibreMarker } from "maplibre-gl";

import {
  CAMPUS_BOUNDS,
  CAMPUS_MAX_BOUNDS,
  DEFAULT_VIEWPORT,
  MAP_STYLE_URL,
} from "@/config/site";

import "maplibre-gl/dist/maplibre-gl.css";

/**
 * Minimal click-to-place / drag-to-adjust location picker for the admin
 * venue editor. Deliberately not the public VenueMap — no pills, zones,
 * filters, or mini-cards, just a marker on the campus basemap. The
 * existing lat/lng number inputs stay as a fallback/precise-entry option
 * alongside this; the picker is a faster way to set the same two fields.
 */
export function VenueLocationPicker({
  lat,
  lng,
  onChange,
}: {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<MapLibreMarker | null>(null);
  const onChangeRef = useRef(onChange);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let disposed = false;

    async function init() {
      const maplibre = await import("maplibre-gl");
      if (disposed || !containerRef.current) return;

      const startCenter: [number, number] =
        lat !== null && lng !== null ? [lng, lat] : DEFAULT_VIEWPORT.center;

      const instance = new maplibre.Map({
        container: containerRef.current,
        style: MAP_STYLE_URL,
        center: startCenter,
        zoom: DEFAULT_VIEWPORT.zoom,
        maxBounds: CAMPUS_MAX_BOUNDS,
        minZoom: 13.5,
        maxZoom: 19,
        attributionControl: false,
        logoPosition: "bottom-left",
        pitchWithRotate: false,
        dragRotate: false,
      });
      mapRef.current = instance;

      const marker = new maplibre.Marker({
        draggable: true,
        color: "#9d2235",
      })
        .setLngLat(startCenter)
        .addTo(instance);
      markerRef.current = marker;

      marker.on("dragend", () => {
        const { lat: newLat, lng: newLng } = marker.getLngLat();
        onChangeRef.current(newLat, newLng);
      });

      instance.on("click", (e) => {
        marker.setLngLat(e.lngLat);
        onChangeRef.current(e.lngLat.lat, e.lngLat.lng);
      });

      instance.on("error", () => {
        if (!disposed) setFailed(true);
      });
    }

    init().catch(() => setFailed(true));

    return () => {
      disposed = true;
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // Only initialize once — subsequent lat/lng changes from typing in the
    // number inputs move the marker via the effect below, not a re-init.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the marker in sync if lat/lng change from outside this component
  // (e.g. the admin types into the plain number inputs instead).
  useEffect(() => {
    if (!markerRef.current || lat === null || lng === null) return;
    const current = markerRef.current.getLngLat();
    if (
      Math.abs(current.lat - lat) > 1e-9 ||
      Math.abs(current.lng - lng) > 1e-9
    ) {
      markerRef.current.setLngLat([lng, lat]);
    }
  }, [lat, lng]);

  if (failed) {
    return (
      <p className="admin-inline-note">
        Map picker unavailable — use the coordinate fields below.
      </p>
    );
  }

  return (
    <div className="admin-location-picker">
      <div className="admin-location-picker-map" ref={containerRef} />
      <p className="admin-inline-note">
        Click the map or drag the pin to set the exact location. Campus bounds:{" "}
        {CAMPUS_BOUNDS.south}–{CAMPUS_BOUNDS.north} lat, {CAMPUS_BOUNDS.west}–
        {CAMPUS_BOUNDS.east} lng.
      </p>
    </div>
  );
}
