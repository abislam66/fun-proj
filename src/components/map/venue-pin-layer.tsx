"use client";

import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import maplibregl from "maplibre-gl";
import { useEffect, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";

import { CuisinePill } from "@/components/map/cuisine-pill";
import { cuisinePinLabel } from "@/config/cuisines";
import type { Venue } from "@/lib/venues";

type PinEntry = { marker: Marker; root: Root; el: HTMLElement };

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function VenuePinLayer({
  map,
  venues,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
}: {
  map: MapLibreMap;
  venues: Venue[];
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const pins = useRef<Map<string, PinEntry>>(new Map());
  const staggered = useRef(false);

  // Reconcile the marker set with the current (already filtered) venues.
  useEffect(() => {
    const current = pins.current;
    const nextIds = new Set(venues.map((venue) => venue.id));

    for (const [id, entry] of current) {
      if (!nextIds.has(id)) {
        entry.root.unmount();
        entry.marker.remove();
        current.delete(id);
      }
    }

    const fresh: HTMLElement[] = [];
    for (const venue of venues) {
      const existing = current.get(venue.id);
      if (existing) {
        existing.marker.setLngLat([venue.lng, venue.lat]);
        continue;
      }
      const el = document.createElement("div");
      el.className = "cuisine-pin";
      el.addEventListener("mouseenter", () => onHover(venue.id));
      el.addEventListener("mouseleave", () => onHover(null));
      const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([venue.lng, venue.lat])
        .addTo(map);
      current.set(venue.id, { marker, root: createRoot(el), el });
      fresh.push(el);
    }

    // GSAP: one-shot stagger after first paint only (DESIGN.md → Motion).
    if (!staggered.current && fresh.length > 0 && !prefersReducedMotion()) {
      staggered.current = true;
      void import("gsap").then(({ gsap }) => {
        gsap.from(fresh, {
          autoAlpha: 0,
          y: -8,
          scale: 0.8,
          transformOrigin: "50% 100%",
          duration: 0.4,
          ease: "power2.out",
          stagger: 0.025,
        });
      });
    }
  }, [map, venues, onHover]);

  // Re-render pill state (selection / hover) without recreating markers.
  useEffect(() => {
    for (const venue of venues) {
      const entry = pins.current.get(venue.id);
      if (!entry) continue;
      entry.el.classList.toggle("is-active", venue.id === selectedId);
      entry.root.render(
        <CuisinePill
          hovered={venue.id === hoveredId}
          label={cuisinePinLabel(venue.cuisines)}
          onSelect={() => onSelect(venue.id)}
          selected={venue.id === selectedId}
        />,
      );
    }
  }, [venues, selectedId, hoveredId, onSelect]);

  useEffect(() => {
    const current = pins.current;
    return () => {
      for (const [, entry] of current) {
        entry.root.unmount();
        entry.marker.remove();
      }
      current.clear();
    };
  }, []);

  return null;
}
