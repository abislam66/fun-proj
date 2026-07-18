"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";

type LocateState = "idle" | "pending" | "active" | "denied" | "unavailable";

export function LocateControl({ map }: { map: MapLibreMap | null }) {
  const [state, setState] = useState<LocateState>("idle");
  const markerRef = useRef<Marker | null>(null);

  useEffect(() => {
    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
    };
  }, []);

  async function locate() {
    if (!map || typeof navigator === "undefined" || !navigator.geolocation) {
      setState("unavailable");
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
          duration: 650,
        });
        setState("active");
      },
      (error) => {
        setState(
          error.code === error.PERMISSION_DENIED ? "denied" : "unavailable",
        );
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
  );
}
