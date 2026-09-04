import Link from "next/link";

import { SiteHeader } from "@/components/layout/site-header";
import { VenueExplorer } from "@/components/venues/venue-explorer";
import { getPublishedVenues, toVenue } from "@/lib/db/queries";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Shown only if the venue query itself fails (a real outage) — not for a
 * failed session check, which degrades to "signed out" instead of taking
 * the whole page down (see below). Kept to a plain link rather than a
 * client "Try again" button so this stays a Server Component.
 */
function HomePageUnavailable() {
  return (
    <div className="public-page">
      <SiteHeader />
      <main className="detail-page">
        <div className="empty-state">
          <span aria-hidden="true" className="empty-state-mark">
            !
          </span>
          <h2>Can&rsquo;t load the map right now</h2>
          <p>Something&rsquo;s wrong on our end. Please try again shortly.</p>
          <Link className="button button-primary" href="/">
            Try again
          </Link>
        </div>
      </main>
    </div>
  );
}

export default async function HomePage({ searchParams }: PageProps) {
  const values = await searchParams;
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (Array.isArray(value)) value.forEach((item) => params.append(key, item));
    else if (value !== undefined) params.set(key, value);
  });

  let venues;
  try {
    venues = (await getPublishedVenues()).map(toVenue);
  } catch (error) {
    console.error("Homepage: failed to load venues:", error);
    return <HomePageUnavailable />;
  }

  return <VenueExplorer initialQuery={params.toString()} venues={venues} />;
}
