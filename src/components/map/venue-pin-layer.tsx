"use client";

import { createRoot, type Root } from "react-dom/client";
import { useEffect, useRef } from "react";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";

import { CuisinePill } from "@/components/map/cuisine-pill";
import { getPinLabel } from "@/lib/pin-label";
import type { Venue } from "@/lib/venues";

type PinHandle = {
  marker: Marker;
  root: Root;
  button: HTMLButtonElement;
};

export function VenuePinLayer({
  map,
  venues,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
}: {
  map: MapLibreMap | null;
  venues: Venue[];
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (venueId: string) => void;
  onHover: (venueId: string | null) => void;
}) {
  const pinsRef = useRef<Map<string, PinHandle>>(new Map());
  const onSelectRef = useRef(onSelect);
  const onHoverRef = useRef(onHover);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    onHoverRef.current = onHover;
  }, [onHover]);

  useEffect(() => {
    if (!map) return;

    let cancelled = false;
    const pins = pinsRef.current;

    async function syncPins() {
      const maplibre = await import("maplibre-gl");
      if (cancelled || !map) return;

      const visibleIds = new Set(venues.map((venue) => venue.id));

      for (const [id, pin] of pins) {
        if (!visibleIds.has(id)) {
          pin.marker.remove();
          pin.root.unmount();
          pins.delete(id);
        }
      }

      venues.forEach((venue, index) => {
        const selected = venue.id === selectedId;
        const highlighted = venue.id === hoveredId;
        const label = getPinLabel(venue.cuisines);
        const existing = pins.get(venue.id);

        if (existing) {
          existing.marker.setLngLat([venue.lng, venue.lat]);
          existing.button.setAttribute("aria-label", `${venue.name}, ${label}`);
          existing.root.render(
            <CuisinePill
              highlighted={highlighted}
              index={index}
              label={label}
              selected={selected}
            />,
          );
          return;
        }

        const button = document.createElement("button");
        button.type = "button";
        button.className = "venue-pin";
        button.setAttribute("aria-label", `${venue.name}, ${label}`);

        button.addEventListener("click", (event) => {
          event.stopPropagation();
          onSelectRef.current(venue.id);
        });
        button.addEventListener("mouseenter", () =>
          onHoverRef.current(venue.id),
        );
        button.addEventListener("mouseleave", () => onHoverRef.current(null));
        button.addEventListener("focus", () => onHoverRef.current(venue.id));
        button.addEventListener("blur", () => onHoverRef.current(null));

        const root = createRoot(button);
        root.render(
          <CuisinePill
            highlighted={highlighted}
            index={index}
            label={label}
            selected={selected}
          />,
        );

        const marker = new maplibre.Marker({
          element: button,
          anchor: "bottom",
        })
          .setLngLat([venue.lng, venue.lat])
          .addTo(map);

        pins.set(venue.id, { marker, root, button });
      });
    }

    void syncPins();

    return () => {
      cancelled = true;
    };
  }, [map, venues, selectedId, hoveredId]);

  useEffect(() => {
    const pins = pinsRef.current;
    return () => {
      for (const pin of pins.values()) {
        pin.marker.remove();
        pin.root.unmount();
      }
      pins.clear();
    };
  }, [map]);

  return null;
}
