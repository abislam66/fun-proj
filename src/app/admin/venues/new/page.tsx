import type { Metadata } from "next";

import { AdminAccessDenied } from "@/components/admin/access-denied";
import { VenueEditor } from "@/components/admin/venue-editor";
import { AuthError, requireAdmin } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Add venue",
};

export default async function NewVenuePage() {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof AuthError) {
      return <AdminAccessDenied />;
    }
    throw error;
  }

  return <VenueEditor />;
}
