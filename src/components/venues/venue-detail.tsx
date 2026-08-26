import Link from "next/link";

import { SiteHeader } from "@/components/layout/site-header";
import { ReportProblemForm } from "@/components/venues/report-problem-form";
import {
  CuisineTags,
  OpenStatus,
  PaymentTag,
} from "@/components/venues/venue-bits";
import { VenuePhotoGallery } from "@/components/venues/venue-photo-gallery";
import { ZONES } from "@/config/zones";
import { WEEKDAY_KEYS, type VenueHours } from "@/lib/hours";
import type { Venue } from "@/lib/venues";

const DAY_LABELS = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
} as const;

function displayTime(value: string): string {
  const [hourText, minuteText] = value.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const period = hour >= 12 ? "p.m." : "a.m.";
  const displayHour = hour % 12 || 12;
  return minute
    ? `${displayHour}:${String(minute).padStart(2, "0")} ${period}`
    : `${displayHour} ${period}`;
}

function HoursTable({ hours }: { hours: VenueHours | null }) {
  if (!hours) return <p className="unknown-value">Hours unknown</p>;
  return (
    <dl className="hours-list">
      {WEEKDAY_KEYS.map((day) => {
        const ranges = hours[day] ?? [];
        return (
          <div key={day}>
            <dt>{DAY_LABELS[day]}</dt>
            <dd>
              {ranges.length
                ? ranges
                    .map(
                      (range) =>
                        `${displayTime(range.open)}–${displayTime(range.close)}`,
                    )
                    .join(", ")
                : "Closed"}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

export function VenueDetail({
  venue,
  backPath,
}: {
  venue: Venue;
  backPath: string;
}) {
  const verified = venue.lastVerifiedAt
    ? new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${venue.lastVerifiedAt}T12:00:00Z`))
    : null;

  return (
    <div className="public-page">
      <SiteHeader />
      <main className="detail-page">
        <Link className="back-link" href={backPath}>
          ← Back to explore
        </Link>

        {venue.status === "retired" ? (
          <div className="retired-banner">
            <strong>This place has closed.</strong>
            <span>
              We keep this page available so old links still make sense.
            </span>
          </div>
        ) : null}

        <header className="detail-hero">
          <p className="eyebrow">{venue.type}</p>
          <h1>{venue.name}</h1>
          <div className="detail-status">
            <div className="detail-tags">
              <CuisineTags cuisines={venue.cuisines} />
              <PaymentTag card={venue.acceptsCard} />
            </div>
            <OpenStatus venue={venue} />
          </div>
        </header>

        <VenuePhotoGallery slug={venue.slug} venueName={venue.name} />

        <section className="detail-section">
          <h2>Good to know</h2>
          <p>{venue.description ?? "No description has been added yet."}</p>
        </section>

        <section className="detail-section">
          <h2>Location</h2>
          <p>{venue.zoneKey ? ZONES[venue.zoneKey].label : venue.location}</p>
          {venue.building ? (
            <p className="location-landmark">Near {venue.building}</p>
          ) : null}
        </section>

        <section className="detail-section">
          <h2>Usual hours</h2>
          <p className="soft-hours-note">
            Schedules can change. Treat these as a guide.
          </p>
          <HoursTable hours={venue.hours} />
        </section>

        <section className="verification-block">
          <div>
            <span className="eyebrow">Last updated</span>
            <strong>{verified ?? "Not yet verified"}</strong>
          </div>
          {venue.status !== "retired" ? (
            <ReportProblemForm venueName={venue.name} />
          ) : null}
        </section>
      </main>
    </div>
  );
}
