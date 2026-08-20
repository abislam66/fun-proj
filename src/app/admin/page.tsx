import type { Metadata } from "next";

import { AdminAccessDenied } from "@/components/admin/access-denied";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { AuthError, requireAdmin } from "@/lib/auth";
import { listAllVenuesAdmin } from "@/lib/db/queries";
import { getProblemReportQueue } from "@/actions/admin";

export const metadata: Metadata = {
  title: "Admin",
};

export default async function AdminPage() {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof AuthError) {
      return <AdminAccessDenied />;
    }
    throw error;
  }

  const [venues, reports] = await Promise.all([
    listAllVenuesAdmin(),
    getProblemReportQueue(),
  ]);

  return <AdminDashboard initialReports={reports} initialVenues={venues} />;
}
