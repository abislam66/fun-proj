import { notFound } from "next/navigation";

import { SignInGate } from "@/components/venues/sign-in-gate";
import { VenueDetail } from "@/components/venues/venue-detail";
import { getUser } from "@/lib/auth";
import { getVenueBySlug, toVenue } from "@/lib/db/queries";
import { safeInternalPath } from "@/lib/safe-path";
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

  const session = await getUser();
  if (!session) {
    return <SignInGate next={`/eat/${slug}`} venueName={row.name} />;
  }

  const venue: Venue = toVenue(row);
  const backPath = safeInternalPath(query.from);
  const user = { displayName: session.profile.displayName };

  return <VenueDetail backPath={backPath} user={user} venue={venue} />;
}
