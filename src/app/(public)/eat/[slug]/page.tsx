import { notFound } from "next/navigation";

import { SignInGate } from "@/components/venues/sign-in-gate";
import { VenueDetail } from "@/components/venues/venue-detail";
import { getUser } from "@/lib/auth";
import {
  getUserRatingForVenue,
  getVenueBySlug,
  listVenueReviews,
  toVenue,
} from "@/lib/db/queries";
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

  const [reviews, ownRow] = await Promise.all([
    listVenueReviews(row.id),
    getUserRatingForVenue(row.id, session.id),
  ]);

  const venue: Venue = toVenue(row);
  const backPath = safeInternalPath(query.from);
  const user = { displayName: session.profile.displayName };

  return (
    <VenueDetail
      backPath={backPath}
      isAdmin={session.profile.role === "admin"}
      ownRating={
        ownRow
          ? {
              stars: Number(ownRow.stars),
              reviewText: ownRow.reviewText,
              status: ownRow.status,
              removedReason: ownRow.removedReason,
            }
          : null
      }
      reviews={reviews.map((review) => ({
        id: review.id,
        userId: review.userId,
        stars: review.stars,
        reviewText: review.reviewText,
        status: review.status,
        removedReason: review.removedReason,
        displayName: review.displayName,
        createdAt: review.createdAt.toISOString(),
        updatedAt: review.updatedAt.toISOString(),
      }))}
      user={user}
      userId={session.id}
      venue={venue}
    />
  );
}
