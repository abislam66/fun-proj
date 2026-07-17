import type { Metadata } from "next";

import { VenueEditor } from "@/components/admin/venue-editor";

export const metadata: Metadata = {
  title: "Edit venue",
};

export default async function EditVenuePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <VenueEditor venueId={id} />;
}
