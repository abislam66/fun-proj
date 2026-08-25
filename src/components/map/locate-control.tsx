"use client";

import { useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";

type LocateState = "idle" | "pending" | "active" | "denied" | "unavailable";

const NOTICE_MS = 6_000;

export function LocateControl({ map }: { map: MapLibreMap | null }) {
  const [state, setState] = useState<LocateState>("idle");
  const markerRef = useRef<Marker | null>(null);
  const noticeTimer = useRef<number | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
      if (noticeTimer.current !== null) {
        window.clearTimeout(noticeTimer.current);
      }
    };
  }, []);

  // Failure states show a visible notice, then settle back to idle so the
  // button is obviously retryable (e.g. after the user re-grants permission).
  function fail(next: "denied" | "unavailable") {
    setState(next);
    if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => {
      setState((current) => (current === next ? "idle" : current));
    }, NOTICE_MS);
  }

  async function locate() {
    if (!map || typeof navigator === "undefined" || !navigator.geolocation) {
      fail("unavailable");
      return;
    }

    setState("pending");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { longitude, latitude } = position.coords;
        const maplibre = await import("maplibre-gl");

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
          zoom: Math.max(map.getZoom(), 16),
          duration: reduceMotion ? 0 : 650,
        });
        setState("active");
      },
      (error) => {
        fail(error.code === error.PERMISSION_DENIED ? "denied" : "unavailable");
      },
      {
        enableHighAccuracy: false,
        maximumAge: 60_000,
        timeout: 8_000,
      },
    );
  }

  const label =
    state === "pending"
      ? "Finding your location"
      : state === "denied"
        ? "Location permission denied — map still works"
        : state === "unavailable"
          ? "Location unavailable — map still works"
          : "Show my location";

  return (
    <div className="locate-wrap">
      <button
        aria-label={label}
        className={[
          "map-control-button",
          "locate-control",
          state === "active" && "map-control-button-active",
          (state === "denied" || state === "unavailable") &&
            "map-control-button-muted",
        ]
          .filter(Boolean)
          .join(" ")}
        disabled={state === "pending"}
        onClick={() => void locate()}
        title={label}
        type="button"
      >
        <span aria-hidden="true" className="locate-control-icon" />
        <span className="sr-only">{label}</span>
      </button>
      {state === "denied" || state === "unavailable" ? (
        <p className="locate-notice" role="status">
          {label}
        </p>
      ) : null}
    </div>
  );
}
