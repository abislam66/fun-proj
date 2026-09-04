"use client";

import Link from "next/link";

import {
  CuisineTags,
  HalalTag,
  OpenStatus,
  PaymentTag,
} from "@/components/venues/venue-bits";
import type { Venue } from "@/lib/venues";

// Placeholder until venues carry real price data (user call, 2026-08-25:
// "just for now, make it $12") — every preview shows this value.
export const PLACEHOLDER_PRICE_RANGE = "$12";

export function VenuePreview({
  venue,
  backPath,
  onClose,
}: {
  venue: Venue;
  backPath: string;
  onClose: () => void;
}) {
  return (
    <div className="venue-preview">
      <button
        aria-label="Close venue preview"
        className="venue-preview-close"
        onClick={onClose}
        type="button"
      >
        <svg
          aria-hidden="true"
          fill="none"
          height="14"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.5"
          viewBox="0 0 16 16"
          width="14"
        >
          <path d="m4 4 8 8" />
          <path d="m12 4-8 8" />
        </svg>
      </button>
      <h2>{venue.name}</h2>
      <div className="venue-tags">
        <CuisineTags cuisines={venue.cuisines} />
        <PaymentTag card={venue.acceptsCard} />
        <HalalTag isHalal={venue.isHalal} />
      </div>
      <div className="venue-preview-meta">
        <OpenStatus venue={venue} />
        <span className="venue-preview-price">{PLACEHOLDER_PRICE_RANGE}</span>
      </div>
      <Link
        className="button button-primary venue-preview-cta"
        href={`/eat/${venue.slug}?from=${encodeURIComponent(backPath)}`}
      >
        View details
      </Link>
    </div>
  );
}
