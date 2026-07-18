"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { EmptyState } from "@/components/ui/primitives";
import type { Venue } from "@/lib/venues";
import {
  CuisineTags,
  OpenStatus,
  PaymentTag,
  VenueLocation,
} from "@/components/venues/venue-bits";

export function VenueRow({
  venue,
  backPath,
  selected = false,
  highlighted = false,
  onHover,
  onSelect,
}: {
  venue: Venue;
  backPath: string;
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
      <Link
        className={[
          "venue-row",
          selected && "venue-row-selected",
          highlighted && !selected && "venue-row-highlighted",
        ]
          .filter(Boolean)
          .join(" ")}
        href={`/eat/${venue.slug}?from=${encodeURIComponent(backPath)}`}
        onBlur={() => onHover?.(null)}
        onFocus={() => {
          onHover?.(venue.id);
          onSelect?.(venue.id);
        }}
        onMouseEnter={() => onHover?.(venue.id)}
        onMouseLeave={() => onHover?.(null)}
      >
        <div className="venue-row-top">
          <div>
            <h2>{venue.name}</h2>
            <div className="venue-meta">
              <VenueLocation venue={venue} />
            </div>
          </div>
          <span className="row-arrow" aria-hidden="true">
            ↗
          </span>
        </div>
        <div className="venue-row-bottom">
          <div className="venue-tags">
            <CuisineTags cuisines={venue.cuisines} />
            <PaymentTag card={venue.acceptsCard} />
          </div>
          <OpenStatus venue={venue} />
        </div>
      </Link>
    </li>
  );
}

export function VenueList({
  venues,
  backPath,
  onClear,
  selectedId = null,
  hoveredId = null,
  onHover,
  onSelect,
}: {
  venues: Venue[];
  backPath: string;
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
          backPath={backPath}
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
