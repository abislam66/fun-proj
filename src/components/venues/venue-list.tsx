"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { EmptyState } from "@/components/ui/primitives";
import {
  CuisineTags,
  OpenStatus,
  PaymentTag,
  VenueLocation,
} from "@/components/venues/venue-bits";
import type { Venue } from "@/lib/venues";

export function VenueRow({
  venue,
  backPath,
  selected = false,
  hovered = false,
  onHover,
}: {
  venue: Venue;
  backPath: string;
  selected?: boolean;
  hovered?: boolean;
  onHover?: (id: string | null) => void;
}) {
  const ref = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    if (selected) {
      ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selected]);

  return (
    <li
      className={[selected && "is-selected", hovered && "is-hovered"]
        .filter(Boolean)
        .join(" ")}
      ref={ref}
    >
      <Link
        aria-current={selected ? "true" : undefined}
        className="venue-row"
        href={`/eat/${venue.slug}?from=${encodeURIComponent(backPath)}`}
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
}: {
  venues: Venue[];
  backPath: string;
  onClear: () => void;
  selectedId?: string | null;
  hoveredId?: string | null;
  onHover?: (id: string | null) => void;
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
          hovered={venue.id === hoveredId}
          key={venue.id}
          onHover={onHover}
          selected={venue.id === selectedId}
          venue={venue}
        />
      ))}
    </ul>
  );
}

export function VenueMiniCard({
  venue,
  href,
  onClose,
}: {
  venue: Venue;
  href?: string;
  onClose?: () => void;
}) {
  const body = (
    <>
      <h3>{venue.name}</h3>
      <CuisineTags cuisines={venue.cuisines} />
      <OpenStatus venue={venue} />
    </>
  );

  if (!href) {
    return <article className="venue-mini-card">{body}</article>;
  }

  return (
    <article className="venue-mini-card venue-mini-card-interactive">
      {onClose ? (
        <button
          aria-label="Close"
          className="mini-card-close"
          onClick={onClose}
          type="button"
        >
          ×
        </button>
      ) : null}
      <Link className="mini-card-link" href={href}>
        {body}
        <span className="mini-card-cta">View details →</span>
      </Link>
    </article>
  );
}
