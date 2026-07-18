"use client";

import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import maplibregl from "maplibre-gl";
import { useEffect, useRef, useState } from "react";

type LocateState = "idle" | "locating" | "denied";

/**
 * Browser geolocation → MapLibre blue dot only. The coordinate NEVER leaves the
 * browser (auth-security.md: user geolocation is sensitive, no endpoint sees it).
 */
export function LocateControl({ map }: { map: MapLibreMap }) {
  const markerRef = useRef<Marker | null>(null);
  const [state, setState] = useState<LocateState>("idle");

  useEffect(() => {
    const marker = markerRef;
    return () => {
      marker.current?.remove();
      marker.current = null;
    };
  }, []);

  function locate() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState("denied");
      return;
    }
    setState("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point: [number, number] = [
          position.coords.longitude,
          position.coords.latitude,
        ];
        if (markerRef.current) {
          markerRef.current.setLngLat(point);
        } else {
          const el = document.createElement("div");
          el.className = "map-user-dot";
          markerRef.current = new maplibregl.Marker({ element: el })
            .setLngLat(point)
            .addTo(map);
        }
        map.easeTo({ center: point, zoom: Math.max(map.getZoom(), 16) });
        setState("idle");
      },
      () => setState("denied"),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 },
    );
  }

  return (
    <button
      aria-label={
        state === "denied"
          ? "Location unavailable"
          : "Show my location on the map"
      }
      className="map-control-button"
      data-state={state}
      onClick={locate}
      title="My location"
      type="button"
    >
      <span
        aria-hidden="true"
        className="map-control-icon map-control-locate"
      />
    </button>
  );
}
