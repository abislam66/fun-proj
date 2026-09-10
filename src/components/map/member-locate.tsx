"use client";

import { useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";

import { CAMPUS_MAX_BOUNDS } from "@/config/site";

// One flag per browser session so navigation / rerenders inside the same
// signed-in visit never re-prompt. Not the coordinates — just "asked".
const SESSION_KEY = "tueats:member-locate-prompted";

function withinCampus(lng: number, lat: number): boolean {
  const [[west, south], [east, north]] = CAMPUS_MAX_BOUNDS;
  return lng >= west && lng <= east && lat >= south && lat <= north;
}

/**
 * The first time a signed-in member lands on the map in a browser
 * session, ask for geolocation once. Granted → drop a dot at their
 * position and ease the camera there, leaving every campus pin in place
 * so nearby spots surface naturally. Denied / unavailable / timeout /
 * off-campus → stay silently on the Temple campus view. Never runs for
 * signed-out visitors. The coordinates never leave the browser: no fetch,
 * no analytics, no storage, no logs — only the "already asked" flag is
 * remembered. The manual LocateControl button is unchanged and still open
 * to everyone.
 */
export function MemberLocate({
  map,
  enabled,
}: {
  map: MapLibreMap | null;
  enabled: boolean;
}) {
  const markerRef = useRef<Marker | null>(null);
  const reduceMotion = useReducedMotion();
  // Read at fire time, not a dep — a late null→false resolve must not
  // re-run (and thus cancel) the one-shot geolocation request.
  const reduceMotionRef = useRef(reduceMotion);
  reduceMotionRef.current = reduceMotion;

  useEffect(() => {
    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map || !enabled) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // Storage blocked (private mode / hardened settings): fall through
      // and prompt once — worst case is one extra prompt on a reload.
    }

    let cancelled = false;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        if (cancelled || !map) return;
        const { longitude, latitude } = position.coords;
        // Off campus (a reviewer opening from elsewhere) — the campus
        // maxBounds would just clamp the pan to an edge, so don't move.
        if (!withinCampus(longitude, latitude)) return;

        const maplibre = await import("maplibre-gl");
        if (cancelled || !map) return;

        markerRef.current?.remove();
        const el = document.createElement("div");
        el.className = "locate-dot";
        el.setAttribute("aria-hidden", "true");
        markerRef.current = new maplibre.Marker({
          element: el,
          anchor: "center",
        })
          .setLngLat([longitude, latitude])
          .addTo(map);

        map.easeTo({
          center: [longitude, latitude],
          zoom: Math.max(map.getZoom(), 15.5),
          duration: reduceMotionRef.current ? 0 : 650,
        });
      },
      () => {
        // Denied / unavailable / timeout — keep the campus view.
      },
      { enableHighAccuracy: false, maximumAge: 120_000, timeout: 8_000 },
    );

    return () => {
      cancelled = true;
    };
  }, [map, enabled]);

  return null;
}
