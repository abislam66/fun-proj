import Link from "next/link";

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
}: {
  venue: Venue;
  backPath: string;
}) {
  return (
    <li>
      <Link
        className="venue-row"
        href={`/eat/${venue.slug}?from=${encodeURIComponent(backPath)}`}
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
}: {
  venues: Venue[];
  backPath: string;
  onClear: () => void;
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
        <VenueRow backPath={backPath} key={venue.id} venue={venue} />
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
