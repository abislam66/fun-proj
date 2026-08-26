import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminAccessDenied } from "@/components/admin/access-denied";
import { VenueEditor } from "@/components/admin/venue-editor";
import { AuthError, requireAdmin } from "@/lib/auth";
import { getVenueById, getVenuePhotosForAdmin } from "@/lib/db/queries";

export const metadata: Metadata = {
  title: "Edit venue",
};

export default async function EditVenuePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof AuthError) {
      return <AdminAccessDenied />;
    }
    throw error;
  }

  const { id } = await params;
  const venue = await getVenueById(id);
  if (!venue) {
    notFound();
  }

  const photos = await getVenuePhotosForAdmin(id);
  return (
    <VenueEditor
      photos={photos.map((photo) => ({
        id: photo.id,
        url: photo.url,
        alt: photo.alt,
      }))}
      source={venue}
    />
  );
}
