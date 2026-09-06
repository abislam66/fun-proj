"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { EmptyState } from "@/components/ui/primitives";
import type { Venue } from "@/lib/venues";
import {
  CuisineTags,
  HalalTag,
  OpenStatus,
  PaymentTag,
  VenueLocation,
} from "@/components/venues/venue-bits";
import { formatStudentRating } from "@/lib/ratings";

/**
 * Rows navigate straight to `/eat/[slug]` (the sign-in gate there is
 * server-side, so nothing extra is needed here) — `onHover` only
 * highlights the matching pin on the map, it doesn't select/fly to it.
 */
export function VenueRow({
  venue,
  href,
  selected = false,
  highlighted = false,
  onHover,
}: {
  venue: Venue;
  href: string;
  selected?: boolean;
  highlighted?: boolean;
  onHover?: (venueId: string | null) => void;
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
        href={href}
        onBlur={() => onHover?.(null)}
        onFocus={() => onHover?.(venue.id)}
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
          {venue.studentRating ? (
            <span className="venue-row-rating">
              {formatStudentRating(venue.studentRating, "list")}
            </span>
          ) : null}
        </div>
        <div className="venue-row-bottom">
          <div className="venue-tags">
            <CuisineTags cuisines={venue.cuisines} />
            <PaymentTag card={venue.acceptsCard} />
            <HalalTag isHalal={venue.isHalal} />
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
}: {
  venues: Venue[];
  backPath: string;
  onClear: () => void;
  selectedId?: string | null;
  hoveredId?: string | null;
  onHover?: (venueId: string | null) => void;
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
          href={`/eat/${venue.slug}?from=${encodeURIComponent(backPath)}`}
          key={venue.id}
          onHover={onHover}
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
