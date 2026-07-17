import { listAllVenuesAdmin, listProblemReports } from "@/lib/db/queries";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Minimal admin stub — no form UI (UI agent owns that).
 * Confirms auth + query wiring for venue CRUD / problem queue.
 */
export default async function AdminPage() {
  await requireAdmin();

  const [venues, openReports] = await Promise.all([
    listAllVenuesAdmin(),
    listProblemReports("open"),
  ]);

  return (
    <main className="mx-auto max-w-[48rem] px-md py-xl">
      <h1 className="font-display text-title">Admin</h1>
      <p className="mt-sm text-ink-secondary">
        {venues.length} venues · {openReports.length} open problem reports
      </p>
      <ul className="mt-lg space-y-sm text-small">
        {venues.map((v) => (
          <li key={v.id}>
            <span className="text-ink">{v.name}</span>{" "}
            <span className="text-ink-muted">
              ({v.status} · {v.slug})
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
