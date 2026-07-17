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
  const zone = venue.zoneKey ? ZONES[venue.zoneKey].label : "Near campus";

  return (
    <span className="venue-location">
      {zone}
      {venue.building ? ` · Near ${venue.building}` : ""}
    </span>
  );
}
