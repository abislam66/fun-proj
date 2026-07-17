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

export function PaymentMethods({
  cash,
  card,
}: {
  cash: boolean | null;
  card: boolean | null;
}) {
  const known = cash !== null || card !== null;
  if (!known) {
    return <span className="payment payment-unknown">Payment unknown</span>;
  }
  return (
    <span className="payments" aria-label="Accepted payment methods">
      {cash ? <span className="payment">Cash</span> : null}
      {card ? <span className="payment">Card</span> : null}
    </span>
  );
}

export function VenueLocation({ venue }: { venue: Venue }) {
  return (
    <span className="venue-location">
      {venue.zoneKey ? ZONES[venue.zoneKey].label : "Near campus"}
    </span>
  );
}
