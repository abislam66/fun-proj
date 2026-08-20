import { notFound } from "next/navigation";

import { VenueDetail } from "@/components/venues/venue-detail";
import { getVenueBySlug, toVenue } from "@/lib/db/queries";
import type { Venue } from "@/lib/venues";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string }>;
};

export default async function VenueDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const row = await getVenueBySlug(slug);

  if (!row) {
    notFound();
  }

  const venue: Venue = toVenue(row);
  const backPath =
    query.from?.startsWith("/") && !query.from.startsWith("//")
      ? query.from
      : "/";

  return <VenueDetail backPath={backPath} venue={venue} />;
}
