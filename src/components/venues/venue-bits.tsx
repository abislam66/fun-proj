import { CUISINES, type CuisineKey } from "@/config/cuisines";
import { MAP_ZONES } from "@/config/map-zones";
import { getOpenStatus } from "@/lib/hours";
import { OTHER_MAP_ZONE, OTHER_MAP_ZONE_LABEL, type Venue } from "@/lib/venues";

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
  const zoneLabel = venue.mapZone
    ? venue.mapZone === OTHER_MAP_ZONE
      ? OTHER_MAP_ZONE_LABEL
      : MAP_ZONES[venue.mapZone].label
    : null;
  const parts = [
    zoneLabel,
    venue.building ? `Near ${venue.building}` : null,
  ].filter(Boolean);

  if (parts.length === 0) return null;

  return <span className="venue-location">{parts.join(" · ")}</span>;
}
