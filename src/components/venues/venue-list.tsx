"use client";

import { useEffect, useRef } from "react";

import { EmptyState } from "@/components/ui/primitives";
import type { Venue } from "@/lib/venues";
import {
  CuisineTags,
  OpenStatus,
  PaymentTag,
  VenueLocation,
} from "@/components/venues/venue-bits";

/**
 * Rows select the venue on the map (fly-to + anchored mini-card) — they
 * do NOT navigate. The mini-card's "View details" is the only door from
 * the explorer to `/eat/[slug]`; the map stays the primary surface.
 */
export function VenueRow({
  venue,
  selected = false,
  highlighted = false,
  onHover,
  onSelect,
}: {
  venue: Venue;
  selected?: boolean;
  highlighted?: boolean;
  onHover?: (venueId: string | null) => void;
  onSelect?: (venueId: string | null) => void;
}) {
  const rowRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (!selected || !rowRef.current) return;
    rowRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selected]);

  return (
    <li ref={rowRef}>
      <button
        className={[
          "venue-row",
          selected && "venue-row-selected",
          highlighted && !selected && "venue-row-highlighted",
        ]
          .filter(Boolean)
          .join(" ")}
        onBlur={() => onHover?.(null)}
        onClick={() => onSelect?.(venue.id)}
        onFocus={() => {
          onHover?.(venue.id);
          onSelect?.(venue.id);
        }}
        onMouseEnter={() => onHover?.(venue.id)}
        onMouseLeave={() => onHover?.(null)}
        type="button"
      >
        <div className="venue-row-top">
          <div>
            <h2>{venue.name}</h2>
            <div className="venue-meta">
              <VenueLocation venue={venue} />
            </div>
          </div>
        </div>
        <div className="venue-row-bottom">
          <div className="venue-tags">
            <CuisineTags cuisines={venue.cuisines} />
            <PaymentTag card={venue.acceptsCard} />
          </div>
          <OpenStatus venue={venue} />
        </div>
      </button>
    </li>
  );
}

export function VenueList({
  venues,
  onClear,
  selectedId = null,
  hoveredId = null,
  onHover,
  onSelect,
}: {
  venues: Venue[];
  onClear: () => void;
  selectedId?: string | null;
  hoveredId?: string | null;
  onHover?: (venueId: string | null) => void;
  onSelect?: (venueId: string | null) => void;
}) {
  if (venues.length === 0) {
    return (
      <EmptyState
        action={
          <button className="text-link" onClick={onClear} type="button">
            Clear all filters
          </button>
        }
      />
    );
  }

  return (
    <ul className="venue-list">
      {venues.map((venue) => (
        <VenueRow
          highlighted={venue.id === hoveredId}
          key={venue.id}
          onHover={onHover}
          onSelect={onSelect}
          selected={venue.id === selectedId}
          venue={venue}
        />
      ))}
    </ul>
  );
}

export function VenueMiniCard({ venue }: { venue: Venue }) {
  return (
    <article className="venue-mini-card">
      <h3>{venue.name}</h3>
      <CuisineTags cuisines={venue.cuisines} />
      <OpenStatus venue={venue} />
    </article>
  );
}
