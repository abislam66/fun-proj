import { CUISINES, type CuisineKey } from "@/config/cuisines";
import { ZONES } from "@/config/zones";
import { getOpenStatus } from "@/lib/hours";
import type { Venue } from "@/lib/venues";

export function CuisineTags({ cuisines }: { cuisines: CuisineKey[] }) {
  return (
    <span className="cuisine-tags">
      {cuisines.map((cuisine) => (
        <span className="cuisine-tag" key={cuisine}>
          {CUISINES[cuisine].label}
        </span>
      ))}
    </span>
  );
}

export function OpenStatus({ venue }: { venue: Venue }) {
  if (venue.status === "retired") {
    return <span className="status status-retired">Closed permanently</span>;
  }
  const status = getOpenStatus(venue.hours);
  return (
    <span className={`status status-${status.kind}`}>
      <span className="status-dot" aria-hidden="true" />
      {status.label}
    </span>
  );
}

export function PaymentTag({ card }: { card: boolean | null }) {
  if (card !== false) {
    return null;
  }

  return <span className="cuisine-tag cash-only-tag">Cash Only</span>;
}

export function VenueLocation({ venue }: { venue: Venue }) {
  // No zone → no filler: every venue is near campus, so saying "Near
  // campus" carries no information.
  const parts = [
    venue.zoneKey ? ZONES[venue.zoneKey].label : null,
    venue.building ? `Near ${venue.building}` : null,
  ].filter(Boolean);

  if (parts.length === 0) return null;

  return <span className="venue-location">{parts.join(" · ")}</span>;
}
