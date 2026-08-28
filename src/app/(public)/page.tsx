import { VenueExplorer } from "@/components/venues/venue-explorer";
import { getUser } from "@/lib/auth";
import { getPublishedVenues, toVenue } from "@/lib/db/queries";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function HomePage({ searchParams }: PageProps) {
  const values = await searchParams;
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (Array.isArray(value)) value.forEach((item) => params.append(key, item));
    else if (value !== undefined) params.set(key, value);
  });

  const [publishedRows, session] = await Promise.all([
    getPublishedVenues(),
    getUser(),
  ]);
  const venues = publishedRows.map(toVenue);
  const user = session ? { displayName: session.profile.displayName } : null;

  return (
    <VenueExplorer
      initialQuery={params.toString()}
      user={user}
      venues={venues}
    />
  );
}
