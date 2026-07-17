import type { Metadata } from "next";

import { VenueEditor } from "@/components/admin/venue-editor";

export const metadata: Metadata = {
  title: "Add venue",
};

export default function NewVenuePage() {
  return <VenueEditor />;
}
