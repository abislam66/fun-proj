import Image from "next/image";
import Link from "next/link";

import { SiteHeader } from "@/components/layout/site-header";
import { ReportProblemForm } from "@/components/venues/report-problem-form";
import {
  CuisineTags,
  OpenStatus,
  PaymentTag,
} from "@/components/venues/venue-bits";
import { VenuePhotoGallery } from "@/components/venues/venue-photo-gallery";
import { WEEKDAY_KEYS, type VenueHours } from "@/lib/hours";
import { googleMapsDirectionsUrl } from "@/lib/maps";
import { venueLocationText, type Venue } from "@/lib/venues";

const DAY_LABELS = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
} as const;

/** "5:30 AM" / "10:00 PM" — always shows minutes, matches the weekly-schedule format. */
function displayTime(value: string): string {
  const [hourText, minuteText] = value.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${period}`;
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
                        `${displayTime(range.open)} – ${displayTime(range.close)}`,
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
  const location = venueLocationText(venue);

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

        {venue.imageUrl ? (
          <Image
            alt={venue.name}
            className="detail-hero-image"
            height={720}
            priority
            src={venue.imageUrl}
            width={1280}
          />
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

        {venue.description ? (
          <section className="detail-section">
            <h2>Good to know</h2>
            <p>{venue.description}</p>
          </section>
        ) : null}

        <section className="detail-section">
          <h2>Location</h2>
          <p>{location.text}</p>
          <a
            className="text-link directions-link"
            href={googleMapsDirectionsUrl(venue)}
            rel="noreferrer"
            target="_blank"
          >
            Get directions <span aria-hidden="true">↗</span>
          </a>
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
            <span className="eyebrow">Last verified</span>
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
