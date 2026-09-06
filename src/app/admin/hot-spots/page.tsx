import type { Metadata } from "next";

import { getHotSpotsBoard } from "@/actions/admin";
import { AdminAccessDenied } from "@/components/admin/access-denied";
import { HotSpotsEditor } from "@/components/admin/hot-spots-editor";
import { AuthError, requireAdmin } from "@/lib/auth";
import { getPublishedVenues } from "@/lib/db/queries";

export const metadata: Metadata = {
  title: "Hot Spots This Week",
};

export default async function HotSpotsAdminPage() {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof AuthError) {
      return <AdminAccessDenied />;
    }
    throw error;
  }

  const [initialVenueIds, published] = await Promise.all([
    getHotSpotsBoard(),
    getPublishedVenues(),
  ]);

  const venues = published
    .map((venue) => ({ id: venue.id, name: venue.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return <HotSpotsEditor initialVenueIds={initialVenueIds} venues={venues} />;
}
